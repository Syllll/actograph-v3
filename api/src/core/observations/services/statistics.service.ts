import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObservationRepository } from '../repositories/obsavation.repository';
import { ReadingRepository } from '../repositories/reading.repository';
import { Reading, ReadingTypeEnum } from '../entities/reading.entity';
import { Observation } from '../entities/observation.entity';
import { ProtocolItem, ProtocolItemTypeEnum } from '../entities/protocol.entity';
import {
  GeneralStatisticsDto,
  CategoryStatisticsSummaryDto,
} from '../dtos/statistics-general.dto';
import {
  CategoryStatisticsDto,
  ObservableStatisticsDto,
} from '../dtos/statistics-category.dto';
import {
  ConditionalStatisticsRequestDto,
  ConditionalStatisticsDto,
  ObservableStateEnum,
  ConditionOperatorEnum,
} from '../dtos/statistics-conditional.dto';

interface ObservableDuration {
  observableName: string;
  observableId: string;
  onDuration: number;
  onCount: number;
  periods: Array<{ start: Date; end: Date }>;
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

    const readings = observation.readings.sort(
      (a, b) => a.dateTime.getTime() - b.dateTime.getTime(),
    );

    // Find START and STOP readings
    const startReading = readings.find((r) => r.type === ReadingTypeEnum.START);
    const stopReading = readings.find((r) => r.type === ReadingTypeEnum.STOP);

    if (!startReading || !stopReading) {
      this.logger.debug(`Observation ${observationId} missing START or STOP reading`);
      return {
        totalDuration: 0,
        totalReadings: readings.length,
        pauseCount: 0,
        pauseDuration: 0,
        observationDuration: 0,
        categories: [],
      };
    }

    const totalDuration =
      stopReading.dateTime.getTime() - startReading.dateTime.getTime();

    // Calculate pause duration
    const pausePeriods = this.calculatePausePeriods(readings);
    const pauseDuration = pausePeriods.reduce(
      (sum, period) => sum + (period.end.getTime() - period.start.getTime()),
      0,
    );
    const pauseCount = pausePeriods.length;
    const observationDuration = totalDuration - pauseDuration;

    // Calculate category statistics
    const categories = await this.calculateCategorySummaries(
      observation,
      observationDuration,
    );

    this.logger.debug(
      `General statistics calculated for observation ${observationId}: ` +
      `duration=${observationDuration}ms, readings=${readings.length}, pauses=${pauseCount}, categories=${categories.length}`
    );

    return {
      totalDuration,
      totalReadings: readings.length,
      pauseCount,
      pauseDuration,
      observationDuration,
      categories,
    };
  }

  /**
   * Get statistics for a specific category
   */
  async getCategoryStatistics(
    observationId: number,
    categoryId: string,
  ): Promise<CategoryStatisticsDto> {
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

    const observables = category.children || [];
    const readings = observation.readings.sort(
      (a, b) => a.dateTime.getTime() - b.dateTime.getTime(),
    );

    // Calculate total observation duration (minus pauses)
    const startReading = readings.find((r) => r.type === ReadingTypeEnum.START);
    const stopReading = readings.find((r) => r.type === ReadingTypeEnum.STOP);

    if (!startReading || !stopReading) {
      return {
        categoryId: category.id,
        categoryName: category.name,
        observables: [],
      };
    }

    const pausePeriods = this.calculatePausePeriods(readings);
    const pauseDuration = pausePeriods.reduce(
      (sum, period) => sum + (period.end.getTime() - period.start.getTime()),
      0,
    );
    const totalDuration =
      stopReading.dateTime.getTime() -
      startReading.dateTime.getTime() -
      pauseDuration;

    // Calculate statistics for each observable
    const observableStats: ObservableStatisticsDto[] = observables.map(
      (observable) => {
        const durations = this.calculateObservableDurations(
          observable.name || '',
          readings,
          pausePeriods,
        );

        return {
          observableId: observable.id,
          observableName: observable.name || '',
          onDuration: durations.onDuration,
          onPercentage:
            totalDuration > 0
              ? (durations.onDuration / totalDuration) * 100
              : 0,
          onCount: durations.onCount,
        };
      },
    );

    this.logger.debug(
      `Category statistics calculated for observation ${observationId}, category ${categoryId}: ` +
      `observables: ${observableStats.length}`
    );

    return {
      categoryId: category.id,
      categoryName: category.name,
      observables: observableStats,
    };
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

    const readings = observation.readings.sort(
      (a, b) => a.dateTime.getTime() - b.dateTime.getTime(),
    );

    // Filter readings based on conditions
    const filteredPeriods = this.applyConditions(
      readings,
      request.conditionGroups,
      request.groupOperator,
    );

    // Calculate statistics for target category within filtered periods
    const targetCategoryStats = await this.calculateCategoryStatisticsForPeriods(
      observation,
      request.targetCategoryId,
      filteredPeriods,
    );

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

  /**
   * Calculate pause periods from readings
   */
  private calculatePausePeriods(
    readings: Reading[],
  ): Array<{ start: Date; end: Date }> {
    const pausePeriods: Array<{ start: Date; end: Date }> = [];
    let pauseStart: Reading | null = null;

    for (const reading of readings) {
      if (reading.type === ReadingTypeEnum.PAUSE_START) {
        pauseStart = reading;
      } else if (
        reading.type === ReadingTypeEnum.PAUSE_END &&
        pauseStart
      ) {
        pausePeriods.push({
          start: pauseStart.dateTime,
          end: reading.dateTime,
        });
        pauseStart = null;
      }
    }

    return pausePeriods;
  }

  /**
   * Calculate durations when an observable was "on"
   */
  private calculateObservableDurations(
    observableName: string,
    readings: Reading[],
    pausePeriods: Array<{ start: Date; end: Date }>,
  ): { onDuration: number; onCount: number } {
    let onDuration = 0;
    let onCount = 0;
    let currentStart: Reading | null = null;

    for (const reading of readings) {
      if (
        reading.name === observableName &&
        reading.type === ReadingTypeEnum.START
      ) {
        currentStart = reading;
        onCount++;
      } else if (
        reading.name === observableName &&
        reading.type === ReadingTypeEnum.STOP &&
        currentStart
      ) {
        const periodDuration =
          reading.dateTime.getTime() - currentStart.dateTime.getTime();

        // Subtract pause duration from this period
        const pauseOverlap = this.calculatePauseOverlap(
          currentStart.dateTime,
          reading.dateTime,
          pausePeriods,
        );

        onDuration += periodDuration - pauseOverlap;
        currentStart = null;
      }
    }

    return { onDuration, onCount };
  }

  /**
   * Calculate pause overlap with a time period
   */
  private calculatePauseOverlap(
    start: Date,
    end: Date,
    pausePeriods: Array<{ start: Date; end: Date }>,
  ): number {
    let overlap = 0;

    for (const pause of pausePeriods) {
      const overlapStart = new Date(
        Math.max(start.getTime(), pause.start.getTime()),
      );
      const overlapEnd = new Date(
        Math.min(end.getTime(), pause.end.getTime()),
      );

      if (overlapStart < overlapEnd) {
        overlap += overlapEnd.getTime() - overlapStart.getTime();
      }
    }

    return overlap;
  }

  /**
   * Calculate category summaries for general statistics
   */
  private async calculateCategorySummaries(
    observation: Observation,
    totalDuration: number,
  ): Promise<CategoryStatisticsSummaryDto[]> {
    if (!observation.protocol) {
      return [];
    }

    const protocolItems: ProtocolItem[] = JSON.parse(observation.protocol.items);
    const categories = protocolItems.filter(
      (item) => item.type === ProtocolItemTypeEnum.Category,
    );

    const readings = observation.readings || [];
    const pausePeriods = this.calculatePausePeriods(readings);

    return categories.map((category) => {
      const observables = category.children || [];
      let totalCategoryDuration = 0;
      let activeObservablesCount = 0;

      for (const observable of observables) {
        const durations = this.calculateObservableDurations(
          observable.name || '',
          readings,
          pausePeriods,
        );

        if (durations.onDuration > 0) {
          totalCategoryDuration += durations.onDuration;
          activeObservablesCount++;
        }
      }

      return {
        categoryId: category.id,
        categoryName: category.name || '',
        activeObservablesCount,
        totalDuration: totalCategoryDuration,
      };
    });
  }

  /**
   * Apply conditions to filter readings periods
   */
  private applyConditions(
    readings: Reading[],
    conditionGroups: ConditionalStatisticsRequestDto['conditionGroups'],
    groupOperator: ConditionOperatorEnum,
  ): Array<{ start: Date; end: Date }> {
    // For each group, find periods where conditions are met
    const groupPeriods = conditionGroups.map((group) => {
      return this.applyConditionGroup(readings, group);
    });

    // Combine groups based on operator
    if (groupOperator === ConditionOperatorEnum.AND) {
      return this.intersectPeriods(groupPeriods);
    } else {
      return this.unionPeriods(groupPeriods);
    }
  }

  /**
   * Apply a single condition group
   */
  private applyConditionGroup(
    readings: Reading[],
    group: ConditionalStatisticsRequestDto['conditionGroups'][0],
  ): Array<{ start: Date; end: Date }> {
    // Find periods for each observable condition
    const observablePeriods = group.observables.map((condition) => {
      return this.findObservablePeriods(
        readings,
        condition.observableName,
        condition.state,
      );
    });

    // Combine observable periods based on group operator
    let combinedPeriods: Array<{ start: Date; end: Date }> = [];
    if (group.operator === ConditionOperatorEnum.AND) {
      combinedPeriods = this.intersectPeriods(observablePeriods);
    } else {
      combinedPeriods = this.unionPeriods(observablePeriods);
    }

    // Apply time range filter if specified
    if (group.timeRange) {
      combinedPeriods = this.filterByTimeRange(
        combinedPeriods,
        group.timeRange.startTime,
        group.timeRange.endTime,
      );
    }

    return combinedPeriods;
  }

  /**
   * Find periods where an observable was in a specific state
   */
  private findObservablePeriods(
    readings: Reading[],
    observableName: string,
    state: ObservableStateEnum,
  ): Array<{ start: Date; end: Date }> {
    const periods: Array<{ start: Date; end: Date }> = [];
    let currentStart: Reading | null = null;

    for (const reading of readings) {
      if (
        reading.name === observableName &&
        reading.type === ReadingTypeEnum.START &&
        state === ObservableStateEnum.ON
      ) {
        currentStart = reading;
      } else if (
        reading.name === observableName &&
        reading.type === ReadingTypeEnum.STOP &&
        currentStart &&
        state === ObservableStateEnum.ON
      ) {
        periods.push({
          start: currentStart.dateTime,
          end: reading.dateTime,
        });
        currentStart = null;
      }
    }

    return periods;
  }

  /**
   * Intersect multiple period arrays (AND logic)
   */
  private intersectPeriods(
    periodArrays: Array<Array<{ start: Date; end: Date }>>,
  ): Array<{ start: Date; end: Date }> {
    if (periodArrays.length === 0) {
      return [];
    }

    if (periodArrays.length === 1) {
      return periodArrays[0];
    }

    let result = periodArrays[0];

    for (let i = 1; i < periodArrays.length; i++) {
      const newResult: Array<{ start: Date; end: Date }> = [];

      for (const period1 of result) {
        for (const period2 of periodArrays[i]) {
          const intersection = this.intersectTwoPeriods(period1, period2);
          if (intersection) {
            newResult.push(intersection);
          }
        }
      }

      result = newResult;
    }

    return result;
  }

  /**
   * Union multiple period arrays (OR logic)
   */
  private unionPeriods(
    periodArrays: Array<Array<{ start: Date; end: Date }>>,
  ): Array<{ start: Date; end: Date }> {
    const allPeriods = periodArrays.flat();
    if (allPeriods.length === 0) {
      return [];
    }

    // Sort by start time
    allPeriods.sort((a, b) => a.start.getTime() - b.start.getTime());

    // Merge overlapping periods
    const merged: Array<{ start: Date; end: Date }> = [allPeriods[0]];

    for (let i = 1; i < allPeriods.length; i++) {
      const current = allPeriods[i];
      const last = merged[merged.length - 1];

      if (current.start <= last.end) {
        // Overlapping or adjacent, merge
        last.end = new Date(Math.max(last.end.getTime(), current.end.getTime()));
      } else {
        // Non-overlapping, add as new period
        merged.push(current);
      }
    }

    return merged;
  }

  /**
   * Intersect two periods
   */
  private intersectTwoPeriods(
    period1: { start: Date; end: Date },
    period2: { start: Date; end: Date },
  ): { start: Date; end: Date } | null {
    const start = new Date(
      Math.max(period1.start.getTime(), period2.start.getTime()),
    );
    const end = new Date(
      Math.min(period1.end.getTime(), period2.end.getTime()),
    );

    if (start < end) {
      return { start, end };
    }

    return null;
  }

  /**
   * Filter periods by time range
   */
  private filterByTimeRange(
    periods: Array<{ start: Date; end: Date }>,
    startTime?: Date,
    endTime?: Date,
  ): Array<{ start: Date; end: Date }> {
    return periods
      .map((period) => {
        const filteredStart = startTime
          ? new Date(Math.max(period.start.getTime(), startTime.getTime()))
          : period.start;
        const filteredEnd = endTime
          ? new Date(Math.min(period.end.getTime(), endTime.getTime()))
          : period.end;

        if (filteredStart < filteredEnd) {
          return { start: filteredStart, end: filteredEnd };
        }

        return null;
      })
      .filter(
        (period): period is { start: Date; end: Date } => period !== null,
      );
  }

  /**
   * Calculate category statistics for specific time periods
   */
  private async calculateCategoryStatisticsForPeriods(
    observation: Observation,
    categoryId: string,
    periods: Array<{ start: Date; end: Date }>,
  ): Promise<CategoryStatisticsDto> {
    if (!observation.protocol) {
      throw new NotFoundException('Protocol not found');
    }

    const protocolItems: ProtocolItem[] = JSON.parse(observation.protocol.items);
    const category = protocolItems.find(
      (item) => item.id === categoryId && item.type === ProtocolItemTypeEnum.Category,
    );

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const observables = category.children || [];
    const readings = observation.readings || [];
    const pausePeriods = this.calculatePausePeriods(readings);

    // Calculate total duration of filtered periods (minus pauses)
    const totalDuration = periods.reduce((sum, period) => {
      const pauseOverlap = this.calculatePauseOverlap(
        period.start,
        period.end,
        pausePeriods,
      );
      return sum + (period.end.getTime() - period.start.getTime()) - pauseOverlap;
    }, 0);

    // Calculate statistics for each observable within filtered periods
    const observableStats: ObservableStatisticsDto[] = observables.map(
      (observable) => {
        // Find observable periods within filtered periods
        const observablePeriods = this.findObservablePeriods(
          readings,
          observable.name || '',
          ObservableStateEnum.ON,
        );

        // Intersect with filtered periods
        const filteredObservablePeriods = this.intersectPeriods([
          observablePeriods,
          periods,
        ]);

        // Calculate duration (minus pauses)
        const onDuration = filteredObservablePeriods.reduce((sum, period) => {
          const pauseOverlap = this.calculatePauseOverlap(
            period.start,
            period.end,
            pausePeriods,
          );
          return (
            sum +
            (period.end.getTime() - period.start.getTime()) -
            pauseOverlap
          );
        }, 0);

        return {
          observableId: observable.id,
          observableName: observable.name || '',
          onDuration,
          onPercentage: totalDuration > 0 ? (onDuration / totalDuration) * 100 : 0,
          onCount: filteredObservablePeriods.length,
        };
      },
    );

    return {
      categoryId: category.id,
      categoryName: category.name || '',
      observables: observableStats,
    };
  }
}

