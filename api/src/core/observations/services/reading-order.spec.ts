import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DataSource } from 'typeorm';
import { ReadingTypeEnum, normalizeJchronicData, parseJchronicFile } from '@actograph/core';
import { AllEntities } from '../../../database/all-entities';
import { AddReadingSortOrder1792600000000 } from '../../../../migrations/1792600000000-add-reading-sort-order';
import { CreateReadingsDto, UpdateReadingsDto } from '../controllers/reading.controller';
import { Observation } from '../entities/observation.entity';
import { Reading } from '../entities/reading.entity';
import { ReadingRepository } from '../repositories/reading.repository';
import { ReadingService } from './reading.service';
import { Export } from './observation/export';

describe('manual reading ordering', () => {
  let dataSource: DataSource;
  let service: ReadingService;
  let observationId: number;

  beforeEach(async () => {
    dataSource = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: AllEntities,
      synchronize: true,
      logging: false,
    });
    await dataSource.initialize();
    const observation = await dataSource.manager.save(
      dataSource.manager.create(Observation, { name: 'Journée rétrospective' }),
    );
    observationId = observation.id;
    const repository = new ReadingRepository(Reading, dataSource.manager);
    service = new ReadingService(repository, {} as any);
  });

  afterEach(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('persists a copied reading between equal timestamps across pages and updates', async () => {
    const sameTime = new Date('2026-10-20T08:00:00.000Z');
    const [first, last] = await service.createMany([
      { observationId, name: 'A', type: ReadingTypeEnum.DATA, dateTime: sameTime, sortOrder: 0 },
      { observationId, name: 'B', type: ReadingTypeEnum.DATA, dateTime: sameTime, sortOrder: 1 },
    ]);
    const [copy] = await service.createMany([
      { observationId, name: first.name!, type: first.type, dateTime: first.dateTime, sortOrder: 1 },
    ]);
    await service.updateMany([{ id: last.id, sortOrder: 2 }], observationId);

    const page1 = await service.findAndPaginateWithOptions(
      { limit: 2, offset: 0, orderBy: 'dateTime', order: 'ASC' },
      { observationId },
    );
    const page2 = await service.findAndPaginateWithOptions(
      { limit: 2, offset: 2, orderBy: 'dateTime', order: 'ASC' },
      { observationId },
    );
    expect(page1.count).toBe(3);
    expect([...page1.results, ...page2.results].map((reading) => reading.id)).toEqual([
      first.id, copy.id, last.id,
    ]);
    expect(page1.results[1].sortOrder).toBe(1);

    await service.updateMany([{ id: copy.id, name: 'A corrigé', dateTime: sameTime }], observationId);
    const reloaded = await dataSource.getRepository(Reading).find({ where: { observation: { id: observationId } } });
    expect(reloaded.find((reading) => reading.id === copy.id)?.name).toBe('A corrigé');
    expect(reloaded.find((reading) => reading.id === first.id)?.name).toBe('A');
  });

  it('keeps legacy readings deterministic when sortOrder is null', async () => {
    const dateTime = new Date('2026-10-20T08:00:00.000Z');
    const saved = await service.createMany([
      { observationId, name: 'old 1', type: ReadingTypeEnum.DATA, dateTime },
      { observationId, name: 'old 2', type: ReadingTypeEnum.DATA, dateTime },
    ]);
    const page = await service.findAndPaginateWithOptions(
      { limit: 1, offset: 1, orderBy: 'dateTime', order: 'ASC' },
      { observationId },
    );
    expect(page.results.map((reading) => reading.id)).toEqual([saved[1].id]);
  });

  it('preserves equal-time order when cloning an observation', async () => {
    const dateTime = new Date('2026-10-20T08:00:00.000Z');
    await service.createMany([
      { observationId, name: 'A', type: ReadingTypeEnum.DATA, dateTime, sortOrder: 0 },
      { observationId, name: 'A bis', type: ReadingTypeEnum.DATA, dateTime, sortOrder: 1 },
    ]);
    const target = await dataSource.manager.save(
      dataSource.manager.create(Observation, { name: 'Copie' }),
    );
    await service.cloneAndAttributeToObservation({
      observationIdToCopyFrom: observationId,
      observationIdToCopyTo: target.id,
    });
    const page = await service.findAndPaginateWithOptions(
      { limit: 10, offset: 0, orderBy: 'dateTime', order: 'ASC' },
      { observationId: target.id },
    );
    expect(page.results.map((reading) => [reading.name, reading.sortOrder])).toEqual([
      ['A', 0], ['A bis', 1],
    ]);
  });

  it('does not let an order update affect a reading in another observation', async () => {
    const [reading] = await service.createMany([{
      observationId,
      name: 'A',
      type: ReadingTypeEnum.DATA,
      dateTime: new Date('2026-10-20T08:00:00.000Z'),
      sortOrder: 0,
    }]);
    const other = await dataSource.manager.save(
      dataSource.manager.create(Observation, { name: 'Autre chronique' }),
    );
    await expect(service.updateMany([{ id: reading.id, sortOrder: 7 }], other.id)).rejects.toThrow();
    expect((await dataSource.getRepository(Reading).findOneByOrFail({ id: reading.id })).sortOrder).toBe(0);
  });

  it('round-trips equal-time order through .jchronic export, parse, import and GET', async () => {
    const dateTime = new Date('2026-10-20T08:00:00.000Z');
    await service.createMany([
      { observationId, name: 'A', type: ReadingTypeEnum.DATA, dateTime, sortOrder: 0 },
      { observationId, name: 'A bis', type: ReadingTypeEnum.DATA, dateTime, sortOrder: 1 },
      { observationId, name: 'B', type: ReadingTypeEnum.DATA, dateTime, sortOrder: 2 },
    ]);
    const source = await dataSource.getRepository(Observation).findOneOrFail({
      where: { id: observationId },
      relations: ['readings'],
    });
    const exporter = new Export(
      { findOne: async () => source } as any,
      {} as any,
      {} as any,
      {} as any,
    );
    const file = JSON.stringify(await exporter.exportObservation(observationId, 1));
    const normalized = normalizeJchronicData(parseJchronicFile(file));
    expect(normalized.readings?.map((reading) => reading.sortOrder)).toEqual([0, 1, 2]);

    const target = await dataSource.manager.save(
      dataSource.manager.create(Observation, { name: 'Importée' }),
    );
    await service.createMany(normalized.readings!.map((reading) => ({
      ...reading,
      observationId: target.id,
    })));
    const page = await service.findAndPaginateWithOptions(
      { limit: 2, offset: 0, orderBy: 'dateTime', order: 'ASC' },
      { observationId: target.id },
    );
    const next = await service.findAndPaginateWithOptions(
      { limit: 2, offset: 2, orderBy: 'dateTime', order: 'ASC' },
      { observationId: target.id },
    );
    expect([...page.results, ...next.results].map((reading) => reading.name)).toEqual([
      'A', 'A bis', 'B',
    ]);
  });

  it('returns the committed row on a lost-response POST retry without overwriting a later edit', async () => {
    const dateTime = new Date('2026-10-20T08:00:00.000Z');
    const payload = {
      observationId,
      tempId: 'client-1',
      name: 'Original',
      description: 'Avant correction',
      type: ReadingTypeEnum.DATA,
      dateTime,
      sortOrder: 1,
    };
    const [committed] = await service.createMany([payload]);
    await service.updateMany([{ id: committed.id, name: 'Corrigé', sortOrder: 2 }], observationId);

    // Simulates the client retrying the original POST after the first response was lost.
    const [retried] = await service.createMany([payload]);
    expect(retried.id).toBe(committed.id);
    expect(retried.name).toBe('Corrigé');
    expect(retried.sortOrder).toBe(2);
    expect(await dataSource.getRepository(Reading).count({ where: { observation: { id: observationId } } })).toBe(1);
  });

  it('keeps legitimate equal-time duplicates distinct and scopes tempId to an observation', async () => {
    const dateTime = new Date('2026-10-20T08:00:00.000Z');
    const make = (tempId?: string) => ({
      observationId,
      tempId,
      name: 'Même observable',
      type: ReadingTypeEnum.DATA,
      dateTime,
    });
    const saveSpy = jest.spyOn((service as any).readingRepository, 'save');
    const firstBatch = await service.createMany([
      make('one'), make('two'), make('one'), make(), make(),
    ]);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy.mock.calls[0][0]).toHaveLength(4);
    expect(firstBatch[0].id).toBe(firstBatch[2].id);
    expect(firstBatch[1].id).not.toBe(firstBatch[0].id);
    expect(firstBatch[3].id).not.toBe(firstBatch[4].id);
    expect(await dataSource.getRepository(Reading).count({ where: { observation: { id: observationId } } })).toBe(4);

    const other = await dataSource.manager.save(
      dataSource.manager.create(Observation, { name: 'Autre chronique' }),
    );
    const [crossObservation] = await service.createMany([{ ...make('one'), observationId: other.id }]);
    expect(crossObservation.id).not.toBe(firstBatch[0].id);
    expect(await dataSource.getRepository(Reading).count({ where: { observation: { id: other.id } } })).toBe(1);
  });

  it('rolls back the whole batch if a later reading has an invalid observation', async () => {
    const dateTime = new Date('2026-10-20T08:00:00.000Z');
    await expect(service.createMany([
      { observationId, tempId: 'valid', name: 'A', type: ReadingTypeEnum.DATA, dateTime },
      { observationId: 999999, tempId: 'invalid', name: 'B', type: ReadingTypeEnum.DATA, dateTime },
    ])).rejects.toThrow();
    expect(await dataSource.getRepository(Reading).count()).toBe(0);
  });
});

describe('reading order API validation and schema migration', () => {
  const baseReading = {
    name: 'Assis',
    type: ReadingTypeEnum.DATA,
    dateTime: '2026-10-20T08:00:00.000Z',
  };

  it.each([0, 1, null])('accepts an optional create order of %s', async (sortOrder) => {
    const body = plainToInstance(CreateReadingsDto, {
      observationId: 1,
      readings: [{ ...baseReading, sortOrder }],
    });
    expect(await validate(body)).toEqual([]);
  });

  it.each([-1, 1.5, '2', Number.MAX_SAFE_INTEGER + 1])(
    'rejects an invalid update order of %s',
    async (sortOrder) => {
      const body = plainToInstance(UpdateReadingsDto, {
        observationId: 1,
        readings: [{ id: 1, ...baseReading, sortOrder }],
      });
      expect(await validate(body)).not.toEqual([]);
    },
  );

  it.each([-1, 1.5, '2', Number.MAX_SAFE_INTEGER + 1])(
    'rejects an invalid create order of %s',
    async (sortOrder) => {
      const body = plainToInstance(CreateReadingsDto, {
        observationId: 1,
        readings: [{ ...baseReading, sortOrder }],
      });
      expect(await validate(body)).not.toEqual([]);
    },
  );

  it('adds a nullable column to existing SQLite readings without losing rows', async () => {
    const dataSource = new DataSource({ type: 'better-sqlite3', database: ':memory:' });
    await dataSource.initialize();
    try {
      await dataSource.query('CREATE TABLE readings (id integer PRIMARY KEY, name text)');
      await dataSource.query("INSERT INTO readings (id, name) VALUES (1, 'original')");
      const migration = new AddReadingSortOrder1792600000000();
      await migration.up(dataSource.createQueryRunner());
      expect(await dataSource.query('SELECT id, name, sortOrder FROM readings')).toEqual([
        { id: 1, name: 'original', sortOrder: null },
      ]);
    } finally {
      await dataSource.destroy();
    }
  });

  it('exports explicit order while keeping legacy files clean', async () => {
    const dateTime = new Date('2026-10-20T08:00:00.000Z');
    const exporter = new Export(
      {
        findOne: async () => ({
          name: 'Journée',
          createdAt: dateTime,
          updatedAt: dateTime,
          readings: [
            { name: 'A', type: ReadingTypeEnum.DATA, dateTime, sortOrder: 0 },
            { name: 'B', type: ReadingTypeEnum.DATA, dateTime, sortOrder: null },
          ],
        }),
      } as any,
      {} as any,
      {} as any,
      {} as any,
    );
    const data = await exporter.exportObservation(1, 1);
    expect(data.readings).toEqual([
      { name: 'A', type: ReadingTypeEnum.DATA, dateTime: dateTime.toISOString(), sortOrder: 0 },
      { name: 'B', type: ReadingTypeEnum.DATA, dateTime: dateTime.toISOString() },
    ]);
    const normalized = normalizeJchronicData(parseJchronicFile(JSON.stringify(data)));
    expect(normalized.readings?.map((reading) => reading.sortOrder)).toEqual([0, undefined]);
  });
});
