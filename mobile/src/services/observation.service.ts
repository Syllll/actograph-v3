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

export interface IObservationFull {
  observation: IObservationEntity;
  protocol: IProtocolItemWithChildren[];
  readings: IReadingEntity[];
  readingsCount: number;
}

export interface ICreateObservationInput {
  name: string;
  description?: string;
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
    });

    // Add protocol items if provided
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
  }

  /**
   * Update an observation
   */
  async update(
    id: number,
    data: Partial<Pick<IObservationEntity, 'name' | 'description'>>
  ): Promise<IObservationEntity | null> {
    return observationRepository.update(id, data);
  }

  /**
   * Delete an observation
   */
  async delete(id: number): Promise<boolean> {
    return observationRepository.delete(id);
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
  async startRecording(observationId: number): Promise<IReadingEntity> {
    return readingRepository.addStart(observationId);
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
    description?: string
  ): Promise<IReadingEntity> {
    // Trim whitespace and ensure comment starts with "#"
    const trimmedComment = comment.trim();
    if (!trimmedComment) {
      throw new Error('Comment cannot be empty');
    }
    const commentName = trimmedComment.startsWith('#') ? trimmedComment : `#${trimmedComment}`;
    return readingRepository.addData(observationId, commentName, new Date(), description);
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
   * Check if observation is recording
   */
  async isRecording(observationId: number): Promise<boolean> {
    const hasStart = await readingRepository.hasStartReading(observationId);
    const hasStop = await readingRepository.hasStopReading(observationId);
    return hasStart && !hasStop;
  }
}

// Singleton instance
export const observationService = new ObservationService();

