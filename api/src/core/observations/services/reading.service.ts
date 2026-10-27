import {
  DateModeEnum,
  License,
  LicenseTypeEnum,
} from '@core/security/entities/license.entity';
import { LicenseRepository } from '@core/security/repositories/license.repository';
import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '@utils/services/base.service';
import { Observation } from '../entities/observation.entity';
import { ObservationRepository } from '../repositories/obsavation.repository';
import { ReadingRepository } from '../repositories/reading.repository';
import { Reading } from '../entities/reading.entity';
import { ReadingTypeEnum } from '@actograph/core';
import { In, IsNull } from 'typeorm';
import {
  IPaginationOptions,
  IConditions,
  OperatorEnum,
  IPaginationOutput,
  TypeEnum,
} from '@utils/repositories/base.repositories';
import { ObservationService } from './observation/index.service';
import { lockActiveObservationWrite, withObservationWriteLocks } from './observation-write-lock';

@Injectable()
export class ReadingService extends BaseService<Reading, ReadingRepository> {
  constructor(
    @InjectRepository(ReadingRepository)
    private readonly readingRepository: ReadingRepository,
    @Inject(forwardRef(() => ObservationService))
    private readonly observationService: ObservationService,
  ) {
    super(readingRepository);
  }

  async findAndPaginateWithOptions(
    paginationOptions: IPaginationOptions,
    searchOptions?: {
      includes?: string[];
      searchString?: string;
      observationId?: number;
    },
  ): Promise<IPaginationOutput<Reading>> {
    const relations = [
      ...(paginationOptions.relations || []),
      ...(searchOptions?.includes || []),
    ];

    const conditions: IConditions[] = [];

    if (searchOptions) {
      if (searchOptions.observationId) {
        if (!relations.includes('observation')) {
          relations.push('observation');
        }

        conditions.push({
          type: TypeEnum.AND,
          key: 'observation.id',
          operator: OperatorEnum.EQUAL,
          value: searchOptions.observationId,
        });
      }

      if (
        searchOptions.searchString?.length &&
        searchOptions.searchString !== '*'
      ) {
        conditions.push({
          type: TypeEnum.AND,
          key: 'observation.name',
          operator: OperatorEnum.LIKE,
          value: searchOptions.searchString,
        });
      }
    }

    return this.findAndPaginate({
      ...paginationOptions,
      relations,
      conditions,
    });
  }

  public async create(options: {
    name: string;
    description?: string;
    observationId: number;
    type: ReadingTypeEnum;
    dateTime: Date;
    sortOrder?: number | null;
  }) {
    return withObservationWriteLocks(
      this.readingRepository.manager.connection,
      [options.observationId],
      () =>
        this.readingRepository.manager.transaction(async (manager) => {
          await lockActiveObservationWrite(manager, options.observationId);
          const repository = manager.getRepository(Reading);
          const reading = repository.create({
            name: options.name,
            description: options.description,
            observation: { id: options.observationId },
            type: options.type,
            dateTime: options.dateTime,
            sortOrder: options.sortOrder,
          });
          return repository.save(reading);
        }),
    );
  }

  // Create several readings at once
  public async createMany(
    readings: {
      tempId?: string | null;
      name: string;
      description?: string | null;
      observationId: number;
      type: ReadingTypeEnum;
      dateTime: Date;
      sortOrder?: number | null;
    }[],
  ) {
    const observationIds = readings.map(({ observationId }) => observationId);
    return withObservationWriteLocks(
      this.readingRepository.manager.connection,
      observationIds,
      () =>
        this.readingRepository.manager.transaction(async (manager) => {
          for (const observationId of [...new Set(observationIds)].sort(
            (left, right) => left - right,
          )) {
            await lockActiveObservationWrite(manager, observationId);
          }
          const repository = manager.getRepository(Reading);

          const idsByObservation = new Map<number, Set<string>>();
          for (const reading of readings) {
            if (!reading.tempId) continue;
            const tempIds =
              idsByObservation.get(reading.observationId) ?? new Set<string>();
            tempIds.add(reading.tempId);
            idsByObservation.set(reading.observationId, tempIds);
          }

          const key = (observationId: number, tempId: string) =>
            `${observationId}\0${tempId}`;
          const existingByKey = new Map<string, Reading>();
          for (const [observationId, tempIds] of idsByObservation) {
            const allTempIds = [...tempIds];
            // Bound SQLite's parameter count for large imports and offline batches.
            for (let offset = 0; offset < allTempIds.length; offset += 500) {
              const existing = await repository.find({
                where: {
                  observation: { id: observationId },
                  tempId: In(allTempIds.slice(offset, offset + 500)),
                },
                order: { id: 'ASC' },
              });
              for (const row of existing) {
                if (row.tempId) {
                  // A legacy database can already contain duplicated tempIds. Keep
                  // returning its first row without modifying or deleting user data.
                  const rowKey = key(observationId, row.tempId);
                  if (!existingByKey.has(rowKey))
                    existingByKey.set(rowKey, row);
                }
              }
            }
          }

          const toCreate: Reading[] = [];
          const pendingByKey = new Map<string, number>();
          const positions: Array<Reading | number> = [];
          for (const reading of readings) {
            const readingKey = reading.tempId
              ? key(reading.observationId, reading.tempId)
              : null;
            if (readingKey && existingByKey.has(readingKey)) {
              positions.push(existingByKey.get(readingKey)!);
              continue;
            }
            if (readingKey && pendingByKey.has(readingKey)) {
              positions.push(pendingByKey.get(readingKey)!);
              continue;
            }
            const entity = repository.create({
              name: reading.name,
              description: reading.description,
              observation: { id: reading.observationId },
              type: reading.type,
              dateTime: reading.dateTime,
              sortOrder: reading.sortOrder,
              tempId: reading.tempId,
            });
            const index = toCreate.push(entity) - 1;
            positions.push(index);
            if (readingKey) pendingByKey.set(readingKey, index);
          }
          // TypeORM save(array) uses one transaction. A later invalid row cannot
          // leave earlier readings committed while the client retries the batch.
          const created =
            toCreate.length > 0 ? await repository.save(toCreate) : [];
          return positions.map((position) =>
            typeof position === 'number' ? created[position] : position,
          );
        }),
    );
  }

  public async removeAllForObservation(observationId: number) {
    return withObservationWriteLocks(
      this.readingRepository.manager.connection,
      [observationId],
      () =>
        this.readingRepository.manager.transaction(async (manager) => {
          await manager.softDelete(Reading, {
            observation: { id: observationId },
            deletedAt: IsNull(),
          });
        }),
    );
  }

  public async cloneAndAttributeToObservation(options: {
    observationIdToCopyFrom: number;
    observationIdToCopyTo: number;
    // Si vrai, décale toutes les dates des relevés clonés pour que le
    // dernier relevé (le plus tardif) tombe à l'instant de la copie.
    // Utilisé pour les chroniques exemples : ainsi, tout relevé ajouté
    // ensuite par l'utilisateur (horodaté avec l'heure réelle) tombe
    // juste après les relevés de démonstration, au lieu d'en être
    // séparé par l'écart entre la date de création de l'exemple et
    // aujourd'hui.
    rebaseLastReadingToNow?: boolean;
  }) {
    // Find the readings to clone
    const readings = await this.readingRepository.find({
      where: { observation: { id: options.observationIdToCopyFrom } },
    });
    if (readings.length === 0) {
      return;
    }

    let offsetMs = 0;
    if (options.rebaseLastReadingToNow) {
      const lastReadingTime = Math.max(
        ...readings.map((r) => new Date(r.dateTime).getTime()),
      );
      offsetMs = Date.now() - lastReadingTime;
    }

    // Clone the readings
    const clonedReadings = await this.createMany(
      readings.map((r) => {
        return {
          name: r.name ?? '',
          description: r.description ?? '',
          observationId: options.observationIdToCopyTo,
          type: r.type,
          dateTime: options.rebaseLastReadingToNow
            ? new Date(new Date(r.dateTime).getTime() + offsetMs)
            : r.dateTime,
          sortOrder: r.sortOrder,
        };
      }),
    );
  }

  public async removeMany(readings: { id: number }[]) {
    const readingIds = [...new Set(readings.map(({ id }) => id))];
    if (readingIds.length === 0) return;

    const existingReadings = await this.readingRepository.find({
      where: { id: In(readingIds) },
      relations: { observation: true },
    });
    const observationIds = existingReadings
      .map(({ observation }) => observation?.id)
      .filter((id): id is number => id != null);

    return withObservationWriteLocks(
      this.readingRepository.manager.connection,
      observationIds,
      () =>
        this.readingRepository.manager.transaction(async (manager) => {
          await manager.softDelete(Reading, {
            id: In(readingIds),
            deletedAt: IsNull(),
          });
        }),
    );
  }

  public async updateMany(
    readings: {
      id?: number;
      tempId?: string | null;
      name?: string;
      description?: string | null;
      type?: ReadingTypeEnum;
      dateTime?: Date;
      sortOrder?: number | null;
    }[],
    observationId: number,
  ) {
    return withObservationWriteLocks(
      this.readingRepository.manager.connection,
      [observationId],
      () =>
        this.readingRepository.manager.transaction(async (manager) => {
          await lockActiveObservationWrite(manager, observationId);
          const repository = manager.getRepository(Reading);
          const updatedReadings: Reading[] = [];

          for (const reading of readings) {
            const existingReading =
              reading.id != null
                ? await repository.findOne({
                    where: {
                      id: reading.id,
                      observation: { id: observationId },
                    },
                  })
                : reading.tempId
                ? await repository.findOne({
                    where: {
                      tempId: reading.tempId,
                      observation: { id: observationId },
                    },
                  })
                : null;
            if (!existingReading) {
              if (reading.id == null && !reading.tempId) {
                throw new BadRequestException(
                  'Temp ID is required for readings without id',
                );
              }
              throw new NotFoundException(
                reading.id != null
                  ? `Reading with id ${reading.id} not found`
                  : `Reading not found with temp ID ${reading.tempId}`,
              );
            }

            const patch: Partial<Reading> = {};
            if (reading.name !== undefined) patch.name = reading.name;
            if (reading.description !== undefined)
              patch.description = reading.description;
            if (reading.type !== undefined) patch.type = reading.type;
            if (reading.dateTime !== undefined) {
              patch.dateTime =
                reading.dateTime instanceof Date
                  ? reading.dateTime
                  : new Date(reading.dateTime);
            }
            if (reading.tempId !== undefined) patch.tempId = reading.tempId;
            if (reading.sortOrder !== undefined)
              patch.sortOrder = reading.sortOrder;

            if (Object.keys(patch).length > 0) {
              const result = await manager.update(
                Reading,
                {
                  id: existingReading.id,
                  observation: { id: observationId },
                  deletedAt: IsNull(),
                },
                patch,
              );
              if (!result.affected) {
                throw new NotFoundException(
                  `Reading with id ${existingReading.id} not found`,
                );
              }
            }

            const updatedReading = await repository.findOne({
              where: {
                id: existingReading.id,
                observation: { id: observationId },
              },
            });
            if (!updatedReading) {
              throw new NotFoundException(
                `Reading with id ${existingReading.id} not found`,
              );
            }
            updatedReadings.push(updatedReading);
          }

          return updatedReadings;
        }),
    );
  }
}
