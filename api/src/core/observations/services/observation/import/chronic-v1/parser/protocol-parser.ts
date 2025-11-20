import qtdatastream from '../qtdatastream';
import { CustomBuffer } from '../qtdatastream/src/buffer';
import { IProtocolNodeV1 } from '../types/chronic-v1.types';
import { BadRequestException } from '@nestjs/common';

const types = qtdatastream.types;

/**
 * Parse un protocole depuis un buffer Qt DataStream
 */
export class ProtocolV1Parser {
  /**
   * Parse un nœud de protocole depuis le buffer
   * @param buffer Buffer avec position de lecture
   * @returns Nœud de protocole parsé
   */
  public parseFromBuffer(buffer: CustomBuffer): IProtocolNodeV1 {
    const version = types.QInt.read(buffer);
    let name: string;
    let type: string;
    let isRootNode: boolean;
    let colorName: string;
    let shape: string;
    let thickness: number;
    let isVisible: boolean;
    let indexInParentContext: number;
    let isBackground: boolean;
    let backgroundCover: string;
    let backgroundMotif: number;
    let bX: number = -1;
    let bY: number = -1;
    let bWidth: number = -1;
    let bHeight: number = -1;
    const children: IProtocolNodeV1[] = [];

    if (version === 1) {
      name = types.QString.read(buffer);
      type = types.QString.read(buffer);
      isRootNode = types.QBool.read(buffer);
      colorName = types.QString.read(buffer);
      shape = types.QString.read(buffer);
      thickness = types.QDouble.read(buffer);
      isVisible = types.QBool.read(buffer);
      indexInParentContext = types.QInt.read(buffer);
      isBackground = types.QBool.read(buffer);
      backgroundCover = types.QString.read(buffer);
      backgroundMotif = types.QInt.read(buffer);

      const numOfChildren = types.QInt.read(buffer);
      for (let i = 0; i < numOfChildren; i++) {
        children.push(this.parseFromBuffer(buffer));
      }
    } else if (version === 2) {
      name = types.QString.read(buffer);
      type = types.QString.read(buffer);
      isRootNode = types.QBool.read(buffer);
      colorName = types.QString.read(buffer);
      shape = types.QString.read(buffer);
      thickness = types.QDouble.read(buffer);
      isVisible = types.QBool.read(buffer);
      indexInParentContext = types.QInt.read(buffer);
      isBackground = types.QBool.read(buffer);
      backgroundCover = types.QString.read(buffer);
      backgroundMotif = types.QUInt.read(buffer);
      bX = types.QDouble.read(buffer);
      bY = types.QDouble.read(buffer);
      bWidth = types.QDouble.read(buffer);
      bHeight = types.QDouble.read(buffer);

      const numOfChildren = types.QInt.read(buffer);
      for (let i = 0; i < numOfChildren; i++) {
        children.push(this.parseFromBuffer(buffer));
      }
    } else {
      throw new BadRequestException(
        `Version de protocole ${version} non supportée`,
      );
    }

    return {
      version,
      name,
      type,
      isRootNode,
      colorName,
      shape,
      thickness,
      isVisible,
      indexInParentContext,
      isBackground,
      backgroundCover,
      backgroundMotif,
      bX,
      bY,
      bWidth,
      bHeight,
      children,
    };
  }
}

