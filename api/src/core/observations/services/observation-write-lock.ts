import { NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, IsNull } from 'typeorm';
import { Observation } from '../entities/observation.entity';

const sqliteWriteTails = new WeakMap<DataSource, Promise<void>>();
const observationWriteTails = new WeakMap<
  DataSource,
  Map<number, Promise<void>>
>();

async function acquireQueueLock(
  tails: Map<number, Promise<void>>,
  observationId: number,
): Promise<() => void> {
  const previous = tails.get(observationId) ?? Promise.resolve();
  let releaseCurrent!: () => void;
  const current = new Promise<void>((resolve) => {
    releaseCurrent = resolve;
  });
  const tail = previous.then(() => current);
  tails.set(observationId, tail);
  await previous;
  return () => {
    releaseCurrent();
    if (tails.get(observationId) === tail) tails.delete(observationId);
  };
}

/** Serialize same-process operations in addition to taking the database lock. */
export async function withObservationWriteLocks<T>(
  dataSource: DataSource,
  observationIds: number[],
  operation: () => Promise<T>,
): Promise<T> {
  // better-sqlite3 has one connection per DataSource. Concurrent TypeORM
  // transactions can therefore become nested SAVEPOINTs, which do not lock
  // each other and can roll back one another's writes. Serialize all such
  // transactions on that DataSource, including writes to different parents.
  if (
    dataSource.options.type === 'better-sqlite3' ||
    dataSource.options.type === 'sqlite'
  ) {
    const previous = sqliteWriteTails.get(dataSource) ?? Promise.resolve();
    let releaseCurrent!: () => void;
    const current = new Promise<void>((resolve) => {
      releaseCurrent = resolve;
    });
    const tail = previous.then(() => current);
    sqliteWriteTails.set(dataSource, tail);
    await previous;
    try {
      return await operation();
    } finally {
      releaseCurrent();
      if (sqliteWriteTails.get(dataSource) === tail)
        sqliteWriteTails.delete(dataSource);
    }
  }

  let tails = observationWriteTails.get(dataSource);
  if (!tails) {
    tails = new Map();
    observationWriteTails.set(dataSource, tails);
  }
  const releases: Array<() => void> = [];
  try {
    for (const observationId of [...new Set(observationIds)].sort(
      (left, right) => left - right,
    )) {
      releases.push(await acquireQueueLock(tails, observationId));
    }
    return await operation();
  } finally {
    releases.reverse().forEach((release) => release());
  }
}

/**
 * Acquire the database write lock used by both observation deletion and child
 * writes. A same-value UPDATE works with SQLite and PostgreSQL, unlike
 * TypeORM's pessimistic locks on SQLite. The active-row predicate also makes
 * a waiting writer fail after a deletion commits.
 */
export async function lockActiveObservationWrite(
  manager: EntityManager,
  observationId: number,
): Promise<void> {
  const updatedAtColumn = manager.connection
    .getMetadata(Observation)
    .findColumnWithPropertyName('updatedAt');
  const escapedUpdatedAt = manager.connection.driver.escape(
    updatedAtColumn?.databaseName ?? 'updatedAt',
  );
  const result = await manager.update(
    Observation,
    { id: observationId, deletedAt: IsNull() },
    { updatedAt: () => escapedUpdatedAt },
  );
  if (!result.affected) {
    throw new NotFoundException('Observation not found');
  }
}
