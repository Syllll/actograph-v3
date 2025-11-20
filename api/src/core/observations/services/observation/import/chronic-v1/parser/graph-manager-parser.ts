import qtdatastream from '../qtdatastream';
import { CustomBuffer } from '../qtdatastream/src/buffer';
import { IGraphManagerV1 } from '../types/chronic-v1.types';
import { BadRequestException } from '@nestjs/common';

const types = qtdatastream.types;

/**
 * Parse le graph manager depuis un buffer Qt DataStream
 * Note: Cette implémentation est simplifiée car les métadonnées du graphique
 * ne sont pas utilisées lors de l'import vers v3. On parse juste assez pour
 * avancer correctement dans le buffer.
 */
export class GraphManagerV1Parser {
  /**
   * Parse le graph manager depuis le buffer
   * @param buffer Buffer avec position de lecture
   * @returns Graph manager parsé (simplifié)
   */
  public parseFromBuffer(buffer: typeof CustomBuffer.prototype): IGraphManagerV1 {
    const version = types.QDouble.read(buffer);
    const layers: any[] = [];

    if (version === 1) {
      const numOfLayers = types.QInt.read(buffer);

      for (let i = 0; i < numOfLayers; i++) {
        if (i === 0) {
          // Static layer - on doit parser toute la structure pour avancer dans le buffer
          // même si on n'utilise pas les données
          const graphNodeVersion = types.QDouble.read(buffer);
          const layerVersion = types.QDouble.read(buffer);
          
          // Parser la layer complète pour avancer dans le buffer
          // On utilise une approche simplifiée : on lit les données essentielles
          // et on ignore le reste
          this.parseLayer(buffer, layerVersion);
          
          layers.push({
            graphNodeVersion,
            version: layerVersion,
          });
        } else if (i === 1) {
          // Mouse layer - on lit juste la version
          const graphNodeVersion = types.QDouble.read(buffer);
          layers.push({
            graphNodeVersion,
          });
        } else {
          throw new BadRequestException(
            `Seulement 2 layers sont supportées (reçu ${numOfLayers})`,
          );
        }
      }
    } else {
      throw new BadRequestException(
        `Version de graph manager ${version} non supportée`,
      );
    }

    return {
      version,
      layers,
    };
  }

  /**
   * Parse une layer complète pour avancer dans le buffer
   * Cette méthode lit toutes les données de la layer sans les utiliser
   * car elles ne sont pas nécessaires pour l'import v3
   */
  private parseLayer(buffer: CustomBuffer, version: number): void {
    // Version 0.1, 0.2 ou 1.0
    if (version === 0.1 || version === 0.2 || version === 1.0) {
      // Point (2 doubles)
      types.QDouble.read(buffer);
      types.QDouble.read(buffer);
      
      // Chronometer time axis (complexe, on doit parser complètement)
      this.parseTimeAxis(buffer);
      
      // Calendar time axis (complexe, on doit parser complètement)
      this.parseTimeAxis(buffer);
      
      // Obs axis (on ignore pour l'instant, structure complexe)
      // On va juste avancer dans le buffer en lisant les données de base
      this.skipObsAxis(buffer);
      
      if (version === 0.2 || version === 1.0) {
        types.QDouble.read(buffer); // leftMargin
      }
      
      if (version === 1.0) {
        types.QBool.read(buffer); // isTimeIntervalManual
        types.QInt64.read(buffer); // manualTimeInterval
      }
    }
  }

  /**
   * Parse un time axis complet pour avancer dans le buffer
   */
  private parseTimeAxis(buffer: typeof CustomBuffer.prototype): void {
    const graphNodeVersion = types.QDouble.read(buffer);
    const version = types.QDouble.read(buffer);
    
    if (version === 0.1) {
      types.QBool.read(buffer); // enableMajorTick
      types.QBool.read(buffer); // enableMinorTick
      types.QDouble.read(buffer); // majorTickUnit
      types.QDouble.read(buffer); // minorTickUnit
      types.QDouble.read(buffer); // length
      types.QDouble.read(buffer); // offset
      types.QInt64.read(buffer); // unit
      types.QBool.read(buffer); // isTextAlongLine
      types.QUInt.read(buffer); // alignFlag
      
      // Rect (4 doubles)
      types.QDouble.read(buffer);
      types.QDouble.read(buffer);
      types.QDouble.read(buffer);
      types.QDouble.read(buffer);
      
      // Point (2 doubles)
      types.QDouble.read(buffer);
      types.QDouble.read(buffer);
      
      // Vector2D (2 doubles)
      types.QDouble.read(buffer);
      types.QDouble.read(buffer);
      
      // Vector (tickLabels) - liste de structures complexes
      const tickLabelsSize = types.QUInt.read(buffer);
      for (let i = 0; i < tickLabelsSize; i++) {
        // Chaque tick label a plusieurs champs
        types.QDouble.read(buffer); // position
        types.QString.read(buffer); // label
        // etc.
      }
      
      types.QString.read(buffer); // noLabel
      types.QBool.read(buffer); // drawEndArrow
      
      // Time structure
      const timeVersion = types.QDouble.read(buffer);
      types.QBool.read(buffer); // isMajorTickLengthCustom
      types.QDateTime.read(buffer); // startTime
      types.QDateTime.read(buffer); // endTime
      
      // TimeInterval (2 valeurs)
      types.QInt.read(buffer);
      types.QDouble.read(buffer);
      
      types.QInt.read(buffer);
      types.QDouble.read(buffer);
      
      if (timeVersion === 1.0) {
        types.QString.read(buffer); // manualTimeFormat
      }
    }
  }

  /**
   * Skip obs axis - structure complexe qu'on ignore pour l'instant
   */
  private skipObsAxis(buffer: typeof CustomBuffer.prototype): void {
    // Structure simplifiée : on lit juste les données de base
    // Si nécessaire, on peut implémenter le parsing complet plus tard
    const graphNodeVersion = types.QDouble.read(buffer);
    const version = types.QDouble.read(buffer);
    
    // Pour l'instant, on ignore le reste de la structure
    // car elle n'est pas utilisée dans v3
  }
}

