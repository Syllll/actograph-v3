import { readingRepository, type IReadingEntity, type ReadingType } from '@database/repositories/reading.repository';
import { 
  autoCorrectReadings as coreAutoCorrectReadings,
  type IReading,
  ReadingTypeEnum,
} from '@actograph/core';

/**
 * Map ReadingType from mobile to ReadingTypeEnum from core
 */
function mapReadingType(type: ReadingType): ReadingTypeEnum {
  const mapping: Record<ReadingType, ReadingTypeEnum> = {
    'START': ReadingTypeEnum.START,
    'STOP': ReadingTypeEnum.STOP,
    'PAUSE_START': ReadingTypeEnum.PAUSE_START,
    'PAUSE_END': ReadingTypeEnum.PAUSE_END,
    'DATA': ReadingTypeEnum.DATA,
  };
  return mapping[type];
}

/**
 * Map ReadingTypeEnum from core to ReadingType from mobile
 */
function mapReadingTypeFromCore(type: ReadingTypeEnum): ReadingType {
  const mapping: Record<ReadingTypeEnum, ReadingType> = {
    [ReadingTypeEnum.START]: 'START',
    [ReadingTypeEnum.STOP]: 'STOP',
    [ReadingTypeEnum.PAUSE_START]: 'PAUSE_START',
    [ReadingTypeEnum.PAUSE_END]: 'PAUSE_END',
    [ReadingTypeEnum.DATA]: 'DATA',
  };
  return mapping[type];
}

/**
 * Convert IReadingEntity (mobile) to IReading (core)
 */
function toCoreReading(entity: IReadingEntity): IReading {
  return {
    id: entity.id,
    name: entity.name || null,
    description: entity.description || null,
    type: mapReadingType(entity.type),
    dateTime: new Date(entity.date),
    tempId: null,
  };
}

/**
 * Auto-correct readings for an observation (baguette magique)
 * 
 * This function silently corrects readings by:
 * - Sorting readings chronologically
 * - Removing duplicate START and STOP readings (keep first START, last STOP)
 * - Ensuring START is first and STOP is last
 * - Pairing PAUSE_START/PAUSE_END correctly
 * - Adding missing pause readings
 * - Repositioning STOP to be after the last reading
 */
export async function autoCorrectReadings(observationId: number): Promise<void> {
  // Load all readings for the observation
  const readings = await readingRepository.findByObservationId(observationId);
  
  if (readings.length === 0) {
    return;
  }

  // Convert to core format
  const coreReadings = readings.map(toCoreReading);

  // Use shared auto-correction function with applyCorrections = true
  const result = coreAutoCorrectReadings(coreReadings, true);

  // Apply corrections to database
  // 1. Delete readings marked for removal
  for (const action of result.actions) {
    if (action.type === 'remove_duplicate') {
      if (action.readingIds) {
        for (const id of action.readingIds) {
          await readingRepository.delete(id);
        }
      }
      // Note: tempIds are not applicable in mobile (all readings are persisted)
    }
  }

  // 2. Update STOP reading position if needed
  for (const action of result.actions) {
    if (action.type === 'reorder' && action.newStopDateTime && action.stopReadingId) {
      await readingRepository.update(action.stopReadingId, {
        date: action.newStopDateTime.toISOString(),
      });
    }
  }

  // 3. Add missing readings (STOP, PAUSE_START, PAUSE_END)
  for (const action of result.actions) {
    if (action.type === 'add_missing_pause' && action.newReading) {
      const newReading = action.newReading;
      if (!newReading.type || !newReading.dateTime) {
        continue;
      }

      const readingType = mapReadingTypeFromCore(newReading.type);
      const date = newReading.dateTime instanceof Date 
        ? newReading.dateTime 
        : new Date(newReading.dateTime);

      switch (readingType) {
        case 'START':
          await readingRepository.addStart(observationId, date);
          break;
        case 'STOP':
          await readingRepository.addStop(observationId, date);
          break;
        case 'PAUSE_START':
          await readingRepository.addPauseStart(observationId, date);
          break;
        case 'PAUSE_END':
          await readingRepository.addPauseEnd(observationId, date);
          break;
        case 'DATA':
          await readingRepository.addData(
            observationId,
            newReading.name || 'Nouveau relevé',
            date,
            newReading.description || undefined
          );
          break;
      }
    }
  }

  // 4. Update all readings that have changed dates (from corrected readings)
  const correctedReadings = result.correctedReadings;
  if (correctedReadings.length > 0) {
    // Build a map of original readings by id
    const originalReadingsMap = new Map<number, IReadingEntity>();
    readings.forEach(r => {
      if (r.id) {
        originalReadingsMap.set(r.id, r);
      }
    });
    
    // Update all readings that have changed
    for (const correctedReading of correctedReadings) {
      if (!correctedReading.id) continue;
      
      const originalReading = originalReadingsMap.get(correctedReading.id);
      if (!originalReading) continue;
      
      const originalDate = new Date(originalReading.date);
      const correctedDate = correctedReading.dateTime instanceof Date 
        ? correctedReading.dateTime 
        : new Date(correctedReading.dateTime);
      
      if (originalDate.getTime() !== correctedDate.getTime()) {
        await readingRepository.update(correctedReading.id, {
          date: correctedDate.toISOString(),
        });
      }
    }
  }
}

