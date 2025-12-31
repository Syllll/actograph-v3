import { IReading } from '../types';
import { ReadingTypeEnum } from '../enums';

/**
 * Action type for auto-correction
 */
export type AutoCorrectActionType = 'sort' | 'remove_duplicate' | 'reorder' | 'add_missing_pause';

/**
 * Action to be performed during auto-correction
 */
export interface IAutoCorrectAction {
  type: AutoCorrectActionType;
  description: string;
  readingIds?: number[];
  tempIds?: string[];
  newReading?: Partial<IReading>;
  stopReadingId?: number;
  stopReadingTempId?: string;
  newStopDateTime?: Date;
}

/**
 * Result of auto-correction analysis
 */
export interface IAutoCorrectResult {
  actions: IAutoCorrectAction[];
  correctedReadings: IReading[];
}

/**
 * Auto-correct readings (pure function - baguette magique)
 * 
 * This function analyzes readings and returns actions to correct them:
 * - Sorts readings chronologically
 * - Removes duplicate START and STOP readings (keep first START, last STOP)
 * - Ensures START is first and STOP is last
 * - Pairs PAUSE_START/PAUSE_END correctly
 * - Adds missing pause readings
 * - Repositions STOP to be after the last reading
 * 
 * @param readings - Array of readings to correct
 * @param applyCorrections - If true, returns corrected readings. If false, only returns actions.
 * @returns Object containing actions and corrected readings (if applyCorrections is true)
 */
export function autoCorrectReadings(
  readings: IReading[],
  applyCorrections = false
): IAutoCorrectResult {
  const actions: IAutoCorrectAction[] = [];
  const correctedReadings: IReading[] = [];

  // 1. Sort readings chronologically
  const sortedReadings = [...readings].sort((a, b) => {
    const dateA = a.dateTime instanceof Date ? a.dateTime : new Date(a.dateTime);
    const dateB = b.dateTime instanceof Date ? b.dateTime : new Date(b.dateTime);
    return dateA.getTime() - dateB.getTime();
  });

  // Check if sorting is needed
  const needsSorting = sortedReadings.some((reading, index) => {
    const originalIndex = readings.findIndex(r => 
      (r.id && reading.id && r.id === reading.id) ||
      (r.tempId && reading.tempId && r.tempId === reading.tempId)
    );
    return originalIndex !== index;
  });

  if (needsSorting) {
    actions.push({
      type: 'sort',
      description: 'Trier les relevés par ordre chronologique croissant',
    });
  }

  // 2. Remove duplicates for START and STOP (should only have 2 total)
  const startReadings = sortedReadings.filter(r => r.type === ReadingTypeEnum.START);
  const stopReadings = sortedReadings.filter(r => r.type === ReadingTypeEnum.STOP);

  // Keep only the first START and the last STOP
  if (startReadings.length > 1) {
    const toRemove = startReadings.slice(1); // Keep first, remove others
    const toRemoveIds = toRemove.map(r => r.id).filter((id): id is number => !!id);
    const toRemoveTempIds = toRemove.map(r => r.tempId).filter((id): id is string => !!id);
    
    actions.push({
      type: 'remove_duplicate',
      description: `Supprimer ${toRemove.length} doublon(s) de relevé "Début" (garder le premier)`,
      readingIds: toRemoveIds.length > 0 ? toRemoveIds : undefined,
      tempIds: toRemoveTempIds.length > 0 ? toRemoveTempIds : undefined,
    });
  }

  if (stopReadings.length > 1) {
    const toRemove = stopReadings.slice(0, -1); // Keep last, remove others
    const toRemoveIds = toRemove.map(r => r.id).filter((id): id is number => !!id);
    const toRemoveTempIds = toRemove.map(r => r.tempId).filter((id): id is string => !!id);
    
    actions.push({
      type: 'remove_duplicate',
      description: `Supprimer ${toRemove.length} doublon(s) de relevé "Fin" (garder le dernier)`,
      readingIds: toRemoveIds.length > 0 ? toRemoveIds : undefined,
      tempIds: toRemoveTempIds.length > 0 ? toRemoveTempIds : undefined,
    });
  }

  // 3. Place START at the beginning and STOP at the end with intelligent timestamping
  const hasStart = sortedReadings.some(r => r.type === ReadingTypeEnum.START);
  const hasStop = sortedReadings.some(r => r.type === ReadingTypeEnum.STOP);
  const firstReading = sortedReadings[0];
  const lastReading = sortedReadings[sortedReadings.length - 1];

  if (hasStart && firstReading && firstReading.type !== ReadingTypeEnum.START) {
    actions.push({
      type: 'reorder',
      description: 'Déplacer le relevé "Début" au début de la liste',
    });
  }

  // Intelligent STOP reading management
  if (hasStop) {
    const allStopReadings = sortedReadings.filter(r => r.type === ReadingTypeEnum.STOP);
    const nonStopReadings = sortedReadings.filter(r => r.type !== ReadingTypeEnum.STOP);
    const latestNonStopReading = nonStopReadings.length > 0 
      ? nonStopReadings[nonStopReadings.length - 1]
      : null;
    
    const latestStopReading = allStopReadings.reduce((latest, current) => {
      const latestDate = latest.dateTime instanceof Date ? latest.dateTime : new Date(latest.dateTime);
      const currentDate = current.dateTime instanceof Date ? current.dateTime : new Date(current.dateTime);
      return currentDate.getTime() > latestDate.getTime() ? current : latest;
    }, allStopReadings[0]);
    
    // Check if STOP is after the latest reading
    if (latestNonStopReading) {
      const stopDate = latestStopReading.dateTime instanceof Date 
        ? latestStopReading.dateTime 
        : new Date(latestStopReading.dateTime);
      const latestNonStopDate = latestNonStopReading.dateTime instanceof Date 
        ? latestNonStopReading.dateTime 
        : new Date(latestNonStopReading.dateTime);
      
      // If STOP is not after the latest reading, reposition it
      if (stopDate.getTime() <= latestNonStopDate.getTime()) {
        const newStopDate = new Date(latestNonStopDate.getTime() + 1);
        
        actions.push({
          type: 'reorder',
          description: `Repositionner le relevé "Fin" après le dernier relevé (${newStopDate.toLocaleString()})`,
          stopReadingId: latestStopReading.id,
          stopReadingTempId: latestStopReading.tempId || undefined,
          newStopDateTime: newStopDate,
        });
      }
    }
  } else {
    // No STOP reading, create one after the last reading
    if (sortedReadings.length > 0 && lastReading) {
      const lastReadingDate = lastReading.dateTime instanceof Date 
        ? lastReading.dateTime 
        : new Date(lastReading.dateTime);
      const newStopDate = new Date(lastReadingDate.getTime() + 1);
      
      actions.push({
        type: 'add_missing_pause',
        description: `Ajouter un relevé "Fin" manquant après le dernier relevé (${newStopDate.toLocaleString()})`,
        newReading: {
          name: 'Fin de la chronique',
          type: ReadingTypeEnum.STOP,
          dateTime: newStopDate,
        },
      });
    }
  }

  // 4. Remove duplicate pauses and correctly pair pauses
  const pauseStarts: IReading[] = [];
  const pauseEnds: IReading[] = [];
  
  sortedReadings.forEach(reading => {
    if (reading.type === ReadingTypeEnum.PAUSE_START) {
      pauseStarts.push(reading);
    } else if (reading.type === ReadingTypeEnum.PAUSE_END) {
      pauseEnds.push(reading);
    }
  });
  
  // Pair pauses: each PAUSE_START should have a PAUSE_END after it
  const validPausePairs: Array<{ start: IReading; end: IReading }> = [];
  const usedStarts = new Set<IReading>();
  const usedEnds = new Set<IReading>();
  
  // For each PAUSE_START, find the closest PAUSE_END after it
  pauseStarts.forEach(pauseStart => {
    const pauseStartDate = pauseStart.dateTime instanceof Date 
      ? pauseStart.dateTime 
      : new Date(pauseStart.dateTime);
    
    const matchingEnd = pauseEnds
      .filter(end => !usedEnds.has(end))
      .filter(end => {
        const endDate = end.dateTime instanceof Date ? end.dateTime : new Date(end.dateTime);
        return endDate.getTime() > pauseStartDate.getTime();
      })
      .sort((a, b) => {
        const dateA = a.dateTime instanceof Date ? a.dateTime : new Date(a.dateTime);
        const dateB = b.dateTime instanceof Date ? b.dateTime : new Date(b.dateTime);
        return dateA.getTime() - dateB.getTime();
      })[0];
    
    if (matchingEnd) {
      validPausePairs.push({ start: pauseStart, end: matchingEnd });
      usedStarts.add(pauseStart);
      usedEnds.add(matchingEnd);
    }
  });
  
  // Remove unpaired PAUSE_START readings (duplicates)
  const unpairedStarts = pauseStarts.filter(start => !usedStarts.has(start));
  if (unpairedStarts.length > 0) {
    const toRemoveIds = unpairedStarts.map(r => r.id).filter((id): id is number => !!id);
    const toRemoveTempIds = unpairedStarts.map(r => r.tempId).filter((id): id is string => !!id);
    
    actions.push({
      type: 'remove_duplicate',
      description: `Supprimer ${unpairedStarts.length} relevé(s) "Début de pause" non apparié(s)`,
      readingIds: toRemoveIds.length > 0 ? toRemoveIds : undefined,
      tempIds: toRemoveTempIds.length > 0 ? toRemoveTempIds : undefined,
    });
  }
  
  // For each unpaired PAUSE_END, add a PAUSE_START before it
  const unpairedEnds = pauseEnds.filter(end => !usedEnds.has(end));
  unpairedEnds.forEach(pauseEnd => {
    const pauseEndDate = pauseEnd.dateTime instanceof Date 
      ? pauseEnd.dateTime 
      : new Date(pauseEnd.dateTime);
    const pauseStartDate = new Date(pauseEndDate.getTime() - 1);
    
    actions.push({
      type: 'add_missing_pause',
      description: `Ajouter un relevé "Début de pause" manquant avant le relevé "Fin de pause" à ${pauseEndDate.toLocaleString()}`,
      newReading: {
        name: 'Début de pause',
        type: ReadingTypeEnum.PAUSE_START,
        dateTime: pauseStartDate,
      },
    });
  });
  
  // For each PAUSE_START without PAUSE_END, add a PAUSE_END after it
  pauseStarts.forEach(pauseStart => {
    if (usedStarts.has(pauseStart)) {
      const pair = validPausePairs.find(p => p.start === pauseStart);
      if (!pair) {
        // PAUSE_START paired but pair doesn't exist? Add PAUSE_END
        const pauseStartDate = pauseStart.dateTime instanceof Date 
          ? pauseStart.dateTime 
          : new Date(pauseStart.dateTime);
        const pauseEndDate = new Date(pauseStartDate.getTime() + 1);
        
        actions.push({
          type: 'add_missing_pause',
          description: `Ajouter un relevé "Fin de pause" manquant après le relevé "Début de pause" à ${pauseStartDate.toLocaleString()}`,
          newReading: {
            name: 'Fin de pause',
            type: ReadingTypeEnum.PAUSE_END,
            dateTime: pauseEndDate,
          },
        });
      }
    }
  });

  // If applyCorrections is true, apply the corrections
  if (applyCorrections) {
    // STEP 1: Sort first chronologically
    const workingReadings = [...readings].sort((a, b) => {
      const dateA = a.dateTime instanceof Date ? a.dateTime : new Date(a.dateTime);
      const dateB = b.dateTime instanceof Date ? b.dateTime : new Date(b.dateTime);
      return dateA.getTime() - dateB.getTime();
    });

    // STEP 2: Apply duplicate removals
    actions.forEach(action => {
      if (action.type === 'remove_duplicate') {
        const readingsToRemove = workingReadings.filter(r => {
          if (action.readingIds && r.id && action.readingIds.includes(r.id)) {
            return true;
          }
          if (action.tempIds && r.tempId && action.tempIds.includes(r.tempId)) {
            return true;
          }
          return false;
        });
        
        // Remove each reading (in reverse order to avoid index issues)
        readingsToRemove.reverse().forEach(readingToRemove => {
          const index = workingReadings.findIndex(r => 
            (r.id && readingToRemove.id && r.id === readingToRemove.id) ||
            (r.tempId && readingToRemove.tempId && r.tempId === readingToRemove.tempId)
          );
          if (index !== -1) {
            workingReadings.splice(index, 1);
          }
        });
      }
    });

    // STEP 3: Apply missing pause additions
    actions.forEach(action => {
      if (action.type === 'add_missing_pause' && action.newReading) {
        const newReading: IReading = {
          name: action.newReading.name || 'Nouveau relevé',
          type: action.newReading.type || ReadingTypeEnum.DATA,
          dateTime: action.newReading.dateTime || new Date(),
          tempId: `temp-${Date.now()}-${Math.random()}`,
        };
        workingReadings.push(newReading);
      }
    });

    // STEP 4: Apply STOP repositioning with intelligent timestamping
    actions.forEach(action => {
      if (action.type === 'reorder' && action.newStopDateTime) {
        const stopReading = workingReadings.find(r => 
          (action.stopReadingId && r.id === action.stopReadingId) ||
          (action.stopReadingTempId && r.tempId === action.stopReadingTempId)
        );
        
        if (stopReading && action.newStopDateTime) {
          stopReading.dateTime = action.newStopDateTime;
        }
      }
    });

    // STEP 5: Re-sort after all modifications
    workingReadings.sort((a, b) => {
      const dateA = a.dateTime instanceof Date ? a.dateTime : new Date(a.dateTime);
      const dateB = b.dateTime instanceof Date ? b.dateTime : new Date(b.dateTime);
      return dateA.getTime() - dateB.getTime();
    });

    // STEP 6: Ensure START has the smallest timestamp and STOP the largest
    const startReadings = workingReadings.filter(r => r.type === ReadingTypeEnum.START);
    const stopReadings = workingReadings.filter(r => r.type === ReadingTypeEnum.STOP);
    const otherReadings = workingReadings.filter(r => 
      r.type !== ReadingTypeEnum.START && r.type !== ReadingTypeEnum.STOP
    );

    // Find the reading with the smallest timestamp (excluding START)
    let earliestDate: Date | null = null;
    if (otherReadings.length > 0) {
      const dates = otherReadings.map(r => {
        return r.dateTime instanceof Date ? r.dateTime : new Date(r.dateTime);
      });
      earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
    }

    // Find the reading with the largest timestamp (excluding STOP)
    let latestDate: Date | null = null;
    if (otherReadings.length > 0) {
      const dates = otherReadings.map(r => {
        return r.dateTime instanceof Date ? r.dateTime : new Date(r.dateTime);
      });
      latestDate = new Date(Math.max(...dates.map(d => d.getTime())));
    } else if (startReadings.length > 0) {
      // If no other readings, use START as reference
      const startDate = startReadings[0].dateTime instanceof Date 
        ? startReadings[0].dateTime 
        : new Date(startReadings[0].dateTime);
      latestDate = startDate;
    }

    // Adjust START to be before all others
    if (startReadings.length > 0) {
      const startReading = startReadings[0]; // Keep only the first
      if (earliestDate) {
        const startDate = startReading.dateTime instanceof Date 
          ? startReading.dateTime 
          : new Date(startReading.dateTime);
        // If START is not before the first reading, reposition it
        if (startDate.getTime() >= earliestDate.getTime()) {
          startReading.dateTime = new Date(earliestDate.getTime() - 1);
        }
      } else {
        // No other readings, START can stay at its current date or be set to 0
        const startDate = startReading.dateTime instanceof Date 
          ? startReading.dateTime 
          : new Date(startReading.dateTime);
        // If START is not at 0 or before, set it just before the first reading
        if (startDate.getTime() > 0) {
          startReading.dateTime = new Date(0);
        }
      }
    }

    // Adjust STOP to be after all others
    if (stopReadings.length > 0) {
      const stopReading = stopReadings[stopReadings.length - 1]; // Keep only the last
      if (latestDate) {
        const stopDate = stopReading.dateTime instanceof Date 
          ? stopReading.dateTime 
          : new Date(stopReading.dateTime);
        // If STOP is not after the last reading, reposition it
        if (stopDate.getTime() <= latestDate.getTime()) {
          stopReading.dateTime = new Date(latestDate.getTime() + 1);
        }
      } else {
        // No other readings, STOP must be after START
        const startReading = startReadings[0];
        if (startReading) {
          const startDate = startReading.dateTime instanceof Date 
            ? startReading.dateTime 
            : new Date(startReading.dateTime);
          stopReading.dateTime = new Date(startDate.getTime() + 1);
        }
      }
    }

    // STEP 7: Sort one last time after timestamp adjustments
    workingReadings.sort((a, b) => {
      const dateA = a.dateTime instanceof Date ? a.dateTime : new Date(a.dateTime);
      const dateB = b.dateTime instanceof Date ? b.dateTime : new Date(b.dateTime);
      return dateA.getTime() - dateB.getTime();
    });

    // STEP 8: Rebuild the list ensuring START is first and STOP is last
    correctedReadings.length = 0;
    
    // Add START first if it exists
    const finalStartReading = workingReadings.find(r => r.type === ReadingTypeEnum.START);
    if (finalStartReading) {
      correctedReadings.push(finalStartReading);
    }
    
    // Add all other readings (sorted by dateTime)
    const finalOtherReadings = workingReadings.filter(r => 
      r.type !== ReadingTypeEnum.START && r.type !== ReadingTypeEnum.STOP
    );
    correctedReadings.push(...finalOtherReadings);
    
    // Add STOP last if it exists
    const finalStopReading = workingReadings.find(r => r.type === ReadingTypeEnum.STOP);
    if (finalStopReading) {
      correctedReadings.push(finalStopReading);
    }
  }

  return {
    actions,
    correctedReadings: applyCorrections ? correctedReadings : [],
  };
}

