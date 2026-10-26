import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ObservationType, ReadingTypeEnum } from '@actograph/core';
import { AllEntities } from '../../../database/all-entities';
import { User } from '../../users/entities/user.entity';
import { UserService } from '../../users/services/user.service';
import { Observation } from '../entities/observation.entity';
import { Reading } from '../entities/reading.entity';
import { Protocol, type ProtocolItem } from '../entities/protocol.entity';
import { ActivityGraph } from '../entities/activity-graph.entity';
import { ObservationRepository } from '../repositories/obsavation.repository';
import { ProtocolRepository } from '../repositories/protocol.repository';
import { ReadingRepository } from '../repositories/reading.repository';
import { ActivityGraphRepository } from '../repositories/activity-graph.repository';
import { ObservationController } from '../controllers/observation.controller';
import { ObservationService } from './observation/index.service';
import { ProtocolService } from './protocol/index.service';
import { ReadingService } from './reading.service';
import { ActivityGraphService } from './activity-graph.service';

describe('atomic observation deletion', () => {
  let dataSource: DataSource;
  let observations: ObservationService;
  let protocols: ProtocolService;
  let controller: ObservationController;
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
    const user = await dataSource.manager.save(
      new User({ firstname: 'Owner' }),
    );
    userId = user.id;

    const readings = new ReadingService(
      new ReadingRepository(Reading, dataSource.manager),
      {} as ObservationService,
    );
    protocols = new ProtocolService(
      new ProtocolRepository(Protocol, dataSource.manager),
    );
    const activityGraphs = new ActivityGraphService(
      new ActivityGraphRepository(ActivityGraph, dataSource.manager),
    );
    observations = new ObservationService(
      new ObservationRepository(Observation, dataSource.manager),
      protocols,
      activityGraphs,
      readings,
    );
    controller = new ObservationController(
      {} as UserService,
      observations,
      protocols,
      readings,
      activityGraphs,
    );
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  async function createChronicle(name: string): Promise<Observation> {
    return observations.create({
      userId,
      name,
      protocol: {
        name: `Protocole ${name}`,
        categories: [{ name: 'Posture', observables: [{ name: 'Assis' }] }],
      },
      activityGraph: {},
      readings: [
        {
          name: 'Assis',
          type: ReadingTypeEnum.DATA,
          dateTime: new Date('2026-10-20T08:00:00.123Z'),
        },
        {
          name: 'Assis',
          type: ReadingTypeEnum.DATA,
          dateTime: new Date('2026-10-20T08:01:00.456Z'),
        },
      ],
    });
  }

  async function expectChronicleActive(id: number): Promise<void> {
    expect(
      await dataSource.getRepository(Observation).findOneBy({ id }),
    ).not.toBeNull();
    for (const entity of [Protocol, ActivityGraph]) {
      expect(
        await dataSource.getRepository(entity).count({
          where: { observation: { id } },
        }),
      ).toBe(1);
    }
    expect(
      await dataSource.getRepository(Reading).count({
        where: { observation: { id } },
      }),
    ).toBe(2);
  }

  it('soft-deletes the whole chronicle and preserves another chronicle', async () => {
    const target = await createChronicle('Essai');
    const other = await createChronicle('À conserver');

    const deleted = await observations.delete(target.id);
    expect(deleted).toMatchObject({ id: target.id, name: 'Essai' });
    expect(
      await dataSource.getRepository(Observation).findOneBy({ id: target.id }),
    ).toBeNull();
    const deletedObservation = await dataSource
      .getRepository(Observation)
      .findOneOrFail({
        where: { id: target.id },
        withDeleted: true,
      });
    expect(deletedObservation.deletedAt).toBeInstanceOf(Date);

    for (const entity of [Protocol, ActivityGraph, Reading]) {
      const repository = dataSource.getRepository(entity);
      expect(
        await repository.count({ where: { observation: { id: target.id } } }),
      ).toBe(0);
      const remainingRows = await repository.find({
        where: { observation: { id: target.id } },
        withDeleted: true,
      });
      expect(remainingRows).toHaveLength(entity === Reading ? 2 : 1);
      expect(remainingRows.every((row) => row.deletedAt instanceof Date)).toBe(
        true,
      );
    }
    await expectChronicleActive(other.id);
  });

  it('allows deletion of a chronicle with no protocol, graph or reading', async () => {
    const target = await observations.create({ userId, name: 'Vide' });
    await observations.delete(target.id);
    expect(
      await dataSource.getRepository(Observation).findOneBy({ id: target.id }),
    ).toBeNull();
  });

  it.each(['protocols', 'activity-graphs', 'observations'])(
    'rolls back all prior updates when SQLite refuses deletion in %s',
    async (tableName) => {
      const target = await createChronicle('Essai');
      const other = await createChronicle('À conserver');
      // A real failing write, after one or more child updates, exercises the
      // transaction itself rather than a mocked manager or repository.
      const foreignKeyColumn =
        tableName === 'observations' ? 'id' : 'observationId';
      await dataSource.query(`
        CREATE TRIGGER reject_chronicle_deletion
        BEFORE UPDATE OF "deletedAt" ON "${tableName}"
        WHEN OLD."${foreignKeyColumn}" = ${target.id}
          AND OLD."deletedAt" IS NULL AND NEW."deletedAt" IS NOT NULL
        BEGIN
          SELECT RAISE(ABORT, 'deletion refused for test');
        END
      `);

      await expect(observations.delete(target.id)).rejects.toThrow(
        'deletion refused for test',
      );
      await expectChronicleActive(target.id);
      await expectChronicleActive(other.id);

      await dataSource.query('DROP TRIGGER reject_chronicle_deletion');
      await expect(observations.delete(target.id)).resolves.toMatchObject({
        id: target.id,
      });
    },
  );

  it('rejects a missing chronicle without changing another chronicle', async () => {
    const other = await createChronicle('À conserver');
    await expect(observations.delete(other.id + 1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expectChronicleActive(other.id);
  });

  it('rejects a non-owner through the controller and allows the owner', async () => {
    const target = await createChronicle('Essai');
    const outsider = await dataSource.manager.save(
      new User({ firstname: 'Other' }),
    );

    await expect(
      controller.delete({ user: { id: outsider.id } }, target.id),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expectChronicleActive(target.id);

    await expect(
      controller.delete({ user: { id: userId } }, target.id),
    ).resolves.toBeUndefined();
    expect(
      await dataSource.getRepository(Observation).findOneBy({ id: target.id }),
    ).toBeNull();
  });

  it('keeps service deletion available for ownerless integrated examples', async () => {
    const example = await dataSource.manager.save(
      dataSource.manager.create(Observation, {
        name: 'Exemple intégré obsolète',
        type: ObservationType.Example,
        exampleKey: 'test-example',
      }),
    );
    await dataSource.manager.save(
      dataSource.manager.create(Protocol, { observation: { id: example.id } }),
    );
    await dataSource.manager.save(
      dataSource.manager.create(ActivityGraph, {
        observation: { id: example.id },
      }),
    );

    await expect(observations.delete(example.id)).resolves.toMatchObject({
      id: example.id,
    });
    expect(
      await dataSource.getRepository(Observation).findOneBy({ id: example.id }),
    ).toBeNull();
    expect(await dataSource.getRepository(Protocol).count()).toBe(0);
    expect(await dataSource.getRepository(ActivityGraph).count()).toBe(0);
  });

  type ItemMutation = (
    protocol: Protocol,
    category: ProtocolItem,
    observable: ProtocolItem,
  ) => Promise<unknown>;
  const mutations: [string, ItemMutation][] = [
    [
      'addCategory',
      (protocol) =>
        protocols.items.addCategory({
          protocolId: protocol.id,
          name: 'New category',
          order: 1,
        }),
    ],
    [
      'removeItem',
      (protocol, category) =>
        protocols.items.removeItem({
          protocolId: protocol.id,
          itemId: category.id,
        }),
    ],
    [
      'removeCategory',
      (protocol, category) =>
        protocols.items.removeCategory({
          protocolId: protocol.id,
          categoryId: category.id,
        }),
    ],
    [
      'editCategory',
      (protocol, category) =>
        protocols.items.editCategory({
          protocolId: protocol.id,
          categoryId: category.id,
          name: 'Changed category',
        }),
    ],
    [
      'addObservable',
      (protocol, category) =>
        protocols.items.addObservable({
          protocolId: protocol.id,
          categoryId: category.id,
          name: 'New observable',
        }),
    ],
    [
      'removeObservable',
      (protocol, _category, observable) =>
        protocols.items.removeObservable({
          protocolId: protocol.id,
          observableId: observable.id,
        }),
    ],
    [
      'editObservable',
      (protocol, _category, observable) =>
        protocols.items.editObservable({
          protocolId: protocol.id,
          observableId: observable.id,
          name: 'Changed observable',
        }),
    ],
    [
      'updateItemGraphPreferences',
      (protocol, category) =>
        protocols.items.updateItemGraphPreferences({
          protocolId: protocol.id,
          itemId: category.id,
          preferences: { color: '#123456' },
        }),
    ],
  ];

  it.each(mutations)(
    'does not restore a deleted protocol from a stale %s request',
    async (_name, mutate) => {
      const target = await createChronicle('Essai');
      const protocol = await dataSource
        .getRepository(Protocol)
        .findOneByOrFail({
          observation: { id: target.id },
        });
      const [category] = JSON.parse(protocol.items) as ProtocolItem[];
      const observable = category.children?.[0];
      if (!observable) throw new Error('Fixture observable is missing');
      const originalFindOne = protocols.findOne.bind(protocols);
      let releaseSnapshot: () => void = () => undefined;
      let snapshotCaptured: () => void = () => undefined;
      const gate = new Promise<void>((resolve) => {
        releaseSnapshot = resolve;
      });
      const captured = new Promise<void>((resolve) => {
        snapshotCaptured = resolve;
      });
      jest
        .spyOn(protocols, 'findOne')
        .mockImplementationOnce(async (...args) => {
          const snapshot = await originalFindOne(...args);
          snapshotCaptured();
          await gate;
          return snapshot;
        });

      const mutation = mutate(protocol, category, observable);
      await captured;
      await observations.delete(target.id);
      releaseSnapshot();
      await expect(mutation).rejects.toBeInstanceOf(NotFoundException);

      expect(await dataSource.getRepository(Protocol).count()).toBe(0);
      const storedProtocol = await dataSource
        .getRepository(Protocol)
        .findOneOrFail({
          where: { id: protocol.id },
          withDeleted: true,
        });
      expect(storedProtocol.deletedAt).toBeInstanceOf(Date);
      expect(storedProtocol.items).toBe(protocol.items);
      expect(
        await dataSource
          .getRepository(Observation)
          .findOneBy({ id: target.id }),
      ).toBeNull();
    },
  );

  it('does not restore an observation from an update that loaded it before deletion', async () => {
    const target = await createChronicle('Essai');
    const originalFindOne = observations.findOne.bind(observations);
    let releaseSnapshot: () => void = () => undefined;
    let snapshotCaptured: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      releaseSnapshot = resolve;
    });
    const captured = new Promise<void>((resolve) => {
      snapshotCaptured = resolve;
    });
    jest
      .spyOn(observations, 'findOne')
      .mockImplementationOnce(async (...args) => {
        const snapshot = await originalFindOne(...args);
        snapshotCaptured();
        await gate;
        return snapshot;
      });

    const updating = observations.update(target.id, { name: 'Late rename' });
    await captured;
    await observations.delete(target.id);
    releaseSnapshot();
    await expect(updating).rejects.toBeInstanceOf(NotFoundException);
    expect(
      await dataSource.getRepository(Observation).findOneBy({ id: target.id }),
    ).toBeNull();
    const stored = await dataSource.getRepository(Observation).findOneOrFail({
      where: { id: target.id },
      withDeleted: true,
    });
    expect(stored.name).toBe('Essai');
    expect(stored.deletedAt).toBeInstanceOf(Date);
  });

  it('keeps controller metadata merging when updating an active chronicle', async () => {
    const target = await createChronicle('Essai');
    await observations.update(target.id, {
      meta: { entryMode: 'manual', graphXStretch: 2 },
    });
    await controller.update(
      target.id,
      { user: { id: userId } },
      { meta: { xAxisFontSize: 18 } },
    );
    const updated = await dataSource
      .getRepository(Observation)
      .findOneByOrFail({ id: target.id });
    expect(updated.meta).toEqual({
      entryMode: 'manual',
      graphXStretch: 2,
      xAxisFontSize: 18,
    });
  });
});
