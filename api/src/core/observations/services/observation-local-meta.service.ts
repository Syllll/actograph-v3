import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '@utils/services/base.service';
import { ObservationLocalMeta } from '../entities/observation-local-meta.entity';
import { ObservationLocalMetaRepository } from '../repositories/observation-local-meta.repository';
import { UpsertObservationLocalMetaDto } from '../dtos/upsert-observation-local-meta.dto';
import { ObservationService } from './observation/index.service';

export type ObservationLocalMetaResponse = {
  observationId: number;
  archived: boolean;
  isProtocol: boolean;
  usedFor: string[];
  usedForOther: string | null;
  note: string | null;
};

@Injectable()
export class ObservationLocalMetaService extends BaseService<
  ObservationLocalMeta,
  ObservationLocalMetaRepository
> {
  constructor(
    @InjectRepository(ObservationLocalMetaRepository)
    private readonly observationLocalMetaRepository: ObservationLocalMetaRepository,
    @Inject(forwardRef(() => ObservationService))
    private readonly observationService: ObservationService,
  ) {
    super(observationLocalMetaRepository);
  }

  private toResponse(
    observationId: number,
    localMeta?: ObservationLocalMeta | null,
  ): ObservationLocalMetaResponse {
    return {
      observationId,
      archived: localMeta?.archived ?? false,
      isProtocol: localMeta?.isProtocol ?? false,
      usedFor: localMeta?.usedFor ?? [],
      usedForOther: localMeta?.usedForOther ?? null,
      note: localMeta?.note ?? null,
    };
  }

  private async assertObservationOwnership(
    observationId: number,
    userId: number,
  ) {
    const observation = await this.observationService.findOne(observationId, {
      where: {
        user: {
          id: userId,
        },
      },
    });

    if (!observation) {
      throw new NotFoundException('Observation not found');
    }
  }

  async getOrDefault(
    observationId: number,
    userId: number,
  ): Promise<ObservationLocalMetaResponse> {
    await this.assertObservationOwnership(observationId, userId);

    const localMeta = await this.observationLocalMetaRepository.findOne({
      where: {
        observation: { id: observationId },
      },
      relations: ['observation'],
    });

    return this.toResponse(observationId, localMeta);
  }

  async upsert(
    observationId: number,
    userId: number,
    body: UpsertObservationLocalMetaDto,
  ): Promise<ObservationLocalMetaResponse> {
    await this.assertObservationOwnership(observationId, userId);

    if (
      body.usedFor?.includes('other') &&
      (!body.usedForOther || body.usedForOther.trim() === '')
    ) {
      throw new BadRequestException(
        'usedForOther is required when usedFor contains "other"',
      );
    }

    let localMeta = await this.observationLocalMetaRepository.findOne({
      where: {
        observation: { id: observationId },
      },
      relations: ['observation'],
    });

    if (!localMeta) {
      localMeta = this.observationLocalMetaRepository.create({
        observation: { id: observationId },
        archived: body.archived ?? false,
        isProtocol: body.isProtocol ?? false,
        usedFor: body.usedFor ?? [],
        usedForOther: body.usedForOther ?? null,
        note: body.note ?? null,
      });
    } else {
      if (body.archived !== undefined) {
        localMeta.archived = body.archived;
      }
      if (body.isProtocol !== undefined) {
        localMeta.isProtocol = body.isProtocol;
      }
      if (body.usedFor !== undefined) {
        localMeta.usedFor = body.usedFor;
      }
      if (body.usedForOther !== undefined) {
        localMeta.usedForOther = body.usedForOther;
      }
      if (body.note !== undefined) {
        localMeta.note = body.note;
      }
    }

    const saved = await this.observationLocalMetaRepository.save(localMeta);
    return this.toResponse(observationId, saved);
  }

  async removeForObservation(observationId: number) {
    const localMeta = await this.observationLocalMetaRepository.findOne({
      where: {
        observation: { id: observationId },
      },
    });

    if (localMeta) {
      await this.observationLocalMetaRepository.remove(localMeta);
    }
  }
}
