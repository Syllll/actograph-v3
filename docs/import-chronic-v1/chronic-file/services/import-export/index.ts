import * as Import from './chronic-file/import-from-file';
import * as Export from './chronic-file/export-from-db';
import { IChronic } from './chronic-file/file-structure/chronic';
import { ChronicFileService } from '../index.service';
import { ObservationService as ObservationService } from 'src/core/observations/services/observation/index.service';
import {
  DataModsEnum,
  ObservationEntity,
  TypesEnum,
} from 'src/core/observations/entities/observation.entity';
import { UserEntity } from '@users/entities/user.entity';
import { ProtocolService } from 'src/core/observations/services/protocol/index.service';
import { ProtocolItemService } from 'src/core/observations/services/protocol-item/index.service';
import { ReadingService } from 'src/core/observations/services/reading/index.service';
import { IProtocolNode } from './chronic-file/file-structure/protocol';
import { ProtocolItemEntity } from 'src/core/observations/entities/protocol-item.entity';
import { InternalServerErrorException } from '@nestjs/common';
import { ifError } from 'assert';
import { ReadingEntity } from 'src/core/observations/entities/reading.entity';
import { IReadingEntry } from './chronic-file/file-structure/reading';

export class ImportExport {
  private chronicFileService: ChronicFileService;
  private observationsService: ObservationService;
  private protocolService: ProtocolService;
  private protocolItemService: ProtocolItemService;
  private readingService: ReadingService;

  constructor(options: {
    chronicFileService: ChronicFileService;
    observationsService: ObservationService;
    protocolService: ProtocolService;
    protocolItemService: ProtocolItemService;
    readingService: ReadingService;
  }) {
    this.chronicFileService = options.chronicFileService;
    this.observationsService = options.observationsService;
    this.protocolService = options.protocolService;
    this.protocolItemService = options.protocolItemService;
    this.readingService = options.readingService;
  }

  /**
   * Import a chronic file as an observation in the database
   * @param options
   * @returns The observations created
   */
  public async importChronic(options: {
    files: Express.Multer.File[];
    user: UserEntity;
  }): Promise<ObservationEntity[]> {
    const output: ObservationEntity[] = [];

    // Loop on each files given as argument
    for (const file of options.files) {
      // **************************************
      // Get the chronic data in json form
      // **************************************

      const chronic = Import.importChronic(file.buffer);

      const chronicName = file.originalname.replace(/.chronic/g, '');
      const staticLayer = chronic.graphManager.layers[0];
      const isTimeIntervalManual = staticLayer.isTimeIntervalManual;
      const dataMod = <DataModsEnum>chronic.modeManager.currentMode;
      const currentTimeAxis =
        dataMod === DataModsEnum.Calendar
          ? staticLayer.calendarTimeAxis
          : staticLayer.chronometerTimeAxis;

      // **************************************
      // Create an observation in the db from the json
      // **************************************
      // This include the graph part

      const obsCreated = await this.observationsService.create.create({
        name: chronicName,
        description: '',
        creator: options.user,
        enabled: true,
        isExample: false,
        type: TypesEnum.Standard,
        dataMod: dataMod,
        saveFilePath: chronic.hasSaveFile ? chronic.saveFile : undefined,
        mediaPath: chronic.reading.mediaFilePath,
        hasLinkedAudioFile: chronic.reading.hasLinkedAudioFile,
        hasLinkedVideoFile: chronic.reading.hasLinkedVideoFile,

        // Graph painter zone
        sliderStartTime: isTimeIntervalManual
          ? currentTimeAxis.time.startTime.toISOString()
          : 'auto',
        sliderEndTime: isTimeIntervalManual
          ? currentTimeAxis.time.endTime.toISOString()
          : 'auto',
        leftMargin: staticLayer.leftMargin,
        timeTickCalendarFormat: currentTimeAxis.time.manualTimeFormat,
        timeTickChronoFormat: currentTimeAxis.time.manualTimeFormat,
        timeTickFreq: isTimeIntervalManual
          ? String(staticLayer.manualTimeInterval)
          : '0',
      });

      output.push(obsCreated);

      // **************************************
      // Protocol creation
      // **************************************

      const protocol = chronic.protocol;
      const protocolName = `protocol_${chronicName}`;

      // Protocol entity
      const protocolCreated = await this.protocolService.create.create({
        name: protocolName,
        descriptions: '',
        creator: options.user,
        enabled: true,
        itemPosType: chronic.autoPosButtons ? 'auto' : 'manual',
        buttonWidth: chronic.buttonsWidth / 16,
        observation: {
          id: obsCreated.id,
        },
      });

      // Protocol items entities
      const rootNode = protocol;

      // Create the root node with hard values
      const rootNodeItem = await this.protocolItemService.create.create({
        name: 'root',
        description: '',
        type: 'root',
        creator: options.user,
        protocol: {
          id: protocolCreated.id,
        },
      });
      // Recursively create the protocol items
      for (let i = 0, ie = rootNode.children.length; i < ie; i++) {
        const child = rootNode.children[i];
        await this.recursivelySaveProtocolItems(
          child,
          rootNodeItem.id,
          options.user,
          protocolCreated.id,
          i,
        );
      }

      // **************************************
      // Readings creation
      // **************************************

      const reading = chronic.reading;

      // Loop on each entry
      for (let i = 0, ie = reading.readings.length; i < ie; ++i) {
        const entry = reading.readings[i];

        const readingCreated = await this.readingService.create.create({
          label: entry.name,
          type: entry.flag,
          datetime: entry.time,
          orderNumber: i,
          observation: {
            id: obsCreated.id,
          },
        });
      }

      // **************************************
    }

    return output;
  }

  public async exportChronic(obsId: number): Promise<Buffer> {
    // First we need to create a chronic from the info in db
    // Get the observation
    const observation = await this.observationsService.findOne(obsId, {
      relations: ['protocol', 'readings'],
    });
    if (!observation) {
      throw new Error('Observation not found');
    }
    if (!observation.protocol) {
      throw new Error('Observation has no protocol');
    }

    // Get the protocol item root, it contains the full tree
    const rootProtocolItem =
      await this.protocolService.createItemTreeFromProtocol(
        observation.protocol.id,
      );

    // Create the protocol tree
    const protocolTree =
      this.convertPrototolItemTreeIntoNodeTree(rootProtocolItem);

    const readingEntries = observation.readings?.map(
      (reading: ReadingEntity) => {
        return this.convertReadingEntityIntoReadingEntry(reading);
      },
    );

    // Create a chronic from the observation object
    const chronic: IChronic = {
      version: 3,
      name: observation.name ?? '',
      hasSaveFile: observation.saveFilePath !== undefined,
      saveFile: observation.saveFilePath ?? '',
      autoPosButtons: true,
      scaleFactor: 1,
      buttonsWidth: observation.protocol?.buttonWidth ?? 16,
      extensionData: {
        version: 1,
        extensions: [],
      },
      modeManager: {
        currentMode: observation.dataMod ?? DataModsEnum.Calendar,
      },
      graphManager: {
        layers: [],
      },
      protocol: protocolTree,
      reading: {
        mediaFilePath: observation.mediaPath ?? '',
        hasLinkedAudioFile: observation.hasLinkedAudioFile ?? false,
        hasLinkedVideoFile: observation.hasLinkedVideoFile ?? false,
        dataManagerType: '',
        readings: readingEntries ?? [],
      },
    };

    // Export the chronic to a buffer
    const buffer = Export.exportChronic(chronic);

    return buffer;
  }

  private async recursivelySaveProtocolItems(
    node: IProtocolNode,
    parentNodeId: number,
    creator: UserEntity,
    protocolId: number,
    orderNumber: number,
  ) {
    const nodeItem = await this.protocolItemService.create.create({
      name: node.name,
      description: '',
      type: node.type,
      creator: creator,
      protocol: {
        id: protocolId,
      },
      parent: {
        id: parentNodeId,
      },
      orderNumber: node.indexInParentContext,

      color: node.colorName,
      posX: node.bX,
      posY: node.bY,
      posWidth: node.bWidth,
      posHeight: node.bHeight,
      shape: node.shape,
      visible: node.isVisible,
      backgroundCover: node.backgroundCover,
      backgroundMotif: String(node.backgroundMotif),
      thickness: node.thickness,
    });

    // Loop on each children
    // Recursion happens here
    for (let i = 0, ie = node.children.length; i < ie; i++) {
      const child = node.children[i];
      await this.recursivelySaveProtocolItems(
        child,
        nodeItem.id,
        creator,
        protocolId,
        i,
      );
    }
  }

  private convertProtocolItemIntoNode(item: ProtocolItemEntity): IProtocolNode {
    const node: IProtocolNode = {
      name: item.name,
      type: item.type,
      bX: item.posX ?? -1,
      bY: item.posY ?? -1,
      shape: item.shape,
      bWidth: item.posWidth ?? -1,
      bHeight: item.posHeight ?? -1,
      colorName: item.color,
      isVisible: item.visible,
      thickness: item.thickness,
      isRootNode: false,
      isBackground: item.shape === 'background' ? true : false,
      backgroundCover: item.backgroundCover ?? '',
      backgroundMotif: Number(item.backgroundMotif),
      indexInParentContext: item.orderNumber ?? 0,
      children: [],
    };

    return node;
  }

  private convertReadingEntityIntoReadingEntry(
    readingEntity: ReadingEntity,
  ): IReadingEntry {
    const entry: IReadingEntry = {
      name: readingEntity.label,
      flag: readingEntity.type,
      time: readingEntity.datetime,
      id: readingEntity.orderNumber,
    };

    return entry;
  }

  private convertPrototolItemTreeIntoNodeTree(rootItem: ProtocolItemEntity) {
    const recursiveConversion = (item: ProtocolItemEntity) => {
      const node = this.convertProtocolItemIntoNode(item);
      if (item.children) {
        for (const child of item.children) {
          node.children.push(recursiveConversion(child));
        }
      }
      return node;
    };

    const rootNode = recursiveConversion(rootItem);

    return rootNode;
  }
}

export { IChronic };
