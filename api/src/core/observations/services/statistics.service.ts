import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObservationRepository } from '../repositories/obsavation.repository';
import { ReadingRepository } from '../repositories/reading.repository';
import { Reading, ReadingTypeEnum } from '../entities/reading.entity';
import { Observation } from '../entities/observation.entity';
import { ProtocolItem, ProtocolItemTypeEnum, ProtocolItemActionEnum } from '../entities/protocol.entity';
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

      // Check if category is continuous or discrete (one-shot)
      // Default to continuous if action is not specified (backward compatibility)
      const isContinuous = !category.action || category.action === ProtocolItemActionEnum.Continuous;

      // Calculate statistics for each observable
      const observableStats: ObservableStatisticsDto[] = observables.map(
      (observable) => {
        if (isContinuous) {
          // For continuous categories: calculate duration based on when observable appears
          // and stays on until another observable of same category appears
          const durations = this.calculateContinuousObservableDurations(
            observable.name || '',
            observables.map((o) => o.name || ''),
            readings,
            pausePeriods,
            startReading.dateTime,
            stopReading.dateTime,
          );

          this.logger.debug(
            `Observable "${observable.name}": onDuration=${durations.onDuration}ms, onCount=${durations.onCount}`
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
        } else {
          // For discrete (one-shot) categories: only count occurrences, no duration
          const count = this.calculateDiscreteObservableCount(
            observable.name || '',
            readings,
          );

          return {
            observableId: observable.id,
            observableName: observable.name || '',
            onDuration: 0, // No duration for one-shot
            onPercentage: 0, // No percentage for one-shot
            onCount: count,
          };
        }
      },
    );

      // Calculate total category duration (sum of all observable durations)
      // This is used for information but NOT for calculating percentages
      // Percentages should be relative to total observation duration (totalDuration)
      const totalCategoryDuration = observableStats.reduce(
        (sum, obs) => sum + (obs.onDuration || 0),
        0,
      );

      this.logger.debug(
        `Total category duration: ${totalCategoryDuration}ms, ` +
        `Total observation duration: ${totalDuration}ms, ` +
        `Observable durations: [${observableStats.map((o) => o.onDuration).join(', ')}]`
      );

      // Keep percentages relative to total observation duration (already calculated above)
      // Do NOT recalculate relative to totalCategoryDuration
      const observableStatsWithCategoryPercentage = observableStats;

      this.logger.debug(
        `Category statistics calculated for observation ${observationId}, category ${categoryId}: ` +
        `observables: ${observableStatsWithCategoryPercentage.length}, ` +
        `total category duration: ${totalCategoryDuration}ms, pause duration: ${pauseDuration}ms`
      );

      const result: CategoryStatisticsDto = {
        categoryId: category.id,
        categoryName: category.name,
        observables: observableStatsWithCategoryPercentage,
        pauseDuration, // Add pause duration to response
        totalCategoryDuration, // Add total category duration to response
      };

      this.logger.debug(
        `Returning category statistics: categoryId=${result.categoryId}, ` +
        `categoryName=${result.categoryName}, ` +
        `observablesCount=${result.observables.length}, ` +
        `pauseDuration=${result.pauseDuration}, ` +
        `totalCategoryDuration=${result.totalCategoryDuration}`
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

    const readings = observation.readings.sort(
      (a, b) => a.dateTime.getTime() - b.dateTime.getTime(),
    );

    // Filter readings based on conditions
    // If no conditions, use the entire observation period
    let filteredPeriods: Array<{ start: Date; end: Date }> = [];
    if (request.conditionGroups.length === 0) {
      // No conditions: use entire observation period
      const startReading = readings.find((r) => r.type === ReadingTypeEnum.START);
      const stopReading = readings.find((r) => r.type === ReadingTypeEnum.STOP);
      if (startReading && stopReading) {
        filteredPeriods = [
          {
            start: startReading.dateTime,
            end: stopReading.dateTime,
          },
        ];
      }
    } else {
      filteredPeriods = this.applyConditions(
        readings,
        request.conditionGroups,
        request.groupOperator,
      );
    }

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
   * Calculate durations when an observable was "on" for CONTINUOUS categories
   * Rule: Observable is "on" from the moment it appears until another observable
   * of the same category appears. Exception: during pauses, all observables are "off"
   */
  private calculateContinuousObservableDurations(
    observableName: string,
    categoryObservableNames: string[],
    readings: Reading[],
    pausePeriods: Array<{ start: Date; end: Date }>,
    observationStart: Date,
    observationEnd: Date,
  ): { onDuration: number; onCount: number } {
    let onDuration = 0;
    let onCount = 0;
    let currentStart: Date | null = null;
    let currentObservable: string | null = null;

    this.logger.debug(
      `Calculating continuous durations for observable "${observableName}" in category with observables: [${categoryObservableNames.join(', ')}]`
    );

    // Filter readings to only include DATA readings for observables in this category
    const relevantReadings = readings
      .filter(
        (r) =>
          r.type === ReadingTypeEnum.DATA &&
          categoryObservableNames.includes(r.name || ''),
      )
      .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

    this.logger.debug(
      `Found ${relevantReadings.length} relevant readings for category. ` +
      `Total readings: ${readings.length}, ` +
      `DATA readings: ${readings.filter((r) => r.type === ReadingTypeEnum.DATA).length}, ` +
      `Category observable names: [${categoryObservableNames.join(', ')}]`
    );

    // Process readings chronologically
    for (const reading of relevantReadings) {
      const readingTime = reading.dateTime;
      const readingName = reading.name || '';

      // If we were tracking THIS observable, end its period
      if (currentStart && currentObservable === observableName) {
        const periodDuration = readingTime.getTime() - currentStart.getTime();
        
        // Only calculate pause overlap if period duration is positive
        let pauseOverlap = 0;
        if (periodDuration > 0) {
          pauseOverlap = this.calculatePauseOverlap(
            currentStart,
            readingTime,
            pausePeriods,
          );
        }
        
        const effectiveDuration = Math.max(0, periodDuration - pauseOverlap);
        onDuration += effectiveDuration;
        
        this.logger.debug(
          `Ending period for "${observableName}": ` +
          `currentStart=${currentStart.toISOString()}, readingTime=${readingTime.toISOString()}, ` +
          `periodDuration=${periodDuration}ms, pauseOverlap=${pauseOverlap}ms, ` +
          `effectiveDuration=${effectiveDuration}ms, total onDuration=${onDuration}ms`
        );
        
        currentStart = null;
        currentObservable = null;
      }

      // If this reading is for our observable, start tracking it
      if (readingName === observableName) {
        currentStart = readingTime;
        currentObservable = readingName;
        onCount++;
        this.logger.debug(
          `Starting period for "${observableName}" at ${readingTime.toISOString()}. Total onCount: ${onCount}`
        );
      } else if (currentStart && currentObservable === observableName) {
        // Another observable in the same category appeared, end our period
        const periodDuration = readingTime.getTime() - currentStart.getTime();
        
        let pauseOverlap = 0;
        if (periodDuration > 0) {
          pauseOverlap = this.calculatePauseOverlap(
            currentStart,
            readingTime,
            pausePeriods,
          );
        }
        
        const effectiveDuration = Math.max(0, periodDuration - pauseOverlap);
        onDuration += effectiveDuration;
        
        this.logger.debug(
          `Ending period for "${observableName}" (replaced by "${readingName}"): ` +
          `currentStart=${currentStart.toISOString()}, readingTime=${readingTime.toISOString()}, ` +
          `periodDuration=${periodDuration}ms, pauseOverlap=${pauseOverlap}ms, ` +
          `effectiveDuration=${effectiveDuration}ms, total onDuration=${onDuration}ms`
        );
        
        currentStart = null;
        currentObservable = null;
      }
    }

    // Handle case where observable is still "on" at the end
    if (currentStart && currentObservable === observableName) {
      const periodDuration = observationEnd.getTime() - currentStart.getTime();
      const pauseOverlap = this.calculatePauseOverlap(
        currentStart,
        observationEnd,
        pausePeriods,
      );
      const effectiveDuration = Math.max(0, periodDuration - pauseOverlap);
      onDuration += effectiveDuration;
      
      this.logger.debug(
        `Ending final period for "${observableName}": ` +
        `periodDuration=${periodDuration}ms, pauseOverlap=${pauseOverlap}ms, ` +
        `effectiveDuration=${effectiveDuration}ms`
      );
    }

    this.logger.debug(
      `Observable "${observableName}": onDuration=${onDuration}ms, onCount=${onCount}`
    );

    return { onDuration, onCount };
  }

  /**
   * Calculate count of occurrences for DISCRETE (one-shot) categories
   * Rule: Only count occurrences, no duration calculation
   */
  private calculateDiscreteObservableCount(
    observableName: string,
    readings: Reading[],
  ): number {
    return readings.filter(
      (r) =>
        r.type === ReadingTypeEnum.DATA && r.name === observableName,
    ).length;
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

    // Get observation start and end times
    const startReading = readings.find((r) => r.type === ReadingTypeEnum.START);
    const stopReading = readings.find((r) => r.type === ReadingTypeEnum.STOP);

    if (!startReading || !stopReading) {
      return categories.map((category) => ({
        categoryId: category.id,
        categoryName: category.name || '',
        activeObservablesCount: 0,
        totalDuration: 0,
      }));
    }

    return categories.map((category) => {
      const observables = category.children || [];
      let totalCategoryDuration = 0;
      let activeObservablesCount = 0;

      // Check if category is continuous (only continuous categories have duration)
      const isContinuous = !category.action || category.action === ProtocolItemActionEnum.Continuous;

      for (const observable of observables) {
        if (isContinuous) {
          // For continuous categories: calculate duration
          const durations = this.calculateContinuousObservableDurations(
            observable.name || '',
            observables.map((o) => o.name || ''),
            readings,
            pausePeriods,
            startReading.dateTime,
            stopReading.dateTime,
          );

          if (durations.onDuration > 0) {
            totalCategoryDuration += durations.onDuration;
            activeObservablesCount++;
          }
        } else {
          // For discrete categories: only count occurrences
          const count = this.calculateDiscreteObservableCount(
            observable.name || '',
            readings,
          );

          if (count > 0) {
            activeObservablesCount++;
          }
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
    // We need to find which category each observable belongs to
    // For now, we'll pass an empty array to findObservablePeriods, which means it will use all readings
    // This is acceptable because we're looking for when ANY observable is on, regardless of category
    const observablePeriods = group.observables.map((condition) => {
      return this.findObservablePeriods(
        readings,
        condition.observableName,
        condition.state,
        [], // Empty array means use all readings (we don't know the category here)
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
   * For continuous categories: observable is "on" from when it appears until another observable of the same category appears
   * 
   * @param readings - All readings from the observation
   * @param observableName - Name of the observable to find periods for
   * @param state - State to find (ON or OFF)
   * @param categoryObservableNames - Names of all observables in the same category (to know when our observable stops)
   */
  private findObservablePeriods(
    readings: Reading[],
    observableName: string,
    state: ObservableStateEnum,
    categoryObservableNames: string[] = [],
  ): Array<{ start: Date; end: Date }> {
    const periods: Array<{ start: Date; end: Date }> = [];
    
    if (state === ObservableStateEnum.OFF) {
      // For OFF state, we would need to find periods where observable is not on
      // This is more complex and not currently needed
      return [];
    }

    // Filter readings to only include DATA readings for observables in this category
    const relevantReadings = readings
      .filter(
        (r) =>
          r.type === ReadingTypeEnum.DATA &&
          (categoryObservableNames.length === 0 || categoryObservableNames.includes(r.name || '')),
      )
      .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

    let currentStart: Date | null = null;
    let currentObservable: string | null = null;

    for (const reading of relevantReadings) {
      const readingTime = reading.dateTime;
      const readingName = reading.name || '';

      // If we were tracking our observable, end its period when another reading appears
      if (currentStart && currentObservable === observableName) {
        periods.push({
          start: currentStart,
          end: readingTime,
        });
        currentStart = null;
        currentObservable = null;
      }

      // Start tracking this observable if it's the one we're looking for
      if (readingName === observableName) {
        currentStart = readingTime;
        currentObservable = readingName;
      }
    }

    // Handle case where observable is still "on" at the end
    // We need to find the observation end time
    const stopReading = readings.find((r) => r.type === ReadingTypeEnum.STOP);
    if (currentStart && currentObservable === observableName && stopReading) {
      periods.push({
        start: currentStart,
        end: stopReading.dateTime,
      });
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

    // Get all observable names in this category for filtering
    const categoryObservableNames = observables.map((obs) => obs.name || '').filter(Boolean);

    // Calculate statistics for each observable within filtered periods
    const observableStats: ObservableStatisticsDto[] = observables.map(
      (observable) => {
        // Find observable periods within filtered periods
        // Pass categoryObservableNames so we only consider readings from this category
        const observablePeriods = this.findObservablePeriods(
          readings,
          observable.name || '',
          ObservableStateEnum.ON,
          categoryObservableNames,
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
          onPercentage: 0, // Will be recalculated below relative to totalCategoryDuration
          onCount: filteredObservablePeriods.length,
        };
      },
    );

    // Calculate total category duration (sum of all observable durations)
    const totalCategoryDuration = observableStats.reduce(
      (sum, obs) => sum + (obs.onDuration || 0),
      0,
    );

    // Recalculate percentages within the category (not relative to total filtered duration)
    const observableStatsWithCategoryPercentage = observableStats.map((obs) => ({
      ...obs,
      onPercentage:
        totalCategoryDuration > 0
          ? (obs.onDuration / totalCategoryDuration) * 100
          : 0,
    }));

    return {
      categoryId: category.id,
      categoryName: category.name || '',
      observables: observableStatsWithCategoryPercentage,
      pauseDuration: pausePeriods.reduce(
        (sum, pause) => sum + (pause.end.getTime() - pause.start.getTime()),
        0,
      ),
      totalCategoryDuration,
    };
  }
}

