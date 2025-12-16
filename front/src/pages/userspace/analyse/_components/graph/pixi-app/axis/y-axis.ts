import { IObservation, DisplayModeEnum } from '@services/observations/interface';
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
  
  /** 
   * Liste des ticks (marqueurs) sur l'axe Y.
   * Chaque tick représente un observable avec sa position, son label et sa catégorie.
   * Pour les catégories en mode Frieze, des propriétés supplémentaires sont ajoutées.
   */
  private ticks: {
    label: string,
    pos?: number,
    category: ProtocolItem,
    observable: ProtocolItem,
    /** Pour les catégories en mode Frieze, indique que c'est un tick de type bandeau */
    isFrieze?: boolean,
    /** Pour les catégories en mode Frieze, la hauteur du bandeau */
    friezeHeight?: number,
    /** Position de début du bandeau (après draw(): position Y absolue du BAS) */
    friezeStartY?: number,
    /** Position de fin du bandeau (après draw(): position Y absolue du HAUT) */
    friezeEndY?: number,
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
  }

  /**
   * Retourne la position Y d'un observable à partir de son nom (label).
   * 
   * Cette méthode est utilisée par la zone de données pour positionner
   * les readings sur le bon observable.
   * 
   * @param label - Nom de l'observable
   * @returns Position Y en pixels, ou -1 si l'observable est dans une catégorie Background
   */
  public getPosFromLabel(label: string): number {
    for (const tick of this.ticks) {
      if (tick.label === label) {
        // Vérifier que tick.pos est défini (peut être 0, ce qui est une position valide)
        if (tick.pos === undefined || tick.pos === null) {
          throw new Error(`Tick with label ${label} has no position`);
        }
        return tick.pos;
      }
      // Pour les catégories en mode Frieze, on doit aussi chercher dans les children
      if (tick.isFrieze && tick.category.children) {
        const observable = tick.category.children.find((o) => o.name === label);
        if (observable) {
          // Retourner le centre du bandeau
          if (tick.pos === undefined || tick.pos === null) {
            throw new Error(`Tick with label ${label} has no position`);
          }
          return tick.pos;
        }
      }
    }

    // Si l'observable n'est pas trouvé, il est peut-être dans une catégorie Background
    // (qui n'a pas de position sur l'axe Y)
    return -1;
  }

  /**
   * Retourne les informations de frieze pour une catégorie donnée.
   * 
   * IMPORTANT: Cette méthode ne peut être appelée qu'APRÈS draw() car les positions
   * sont converties en coordonnées absolues lors du dessin.
   * 
   * @param categoryId - ID de la catégorie
   * @returns Informations de frieze (position, hauteur) ou null si pas en mode Frieze
   */
  public getFriezeInfo(categoryId: string): {
    centerY: number,
    startY: number,
    endY: number,
    height: number,
  } | null {
    const tick = this.ticks.find(
      (t) => t.isFrieze && t.category.id === categoryId
    );
    
    if (!tick || !tick.isFrieze || tick.pos === undefined || tick.friezeStartY === undefined || tick.friezeHeight === undefined) {
      return null;
    }

    // Après draw(), friezeStartY et friezeEndY contiennent déjà les positions absolues
    // Dans le système de coordonnées du canvas, Y augmente vers le BAS
    // friezeStartY = position Y du BAS du bandeau (valeur Y plus grande)
    // friezeEndY = position Y du HAUT du bandeau (valeur Y plus petite)
    if (tick.friezeEndY === undefined) {
      return null;
    }

    return {
      centerY: tick.pos,
      startY: tick.friezeStartY, // BAS du bandeau (Y plus grand)
      endY: tick.friezeEndY,     // HAUT du bandeau (Y plus petit)
      height: tick.friezeHeight,
    };
  }

  /**
   * Vérifie si une catégorie est en mode Background.
   * 
   * @param categoryId - ID de la catégorie
   * @returns true si la catégorie est en mode Background
   */
  public isCategoryBackground(categoryId: string): boolean {
    const category = this.categories.find((c) => c.id === categoryId);
    if (!category) {
      return false;
    }
    return category.graphPreferences?.displayMode === DisplayModeEnum.Background;
  }

  /**
   * Vérifie si une catégorie est en mode Frieze.
   * 
   * @param categoryId - ID de la catégorie
   * @returns true si la catégorie est en mode Frieze
   */
  public isCategoryFrieze(categoryId: string): boolean {
    const category = this.categories.find((c) => c.id === categoryId);
    if (!category) {
      return false;
    }
    return category.graphPreferences?.displayMode === DisplayModeEnum.Frieze;
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

    // Utiliser _items si disponible (déjà parsé), sinon parser items
    if (protocol._items && protocol._items.length > 0) {
      this.categories = protocol._items;
    } else {
      // Parsing du protocole pour extraire les catégories et observables
      const categories = protocolService.parseProtocolItems(protocol);
      this.categories = categories;
    }
  }

  /**
   * Met à jour le protocole et les catégories.
   * 
   * Cette méthode est appelée quand les préférences graphiques changent
   * (par exemple, le mode d'affichage d'une catégorie).
   * Elle synchronise les catégories avec les items du protocole mis à jour.
   * 
   * @param protocol - Protocole mis à jour
   */
  public setProtocol(protocol: { _items?: ProtocolItem[] }) {
    if (protocol._items && protocol._items.length > 0) {
      this.categories = protocol._items;
    }
  }

  /**
   * Efface tous les éléments de l'axe Y.
   * 
   * Cette méthode supprime les labels, réinitialise les ticks et les positions,
   * puis appelle clear() de la classe parente pour nettoyer les graphiques.
   */
  public clear() {
    // Supprimer uniquement les labels (pas le graphic) - parcourir en sens inverse pour éviter les problèmes d'index
    for (let i = this.children.length - 1; i >= 0; i--) {
      const child = this.children[i];
      if (child !== this.graphic) {
        this.removeChild(child);
      }
    }
    this.graphic.clear();

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
   * Les catégories en mode Background sont exclues de l'axe Y (pas d'espace alloué).
   * Les catégories en mode Frieze allouent un seul espace pour toute la catégorie.
   * Les catégories en mode Normal allouent un espace par observable.
   * 
   * Espacement utilisé :
   * - Mode Normal : 30px par observable
   * - Mode Frieze : 40px pour toute la catégorie (bandeau)
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
      /** Pour les catégories en mode Frieze, indique que c'est un tick de type bandeau */
      isFrieze?: boolean,
      /** Pour les catégories en mode Frieze, la hauteur du bandeau */
      friezeHeight?: number,
      /** Position de début du bandeau (haut) */
      friezeStartY?: number,
      /** Position de fin du bandeau (après draw(): position Y absolue du HAUT) */
      friezeEndY?: number,
    }[],
  } {
    let axisLength = 0;

    const ticks: {
      label: string,
      pos?: number,
      category: ProtocolItem,
      observable: ProtocolItem,
      isFrieze?: boolean,
      friezeHeight?: number,
      friezeStartY?: number,
      friezeEndY?: number,
    }[] = [];

    // Parcours de toutes les catégories du protocole
    for (const category of this.categories) {
      const displayMode = category.graphPreferences?.displayMode ?? DisplayModeEnum.Normal;
      
      // Les catégories en mode Background ne sont pas affichées sur l'axe Y
      if (displayMode === DisplayModeEnum.Background) {
        continue;
      }
      
      if (category.children) {
        if (displayMode === DisplayModeEnum.Frieze) {
          // Mode Frieze : un seul espace pour toute la catégorie (bandeau)
          const friezeHeight = 40; // Hauteur du bandeau
          const friezeStartY = axisLength; // Position de début du bandeau
          axisLength += friezeHeight;
          
          // On crée un tick pour la catégorie elle-même (pas pour chaque observable)
          // Le tick est positionné au centre du bandeau
          ticks.push({
            label: category.name,
            pos: friezeStartY + friezeHeight / 2, // Centre du bandeau
            category,
            observable: category, // La catégorie elle-même comme "observable" pour simplifier
            isFrieze: true,
            friezeHeight,
            friezeStartY,
          });
        } else {
          // Mode Normal : un espace par observable
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
    // Nettoyer les éléments précédents avant de redessiner
    this.graphic.clear();
    // Réinitialiser la position du graphic pour éviter les décalages
    this.graphic.x = 0;
    this.graphic.y = 0;
    
    // Supprimer uniquement les labels (pas le graphic) - parcourir en sens inverse pour éviter les problèmes d'index
    for (let i = this.children.length - 1; i >= 0; i--) {
      const child = this.children[i];
      if (child !== this.graphic) {
        this.removeChild(child);
      }
    }
    // Réinitialiser la position du yAxis pour garantir un positionnement correct
    // Le yAxis doit toujours être à (0, 0) dans le plot pour que les coordonnées absolues fonctionnent correctement
    this.x = 0;
    this.y = 0;
    this.scale.set(1);
    this.rotation = 0;
    this.ticks = [];

    // L'axe se termine à 20px du haut de l'écran (offset.y)
    // La position de départ est déterminée par le nombre d'observables et de catégories

    // Calcul de la longueur totale de l'axe et génération des ticks
    // Cette méthode parcourt toutes les catégories et observables
    const { axisLength, ticks } = this.computeAxisLengthAndTicks();

    // Calcul des positions de départ et de fin de l'axe AVANT de convertir les positions
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

    // Convertir toutes les positions relatives en positions absolues AVANT de sauvegarder dans this.ticks
    // Cela garantit que getPosFromLabel() retourne toujours des positions absolues correctes,
    // même si dataArea.draw() est appelé immédiatement après yAxis.draw()
    const ticksWithAbsolutePositions = ticks.map(tick => {
      if (tick.pos === undefined || tick.pos === null) {
        throw new Error(`Tick with label ${tick.label} has no position`);
      }
      
      // Conversion de la position relative en position absolue sur le canvas
      const tickYPos = yAxisStart.y - tick.pos;
      
      // Mise à jour des positions de frieze si nécessaire
      let friezeStartY = tick.friezeStartY;
      let friezeEndY = tick.friezeEndY;
      if (tick.isFrieze && tick.friezeStartY !== undefined && tick.friezeHeight !== undefined) {
        const absoluteFriezeBottomY = yAxisStart.y - tick.friezeStartY;
        const absoluteFriezeTopY = absoluteFriezeBottomY - tick.friezeHeight;
        friezeStartY = absoluteFriezeBottomY;
        friezeEndY = absoluteFriezeTopY;
      }
      
      return {
        ...tick,
        pos: tickYPos,
        friezeStartY,
        friezeEndY,
      };
    });

    // Sauvegarde des ticks avec positions absolues (seront utilisés par getPosFromLabel)
    this.ticks = ticksWithAbsolutePositions;

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

    // Dessin des ticks (marqueurs) pour chaque observable ou catégorie
    // Les positions sont déjà en coordonnées absolues dans this.ticks
    for (const tick of this.ticks) {
      if (tick.pos === undefined || tick.pos === null) {
        throw new Error('Tick position is undefined');
      }

      // tick.pos est déjà en position absolue (convertie ci-dessus)
      const tickYPos = tick.pos;

      if (tick.isFrieze) {
        // Mode Frieze : dessiner un indicateur de bandeau sur l'axe Y
        // Note: le bandeau lui-même est dessiné par DataArea.drawCategoryFrieze()
        
        // Ligne courte sur l'axe pour indiquer le centre
        this.graphic.moveTo(yAxisStart.x - 5, tickYPos);
        this.graphic.lineTo(yAxisStart.x + 5, tickYPos);
        this.graphic.setStrokeStyle({
          color: this.styleOptions.tick.color,
          width: this.styleOptions.tick.width,
        });
        this.graphic.stroke();

        // Création du label avec le nom de la catégorie (en gras pour le différencier)
        const label = new Text({
          text: tick.label,
          style: {
            fontSize: this.styleOptions.label.fontSize,
            fill: this.styleOptions.label.color,
            fontFamily: this.styleOptions.label.fontFamily,
            fontWeight: 'bold',
          },
        });
        // Positionnement du label à gauche de l'axe
        label.x = yAxisStart.x - 12;
        label.y = tickYPos;
        // Ancrage du label : alignement à droite et centré verticalement
        label.anchor.set(1, 0.5);
        // Forcer la visibilité et la mise à jour du label
        label.visible = true;
        label.alpha = 1;
        this.addChild(label);
      } else {
        // Mode Normal : dessiner un tick classique
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
        // Forcer la visibilité et la mise à jour du label
        label.visible = true;
        label.alpha = 1;
        this.addChild(label);
      }
    }
    
    // Forcer la mise à jour de la visibilité du conteneur yAxis après avoir ajouté tous les labels
    this.visible = true;
    this.alpha = 1;
  }
}