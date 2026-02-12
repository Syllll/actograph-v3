import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObservationRepository } from '../repositories/obsavation.repository';
import { ReadingRepository } from '../repositories/reading.repository';
import { ProtocolItem } from '../entities/protocol.entity';
import type { IReading } from '@actograph/core';
import {
  ReadingTypeEnum,
  ProtocolItemTypeEnum,
  calculateGeneralStatistics,
  calculateCategoryStatistics,
  calculateConditionalStatistics,
} from '@actograph/core';
import { GeneralStatisticsDto } from '../dtos/statistics-general.dto';
import { CategoryStatisticsDto } from '../dtos/statistics-category.dto';
import {
  ConditionalStatisticsRequestDto,
  ConditionalStatisticsDto,
} from '../dtos/statistics-conditional.dto';

/**
 * Normalize readings for video mode: clamp DATA reading timestamps to observation bounds.
 * Video timestamps can be outside [START, STOP] (e.g. negative -2ms bug), causing wrong totals.
 * Returns { normalizedReadings, observationStart, observationEnd } or null if no valid bounds.
 */
function normalizeReadingsForStatistics(
  readings: IReading[],
): {
  normalizedReadings: IReading[];
  observationStart: Date;
  observationEnd: Date;
} | null {
  const sortedReadings = [...readings].sort(
    (a, b) => a.dateTime.getTime() - b.dateTime.getTime(),
  );
  const startReadings = sortedReadings.filter(
    (r) => r.type === ReadingTypeEnum.START,
  );
  const stopReadings = sortedReadings.filter(
    (r) => r.type === ReadingTypeEnum.STOP,
  );
  if (startReadings.length === 0 || stopReadings.length === 0) {
    return null;
  }
  const observationStart = new Date(
    Math.min(...startReadings.map((r) => r.dateTime.getTime())),
  );
  const observationEnd = new Date(
    Math.max(...stopReadings.map((r) => r.dateTime.getTime())),
  );
  const startT = observationStart.getTime();
  const endT = observationEnd.getTime();
  const normalizedReadings = sortedReadings.map((r) => {
    if (r.type !== ReadingTypeEnum.DATA) {
      return r;
    }
    const t = r.dateTime.getTime();
    if (t < startT || t > endT) {
      return { ...r, dateTime: new Date(Math.max(startT, Math.min(endT, t))) };
    }
    return r;
  });
  return {
    normalizedReadings,
    observationStart,
    observationEnd,
  };
}

@Injectable()
export class StatisticsService {
  private readonly logger = new Logger(StatisticsService.name);

  constructor(
    @InjectRepository(ObservationRepository)
    private readonly observationRepository: ObservationRepository,
    @InjectRepository(ReadingRepository)
    private readonly readingRepository: ReadingRepository,
  ) {}

  /**
   * Get general statistics for an observation
   */
  async getGeneralStatistics(
    observationId: number,
  ): Promise<GeneralStatisticsDto> {
    this.logger.debug(`Calculating general statistics for observation ${observationId}`);
    
    const observation = await this.observationRepository.findOneFromId(observationId, {
      relations: ['readings', 'protocol'],
    });

    if (!observation) {
      this.logger.warn(`Observation ${observationId} not found`);
      throw new NotFoundException('Observation not found');
    }
    
    this.logger.debug(`Found observation ${observationId} with ${observation.readings?.length || 0} readings`);

    if (!observation.readings || observation.readings.length === 0) {
      this.logger.debug(`Observation ${observationId} has no readings, returning empty statistics`);
      return {
        totalDuration: 0,
        totalReadings: 0,
        pauseCount: 0,
        pauseDuration: 0,
        observationDuration: 0,
        categories: [],
      };
    }

    // Parse protocol items
    const protocolItems: ProtocolItem[] = observation.protocol
      ? JSON.parse(observation.protocol.items)
      : [];

    // Normalize readings for video mode (clamp DATA timestamps to observation bounds)
    const normalized = normalizeReadingsForStatistics(observation.readings);
    const readingsToUse = normalized?.normalizedReadings ?? observation.readings;

    // Use core function to calculate statistics
    const stats = calculateGeneralStatistics(readingsToUse, protocolItems);

    this.logger.debug(
      `General statistics calculated for observation ${observationId}: ` +
      `duration=${stats.observationDuration}ms, readings=${stats.totalReadings}, pauses=${stats.pauseCount}, categories=${stats.categories.length}`
    );

    return stats;
  }

  /**
   * Get statistics for a specific category
   */
  async getCategoryStatistics(
    observationId: number,
    categoryId: string,
  ): Promise<CategoryStatisticsDto> {
    try {
      this.logger.debug(`Calculating category statistics for observation ${observationId}, category ${categoryId}`);
      
      const observation = await this.observationRepository.findOneFromId(observationId, {
        relations: ['readings', 'protocol'],
      });

      if (!observation) {
        this.logger.warn(`Observation ${observationId} not found`);
        throw new NotFoundException('Observation not found');
      }

      if (!observation.protocol || !observation.readings) {
        this.logger.warn(`Observation ${observationId} missing protocol or readings`);
        throw new NotFoundException('Protocol or readings not found');
      }

      const protocolItems: ProtocolItem[] = JSON.parse(observation.protocol.items);
      const category = protocolItems.find(
        (item) => item.id === categoryId && item.type === ProtocolItemTypeEnum.Category,
      );

      if (!category) {
        this.logger.warn(`Category ${categoryId} not found in observation ${observationId}`);
        throw new NotFoundException('Category not found');
      }
      
      this.logger.debug(`Found category "${category.name}" with ${category.children?.length || 0} observables`);

      // Normalize readings for video mode (clamp DATA timestamps, use min START / max STOP)
      const normalized = normalizeReadingsForStatistics(observation.readings);
      if (!normalized) {
        return {
          categoryId: category.id,
          categoryName: category.name,
          observables: [],
        };
      }

      const { normalizedReadings, observationStart, observationEnd } =
        normalized;

      // Use core function to calculate category statistics
      const result = calculateCategoryStatistics(
        category,
        normalizedReadings,
        observationStart,
        observationEnd,
      );

      this.logger.debug(
        `Category statistics calculated for observation ${observationId}, category ${categoryId}: ` +
        `observables: ${result.observables.length}, ` +
        `total category duration: ${result.totalCategoryDuration}ms, pause duration: ${result.pauseDuration}ms`
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Error calculating category statistics for observation ${observationId}, category ${categoryId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Get conditional statistics
   */
  async getConditionalStatistics(
    observationId: number,
    request: ConditionalStatisticsRequestDto,
  ): Promise<ConditionalStatisticsDto> {
    this.logger.debug(
      `Calculating conditional statistics for observation ${observationId}, ` +
      `target category: ${request.targetCategoryId}, ` +
      `condition groups: ${request.conditionGroups.length}, ` +
      `group operator: ${request.groupOperator}`
    );
    
    const observation = await this.observationRepository.findOneFromId(observationId, {
      relations: ['readings', 'protocol'],
    });

    if (!observation) {
      this.logger.warn(`Observation ${observationId} not found`);
      throw new NotFoundException('Observation not found');
    }

    if (!observation.protocol || !observation.readings) {
      this.logger.warn(`Observation ${observationId} missing protocol or readings`);
      throw new NotFoundException('Protocol or readings not found');
    }

    const protocolItems: ProtocolItem[] = JSON.parse(observation.protocol.items);

    // Normalize readings for video mode (clamp DATA timestamps to observation bounds)
    const normalized = normalizeReadingsForStatistics(observation.readings);
    const readingsToUse = normalized?.normalizedReadings ?? observation.readings;

    // Use core function to calculate conditional statistics
    const { categoryStatistics: targetCategoryStats, filteredPeriods } = calculateConditionalStatistics(
      readingsToUse,
      protocolItems,
      request,
    );

    // Calculate filtered duration from the filtered periods
    const filteredDuration = filteredPeriods.reduce(
      (sum, period) => sum + (period.end.getTime() - period.start.getTime()),
      0,
    );

    this.logger.debug(
      `Conditional statistics calculated for observation ${observationId}: ` +
      `filtered periods: ${filteredPeriods.length}, filtered duration: ${filteredDuration}ms, ` +
      `target category observables: ${targetCategoryStats.observables.length}`
    );

    return {
      conditions: request.conditionGroups,
      targetCategory: targetCategoryStats,
      filteredDuration,
    };
  }
}

