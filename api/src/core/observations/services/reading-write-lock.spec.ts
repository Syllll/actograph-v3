import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReadingTypeEnum } from '@actograph/core';
import { AllEntities } from '../../../database/all-entities';
import { Observation } from '../entities/observation.entity';
import { Reading } from '../entities/reading.entity';
import { Protocol } from '../entities/protocol.entity';
import { ActivityGraph } from '../entities/activity-graph.entity';
import { ObservationRepository } from '../repositories/obsavation.repository';
import { ProtocolRepository } from '../repositories/protocol.repository';
import { ReadingRepository } from '../repositories/reading.repository';
import { ActivityGraphRepository } from '../repositories/activity-graph.repository';
import { ObservationService } from './observation/index.service';
import { ProtocolService } from './protocol/index.service';
import { ReadingService } from './reading.service';
import { ActivityGraphService } from './activity-graph.service';
import { withObservationWriteLocks } from './observation-write-lock';

describe('reading writes and observation deletion', () => {
  let dataSource: DataSource;
  let observations: ObservationService;
  let readings: ReadingService;

  beforeEach(async () => {
    dataSource = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: AllEntities,
      synchronize: true,
      logging: false,
    });
    await dataSource.initialize();
    readings = new ReadingService(
      new ReadingRepository(Reading, dataSource.manager),
      {} as ObservationService,
    );
    observations = new ObservationService(
      new ObservationRepository(Observation, dataSource.manager),
      new ProtocolService(new ProtocolRepository(Protocol, dataSource.manager)),
      new ActivityGraphService(
        new ActivityGraphRepository(ActivityGraph, dataSource.manager),
      ),
      readings,
    );
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  const deferred = () => {
    let resolve!: () => void;
    const promise = new Promise<void>((done) => {
      resolve = done;
    });
    return { promise, resolve };
  };

  // Keep the real SQLite query runner and transaction alive while a second
  // service call starts. Only the selected SQL statement is paused.
  const pauseQuery = (matches: (sql: string) => boolean, failure?: Error) => {
    const started = deferred();
    const resume = deferred();
    const runner = dataSource.createQueryRunner();
    const execute = runner.query.bind(runner);
    let paused = false;
    jest
      .spyOn(runner, 'query')
      .mockImplementation(
        async (sql: string, parameters?: unknown[], structured?: true) => {
          if (!paused && matches(sql)) {
            paused = true;
            started.resolve();
            await resume.promise;
            if (failure) throw failure;
          }
          return structured
            ? execute(sql, parameters, true)
            : execute(sql, parameters);
        },
      );
    return { started: started.promise, resume: resume.resolve };
  };

  const flushRequests = () =>
    new Promise<void>((resolve) => setImmediate(resolve));

  async function createObservation(name: string): Promise<Observation> {
    return dataSource.manager.save(
      dataSource.manager.create(Observation, { name }),
    );
  }

  const readingInput = (observationId: number, name: string) => ({
    observationId,
    name,
    type: ReadingTypeEnum.DATA,
    dateTime: new Date('2026-10-20T08:00:00.000Z'),
  });

  it('rejects writes after the parent has been soft-deleted', async () => {
    const target = await createObservation('À supprimer');
    await observations.delete(target.id);

    await expect(
      readings.create(readingInput(target.id, 'Après')),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      readings.createMany([readingInput(target.id, 'Après')]),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(
      await dataSource.getRepository(Reading).count({
        where: { observation: { id: target.id } },
        withDeleted: true,
      }),
    ).toBe(0);
  });

  it('rolls back a mixed batch when one parent is deleted', async () => {
    const active = await createObservation('Active');
    const deleted = await createObservation('Supprimée');
    await observations.delete(deleted.id);

    await expect(
      readings.createMany([
        readingInput(active.id, 'À créer'),
        readingInput(deleted.id, 'Parent absent'),
      ]),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(
      await dataSource
        .getRepository(Reading)
        .count({ where: { observation: { id: active.id } } }),
    ).toBe(0);
  });

  it('does not resurrect a reading when updating after its parent deletion', async () => {
    const target = await createObservation('À supprimer');
    const [reading] = await readings.createMany([
      readingInput(target.id, 'Avant'),
    ]);
    await observations.delete(target.id);

    await expect(
      readings.updateMany([{ id: reading.id, name: 'Après' }], target.id),
    ).rejects.toBeInstanceOf(NotFoundException);
    const persisted = await dataSource.getRepository(Reading).findOneOrFail({
      where: { id: reading.id },
      withDeleted: true,
    });
    expect(persisted.name).toBe('Avant');
    expect(persisted.deletedAt).toBeInstanceOf(Date);
  });

  it('finishes a suspended createMany before deleting its parent and all its children', async () => {
    const target = await createObservation('Insertion en cours');
    const paused = pauseQuery((sql) =>
      sql.startsWith('INSERT INTO "readings"'),
    );
    const creating = readings.createMany([readingInput(target.id, 'En cours')]);
    await paused.started;
    let deletionFinished = false;
    const deleting = observations.delete(target.id).then(() => {
      deletionFinished = true;
    });
    await flushRequests();
    const deletionWaited = !deletionFinished;
    paused.resume();
    const [created] = await creating;
    await deleting;

    expect(deletionWaited).toBe(true);
    expect(
      await dataSource.getRepository(Observation).findOneBy({ id: target.id }),
    ).toBeNull();
    expect(
      await dataSource
        .getRepository(Reading)
        .count({ where: { observation: { id: target.id } } }),
    ).toBe(0);
    const persisted = await dataSource
      .getRepository(Reading)
      .findOneOrFail({ where: { id: created.id }, withDeleted: true });
    expect(persisted.deletedAt).toBeInstanceOf(Date);
  });

  it('finishes a suspended updateMany before deleting the parent without resurrecting its child', async () => {
    const target = await createObservation('Modification en cours');
    const [original] = await readings.createMany([
      readingInput(target.id, 'Avant'),
    ]);
    const paused = pauseQuery(
      (sql) => sql.startsWith('UPDATE "readings"') && sql.includes('"name"'),
    );
    const updating = readings.updateMany(
      [{ id: original.id, name: 'Après' }],
      target.id,
    );
    await paused.started;
    let deletionFinished = false;
    const deleting = observations.delete(target.id).then(() => {
      deletionFinished = true;
    });
    await flushRequests();
    const deletionWaited = !deletionFinished;
    paused.resume();
    await updating;
    await deleting;

    expect(deletionWaited).toBe(true);
    expect(
      await dataSource.getRepository(Observation).findOneBy({ id: target.id }),
    ).toBeNull();
    expect(
      await dataSource.getRepository(Reading).findOneBy({ id: original.id }),
    ).toBeNull();
    const persisted = await dataSource
      .getRepository(Reading)
      .findOneOrFail({ where: { id: original.id }, withDeleted: true });
    expect(persisted.name).toBe('Après');
    expect(persisted.deletedAt).toBeInstanceOf(Date);
  });

  it.each(['createMany', 'updateMany'] as const)(
    'rejects %s started while the parent deletion is suspended',
    async (operation) => {
      const target = await createObservation('Suppression en cours');
      const [original] = await readings.createMany([
        readingInput(target.id, 'Avant'),
      ]);
      const paused = pauseQuery(
        (sql) =>
          sql.startsWith('UPDATE "observations"') &&
          sql.includes('"deletedAt" = CURRENT_TIMESTAMP'),
      );
      const deleting = observations.delete(target.id);
      await paused.started;
      let writeFinished = false;
      const writing = (
        operation === 'createMany'
          ? readings.createMany([readingInput(target.id, 'Trop tard')])
          : readings.updateMany(
              [{ id: original.id, name: 'Trop tard' }],
              target.id,
            )
      ).finally(() => {
        writeFinished = true;
      });
      const rejectedWrite =
        expect(writing).rejects.toBeInstanceOf(NotFoundException);
      await flushRequests();
      const writeWaited = !writeFinished;
      paused.resume();
      await deleting;
      await rejectedWrite;

      expect(writeWaited).toBe(true);
      expect(
        await dataSource
          .getRepository(Reading)
          .count({ where: { observation: { id: target.id } } }),
      ).toBe(0);
      expect(
        await dataSource.getRepository(Reading).count({
          where: { observation: { id: target.id } },
          withDeleted: true,
        }),
      ).toBe(1);
    },
  );

  it.each(['removeMany', 'removeAllForObservation'] as const)(
    'keeps %s committed after a concurrent SQLite update rolls back',
    async (operation) => {
      const target = await createObservation('Suppression du relevé');
      const [original] = await readings.createMany([
        readingInput(target.id, 'Avant'),
      ]);
      const paused = pauseQuery(
        (sql) => sql.startsWith('UPDATE "readings"') && sql.includes('"name"'),
        new Error('Échec contrôlé du PATCH'),
      );
      const failedUpdate = expect(
        readings.updateMany([{ id: original.id, name: 'Après' }], target.id),
      ).rejects.toThrow('Échec contrôlé du PATCH');
      await paused.started;
      let deletionFinished = false;
      const deleting = (
        operation === 'removeMany'
          ? readings.removeMany([{ id: original.id }])
          : readings.removeAllForObservation(target.id)
      ).then(() => {
        deletionFinished = true;
      });
      await flushRequests();
      const deletionWaited = !deletionFinished;
      paused.resume();
      await failedUpdate;
      await deleting;

      expect(deletionWaited).toBe(true);
      expect(
        await dataSource
          .getRepository(Observation)
          .findOneBy({ id: target.id }),
      ).not.toBeNull();
      expect(
        await dataSource.getRepository(Reading).findOneBy({ id: original.id }),
      ).toBeNull();
      const persisted = await dataSource
        .getRepository(Reading)
        .findOneOrFail({ where: { id: original.id }, withDeleted: true });
      expect(persisted.name).toBe('Avant');
      expect(persisted.deletedAt).toBeInstanceOf(Date);
    },
  );

  it('does not let a rollback of one SQLite parent transaction roll back another parent write', async () => {
    const first = await createObservation('Transaction annulée');
    const second = await createObservation('Transaction conservée');
    let markStarted!: () => void;
    let allowFailure!: () => void;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const hold = new Promise<void>((resolve) => {
      allowFailure = resolve;
    });

    const failedWrite = withObservationWriteLocks(
      dataSource,
      [first.id],
      async () =>
        dataSource.manager.transaction(async (manager) => {
          markStarted();
          await hold;
          await manager.getRepository(Reading).save(
            manager.create(Reading, {
              name: 'Rollback',
              type: ReadingTypeEnum.DATA,
              dateTime: new Date('2026-10-20T08:00:00.000Z'),
              observation: { id: first.id },
            }),
          );
          throw new Error('Rollback du test');
        }),
    );
    await started;
    const successfulWrite = readings.create(
      readingInput(second.id, 'Conservé'),
    );
    allowFailure();
    await expect(failedWrite).rejects.toThrow('Rollback du test');
    await successfulWrite;

    expect(
      await dataSource
        .getRepository(Reading)
        .count({ where: { observation: { id: first.id } } }),
    ).toBe(0);
    expect(
      await dataSource
        .getRepository(Reading)
        .count({ where: { observation: { id: second.id } } }),
    ).toBe(1);
  });
});
