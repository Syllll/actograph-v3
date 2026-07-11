import {
  observationRepository,
  type IObservationEntity,
  type IObservationWithCounts,
} from '@database/repositories/observation.repository';
import {
  protocolRepository,
  type IProtocolItemWithChildren,
} from '@database/repositories/protocol.repository';
import {
  readingRepository,
  type IReadingEntity,
  type ReadingType,
} from '@database/repositories/reading.repository';
import { computeNextDuplicateName } from '@utils/chronicle-name';

export interface IObservationFull {
  observation: IObservationEntity;
  protocol: IProtocolItemWithChildren[];
  readings: IReadingEntity[];
  readingsCount: number;
}

export interface ICreateObservationInput {
  name: string;
  description?: string;
  meta?: Record<string, unknown> | null;
  protocol?: {
    categories: {
      name: string;
      observables: {
        name: string;
        color?: string;
      }[];
    }[];
  };
}

async function copyProtocolTree(
  categories: IProtocolItemWithChildren[],
  targetObservationId: number
): Promise<void> {
  const targetProtocol = await protocolRepository.findByObservationId(targetObservationId);
  if (!targetProtocol) {
    throw new Error('Protocole introuvable');
  }

  for (let i = 0; i < categories.length; i++) {
    const category = categories[i];
    const newCategory = await protocolRepository.addCategory(
      targetProtocol.id,
      category.name,
      i,
      category.action || 'continuous',
      category.meta ?? null
    );

    if (category.display_mode || category.background_pattern) {
      await protocolRepository.updateItem(newCategory.id, {
        display_mode: category.display_mode,
        background_pattern: category.background_pattern,
      });
    }

    for (let j = 0; j < (category.children?.length ?? 0); j++) {
      const observable = category.children![j];
      const newObservable = await protocolRepository.addObservable(
        targetProtocol.id,
        newCategory.id,
        observable.name,
        observable.color,
        observable.sort_order ?? j
      );

      if (observable.display_mode || observable.background_pattern) {
        await protocolRepository.updateItem(newObservable.id, {
          display_mode: observable.display_mode,
          background_pattern: observable.background_pattern,
        });
      }
    }
  }
}

/**
 * Service for managing observations
 */
class ObservationService {
  /**
   * Get all observations with counts
   */
  async getAll(): Promise<IObservationWithCounts[]> {
    return observationRepository.findAllWithCounts();
  }

  /**
   * Get recent observations
   */
  async getRecent(limit = 5): Promise<IObservationEntity[]> {
    return observationRepository.findRecent(limit);
  }

  /**
   * Get observation by ID with full details
   */
  async getById(id: number): Promise<IObservationFull | null> {
    const observation = await observationRepository.findById(id);
    if (!observation) {
      return null;
    }

    const protocol = await protocolRepository.findByObservationId(id);
    const protocolItems = protocol
      ? await protocolRepository.getProtocolItems(protocol.id)
      : [];

    const readings = await readingRepository.findByObservationId(id);
    const readingsCount = await readingRepository.countByObservationId(id);

    return {
      observation,
      protocol: protocolItems,
      readings,
      readingsCount,
    };
  }

  /**
   * Create a new observation
   */
  async create(input: ICreateObservationInput): Promise<IObservationEntity> {
    // Create observation with protocol
    // Use Calendar mode by default for mobile - readings have absolute timestamps
    const observation = await observationRepository.createWithProtocol({
      name: input.name,
      description: input.description,
      type: 'Normal',
      mode: 'Calendar',
      meta: input.meta ?? null,
    });

    try {
      if (input.protocol?.categories) {
        const protocol = await protocolRepository.findByObservationId(observation.id);
        if (protocol) {
          for (let i = 0; i < input.protocol.categories.length; i++) {
            const category = input.protocol.categories[i];
            const categoryItem = await protocolRepository.addCategory(
              protocol.id,
              category.name,
              i
            );

            for (let j = 0; j < category.observables.length; j++) {
              const observable = category.observables[j];
              await protocolRepository.addObservable(
                protocol.id,
                categoryItem.id,
                observable.name,
                observable.color,
                j
              );
            }
          }
        }
      }

      return observation;
    } catch (error) {
      try {
        await observationRepository.hardDelete(observation.id);
      } catch (cleanupError) {
        console.error('Failed to rollback partial chronicle creation:', cleanupError);
      }
      throw error;
    }
  }

  /**
   * Update an observation
   */
  async update(
    id: number,
    data: Partial<Pick<IObservationEntity, 'name' | 'description' | 'meta'>>
  ): Promise<IObservationEntity | null> {
    return observationRepository.update(id, data);
  }

  /**
   * Patch partiel du meta d'une observation (fusion avec le meta existant).
   * Utilisé pour persister des réglages de disposition (ex: uiScale) sans
   * écraser les autres clés du meta.
   */
  async updateMeta(
    id: number,
    metaPatch: Record<string, unknown>,
  ): Promise<IObservationEntity | null> {
    return observationRepository.updateMeta(id, metaPatch);
  }

  /**
   * Delete an observation
   */
  async delete(id: number): Promise<boolean> {
    return observationRepository.delete(id);
  }

  /**
   * Duplicate an observation with its protocol but without readings.
   * The source chronicle is left untouched.
   */
  async duplicateWithoutReadings(sourceId: number): Promise<IObservationEntity> {
    const source = await this.getById(sourceId);
    if (!source) {
      throw new Error('Chronique introuvable');
    }

    const allObservations = await this.getAll();
    const newName = computeNextDuplicateName(
      source.observation.name,
      allObservations.map((obs) => obs.name)
    );

    const newObservation = await observationRepository.createWithProtocol({
      name: newName,
      description: source.observation.description,
      type: source.observation.type,
      mode: source.observation.mode,
      meta: source.observation.meta ?? null,
    });

    try {
      await copyProtocolTree(source.protocol, newObservation.id);
      return newObservation;
    } catch (error) {
      try {
        await observationRepository.hardDelete(newObservation.id);
      } catch (cleanupError) {
        console.error('Failed to rollback partial chronicle duplication:', cleanupError);
      }
      throw error;
    }
  }

  /**
   * Add a reading to an observation
   */
  async addReading(
    observationId: number,
    type: ReadingType,
    name?: string,
    description?: string
  ): Promise<IReadingEntity> {
    return readingRepository.addReading(
      observationId,
      type,
      new Date(),
      name,
      description
    );
  }

  /**
   * Start recording
   */
  async startRecording(
    observationId: number,
    initialContinuousObservableNames: string[] = []
  ): Promise<IReadingEntity> {
    const startDate = new Date();
    const startReading = await readingRepository.addStart(observationId, startDate);

    for (const observableName of initialContinuousObservableNames) {
      const trimmedObservableName = observableName.trim();
      if (!trimmedObservableName) {
        continue;
      }
      await readingRepository.addData(observationId, trimmedObservableName, startDate);
    }

    return startReading;
  }

  /**
   * Stop recording
   */
  async stopRecording(observationId: number): Promise<IReadingEntity> {
    return readingRepository.addStop(observationId);
  }

  /**
   * Pause recording
   */
  async pauseRecording(observationId: number): Promise<IReadingEntity> {
    return readingRepository.addPauseStart(observationId);
  }

  /**
   * Resume recording
   */
  async resumeRecording(observationId: number): Promise<IReadingEntity> {
    return readingRepository.addPauseEnd(observationId);
  }

  /**
   * Toggle observable
   */
  async toggleObservable(
    observationId: number,
    observableName: string
  ): Promise<IReadingEntity> {
    return readingRepository.addData(observationId, observableName);
  }

  /**
   * Add a comment reading (type DATA with name starting with "#")
   * Comments are not included in activity graph or statistics
   */
  async addComment(
    observationId: number,
    comment: string,
    description?: string,
    date: Date = new Date()
  ): Promise<IReadingEntity> {
    // Trim whitespace and ensure comment starts with "#"
    const trimmedComment = comment.trim();
    if (!trimmedComment) {
      throw new Error('Comment cannot be empty');
    }
    const commentName = trimmedComment.startsWith('#') ? trimmedComment : `#${trimmedComment}`;
    return readingRepository.addData(observationId, commentName, date, description);
  }

  /**
   * Append a free-text comment to an existing reading's description field.
   */
  async appendReadingComment(
    readingId: number,
    comment: string,
    observationId?: number
  ): Promise<IReadingEntity> {
    const trimmedComment = comment.trim();
    if (!trimmedComment) {
      throw new Error('Comment cannot be empty');
    }

    const reading = await readingRepository.findById(readingId);
    if (!reading) {
      throw new Error('Relevé introuvable');
    }

    if (observationId !== undefined && reading.observation_id !== observationId) {
      throw new Error('Relevé non rattaché à la chronique courante');
    }

    const description = reading.description
      ? `${reading.description}\n${trimmedComment}`
      : trimmedComment;

    const updated = await readingRepository.update(readingId, { description });
    if (!updated) {
      throw new Error('Relevé introuvable');
    }

    return updated;
  }

  /**
   * Get readings for an observation
   */
  async getReadings(observationId: number): Promise<IReadingEntity[]> {
    return readingRepository.findByObservationId(observationId);
  }

  /**
   * Get recent readings for an observation
   */
  async getRecentReadings(observationId: number, limit = 10): Promise<IReadingEntity[]> {
    return readingRepository.findRecentByObservationId(observationId, limit);
  }

  /**
   * Check if observation is currently recording.
   * Looks at the most recent START/STOP reading to handle multiple sessions.
   */
  async isRecording(observationId: number): Promise<boolean> {
    const last = await readingRepository.getLastStartOrStop(observationId);
    return last?.type === 'START';
  }
}

// Singleton instance
export const observationService = new ObservationService();

