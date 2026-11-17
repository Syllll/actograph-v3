import 'reflect-metadata';
import {
  createProtocolExchange,
  createReadingsExchange,
  EXCHANGE_CHRONOMETER_ZERO_MS,
  ObservationModeEnum,
  ProtocolItemActionEnum,
  ProtocolItemTypeEnum,
  ReadingTypeEnum,
  parseLegacyReadingsText,
  type ReadingExchangeDocument,
} from '@actograph/core';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request = require('supertest');
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AllEntities } from '../../../database/all-entities';
import { User } from '../../users/entities/user.entity';
import { JwtAuthGuard } from '../../users/guards/jwt-auth.guard';
import { UserRolesGuard } from '../../users/guards/user-roles.guard';
import { ExchangeController } from '../controllers/exchange.controller';
import { ApplyExchangeDto, PreviewExchangeDto } from '../dtos/exchange.dto';
import { ActivityGraph } from '../entities/activity-graph.entity';
import { Observation } from '../entities/observation.entity';
import { Protocol, ProtocolItem } from '../entities/protocol.entity';
import { Reading } from '../entities/reading.entity';
import { ProtocolRepository } from '../repositories/protocol.repository';
import { ReadingRepository } from '../repositories/reading.repository';
import { ExchangeService } from './exchange.service';
import { ProtocolService } from './protocol/index.service';
import { ReadingService } from './reading.service';

describe('tabular observation exchange', () => {
  let db: DataSource;
  let service: ExchangeService;
  let userId: number;
  let observationId: number;

  const originalItems: ProtocolItem[] = [
    {
      id: 'local-cat',
      type: ProtocolItemTypeEnum.Category,
      name: 'Activité',
      action: ProtocolItemActionEnum.Continuous,
      graphPreferences: { color: '#123456', visible: false },
      children: [
        {
          id: 'local-obs',
          type: ProtocolItemTypeEnum.Observable,
          name: 'Assis',
          description: 'Description intacte',
        },
      ],
    },
    {
      id: 'empty-cat',
      type: ProtocolItemTypeEnum.Category,
      name: 'Vide',
      children: [],
    },
  ];

  beforeEach(async () => {
    db = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: AllEntities,
      synchronize: true,
    });
    await db.initialize();
    userId = (await db.manager.save(new User({ firstname: 'Owner' }))).id;
    const observation = await db.manager.save(
      db.manager.create(Observation, {
        name: 'Chronique source',
        user: { id: userId },
        mode: ObservationModeEnum.Calendar,
        description: 'Avant import',
        meta: { entryMode: 'manual', uiScale: 1.2 },
        videoPath: '/source/video.mp4',
      }),
    );
    observationId = observation.id;
    await db.manager.save(
      db.manager.create(Protocol, {
        observation: { id: observationId },
        user: { id: userId },
        name: 'Protocole source',
        items: JSON.stringify(originalItems),
      }),
    );
    await db.manager.save(
      db.manager.create(ActivityGraph, {
        observation: { id: observationId },
        name: 'Graphe source',
        description: 'Préférences',
      }),
    );
    service = new ExchangeService(db);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    if (db?.isInitialized) await db.destroy();
  });

  const row = (
    name: string | null,
    type = ReadingTypeEnum.DATA,
    time = '2026-11-17T10:00:00.123Z',
  ) => ({
    name,
    type,
    dateTime: new Date(time),
    description: '« Texte » ; accents\nDeuxième ligne',
  });
  const document = (
    names: Array<string | null> = ['Inconnu'],
  ): ReadingExchangeDocument =>
    createReadingsExchange(
      names.map((name) => row(name)),
      ObservationModeEnum.Calendar,
    );
  const input = (
    doc = document(),
    mode: 'add' | 'replace' = 'add',
  ): PreviewExchangeDto => ({ kind: 'readings', mode, document: doc });
  const storedRows = () =>
    db.getRepository(Reading).find({
      where: { observation: { id: observationId } },
      order: { id: 'ASC' },
    });
  const saveReading = (reading = row('Assis'), sortOrder: number | null = 0) =>
    db.manager.save(
      db.manager.create(Reading, {
        ...reading,
        sortOrder,
        observation: { id: observationId },
        tempId: 'local-only',
      }),
    );
  const apply = async (body: PreviewExchangeDto) => {
    const preview = await service.preview(observationId, userId, body);
    return service.apply(observationId, userId, {
      ...body,
      revision: preview.revision,
      confirmReplace: true,
    });
  };

  it('exports every raw event including unknowns, unnamed markers and comments, in equal-time order', async () => {
    await saveReading(row(null, ReadingTypeEnum.START), 0);
    await saveReading(row('Inconnu'), 1);
    await saveReading(row('# note'), 2);
    await saveReading(row(null, ReadingTypeEnum.STOP), 3);
    const snapshot = await service.snapshot(observationId, userId);
    expect(snapshot.readings.readings.map((reading) => reading.name)).toEqual([
      null,
      'Inconnu',
      '# note',
      null,
    ]);
    expect(snapshot.readings.readings.map((reading) => reading.time)).toEqual(
      Array(4).fill('2026-11-17T10:00:00.123Z'),
    );
    expect(snapshot.protocol.items[1]).toMatchObject({
      name: 'Vide',
      children: [],
    });
    expect(JSON.stringify(snapshot.protocol)).not.toContain('local-cat');
  });

  it('adds unknown and duplicate events without deduplication or trusting foreign IDs', async () => {
    const initial = await saveReading(row('Inconnu'));
    const body = input(document(['Inconnu', 'Inconnu', '# commentaire']));
    (body.document as ReadingExchangeDocument).readings.forEach((reading) =>
      Object.assign(reading, { id: initial.id, tempId: 'local-only' }),
    );
    const preview = await service.preview(observationId, userId, body);
    expect(preview.canApply).toBe(true);
    expect(preview.counts).toEqual({
      existing: 1,
      incoming: 3,
      added: 3,
      removed: 0,
    });
    expect(preview.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'UNKNOWN_OBSERVABLES',
          severity: 'warning',
        }),
        expect.objectContaining({ code: 'POTENTIAL_DUPLICATES' }),
      ]),
    );
    await apply(body);
    const rows = await storedRows();
    expect(rows).toHaveLength(4);
    expect(new Set(rows.map((reading) => reading.id)).size).toBe(4);
    expect(rows.slice(1).every((reading) => reading.tempId === null)).toBe(
      true,
    );
    const { observation: _initialObservation, ...initialFields } = initial;
    expect(rows[0]).toEqual(initialFields);
  });

  it.each(['add', 'replace'] as const)(
    'imports incompatible protocol with %s while preserving every existing reading byte for byte',
    async (mode) => {
      for (const [index, reading] of [
        row(null, ReadingTypeEnum.START),
        row('Assis'),
        row('Inconnu'),
        row('# commentaire'),
        row(null, ReadingTypeEnum.PAUSE_START),
        row(null, ReadingTypeEnum.PAUSE_END),
        row(null, ReadingTypeEnum.STOP),
      ].entries())
        await saveReading(reading, index);
      const before = await storedRows();
      const body: PreviewExchangeDto = {
        kind: 'protocol',
        mode,
        document: createProtocolExchange([
          {
            id: 'foreign-cat',
            type: ProtocolItemTypeEnum.Category,
            name: 'Autre grille',
            children: [
              {
                id: 'foreign-obs',
                type: ProtocolItemTypeEnum.Observable,
                name: 'Autre observable',
              },
            ],
          },
        ]),
      };
      const preview = await service.preview(observationId, userId, body);
      expect(preview.canApply).toBe(true);
      expect(
        preview.diagnostics.some(
          (diagnostic) => diagnostic.code === 'UNKNOWN_OBSERVABLES',
        ),
      ).toBe(true);
      await apply(body);
      expect(await storedRows()).toEqual(before);
      const protocol = await db
        .getRepository(Protocol)
        .findOneByOrFail({ observation: { id: observationId } });
      expect(protocol.items).not.toContain('foreign-cat');
      expect(protocol.items).not.toContain('foreign-obs');
    },
  );

  it.each(['add', 'replace'] as const)(
    'keeps existing graphic settings and inherited absence in %s, and remaps new support references',
    async (mode) => {
      const body: PreviewExchangeDto = {
        kind: 'protocol',
        mode,
        document: createProtocolExchange([
          {
            ...originalItems[0],
            id: 'source-cat',
            graphPreferences: { color: '#abcdef' },
            children: [
              {
                ...originalItems[0].children![0],
                id: 'source-obs',
                graphPreferences: { color: '#abcdef' },
              },
            ],
          },
          {
            id: 'source-empty',
            type: ProtocolItemTypeEnum.Category,
            name: 'Nouvelle vide',
            children: [],
          },
          {
            id: 'source-bg',
            type: ProtocolItemTypeEnum.Category,
            name: 'Fond',
            graphPreferences: { supportCategoryId: 'source-empty' },
            children: [],
          },
        ]),
      };
      await apply(body);
      const protocol = await db
        .getRepository(Protocol)
        .findOneByOrFail({ observation: { id: observationId } });
      const items = JSON.parse(protocol.items) as ProtocolItem[];
      expect(
        items.find((item) => item.name === 'Activité')?.graphPreferences,
      ).toEqual(originalItems[0].graphPreferences);
      expect(
        items.find((item) => item.name === 'Activité')?.children?.[0]
          .graphPreferences,
      ).toBeUndefined();
      expect(
        items.find((item) => item.name === 'Fond')?.graphPreferences
          ?.supportCategoryId,
      ).toBe(items.find((item) => item.name === 'Nouvelle vide')?.id);
      expect(
        items.find((item) => item.name === 'Nouvelle vide')?.children,
      ).toEqual([]);
    },
  );

  it('keeps duplicate names as distinct imported observables', async () => {
    const body: PreviewExchangeDto = {
      kind: 'protocol',
      mode: 'add',
      document: createProtocolExchange([
        {
          id: 'cat',
          type: ProtocolItemTypeEnum.Category,
          name: 'Activité',
          children: [
            { id: 'a', type: ProtocolItemTypeEnum.Observable, name: 'Assis' },
            { id: 'b', type: ProtocolItemTypeEnum.Observable, name: 'Assis' },
          ],
        },
      ]),
    };
    const result = await apply(body);
    expect(
      result.diagnostics.some(
        (diagnostic) => diagnostic.code === 'AMBIGUOUS_OBSERVABLES',
      ),
    ).toBe(true);
    const protocol = await db
      .getRepository(Protocol)
      .findOneByOrFail({ observation: { id: observationId } });
    const items = JSON.parse(protocol.items) as ProtocolItem[];
    expect(
      items[0].children?.filter((item) => item.name === 'Assis'),
    ).toHaveLength(3);
  });

  it('diagnoses orphan support references in the effective protocol after preserving existing preferences', async () => {
    await saveReading();
    const before = await storedRows();
    await db.manager.update(
      Protocol,
      { observation: { id: observationId } },
      {
        items: JSON.stringify([
          {
            id: 'a',
            name: 'A',
            type: ProtocolItemTypeEnum.Category,
            graphPreferences: { supportCategoryId: 'b' },
            children: [],
          },
          {
            id: 'b',
            name: 'B',
            type: ProtocolItemTypeEnum.Category,
            children: [],
          },
        ]),
      },
    );
    const body: PreviewExchangeDto = {
      kind: 'protocol',
      mode: 'replace',
      document: createProtocolExchange([
        {
          id: 'source-a',
          name: 'A',
          type: ProtocolItemTypeEnum.Category,
          children: [],
        },
        {
          id: 'source-c',
          name: 'C',
          type: ProtocolItemTypeEnum.Category,
          children: [],
        },
      ]),
    };
    const preview = await service.preview(observationId, userId, body);
    expect(preview.canApply).toBe(true);
    expect(preview.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'support_reference',
        severity: 'warning',
      }),
    );
    const result = await apply(body);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'support_reference',
        severity: 'warning',
      }),
    );
    const persisted = await db
      .getRepository(Protocol)
      .findOneByOrFail({ observation: { id: observationId } });
    const items = JSON.parse(persisted.items) as ProtocolItem[];
    expect(
      items.find((item) => item.name === 'A')?.graphPreferences
        ?.supportCategoryId,
    ).toBe('b');
    expect(items.some((item) => item.name === 'B')).toBe(false);
    expect(await storedRows()).toEqual(before);
  });

  it('reports unnamed DATA as a nonblocking warning without changing imported names', async () => {
    const body = input(document([null, '']));
    const preview = await service.preview(observationId, userId, body);
    expect(preview.canApply).toBe(true);
    expect(preview.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'UNKNOWN_OBSERVABLES',
        severity: 'warning',
        message:
          '2 relevés sans correspondance : Sans nom. Les données sont conservées.',
      }),
    );
    await apply(body);
    expect((await storedRows()).map((reading) => reading.name)).toEqual([
      null,
      '',
    ]);
  });

  it('requires replacement confirmation and creates a complete, normally accessible persistent backup', async () => {
    const before = await saveReading(row('Assis'), null);
    const body = input(document(['Nouveau']), 'replace');
    const preview = await service.preview(observationId, userId, body);
    await expect(
      service.apply(observationId, userId, {
        ...body,
        revision: preview.revision,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(await db.getRepository(Observation).count()).toBe(1);
    const result = await apply(body);
    expect(result.backup?.name).toContain('sauvegarde avant import');
    const backup = await db.getRepository(Observation).findOneOrFail({
      where: { id: result.backup!.id, user: { id: userId } },
      relations: ['readings', 'protocol', 'activityGraph'],
    });
    expect(backup).toMatchObject({
      description: 'Avant import',
      mode: ObservationModeEnum.Calendar,
      videoPath: '/source/video.mp4',
      meta: { entryMode: 'manual', uiScale: 1.2 },
    });
    expect(backup.protocol?.items).toBe(JSON.stringify(originalItems));
    expect(backup.activityGraph).toMatchObject({
      name: 'Graphe source',
      description: 'Préférences',
    });
    expect(backup.readings).toHaveLength(1);
    expect(backup.readings![0]).toMatchObject({
      name: before.name,
      dateTime: before.dateTime,
      description: before.description,
      sortOrder: 0,
    });
    expect((await storedRows()).map((reading) => reading.name)).toEqual([
      'Nouveau',
    ]);
    expect(
      (await service.snapshot(backup.id, userId)).readings.readings[0].name,
    ).toBe('Assis');
  });

  it('preserves mixed legacy and explicit equal-time order in a backup with newly allocated IDs', async () => {
    await saveReading(row('A'), null);
    await saveReading(row('B'), 100);
    const sourceRows = await storedRows();
    const sourceSnapshot = await service.snapshot(observationId, userId);
    expect(
      sourceSnapshot.readings.readings.map((reading) => reading.name),
    ).toEqual(['A', 'B']);

    // An unrelated chronicle advances the global sequence beyond the explicit
    // order. Copying null would make A fall back to its new ID and follow B.
    const other = await db.manager.save(
      db.manager.create(Observation, {
        name: 'Autre chronique',
        user: { id: userId },
      }),
    );
    await db.manager.save(
      db.manager.create(Reading, {
        ...row('Sans rapport'),
        id: 1000,
        observation: { id: other.id },
      }),
    );
    const result = await apply({
      kind: 'protocol',
      mode: 'replace',
      document: createProtocolExchange([]),
    });
    const backupRows = await db.getRepository(Reading).find({
      where: { observation: { id: result.backup!.id } },
      order: { id: 'ASC' },
    });
    expect(backupRows.every((reading) => reading.id > 1000)).toBe(true);
    expect(backupRows.map((reading) => reading.sortOrder)).toEqual([0, 1]);
    expect(
      (await service.snapshot(result.backup!.id, userId)).readings,
    ).toEqual(sourceSnapshot.readings);
    expect(await storedRows()).toEqual(sourceRows);
  });

  it.each([ObservationModeEnum.Calendar, ObservationModeEnum.Chronometer])(
    'round-trips exact %s timestamps, long durations and event order',
    async (mode) => {
      await db.manager.update(Observation, observationId, { mode });
      const milliseconds =
        mode === ObservationModeEnum.Chronometer
          ? EXCHANGE_CHRONOMETER_ZERO_MS + 100 * 3600 * 1000 + 789
          : Date.parse('2026-11-17T10:00:00.789Z');
      const events = [
        ReadingTypeEnum.START,
        ReadingTypeEnum.DATA,
        ReadingTypeEnum.PAUSE_START,
        ReadingTypeEnum.PAUSE_END,
        ReadingTypeEnum.DATA,
        ReadingTypeEnum.STOP,
      ];
      const doc = createReadingsExchange(
        events.map((type, index) => ({
          ...row(type === ReadingTypeEnum.DATA ? 'Assis' : null, type),
          dateTime: new Date(milliseconds),
          sortOrder: index,
        })),
        mode,
      );
      doc.readings.reverse(); // File row order is not the exchange order.
      await apply(input(doc));
      const rows = await storedRows();
      expect(rows.map((reading) => reading.type)).toEqual(events);
      expect(rows.map((reading) => reading.dateTime.getTime())).toEqual(
        Array(6).fill(milliseconds),
      );
      expect(rows.map((reading) => reading.sortOrder)).toEqual([
        0, 1, 2, 3, 4, 5,
      ]);
      expect((await service.snapshot(observationId, userId)).readings).toEqual({
        ...doc,
        readings: [...doc.readings].reverse(),
      });
    },
  );

  it('rejects a stale preview after a reading edit or protocol change', async () => {
    const original = await saveReading();
    const body = input();
    const preview = await service.preview(observationId, userId, body);
    await db.manager.update(Reading, original.id, {
      description: 'Correction pendant aperçu',
    });
    await expect(
      service.apply(observationId, userId, {
        ...body,
        revision: preview.revision,
      }),
    ).rejects.toMatchObject({
      response: { code: 'EXCHANGE_PREVIEW_STALE' },
      status: 409,
    });
    const next = await service.preview(observationId, userId, body);
    await db.manager.update(
      Protocol,
      { observation: { id: observationId } },
      { items: '[]' },
    );
    await expect(
      service.apply(observationId, userId, {
        ...body,
        revision: next.revision,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(await db.getRepository(Observation).count()).toBe(1);
    expect(await storedRows()).toHaveLength(1);
  });

  it('denies snapshot, preview and apply to another user', async () => {
    const intruder = await db.manager.save(new User({ firstname: 'Intruder' }));
    const body = input();
    const preview = await service.preview(observationId, userId, body);
    await expect(
      service.snapshot(observationId, intruder.id),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.preview(observationId, intruder.id, body),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.apply(observationId, intruder.id, {
        ...body,
        revision: preview.revision,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(await storedRows()).toHaveLength(0);
  });

  it('returns structural diagnostics and changes nothing, including backups, when any row is invalid', async () => {
    const original = await saveReading();
    const invalid = document(['Bon', 'Invalide']);
    invalid.readings[1].time = '17/11/2026 10:00';
    const body = input(invalid, 'replace');
    const preview = await service.preview(observationId, userId, body);
    expect(preview.canApply).toBe(false);
    expect(preview.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'time', row: 4, severity: 'error' }),
    );
    await expect(
      service.apply(observationId, userId, {
        ...body,
        revision: preview.revision,
        confirmReplace: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    const { observation: _originalObservation, ...originalFields } = original;
    expect(await storedRows()).toEqual([originalFields]);
    expect(await db.getRepository(Observation).count()).toBe(1);
  });

  it('rejects incompatible temporal modes and imports while an existing recording is active', async () => {
    const mismatch = createReadingsExchange(
      [row('Assis')],
      ObservationModeEnum.Chronometer,
    );
    expect(
      (await service.preview(observationId, userId, input(mismatch))).canApply,
    ).toBe(false);
    await db.manager.save(db.manager.create(Observation, {
      id: observationId, meta: { entryMode: 'live' },
    }));
    await saveReading(row(null, ReadingTypeEnum.START));
    const preview = await service.preview(observationId, userId, input());
    expect(preview.canApply).toBe(false);
    expect(preview.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'EXCHANGE_RECORDING_ACTIVE' }),
    );
  });

  it.each(['readings', 'protocol'] as const)(
    'allows %s imports in a manual chronicle with its automatic START and no STOP',
    async (kind) => {
      await saveReading(row(null, ReadingTypeEnum.START));
      const before = await storedRows();
      const body: PreviewExchangeDto =
        kind === 'readings'
          ? input(document(['Donnée manuelle']))
          : {
              kind: 'protocol',
              mode: 'replace',
              document: createProtocolExchange([]),
            };
      const preview = await service.preview(observationId, userId, body);
      expect(preview.canApply).toBe(true);
      expect(
        preview.diagnostics.some(
          (diagnostic) => diagnostic.code === 'EXCHANGE_RECORDING_ACTIVE',
        ),
      ).toBe(false);
      await apply(body);
      const readings = await storedRows();
      expect(readings[0]).toEqual(before[0]);
      expect(
        readings.filter((reading) => reading.type === ReadingTypeEnum.STOP),
      ).toEqual([]);
      if (kind === 'protocol') expect(readings).toEqual(before);
      else
        expect(readings.map((reading) => reading.name)).toEqual([
          null,
          'Donnée manuelle',
        ]);
    },
  );

  it('rolls back both the backup and replacement if persistence fails after deletion', async () => {
    const initial = await saveReading();
    const body = input(document(), 'replace');
    const preview = await service.preview(observationId, userId, body);
    const runner = db.createQueryRunner();
    const originalQuery = runner.query.bind(runner);
    jest
      .spyOn(runner, 'query')
      .mockImplementation(
        async (sql: string, parameters?: unknown[], structured?: true) => {
          if (
            sql.startsWith('INSERT INTO "readings"') &&
            parameters?.includes('Inconnu')
          )
            throw new Error('simulated disk failure');
          return structured
            ? originalQuery(sql, parameters, true)
            : originalQuery(sql, parameters);
        },
      );
    await expect(
      service.apply(observationId, userId, {
        ...body,
        revision: preview.revision,
        confirmReplace: true,
      }),
    ).rejects.toThrow('simulated disk failure');
    jest.restoreAllMocks();
    const { observation: _initialObservation, ...initialFields } = initial;
    expect(await storedRows()).toEqual([initialFields]);
    expect(await db.getRepository(Observation).count()).toBe(1);
    expect(await db.getRepository(Protocol).count()).toBe(1);
  });

  it('serializes two concurrent applies, commits one and rejects the other as stale', async () => {
    const body = input();
    const preview = await service.preview(observationId, userId, body);
    const payload: ApplyExchangeDto = { ...body, revision: preview.revision };
    const results = await Promise.allSettled([
      service.apply(observationId, userId, payload),
      service.apply(observationId, userId, payload),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = results.find(
      (result) => result.status === 'rejected',
    ) as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({
      response: { code: 'EXCHANGE_PREVIEW_STALE' },
    });
    expect(await storedRows()).toHaveLength(1);
  });

  it('keeps normal protocol edits working and rejects a manual edit prepared before an import', async () => {
    const repository = new ProtocolRepository(Protocol, db.manager);
    const protocols = new ProtocolService(repository);
    const protocol = await repository.findOneByOrFail({
      observation: { id: observationId },
    });
    await saveReading(row('Assis'));
    const before = await storedRows();
    await protocols.items.editObservable({
      protocolId: protocol.id,
      observableId: 'local-obs',
      name: 'Debout',
    });
    expect(await storedRows()).toEqual(before);
    const stale = await repository.findOneByOrFail({ id: protocol.id });
    await apply({
      kind: 'protocol',
      mode: 'replace',
      document: createProtocolExchange([]),
    });
    await expect(
      (protocols.items as any).saveActiveItems(
        { id: stale.id, items: stale.items },
        stale.items,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect((await repository.findOneByOrFail({ id: protocol.id })).items).toBe(
      '[]',
    );
    expect(await storedRows()).toEqual(before);
  });

  it('serializes normal reading writes with import and detects their committed content in a preview revision', async () => {
    const readings = new ReadingService(
      new ReadingRepository(Reading, db.manager),
      {} as any,
    );
    const body = input();
    const preview = await service.preview(observationId, userId, body);
    await readings.create({ observationId, ...row('Assis'), name: 'Assis' });
    await expect(
      service.apply(observationId, userId, {
        ...body,
        revision: preview.revision,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('imports normalized V1 TXT readings without changing names, duplicates, pauses or exact long durations', async () => {
    await db.manager.update(Observation, observationId, {
      mode: ObservationModeEnum.Chronometer,
    });
    const text = [
      '# Data export file',
      '# Data mod (0: chronometer, 1: calendar)',
      '0',
      '# Flag, time, name',
      'start\t\t2 3 12:34:56.789\t\t',
      'data\t\t2 3 12:34:56.789\t\t É;001 ',
      'data\t\t2 3 12:34:56.789\t\t É;001 ',
      'pause_start\t\t2 3 12:34:56.789\t\t',
      'pause_end\t\t2 3 12:34:56.789\t\t',
      'stop\t\t2 3 12:34:56.789\t\t',
      '',
    ].join('\r\n');
    const doc = parseLegacyReadingsText(text, {
      mode: ObservationModeEnum.Chronometer,
    });
    await apply(input(doc));
    const rows = await storedRows();
    expect(rows.map((reading) => reading.name)).toEqual([
      '',
      ' É;001 ',
      ' É;001 ',
      '',
      '',
      '',
    ]);
    expect(rows.map((reading) => reading.type)).toEqual([
      'start',
      'data',
      'data',
      'pause_start',
      'pause_end',
      'stop',
    ]);
    expect(
      rows.map(
        (reading) => reading.dateTime.getTime() - EXCHANGE_CHRONOMETER_ZERO_MS,
      ),
    ).toEqual(
      Array(6).fill((17 * 86400 + 12 * 3600 + 34 * 60 + 56) * 1000 + 789),
    );
  });

  it('extracts only the protocol from a real V1 binary without writing anything, then applies without touching readings', async () => {
    await saveReading();
    const before = await storedRows();
    const buffer = readFileSync(
      resolve(
        __dirname,
        '../../../../../packages/core/src/__tests__/import/fixtures/sample-v3-with-readings.chronic',
      ),
    );
    const log = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const doc = await service.parseLegacyProtocol(observationId, userId, {
      buffer,
      originalname: 'source.chronic',
    });
    log.mockRestore();
    expect(doc.kind).toBe('protocol');
    expect(doc.items.length).toBeGreaterThan(0);
    expect(await storedRows()).toEqual(before);
    expect(await db.getRepository(Observation).count()).toBe(1);
    await apply({ kind: 'protocol', mode: 'replace', document: doc });
    expect(await storedRows()).toEqual(before);
  });

  it('rejects missing or malformed binary V1 and checks ownership before parsing', async () => {
    await expect(
      service.parseLegacyProtocol(observationId, userId, undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
    const log = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await expect(
      service.parseLegacyProtocol(observationId, userId, {
        buffer: Buffer.from('invalid'),
        originalname: 'bad.chronic',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.parseLegacyProtocol(observationId, -1, {
        buffer: Buffer.from('invalid'),
        originalname: 'bad.chronic',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    log.mockRestore();
    expect(await storedRows()).toEqual([]);
    expect(await db.getRepository(Observation).count()).toBe(1);
  });

  it('validates the HTTP contract and exposes the implemented snapshot/preview/apply routes', async () => {
    const module = await Test.createTestingModule({
      controllers: [ExchangeController],
      providers: [{ provide: ExchangeService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          context.switchToHttp().getRequest().user = { id: userId };
          return true;
        },
      })
      .overrideGuard(UserRolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
    const app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    await app.listen(0, '127.0.0.1');
    try {
      const route = `/observations/${observationId}/exchange`;
      await request(app.getHttpServer()).get(route).expect(200);
      await request(app.getHttpServer())
        .post(`${route}/legacy-protocol`)
        .attach('file', Buffer.from('invalid'), 'bad.chronic')
        .expect(400);
      const buffer = readFileSync(
        resolve(
          __dirname,
          '../../../../../packages/core/src/__tests__/import/fixtures/sample-v3-with-readings.chronic',
        ),
      );
      const legacyResponse = await request(app.getHttpServer())
        .post(`${route}/legacy-protocol`)
        .attach('file', buffer, 'source.chronic')
        .expect(201);
      expect(legacyResponse.body.kind).toBe('protocol');
      expect(await db.getRepository(Observation).count()).toBe(1);
      await request(app.getHttpServer())
        .post(`${route}/preview`)
        .send({ ...input(), mode: 'merge' })
        .expect(400);
      const preview = await request(app.getHttpServer())
        .post(`${route}/preview`)
        .send(input())
        .expect(201);
      const response = await request(app.getHttpServer())
        .post(`${route}/apply`)
        .send({ ...input(), revision: preview.body.revision })
        .expect(201);
      expect(response.body.imported).toBe(1);
      expect(await storedRows()).toHaveLength(1);
    } finally {
      await app.close();
    }
  });
});
