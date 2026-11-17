import {
  createProtocolExchange,
  createReadingsExchange,
  diagnoseProtocolCorrespondence,
  exchangeReadingsToReadings,
  isRecordingActiveFromReadings,
  ObservationModeEnum,
  ObservationType,
  validateExchangeDocument,
  type ExchangeDiagnostic,
  type ProtocolExchangeDocument,
  type ReadingExchangeDocument,
} from '@actograph/core';
import {
  ChronicV1Parser,
  extractChronicV1Protocol,
} from '@actograph/core/import/chronic-v1';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DataSource, EntityManager, IsNull } from 'typeorm';
import { ApplyExchangeDto, PreviewExchangeDto } from '../dtos/exchange.dto';
import { ActivityGraph } from '../entities/activity-graph.entity';
import { Observation } from '../entities/observation.entity';
import { Protocol, ProtocolItem } from '../entities/protocol.entity';
import { Reading } from '../entities/reading.entity';
import { flattenProtocol, prepareExchangeProtocol } from './exchange-protocol';
import {
  lockActiveObservationWrite,
  withObservationWriteLocks,
} from './observation-write-lock';

type Diagnostic = ExchangeDiagnostic & { severity: 'error' | 'warning' };

@Injectable()
export class ExchangeService {
  constructor(private readonly dataSource: DataSource) {}

  async parseLegacyProtocol(
    observationId: number,
    userId: number,
    file: Pick<Express.Multer.File, 'buffer' | 'originalname'> | undefined,
  ): Promise<ProtocolExchangeDocument> {
    const owned = await this.dataSource.manager.findOne(Observation, {
      where: { id: observationId, user: { id: userId } },
    });
    if (!owned) throw new NotFoundException('Observation not found');
    if (
      !file ||
      !file.originalname.toLowerCase().endsWith('.chronic') ||
      !Buffer.isBuffer(file.buffer) ||
      file.buffer.length === 0 ||
      file.buffer.length > 20 * 1024 * 1024
    ) {
      throw new BadRequestException({
        code: 'EXCHANGE_INVALID_LEGACY_FILE',
        message: 'Choisissez un fichier .chronic valide de 20 Mio maximum.',
      });
    }
    try {
      // Extract only the protocol. Full chronic normalization can alter reading
      // labels and timestamps, so it must never run in this exchange endpoint.
      return extractChronicV1Protocol(new ChronicV1Parser().parse(file.buffer));
    } catch (error) {
      throw new BadRequestException({
        code: 'EXCHANGE_INVALID_LEGACY_FILE',
        message:
          error instanceof Error
            ? error.message
            : 'Le fichier .chronic est illisible.',
      });
    }
  }

  snapshot(observationId: number, userId: number) {
    return this.withSnapshot(
      observationId,
      userId,
      async (_manager, observation) => ({
        revision: this.revision(observation),
        observation: {
          name: observation.name,
          mode: observation.mode ?? ObservationModeEnum.Calendar,
        },
        readings: createReadingsExchange(
          observation.readings ?? [],
          observation.mode ?? ObservationModeEnum.Calendar,
        ),
        protocol: createProtocolExchange(this.protocolItems(observation)),
      }),
    );
  }

  preview(observationId: number, userId: number, body: PreviewExchangeDto) {
    return this.withSnapshot(
      observationId,
      userId,
      async (_manager, observation) => this.prepare(observation, body).preview,
    );
  }

  apply(observationId: number, userId: number, body: ApplyExchangeDto) {
    return this.withSnapshot(
      observationId,
      userId,
      async (manager, observation) => {
        if (body.revision !== this.revision(observation)) {
          throw new ConflictException({
            code: 'EXCHANGE_PREVIEW_STALE',
            message:
              'La chronique a changé. Actualisez l’aperçu avant de continuer.',
          });
        }
        if (body.mode === 'replace' && body.confirmReplace !== true) {
          throw new BadRequestException({
            code: 'EXCHANGE_REPLACE_CONFIRMATION_REQUIRED',
            message: 'Confirmez explicitement le remplacement.',
          });
        }
        const prepared = this.prepare(observation, body);
        if (!prepared.preview.canApply) {
          throw new BadRequestException({
            code: 'EXCHANGE_INVALID_DOCUMENT',
            message: 'L’import contient des erreurs.',
            diagnostics: prepared.preview.diagnostics,
          });
        }

        // The backup commits in the same transaction and remains a normal,
        // recoverable chronicle in the user's library after application restart.
        const backup =
          body.mode === 'replace'
            ? await this.createBackup(manager, observation, userId)
            : undefined;
        if (body.kind === 'readings') {
          if (body.mode === 'replace') {
            await manager.softDelete(Reading, {
              observation: { id: observationId },
              deletedAt: IsNull(),
            });
          }
          const rows = exchangeReadingsToReadings(
            body.document as ReadingExchangeDocument,
          );
          const orderOffset =
            body.mode === 'add'
              ? (observation.readings ?? []).reduce(
                  (max, reading) =>
                    Math.max(max, reading.sortOrder ?? reading.id),
                  -1,
                ) + 1
              : 0;
          // Only allowlisted fields enter persistence. Neither IDs nor tempIds
          // from another installation are used to update or deduplicate rows.
          const entities = rows.map((reading, index) =>
            manager.create(Reading, {
              observation: { id: observationId },
              name: reading.name ?? null,
              description: reading.description ?? null,
              type: reading.type,
              dateTime: reading.dateTime,
              sortOrder: orderOffset + index,
              tempId: null,
            }),
          );
          if (entities.length)
            await manager.save(Reading, entities, { chunk: 500 });
        } else {
          const protocol =
            observation.protocol ??
            manager.create(Protocol, {
              name: `Protocole - ${observation.name}`,
              observation: { id: observationId },
              user: { id: userId },
            });
          protocol.items = JSON.stringify(prepared.protocolItems);
          await manager.save(Protocol, protocol);
          // Protocol import deliberately never writes to Reading.
        }
        const updated = await this.loadOwned(manager, observationId, userId);
        return {
          imported: prepared.preview.counts.added,
          diagnostics: prepared.preview.diagnostics,
          ...(backup ? { backup } : {}),
          revision: this.revision(updated),
        };
      },
    );
  }

  private async withSnapshot<T>(
    observationId: number,
    userId: number,
    action: (manager: EntityManager, observation: Observation) => Promise<T>,
  ): Promise<T> {
    return withObservationWriteLocks(this.dataSource, [observationId], () =>
      this.dataSource.transaction(async (manager) => {
        // Check ownership before obtaining a write lock, then read again under
        // the same database lock as reading writes and observation deletion.
        await this.loadOwned(manager, observationId, userId);
        await lockActiveObservationWrite(manager, observationId);
        return action(
          manager,
          await this.loadOwned(manager, observationId, userId),
        );
      }),
    );
  }

  private async loadOwned(
    manager: EntityManager,
    id: number,
    userId: number,
  ): Promise<Observation> {
    const observation = await manager.findOne(Observation, {
      where: { id, user: { id: userId } },
      relations: ['readings', 'protocol', 'activityGraph'],
    });
    if (!observation) throw new NotFoundException('Observation not found');
    observation.readings?.sort(
      (a, b) =>
        a.dateTime.getTime() - b.dateTime.getTime() ||
        (a.sortOrder ?? a.id) - (b.sortOrder ?? b.id) ||
        a.id - b.id,
    );
    return observation;
  }

  private protocolItems(observation: Observation): ProtocolItem[] {
    const items: unknown = JSON.parse(observation.protocol?.items ?? '[]');
    if (!Array.isArray(items))
      throw new BadRequestException('Le protocole courant est illisible.');
    return items;
  }

  private revision(observation: Observation): string {
    return createHash('sha256')
      .update(
        JSON.stringify({
          id: observation.id,
          name: observation.name,
          description: observation.description,
          videoPath: observation.videoPath,
          mode: observation.mode,
          meta: observation.meta,
          updatedAt: observation.updatedAt,
          protocol: observation.protocol,
          activityGraph: observation.activityGraph,
          readings: observation.readings,
        }),
      )
      .digest('hex');
  }

  private prepare(observation: Observation, body: PreviewExchangeDto) {
    if (
      !['readings', 'protocol'].includes(body.kind) ||
      !['add', 'replace'].includes(body.mode)
    ) {
      throw new BadRequestException('Invalid import kind or mode');
    }
    const validation = validateExchangeDocument(
      body.document,
      body.kind,
      observation.mode ?? ObservationModeEnum.Calendar,
    );
    const diagnostics: Diagnostic[] = [
      ...validation.errors.map((diagnostic) => ({
        ...diagnostic,
        severity: 'error' as const,
      })),
      ...validation.warnings.map((diagnostic) => ({
        ...diagnostic,
        severity: 'warning' as const,
      })),
    ];
    const currentItems = this.protocolItems(observation);
    const readings = observation.readings ?? [];
    let protocolItems = currentItems;
    let existing = readings.length;
    let incoming = 0;
    let added = 0;
    if (
      observation.meta?.entryMode !== 'manual' &&
      isRecordingActiveFromReadings(readings)
    )
      diagnostics.push({
        severity: 'error',
        code: 'EXCHANGE_RECORDING_ACTIVE',
        message: 'Terminez l’enregistrement avant d’importer.',
      });
    if (validation.valid) {
      if (body.kind === 'protocol') {
        const source = (body.document as ProtocolExchangeDocument)
          .items as ProtocolItem[];
        const prepared = prepareExchangeProtocol(
          currentItems,
          source,
          body.mode,
        );
        protocolItems = prepared.items;
        existing = flattenProtocol(currentItems).length;
        incoming = flattenProtocol(source).length;
        added = body.mode === 'replace' ? incoming : prepared.added;
        // Preserved local graphic preferences can reference categories removed
        // by the replacement. Diagnose the actual result as well as the file.
        const effectiveValidation = validateExchangeDocument(
          {
            format: 'actograph-tabular',
            version: 1,
            kind: 'protocol',
            items: protocolItems,
          },
          'protocol',
        );
        diagnostics.push(
          ...effectiveValidation.errors.map((diagnostic) => ({
            ...diagnostic,
            severity: 'error' as const,
          })),
          ...effectiveValidation.warnings.map((diagnostic) => ({
            ...diagnostic,
            severity: 'warning' as const,
          })),
        );
      } else {
        incoming = (body.document as ReadingExchangeDocument).readings.length;
        added = incoming;
      }
      const targetReadings =
        body.kind === 'readings'
          ? [
              ...(body.mode === 'add' ? readings : []),
              ...exchangeReadingsToReadings(
                body.document as ReadingExchangeDocument,
              ),
            ]
          : readings;
      const correspondence = diagnoseProtocolCorrespondence(
        targetReadings,
        protocolItems,
      );
      if (correspondence.unknownReadingCount)
        diagnostics.push({
          severity: 'warning',
          code: 'UNKNOWN_OBSERVABLES',
          message: `${
            correspondence.unknownReadingCount
          } relevés sans correspondance : ${correspondence.unknownNames
            .map((name) => name || 'Sans nom')
            .join(', ')}. Les données sont conservées.`,
        });
      if (
        correspondence.ambiguousReadingCount ||
        correspondence.duplicateObservableNames.length
      )
        diagnostics.push({
          severity: 'warning',
          code: 'AMBIGUOUS_OBSERVABLES',
          message: `Correspondances ambiguës : ${correspondence.duplicateObservableNames.join(
            ', ',
          )}. Les données sont conservées.`,
        });
      if (body.kind === 'readings') {
        const seen = new Set<string>();
        let duplicates = 0;
        for (const reading of targetReadings) {
          const key = JSON.stringify([
            reading.type,
            reading.name,
            reading.description ?? null,
            reading.dateTime.getTime(),
          ]);
          if (seen.has(key)) duplicates += 1;
          seen.add(key);
        }
        if (duplicates)
          diagnostics.push({
            severity: 'warning',
            code: 'POTENTIAL_DUPLICATES',
            message: `${duplicates} doublons possibles. Aucun relevé ne sera supprimé automatiquement.`,
          });
      }
    }
    return {
      protocolItems,
      preview: {
        revision: this.revision(observation),
        kind: body.kind,
        mode: body.mode,
        counts: {
          existing,
          incoming,
          added,
          removed: body.mode === 'replace' ? existing : 0,
        },
        diagnostics,
        canApply: !diagnostics.some(
          (diagnostic) => diagnostic.severity === 'error',
        ),
      },
    };
  }

  private async createBackup(
    manager: EntityManager,
    source: Observation,
    userId: number,
  ) {
    const name = `${
      source.name
    } - sauvegarde avant import ${new Date().toISOString()}`;
    const backup = await manager.save(
      Observation,
      manager.create(Observation, {
        name,
        description: source.description,
        videoPath: source.videoPath,
        mode: source.mode,
        meta: source.meta,
        user: { id: userId },
        type: ObservationType.Normal,
        exampleKey: null,
      }),
    );
    if (source.protocol)
      await manager.save(
        Protocol,
        manager.create(Protocol, {
          name: source.protocol.name,
          description: source.protocol.description,
          items: source.protocol.items,
          observation: { id: backup.id },
          user: { id: userId },
        }),
      );
    if (source.activityGraph)
      await manager.save(
        ActivityGraph,
        manager.create(ActivityGraph, {
          name: source.activityGraph.name,
          description: source.activityGraph.description,
          observation: { id: backup.id },
        }),
      );
    // loadOwned already orders this snapshot by dateTime, sortOrder ?? id, id.
    // Materialize that effective order: new database IDs must not change the
    // position of legacy rows whose source sortOrder was null.
    const rows = (source.readings ?? []).map((reading, index) =>
      manager.create(Reading, {
        observation: { id: backup.id },
        name: reading.name,
        description: reading.description,
        type: reading.type,
        dateTime: reading.dateTime,
        sortOrder: index,
        tempId: null,
      }),
    );
    if (rows.length) await manager.save(Reading, rows, { chunk: 500 });
    return { id: backup.id, name };
  }
}
