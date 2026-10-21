import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ObservationModeEnum, ReadingTypeEnum } from '@actograph/core';
import { AllEntities } from '../../../database/all-entities';
import { User } from '../../users/entities/user.entity';
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

describe('manual entry observation persistence', () => {
  let dataSource: DataSource;
  let observations: ObservationService;
  let readings: ReadingService;
  let userId: number;

  beforeEach(async () => {
    dataSource = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: AllEntities,
      synchronize: true,
      logging: false,
    });
    await dataSource.initialize();
    const user = await dataSource.manager.save(new User({ firstname: 'Test' }));
    userId = user.id;
    readings = new ReadingService(new ReadingRepository(Reading, dataSource.manager), {} as any);
    observations = new ObservationService(
      new ObservationRepository(Observation, dataSource.manager),
      new ProtocolService(new ProtocolRepository(Protocol, dataSource.manager)),
      new ActivityGraphService(new ActivityGraphRepository(ActivityGraph, dataSource.manager)),
      readings,
    );
  });

  afterEach(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it.each([ObservationModeEnum.Calendar, ObservationModeEnum.Chronometer])(
    'retains manual %s mode, edited readings and timestamps after export and import',
    async (mode) => {
      const created = await observations.create({
        userId,
        name: `Saisie ${mode}`,
        mode,
        meta: { entryMode: 'manual', timeZone: 'Europe/Paris' },
        protocol: { name: 'Protocole manuel' },
      });
      const reloaded = await dataSource.getRepository(Observation).findOneByOrFail({ id: created.id });
      expect(reloaded.mode).toBe(mode);
      expect(reloaded.meta).toMatchObject({ entryMode: 'manual', timeZone: 'Europe/Paris' });
      expect(await dataSource.getRepository(Reading).count({ where: { observation: { id: created.id } } })).toBe(0);

      const initialDate = new Date('2026-10-20T08:12:13.456Z');
      const correctedDate = new Date('2026-10-20T08:13:14.789Z');
      const [reading] = await readings.createMany([{
        observationId: created.id,
        tempId: 'manual-reading',
        name: 'Assis',
        type: ReadingTypeEnum.DATA,
        dateTime: initialDate,
        sortOrder: 0,
      }]);
      await readings.updateMany([{
        id: reading.id,
        name: 'Debout',
        dateTime: correctedDate,
      }], created.id);
      const edited = await dataSource.getRepository(Reading).findOneByOrFail({ id: reading.id });
      expect(edited.name).toBe('Debout');
      expect(edited.dateTime.getTime()).toBe(correctedDate.getTime());
      expect(edited.sortOrder).toBe(0);

      const exported = await observations.export.exportObservation(created.id, userId);
      expect(exported.observation.mode).toBe(mode);
      expect(exported.observation.meta).toMatchObject({ entryMode: 'manual' });
      expect(exported.readings).toEqual([
        expect.objectContaining({ name: 'Debout', dateTime: correctedDate.toISOString(), sortOrder: 0 }),
      ]);
      const imported = await observations.import.importFromFile(
        JSON.stringify(exported),
        'manual.jchronic',
        userId,
      );
      const importedObservation = await dataSource.getRepository(Observation).findOneByOrFail({ id: imported.id });
      expect(importedObservation.mode).toBe(mode);
      expect(importedObservation.meta).toMatchObject({ entryMode: 'manual', timeZone: 'Europe/Paris' });
      const importedReadings = await dataSource.getRepository(Reading).find({
        where: { observation: { id: imported.id } },
      });
      expect(importedReadings).toHaveLength(1);
      expect(importedReadings[0].name).toBe('Debout');
      expect(importedReadings[0].dateTime.getTime()).toBe(correctedDate.getTime());
      expect(importedReadings[0].sortOrder).toBe(0);
      expect(importedReadings.some((row) => row.type === ReadingTypeEnum.START)).toBe(false);
    },
  );

  it('preserves the legacy absence of manual metadata through export and import', async () => {
    const created = await observations.create({
      userId,
      name: 'Observation historique',
      mode: ObservationModeEnum.Calendar,
    });
    const exported = await observations.export.exportObservation(created.id, userId);
    expect(exported.observation.meta).toBeUndefined();
    const imported = await observations.import.importFromFile(
      JSON.stringify(exported),
      'legacy.jchronic',
      userId,
    );
    const reloaded = await dataSource.getRepository(Observation).findOneByOrFail({ id: imported.id });
    expect(reloaded.meta).toBeNull();
    expect(reloaded.mode).toBe(ObservationModeEnum.Calendar);
  });
});
