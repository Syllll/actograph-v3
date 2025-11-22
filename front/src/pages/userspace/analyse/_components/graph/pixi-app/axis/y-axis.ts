import { IObservation } from '@services/observations/interface';
import { BaseGroup } from '../lib/base-group';
import { Application, Container, Text } from 'pixi.js';
import { BaseGraphic } from '../lib/base-graphic';
import { ProtocolItem, protocolService } from '@services/observations/protocol.service';

/**
 * Classe représentant l'axe Y (vertical) du graphique d'activité.
 * 
 * Cet axe affiche les observables du protocole organisés par catégories.
 * Chaque observable est représenté par :
 * - Une ligne horizontale (tick) sur l'axe
 * - Un label avec le nom de l'observable
 * 
 * L'axe Y est dessiné de bas en haut, avec :
 * - Le début de l'axe en bas (point de départ des données)
 * - La fin de l'axe en haut (avec une flèche)
 * - Les ticks positionnés selon le nombre d'observables
 */
export class yAxis extends BaseGroup {
  /** Objet graphique utilisé pour dessiner l'axe et les ticks */
  private graphic: BaseGraphic;
  
  /** Conteneur pour les labels textuels des observables */
  private labelsContainer: Container;
  
  /** 
   * Liste des ticks (marqueurs) sur l'axe Y.
   * Chaque tick représente un observable avec sa position, son label et sa catégorie.
   */
  private ticks: {
    label: string,
    pos?: number,
    category: ProtocolItem,
    observable: ProtocolItem,
  }[] = [];
  
  /** Liste des catégories du protocole (chaque catégorie contient des observables) */
  private categories: ProtocolItem[] = [];
  
  /** Options de style pour le rendu de l'axe */
  private styleOptions = {
    axis: {
      color: 'black',
      width: 2,
    },
    tick: {
      color: 'black',
      width: 1,
    },
    label: {
      color: 'black',
      fontSize: 12,
      fontFamily: 'Arial',
    },
  }

  /** 
   * Décalage de l'axe par rapport aux bords du canvas.
   * x: 150px depuis la gauche (espace pour les labels)
   * y: 20px depuis le haut (marge supérieure)
   */
  private axisOffset = {
    x: 150,
    y: 20,
  };

  /** Position de départ de l'axe (en bas) */
  private axisStart: {
    x: number,
    y: number,
  } | null = null;

  /** Position de fin de l'axe (en haut) */
  private axisEnd: {
    x: number,
    y: number,
  } | null = null;

  /**
   * Retourne la position de départ de l'axe (copie pour éviter les mutations).
   * Cette position est utilisée par l'axe X et la zone de données pour s'aligner.
   */
  public getAxisStart() {
    return { ...this.axisStart };
  }
  
  /**
   * Retourne la position de fin de l'axe (copie pour éviter les mutations).
   */
  public getAxisEnd() {
    return { ...this.axisEnd };
  }

  constructor(app: Application) {
    super(app);

    // Création de l'objet graphique pour dessiner l'axe et les ticks
    this.graphic = new BaseGraphic(this.app);
    this.addChild(this.graphic);

    // Création du conteneur pour les labels textuels
    // Les labels sont dans un conteneur séparé pour faciliter leur gestion
    this.labelsContainer = new Container();
    this.addChild(this.labelsContainer);
  }

  /**
   * Retourne la position Y d'un observable à partir de son nom (label).
   * 
   * Cette méthode est utilisée par la zone de données pour positionner
   * les readings sur le bon observable.
   * 
   * @param label - Nom de l'observable
   * @returns Position Y en pixels
   * @throws Error si le label n'est pas trouvé ou n'a pas de position
   */
  public getPosFromLabel(label: string): number {
    for (const tick of this.ticks) {
      if (tick.label === label) {
        if (!tick.pos) {
          throw new Error(`Tick with label ${label} has no position`);
        }
        return tick.pos;
      }
    }

    throw new Error(`Tick with label ${label} not found`);
  }

  /**
   * Configure les données de l'observation dans l'axe Y.
   * 
   * Cette méthode extrait le protocole de l'observation et parse les catégories
   * et observables qui seront affichés sur l'axe.
   * 
   * @param observation - Observation contenant le protocole
   * @throws Error si le protocole n'est pas trouvé
   */
  public setData(observation: IObservation) {
    super.setData(observation);

    // Récupération du protocole depuis l'observation
    const protocol = observation.protocol;
    if (!protocol) {
      throw new Error('No protocol found');
    }

    // Parsing du protocole pour extraire les catégories et observables
    // Le service parseProtocolItems organise les items en hiérarchie catégorie -> observables
    const categories = protocolService.parseProtocolItems(protocol);

    this.categories = categories;
  }

  /**
   * Efface tous les éléments de l'axe Y.
   * 
   * Cette méthode supprime les labels, réinitialise les ticks et les positions,
   * puis appelle clear() de la classe parente pour nettoyer les graphiques.
   */
  public clear() {
    // Suppression de tous les labels
    this.labelsContainer.removeChildren();

    // Réinitialisation des ticks et positions
    this.ticks = [];
    this.axisStart = null;
    this.axisEnd = null;

    // Nettoyage des graphiques (ligne d'axe, ticks)
    super.clear();
  }

  /**
   * Calcule la longueur totale de l'axe et génère la liste des ticks.
   * 
   * Cette méthode parcourt toutes les catégories et leurs observables pour :
   * - Calculer la longueur totale nécessaire pour l'axe
   * - Créer un tick pour chaque observable avec sa position relative
   * 
   * Espacement utilisé :
   * - 30px par observable
   * - 15px d'espacement entre les catégories
   * 
   * @returns Objet contenant la longueur totale de l'axe et la liste des ticks
   */
  private computeAxisLengthAndTicks(): {
    axisLength: number,
    ticks: {
      label: string,
      pos?: number,
      category: ProtocolItem,
      observable: ProtocolItem,
    }[],
  } {
    let axisLength = 0;

    const ticks: {
      label: string,
      pos?: number,
      category: ProtocolItem,
      observable: ProtocolItem,
    }[] = [];
    
    // Parcours de toutes les catégories du protocole
    for (const category of this.categories) {
      if (category.children) {
        // Parcours de tous les observables de la catégorie
        for (const observable of category.children) {
          // Chaque observable occupe 30px de hauteur
          axisLength += 30;
          
          // Création d'un tick pour cet observable
          ticks.push({
            label: observable.name,
            pos: axisLength, // Position relative depuis le début de l'axe
            category,
            observable,
          });
        }

        // Espacement de 15px entre les catégories
        axisLength += 15;
      }
    }

    return {
      axisLength,
      ticks,
    };
  }

  /**
   * Calcule la hauteur minimale requise pour le canvas.
   * 
   * Cette méthode est utilisée par PixiApp pour ajuster la hauteur du canvas
   * afin que tous les observables soient visibles.
   * 
   * @returns Hauteur minimale requise en pixels
   */
  public getRequiredHeight(): number {
    const { axisLength } = this.computeAxisLengthAndTicks();
    const offsetY = 20; // Marge supérieure
    const extraMargin = 20; // Marge supplémentaire pour le confort visuel
    return axisLength + offsetY + extraMargin;
  }

  /**
   * Dessine l'axe Y avec tous ses éléments (ligne, flèche, ticks, labels).
   * 
   * Cette méthode :
   * 1. Calcule la longueur de l'axe et les positions des ticks
   * 2. Détermine les positions de départ et de fin de l'axe
   * 3. Dessine la ligne principale de l'axe
   * 4. Dessine une flèche en haut de l'axe
   * 5. Dessine les ticks (marqueurs) pour chaque observable
   * 6. Affiche les labels avec les noms des observables
   * 
   * L'axe est dessiné de bas en haut :
   * - Début : en bas (yAxisStart) où les données commencent
   * - Fin : en haut (yAxisEnd) avec une flèche pointant vers le haut
   */
  public draw(): void {
    // L'axe se termine à 20px du haut de l'écran (offset.y)
    // La position de départ est déterminée par le nombre d'observables et de catégories

    const width = this.app.screen.width;
    const height = this.app.screen.height;

    // Calcul de la longueur totale de l'axe et génération des ticks
    // Cette méthode parcourt toutes les catégories et observables
    const { axisLength, ticks } = this.computeAxisLengthAndTicks();

    // Sauvegarde des ticks calculés (seront utilisés par getPosFromLabel)
    this.ticks = ticks;

    // Calcul des positions de départ et de fin de l'axe
    const offset = this.axisOffset;

    // L'axe Y commence en bas, à la position calculée selon le nombre d'observables
    // x: 150px depuis la gauche (espace pour les labels)
    // y: position basée sur la longueur totale de l'axe + marge supérieure
    const yAxisStart = {
      x: offset.x,
      y: axisLength + offset.y,
    };

    // L'axe Y se termine en haut, à 20px du haut de l'écran
    const yAxisEnd = {
      x: offset.x,
      y: offset.y,
    };

    // Sauvegarde des positions pour utilisation par les autres composants
    this.axisStart = yAxisStart;
    this.axisEnd = yAxisEnd;

    // Dessin de la ligne principale de l'axe
    this.graphic.moveTo(yAxisStart.x, yAxisStart.y);
    this.graphic.lineTo(yAxisEnd.x, yAxisEnd.y);
    this.graphic.setStrokeStyle({
      color: this.styleOptions.axis.color,
      width: this.styleOptions.axis.width,
    });
    this.graphic.stroke();

    // Dessin d'une flèche remplie en haut de l'axe
    // La flèche pointe vers le haut et indique la direction de l'axe
    this.graphic.moveTo(yAxisEnd.x, yAxisEnd.y);
    this.graphic.lineTo(yAxisEnd.x + 10, yAxisEnd.y + 10);
    this.graphic.lineTo(yAxisEnd.x - 10, yAxisEnd.y + 10);
    this.graphic.lineTo(yAxisEnd.x, yAxisEnd.y);
    this.graphic.closePath();
    this.graphic.fill({ color: this.styleOptions.axis.color });

    // Dessin des ticks (marqueurs) pour chaque observable
    for (const tick of this.ticks) {
      if (!tick.pos) {
        throw new Error('Tick position is undefined');
      }

      // Conversion de la position relative en position absolue sur le canvas
      // La position est calculée depuis le début de l'axe vers le haut
      const tickYPos = yAxisStart.y - tick.pos;
      tick.pos = tickYPos; // Mise à jour avec la position absolue

      // Dessin d'un tick horizontal (ligne perpendiculaire à l'axe)
      // Le tick s'étend de 10px à gauche à 10px à droite de l'axe
      this.graphic.moveTo(yAxisStart.x - 10, tickYPos);
      this.graphic.lineTo(yAxisStart.x + 10, tickYPos);
      this.graphic.setStrokeStyle({
        color: this.styleOptions.tick.color,
        width: this.styleOptions.tick.width,
      });
      this.graphic.stroke();

      // Création et positionnement du label textuel avec le nom de l'observable
      const label = new Text({
        text: tick.label,
        style: {
          fontSize: this.styleOptions.label.fontSize,
          fill: this.styleOptions.label.color,
          fontFamily: this.styleOptions.label.fontFamily,
        },
      });
      // Positionnement du label à gauche de l'axe
      label.x = yAxisStart.x - 12;
      label.y = tickYPos;
      // Ancrage du label : alignement à droite et centré verticalement
      label.anchor.set(1, 0.5);
      this.labelsContainer.addChild(label);
    }
  }
}