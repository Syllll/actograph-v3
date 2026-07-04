import {
  Observation,
} from '@core/observations/entities/observation.entity';
import { ObservationRepository } from '@core/observations/repositories/obsavation.repository';
import { ActivityGraphService } from '../activity-graph.service';
import { ProtocolService } from '../protocol/index.service';
import { ReadingService } from '../reading.service';
import { ObservationService } from './index.service';
import { ObservationType, ReadingTypeEnum, ProtocolItemActionEnum } from '@actograph/core';
import { NotFoundException } from '@nestjs/common';

interface ExampleDefinition {
  key: string;
  version: string;
  create: () => Promise<void>;
}

export class Example {
  // Default example key, used when no exampleKey is provided to cloneExampleObservation.
  public static readonly DEFAULT_EXAMPLE_KEY = 'default';

  // List of all integrated examples to seed and keep up to date.
  // Each example is identified by a unique key and has a version
  // (matching the last word of its description) used to trigger re-seed.
  private readonly examples: ExampleDefinition[] = [
    {
      key: 'default',
      version: 'v0.0.1',
      create: () => this.createExampleObservation(),
    },
    {
      key: 'faire-le-cafe',
      version: 'v0.0.1',
      create: () => this.createFaireLeCafeExampleObservation(),
    },
  ];

  constructor(
    private readonly observationService: ObservationService,
    private readonly observationRepository: ObservationRepository,
    private readonly protocolService: ProtocolService,
    private readonly readingService: ReadingService,
    private readonly activityGraphService: ActivityGraphService,
  ) {}

  public async checkExampleAndRecreateItIfNeeded() {
    for (const example of this.examples) {
      // Find the example observation by its key (and type).
      const observation = await this.observationRepository.findOne({
        where: {
          type: ObservationType.Example,
          exampleKey: example.key,
        },
      });

      if (!observation) {
        console.info(
          `Example observation "${example.key}" not found, creating it...`,
        );
        await example.create();
        continue;
      }

      // Check the version of the observation, which is the last word of its description.
      const version = observation.description?.split(' ').pop();
      if (version !== example.version) {
        console.info(
          `Example observation "${example.key}" version is outdated, recreating it...`,
        );
        await this.observationRepository.delete(observation.id);
        await example.create();
      }
    }
  }

  public async cloneExampleObservation(
    userId: number,
    exampleKey: string = Example.DEFAULT_EXAMPLE_KEY,
  ): Promise<Observation> {
    // Find the example observation by its key.
    const exampleObservation = await this.observationRepository.findOne({
      where: {
        type: ObservationType.Example,
        exampleKey,
      },
    });
    if (!exampleObservation) {
      throw new NotFoundException(
        `Example observation "${exampleKey}" not found`,
      );
    }

    // Clone the example observation.
    const clonedObservation = await this.observationService.clone(
      exampleObservation.id,
      userId,
    );
    return clonedObservation;
  }

  /**
   * This function creates an example observation with a protocol and a few readings
   * The example observation is loaded when the application is opened to great the user.
   */
  public async createExampleObservation(options?: {}) {
    // First create the observation entity
    const observationObj = this.observationRepository.create({
      name: 'Example Observation',
      description: 'This the exemple observation. v0.0.1',
      type: ObservationType.Example,
      exampleKey: 'default',
    });

    // Save the observation in the db
    const observation = await this.observationRepository.save(observationObj);

    // ********** Create the protocol **********

    const protocol = await this.protocolService.create({
      name: 'Example Protocol',
      description: 'This is an example protocol',
      observationId: observation.id,
    });

    // Add the position category
    const positionCategory = await this.protocolService.items.addCategory({
      protocolId: protocol.id,
      order: 0,
      name: 'Position',
      description: 'This is the position category',
    });
    await this.protocolService.items.addObservable({
      protocolId: protocol.id,
      categoryId: positionCategory.id,
      name: 'Debout',
    });
    await this.protocolService.items.addObservable({
      protocolId: protocol.id,
      categoryId: positionCategory.id,
      name: 'Assis',
    });
    await this.protocolService.items.addObservable({
      protocolId: protocol.id,
      categoryId: positionCategory.id,
      name: 'Autre Position',
    });

    // Add the action category
    const actionCategory = await this.protocolService.items.addCategory({
      protocolId: protocol.id,
      order: 1,
      name: 'Action',
      description: 'This is the action category',
    });
    await this.protocolService.items.addObservable({
      protocolId: protocol.id,
      categoryId: actionCategory.id,
      name: 'Chercher',
    });
    await this.protocolService.items.addObservable({
      protocolId: protocol.id,
      categoryId: actionCategory.id,
      name: 'Se lever',
    });
    await this.protocolService.items.addObservable({
      protocolId: protocol.id,
      categoryId: actionCategory.id,
      name: 'Autre Action',
    });

    // ********** Create the readings **********

    // Add a few readings:
    // - Start
    // - Chercher
    // - Debout
    // - Assis
    // - Autre Position
    // - Se lever
    // - Chercher
    // - Pause start
    // - Pause end
    // - Debout
    // - Assis
    // - Autre Position
    // - End

    await this.readingService.createMany([
      {
        name: 'Start',
        type: ReadingTypeEnum.START,
        observationId: observation.id,
        dateTime: new Date('2025/01/01 12:00:00'),
      },
      {
        name: 'Chercher',
        type: ReadingTypeEnum.DATA,
        observationId: observation.id,
        dateTime: new Date('2025/01/01 12:00:01'),
      },
      {
        name: 'Debout',
        type: ReadingTypeEnum.DATA,
        observationId: observation.id,
        dateTime: new Date('2025/01/01 12:00:02'),
      },
      {
        name: 'Assis',
        type: ReadingTypeEnum.DATA,
        observationId: observation.id,
        dateTime: new Date('2025/01/01 12:00:03'),
      },
      {
        name: 'Autre Position',
        type: ReadingTypeEnum.DATA,
        observationId: observation.id,
        dateTime: new Date('2025/01/01 12:00:04'),
      },
      {
        name: 'Se lever',
        type: ReadingTypeEnum.DATA,
        observationId: observation.id,
        dateTime: new Date('2025/01/01 12:00:05'),
      },
      {
        name: 'Chercher',
        type: ReadingTypeEnum.DATA,
        observationId: observation.id,
        dateTime: new Date('2025/01/01 12:00:06'),
      },
      {
        name: 'Pause start',
        type: ReadingTypeEnum.PAUSE_START,
        observationId: observation.id,
        dateTime: new Date('2025/01/01 12:00:07'),
      },
      {
        name: 'Pause end',
        type: ReadingTypeEnum.PAUSE_END,
        observationId: observation.id,
        dateTime: new Date('2025/01/01 12:00:08'),
      },
      {
        name: 'Debout',
        type: ReadingTypeEnum.DATA,
        observationId: observation.id,
        dateTime: new Date('2025/01/01 12:00:09'),
      },
      {
        name: 'Assis',
        type: ReadingTypeEnum.DATA,
        observationId: observation.id,
        dateTime: new Date('2025/01/01 12:00:10'),
      },
      {
        name: 'Autre Position',
        type: ReadingTypeEnum.DATA,
        observationId: observation.id,
        dateTime: new Date('2025/01/01 12:00:11'),
      },
      {
        name: 'End',
        type: ReadingTypeEnum.STOP,
        observationId: observation.id,
        dateTime: new Date('2025/01/01 12:00:12'),
      },
    ]);

    // Create the activity graph
    await this.activityGraphService.create({
      observationId: observation.id,
    });
  }

  /**
   * Integrated example "Faire le café".
   *
   * Protocol seeded from the .jchronic export
   * (exemple_Faire_le_caf__2026-07-04.jchronic): 3 categories
   * (Lieu [continuous], Action [continuous], Evènements [discrete]) with their
   * observables. The .jchronic contains no readings, so a coherent reading
   * sequence is authored here to make the activity graph meaningful for
   * students (all reading names reference observables that exist in the
   * protocol).
   */
  public async createFaireLeCafeExampleObservation() {
    // First create the observation entity
    const observationObj = this.observationRepository.create({
      name: 'Exemple Faire le café',
      description: 'Exemple Faire le café. v0.0.1',
      type: ObservationType.Example,
      exampleKey: 'faire-le-cafe',
    });

    // Save the observation in the db
    const observation = await this.observationRepository.save(observationObj);

    // ********** Create the protocol **********

    const protocol = await this.protocolService.create({
      name: 'Exemple Faire le café',
      description: 'This is an example protocol',
      observationId: observation.id,
    });

    // Add the "Lieu" category (continuous)
    const lieuCategory = await this.protocolService.items.addCategory({
      protocolId: protocol.id,
      order: 0,
      name: 'Lieu',
      description: 'This is the position category',
      action: ProtocolItemActionEnum.Continuous,
    });
    for (const name of ['Cuisine', 'Salon', 'Autre Lieu']) {
      await this.protocolService.items.addObservable({
        protocolId: protocol.id,
        categoryId: lieuCategory.id,
        name,
      });
    }

    // Add the "Action" category (continuous)
    const actionCategory = await this.protocolService.items.addCategory({
      protocolId: protocol.id,
      order: 1,
      name: 'Action',
      description: 'This is the action category',
      action: ProtocolItemActionEnum.Continuous,
    });
    for (const name of [
      'Préparer le café',
      'Verser le café',
      'Boire le café',
      'Autre Action',
    ]) {
      await this.protocolService.items.addObservable({
        protocolId: protocol.id,
        categoryId: actionCategory.id,
        name,
      });
    }

    // Add the "Evènements" category (discrete)
    const evenementsCategory = await this.protocolService.items.addCategory({
      protocolId: protocol.id,
      order: 2,
      name: 'Evènements',
      action: ProtocolItemActionEnum.Discrete,
    });
    for (const name of ['Téléphone', 'Sifflement cafetière']) {
      await this.protocolService.items.addObservable({
        protocolId: protocol.id,
        categoryId: evenementsCategory.id,
        name,
      });
    }

    // ********** Create the readings **********
    // Scénario cohérent « faire le café » : tous les noms correspondent à des
    // observables du protocole (Lieu/Action/Evènements) ou à des marqueurs
    // (Start/End/Pause).

    await this.readingService.createMany([
      {
        name: 'Start',
        type: ReadingTypeEnum.START,
        observationId: observation.id,
        dateTime: new Date('2025-01-01T11:00:00.000Z'),
      },
      {
        name: 'Cuisine',
        type: ReadingTypeEnum.DATA,
        observationId: observation.id,
        dateTime: new Date('2025-01-01T11:00:01.000Z'),
      },
      {
        name: 'Préparer le café',
        type: ReadingTypeEnum.DATA,
        observationId: observation.id,
        dateTime: new Date('2025-01-01T11:00:02.000Z'),
      },
      {
        name: 'Sifflement cafetière',
        type: ReadingTypeEnum.DATA,
        observationId: observation.id,
        dateTime: new Date('2025-01-01T11:00:03.000Z'),
      },
      {
        name: 'Verser le café',
        type: ReadingTypeEnum.DATA,
        observationId: observation.id,
        dateTime: new Date('2025-01-01T11:00:04.000Z'),
      },
      {
        name: 'Boire le café',
        type: ReadingTypeEnum.DATA,
        observationId: observation.id,
        dateTime: new Date('2025-01-01T11:00:05.000Z'),
      },
      {
        name: 'Salon',
        type: ReadingTypeEnum.DATA,
        observationId: observation.id,
        dateTime: new Date('2025-01-01T11:00:06.000Z'),
      },
      {
        name: 'Téléphone',
        type: ReadingTypeEnum.DATA,
        observationId: observation.id,
        dateTime: new Date('2025-01-01T11:00:07.000Z'),
      },
      {
        name: 'Pause start',
        type: ReadingTypeEnum.PAUSE_START,
        observationId: observation.id,
        dateTime: new Date('2025-01-01T11:00:08.000Z'),
      },
      {
        name: 'Pause end',
        type: ReadingTypeEnum.PAUSE_END,
        observationId: observation.id,
        dateTime: new Date('2025-01-01T11:00:09.000Z'),
      },
      {
        name: 'Cuisine',
        type: ReadingTypeEnum.DATA,
        observationId: observation.id,
        dateTime: new Date('2025-01-01T11:00:10.000Z'),
      },
      {
        name: 'Boire le café',
        type: ReadingTypeEnum.DATA,
        observationId: observation.id,
        dateTime: new Date('2025-01-01T11:00:11.000Z'),
      },
      {
        name: 'End',
        type: ReadingTypeEnum.STOP,
        observationId: observation.id,
        dateTime: new Date('2025-01-01T11:00:12.000Z'),
      },
    ]);

    // Create the activity graph
    await this.activityGraphService.create({
      observationId: observation.id,
    });
  }
}
