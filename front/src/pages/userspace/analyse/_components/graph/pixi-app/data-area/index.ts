import { Application, Text, Container, Graphics } from 'pixi.js';
import { BaseGroup } from '../lib/base-group';
import {
  IReading,
  IObservation,
  ReadingTypeEnum,
  ObservationModeEnum,
  IProtocol,
  IGraphPreferences,
  BackgroundPatternEnum,
  DisplayModeEnum,
} from '@services/observations/interface';
import { yAxis } from '../axis/y-axis';
import { xAxis } from '../axis/x-axis';
import {
  ProtocolItem,
  protocolService,
  ProtocolItemActionEnum,
} from '@services/observations/protocol.service';
import { BaseGraphic } from '../lib/base-graphic';
import { useDuration } from 'src/composables/use-duration';
import { CHRONOMETER_T0 } from '@utils/chronometer.constants';
import { createPatternTexture } from '../lib/pattern-textures';

/**
 * Classe représentant la zone de données du graphique d'activité.
 * 
 * Cette zone affiche les readings sous forme de segments de ligne ou de points,
 * selon le type de catégorie (continue ou discrète) :
 * 
 * - Catégories continues (action === 'continuous' ou non défini) :
 *   → Readings visualisés comme des transitions entre observables (lignes step-line)
 *   → Segments horizontaux (maintien sur le même observable) en vert épais
 *   → Segments verticaux (transitions entre observables) en gris fin
 *   → Visualise la durée pendant laquelle chaque observable est actif
 * 
 * - Catégories discrètes (action === 'discrete') :
 *   → Readings visualisés comme des points individuels (cercles de 4px)
 *   → Pas de lignes entre les points (chaque occurrence est isolée)
 *   → Visualise les événements ponctuels sans notion de durée
 * 
 * Les readings sont groupés par catégorie du protocole et chaque catégorie
 * a son propre graphique pour dessiner ses readings.
 * 
 * La zone gère également l'interaction avec la souris :
 * - Affichage de lignes en pointillés pour suivre le curseur
 * - Lignes de référence horizontale et verticale depuis l'origine
 * - Label de temps affiché sous l'axe X à la position du curseur
 */
export class DataArea extends BaseGroup {
  /** Référence à l'axe Y pour connaître les positions des observables */
  private yAxis: yAxis;
  
  /** Référence à l'axe X pour connaître les positions temporelles */
  private xAxis: xAxis;
  
  /** 
   * Readings groupés par catégorie.
   * Chaque entrée contient une catégorie et la liste de ses readings.
   */
  private readingsPerCategory: {
    category: ProtocolItem;
    readings: IReading[];
  }[] = [];

  /** 
   * Graphiques par catégorie.
   * Chaque catégorie a son propre objet graphique pour dessiner ses readings.
   */
  private graphicPerCategory: {
    category: ProtocolItem;
    graphic: BaseGraphic;
  }[] = [];

  /** Graphique pour le fond de la zone de données (zone interactive) */
  private graphicForBackground: BaseGraphic;

  /** Graphique pour les lignes en pointillés qui suivent le curseur */
  private pointerDashedLines: BaseGraphic;

  /** 
   * Conteneur pour le label de temps avec fond blanc.
   * Ce conteneur regroupe le texte et le rectangle de fond pour faciliter
   * le positionnement et la gestion de la visibilité.
   */
  private timeLabelContainer: Container | null = null;
  
  /** 
   * Label textuel affichant le temps à la position du curseur sur l'axe X.
   * Le format dépend du mode de l'observation :
   * - Mode chronomètre : durée formatée (ex: "2j 3h 15m 30s 500ms")
   * - Mode calendrier : date/heure au format français (dd-MM-yyyy HH:mm:ss.xxx)
   * Le label est affiché juste sous l'axe X (abscisse), centré horizontalement sur le curseur.
   */
  private timeLabel: Text | null = null;
  
  /** 
   * Rectangle de fond blanc pour le label de temps.
   * Ce rectangle améliore la lisibilité du texte en créant un contraste
   * avec le fond du graphique et les autres éléments.
   */
  private timeLabelBackground: Graphics | null = null;

  /** Instance du composable useDuration pour formater les durées en mode chronomètre */
  private duration = useDuration();

  /** Protocole contenant les préférences graphiques */
  private protocol: IProtocol | null = null;

  /** Observation courante pour accéder au protocole */
  protected observation: IObservation | null = null;

  constructor(app: Application, yAxis: yAxis, xAxis: xAxis) {
    super(app);

    // Sauvegarde des références aux axes pour les calculs de position
    this.yAxis = yAxis;
    this.xAxis = xAxis;

    // Création du graphique pour le fond (zone interactive pour les événements souris)
    this.graphicForBackground = new BaseGraphic(app);
    this.addChild(this.graphicForBackground);

    // Création du graphique pour les lignes en pointillés du curseur
    this.pointerDashedLines = new BaseGraphic(app);
    this.addChild(this.pointerDashedLines);

    // Création d'un conteneur pour le label de temps avec fond blanc
    // Ce conteneur permet de grouper le texte et son fond pour faciliter
    // le positionnement et la gestion de la visibilité
    this.timeLabelContainer = new Container();
    this.addChild(this.timeLabelContainer);

    // Création du rectangle de fond blanc
    // Ce rectangle sera redessiné dynamiquement selon la taille du texte
    // pour s'adapter au contenu affiché
    this.timeLabelBackground = new Graphics();
    this.timeLabelContainer.addChild(this.timeLabelBackground);

    // Création du label textuel pour afficher le temps
    // Le texte sera mis à jour dynamiquement lors du mouvement de la souris
    // pour afficher la date/heure correspondant à la position du curseur
    this.timeLabel = new Text({
      text: '',
      style: {
        fontSize: 12,
        fill: 'black',
        fontFamily: 'Arial',
      },
    });
    this.timeLabelContainer.addChild(this.timeLabel);
  }

  /**
   * Initialise les événements interactifs de la zone de données.
   * 
   * Cette méthode configure :
   * - Les événements de mouvement de la souris pour afficher les lignes de référence
   * - Les événements de sortie de la zone pour masquer les lignes
   * 
   * Les lignes en pointillés aident l'utilisateur à lire les valeurs
   * en suivant le curseur depuis l'origine du graphique.
   */
  public init() {
    super.init();

    // Mode passif : les événements ne sont pas capturés par ce conteneur
    // Seuls les enfants peuvent recevoir des événements
    this.eventMode = 'passive';

    // Mode statique : le graphique de fond peut recevoir des événements
    this.graphicForBackground.eventMode = 'static';
    
    // Gestion du mouvement de la souris : affichage des lignes de référence
    this.graphicForBackground.on('pointermove', (evt) => {
      // Récupération de l'origine du graphique (début de l'axe Y)
      const origin = this.yAxis.getAxisStart();
      if (!origin) {
        throw new Error('No origin');
      }

      // Conversion des positions en coordonnées locales du graphique des lignes pointillées
      const p = evt.getLocalPosition(this.pointerDashedLines);
      const originLocal = this.pointerDashedLines.toLocal(origin as any);

      // Nettoyage des lignes précédentes
      this.pointerDashedLines.clear();

      // Dessin d'une ligne verticale en pointillés depuis le curseur jusqu'à l'axe X
      this.pointerDashedLines
        .setStrokeStyle({ color: 'black', width: 1, cap: 'butt' })
        .moveTo(p.x, p.y)
        .dashedLineTo(p.x, originLocal.y)
        .stroke();
    
      // Dessin d'une ligne horizontale en pointillés depuis le curseur jusqu'à l'axe Y
      this.pointerDashedLines
        .setStrokeStyle({ color: 'black', width: 1, cap: 'butt' })
        .moveTo(p.x, p.y)
        .dashedLineTo(originLocal.x, p.y)
        .stroke();

      // Affichage du temps sur l'axe X à la position du curseur
      // Le label affiche la date/heure ou la durée correspondant à la position X du curseur,
      // selon le mode de l'observation (chronomètre ou calendrier).
      // Le label est positionné juste sous l'axe X (abscisse) avec un fond blanc pour la lisibilité
      if (this.timeLabel) {
        try {
          // Conversion de la position X du curseur en date/heure
          // p.x est en coordonnées locales de pointerDashedLines (qui est un enfant de DataArea)
          // getDateTimeFromPos attend une position X dans le même système de coordonnées que getPosFromDateTime
          // getPosFromDateTime utilise axisStart.x qui est relatif au conteneur parent (plot/stage)
          // On doit donc convertir p.x en coordonnées du stage pour être cohérent
          const globalPos = this.pointerDashedLines.toGlobal({ x: p.x, y: p.y });
          const stagePos = this.app.stage.toLocal(globalPos);
          
          // Conversion de la position X en date/heure en utilisant la méthode inverse de getPosFromDateTime
          const dateTime = this.xAxis.getDateTimeFromPos(stagePos.x);
          
          // Formatage selon le mode de l'observation
          // En mode chronomètre : afficher une durée (format compact : "Xj Yh Zm Ws Vms")
          // En mode calendrier : afficher la date/heure (format français : dd-MM-yyyy HH:mm:ss.xxx)
          let timeString: string;
          if (this.observation?.mode === ObservationModeEnum.Chronometer) {
            // Mode chronomètre : formater comme une durée depuis t0
            // CHRONOMETER_T0 est la date de référence définie dans @utils/chronometer.constants.ts
            // La durée est calculée comme la différence entre dateTime et CHRONOMETER_T0
            timeString = this.duration.formatFromDate(dateTime, CHRONOMETER_T0);
          } else {
            // Mode calendrier : formater comme une date/heure au format français
            // Format : dd-MM-yyyy HH:mm:ss.xxx (ex: 15-01-2024 10:30:45.123)
            timeString = dateTime.toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              fractionalSecondDigits: 3,
            }).replace(/\//g, '-');
          }

          // Vérification que tous les éléments nécessaires sont disponibles
          if (!this.timeLabel || !this.timeLabelContainer || !this.timeLabelBackground) {
            return;
          }

          // Mise à jour du texte du label avec la date/heure formatée
          this.timeLabel.text = timeString;
          
          // Calcul des dimensions du texte pour créer le fond blanc adaptatif
          // Le fond blanc s'adapte automatiquement à la taille du texte affiché
          const padding = 4; // Padding autour du texte (en pixels)
          const textWidth = this.timeLabel.width;
          const textHeight = this.timeLabel.height;
          const backgroundWidth = textWidth + padding * 2;
          const backgroundHeight = textHeight + padding * 2;

          // Dessin du rectangle de fond blanc
          // Le rectangle est redessiné à chaque mise à jour pour s'adapter à la taille du texte
          this.timeLabelBackground.clear();
          this.timeLabelBackground.rect(0, 0, backgroundWidth, backgroundHeight);
          this.timeLabelBackground.fill({ color: 'white' });

          // Positionnement du texte dans le conteneur (avec padding)
          // Le texte est positionné avec un décalage égal au padding pour créer l'espace blanc autour
          this.timeLabel.x = padding;
          this.timeLabel.y = padding;
          
          // Positionnement du conteneur sur l'axe X, juste sous l'axe (abscisse)
          // Horizontalement : centré sur le curseur (p.x - backgroundWidth / 2)
          //   - Le label est centré horizontalement sur la position du curseur
          //   - Cela permet de suivre précisément la position temporelle indiquée par la ligne verticale pointillée
          // Verticalement : sous l'axe X (originLocal.y + 15px)
          //   - Le label est positionné juste sous l'axe X pour ne pas masquer les autres éléments
          //   - L'offset de 15px permet de laisser un espace entre l'axe et le label
          // p.x est en coordonnées locales de pointerDashedLines, qui est aligné avec DataArea
          // Comme timeLabelContainer est aussi un enfant de DataArea, on peut utiliser p.x directement
          this.timeLabelContainer.x = p.x - backgroundWidth / 2; // Centré horizontalement sur le curseur
          this.timeLabelContainer.y = originLocal.y + 15; // 15px sous l'axe X
          this.timeLabelContainer.visible = true;
        } catch (error) {
          // Si l'axe n'est pas encore initialisé ou si une erreur survient, on masque le label
          // Cela peut arriver si l'axe X n'a pas encore été dessiné ou si les données ne sont pas disponibles
          // En développement, on pourrait logger l'erreur pour le débogage
          if (this.timeLabelContainer) {
            this.timeLabelContainer.visible = false;
          }
        }
      }
    });
    
    // Masquage des lignes et du label lorsque la souris quitte la zone
    // Lorsque l'utilisateur sort de la zone de données, on nettoie les éléments visuels
    // (lignes pointillées et label de temps) pour éviter qu'ils restent affichés
    this.graphicForBackground.on('pointerleave', (evt) => {
      // Nettoyage des lignes pointillées de référence
      this.pointerDashedLines.clear();
      // Masquage du label de temps
      if (this.timeLabelContainer) {
        this.timeLabelContainer.visible = false;
      }
    });
  }

  /**
   * Définit le protocole pour accéder aux préférences graphiques.
   * 
   * Cette méthode synchronise aussi les références de catégories dans readingsPerCategory
   * pour que les préférences graphiques mises à jour soient utilisées lors du dessin.
   * 
   * @param protocol - Protocole contenant les items avec leurs préférences
   */
  public setProtocol(protocol: IProtocol) {
    // S'assurer que _items est parsé si nécessaire (seulement si pas déjà parsé)
    if (protocol && protocol.items && (!protocol._items || protocol._items.length === 0)) {
      try {
        protocol._items = JSON.parse(protocol.items);
      } catch (e) {
        console.error('Failed to parse protocol items:', e);
        protocol._items = [];
      }
    }
    
    this.protocol = protocol;

    // Synchroniser les références de catégories dans readingsPerCategory
    // pour que les préférences graphiques mises à jour soient utilisées
    if (protocol._items && this.readingsPerCategory.length > 0) {
      for (const entry of this.readingsPerCategory) {
        const updatedCategory = protocol._items.find(
          (cat) => cat.id === entry.category.id
        );
        if (updatedCategory) {
          entry.category = updatedCategory;
        }
      }
    }
  }

  /**
   * Configure les données de l'observation dans la zone de données.
   * 
   * Cette méthode :
   * 1. Parse le protocole pour obtenir les catégories
   * 2. Initialise une liste vide de readings pour chaque catégorie
   * 3. Parcourt tous les readings de type DATA et les groupe par catégorie
   * 4. Ajoute le reading STOP à toutes les catégories (marque la fin de l'observation)
   * 
   * Les readings sont groupés par catégorie en fonction du nom de l'observable
   * auquel ils correspondent.
   * 
   * @param observation - Observation contenant les readings et le protocole
   * @throws Error si le protocole ou les readings ne sont pas trouvés
   */
  public setData(observation: IObservation) {
    super.setData(observation);
    this.observation = observation;

    // Récupération et parsing du protocole
    const protocol = observation.protocol;
    if (!protocol) {
      throw new Error('No protocol found');
    }
    const categories = protocolService.parseProtocolItems(protocol);

    // Initialisation de la liste des readings par catégorie
    this.readingsPerCategory = [];
    
    // Création d'une entrée vide pour chaque catégorie
    for (const category of categories) {
      this.readingsPerCategory.push({
        category,
        readings: [],
      });
    }

    // Récupération des readings
    const readings = observation.readings;
    if (!readings?.length) {
      throw new Error('No readings found');
    }

    // Parcours de tous les readings et groupement par catégorie
    // Seuls les readings de type DATA sont traités ici
    for (const reading of readings) {
      if (reading.type === ReadingTypeEnum.DATA) {
        const obsName = reading.name;

        // Recherche de la catégorie qui contient un observable avec le même nom
        const categoryEntry = this.readingsPerCategory.find((r) =>
          r.category.children?.some((o) => o.name === obsName)
        );
        if (!categoryEntry) {
          console.warn(`Category not found for observable ${obsName}`);
          continue;
        }

        // Ajout du reading à la catégorie correspondante
        categoryEntry.readings.push(reading);
      }
    }

    // Ajout du reading STOP à toutes les catégories
    // Le reading STOP marque la fin de l'observation et est utilisé pour fermer les segments
    const lastReading = readings[readings.length - 1];
    if (lastReading.type === ReadingTypeEnum.STOP) {
      for (const categoryEntry of this.readingsPerCategory) {
        categoryEntry.readings.push(lastReading);
      }
    }
  }

  /**
   * Efface tous les éléments de la zone de données.
   * 
   * Cette méthode nettoie :
   * - Le fond de la zone
   * - Les lignes en pointillés du curseur
   * - Le label de temps
   * - Les readings groupés par catégorie
   * - Tous les graphiques des catégories (supprimés et recréés si nécessaire)
   */
  public clear() {
    super.clear();

    // Nettoyage des graphiques principaux
    this.graphicForBackground.clear();
    this.pointerDashedLines.clear();

    // Masquage du label de temps lors du nettoyage de la zone de données
    if (this.timeLabelContainer) {
      this.timeLabelContainer.visible = false;
    }

    // Réinitialisation des données
    this.readingsPerCategory = [];

    // Suppression de tous les graphiques des catégories du conteneur et nettoyage
    for (const graphicEntry of this.graphicPerCategory) {
      graphicEntry.graphic.clear();
      this.removeChild(graphicEntry.graphic);
    }
    this.graphicPerCategory = [];
  }

  /**
   * Dessine la zone de données avec tous ses éléments.
   * 
   * Cette méthode :
   * 1. Dessine un rectangle transparent pour la zone interactive (fond)
   * 2. Dessine les readings pour chaque catégorie selon son mode d'affichage :
   *    - D'abord les catégories en mode "arrière plan" (zones sur le fond)
   *    - Ensuite les catégories en mode "frise" (bandeaux horizontaux)
   *    - Enfin les catégories en mode "normal" (step-lines)
   * 
   * Le rectangle de fond sert de zone de détection pour les événements souris.
   */
  public draw(): void {
    // Nettoyer le graphique de fond avant de redessiner
    this.graphicForBackground.clear();
    
    // Calcul des coins du rectangle de fond
    // Coin inférieur gauche : début de l'axe Y (origine du graphique)
    const bottomLeft = this.yAxis.getAxisStart() as {x: number, y: number};
    
    // Coin supérieur droit : fin de l'axe X (horizontalement) et fin de l'axe Y (verticalement)
    const topRight = {
      x: this.xAxis.getAxisEnd().x,
      y: this.yAxis.getAxisEnd().y,
    }  as {x: number, y: number};
    
    // Dessin d'un rectangle transparent pour la zone interactive
    // Ce rectangle permet de capturer les événements souris dans toute la zone de données
    this.graphicForBackground.rect(
      bottomLeft.x, 
      topRight.y, 
      topRight.x - bottomLeft.x, 
      Math.abs(topRight.y - bottomLeft.y)
    );
    this.graphicForBackground.fill({
      color: 'transparent',
    });

    // Trier les catégories selon leur mode d'affichage
    const backgroundCategories: typeof this.readingsPerCategory = [];
    const friezeCategories: typeof this.readingsPerCategory = [];
    const normalCategories: typeof this.readingsPerCategory = [];

    for (const categoryEntry of this.readingsPerCategory) {
      const displayMode = categoryEntry.category.graphPreferences?.displayMode ?? DisplayModeEnum.Normal;
      if (displayMode === DisplayModeEnum.Background) {
        backgroundCategories.push(categoryEntry);
      } else if (displayMode === DisplayModeEnum.Frieze) {
        friezeCategories.push(categoryEntry);
      } else {
        normalCategories.push(categoryEntry);
      }
    }

    // 1. Dessiner d'abord les catégories en mode arrière plan (en fond du graphique)
    // Trier pour que les catégories sans support (arrière-plan global) soient dessinées en premier
    backgroundCategories.sort((a, b) => {
      const aHasSupport = a.category.graphPreferences?.supportCategoryId ? 1 : 0;
      const bHasSupport = b.category.graphPreferences?.supportCategoryId ? 1 : 0;
      return aHasSupport - bHasSupport;
    });
    for (const categoryEntry of backgroundCategories) {
      this.drawCategoryBackground(categoryEntry);
    }

    // 2. Dessiner ensuite les catégories en mode frise (bandeaux)
    for (const categoryEntry of friezeCategories) {
      this.drawCategoryFrieze(categoryEntry);
    }

    // 3. Dessiner enfin les catégories en mode normal (step-lines)
    for (const categoryEntry of normalCategories) {
      this.drawCategoryNormal(categoryEntry);
    }
  }

  /**
   * Récupère ou crée le graphique pour une catégorie.
   * @param category - La catégorie
   * @returns Le graphique associé
   */
  private getOrCreateGraphicForCategory(category: ProtocolItem): BaseGraphic {
    let graphicEntry = this.graphicPerCategory.find(
      (g) => g.category.id === category.id
    );
    if (!graphicEntry) {
      const graphic = new BaseGraphic(this.app);
      this.addChild(graphic);
      this.graphicPerCategory.push({
        category,
        graphic,
      });
      graphicEntry = this.graphicPerCategory.find(
        (g) => g.category.id === category.id
      );
    }
    if (!graphicEntry) {
      throw new Error('Graphic not found for category');
    }
    return graphicEntry.graphic;
  }

  /**
   * Dessine une catégorie en mode Normal (step-lines).
   * 
   * Pour les catégories continues :
   * - Les readings sont visualisés comme une ligne qui :
   *   - Commence au premier reading sur son observable
   *   - Se déplace horizontalement vers la droite jusqu'à la date du reading suivant
   *   - Se déplace verticalement vers le nouvel observable (si changement)
   *   - Continue ainsi jusqu'au reading STOP
   * 
   * Pour les catégories discrètes (ponctuelles) :
   * - Chaque reading est affiché comme un point unique
   * - Pas de lignes entre les points
   */
  private drawCategoryNormal(categoryEntry: {
    category: ProtocolItem;
    readings: IReading[];
  }) {
    const category = categoryEntry.category;
    const readings = categoryEntry.readings;
    const graphic = this.getOrCreateGraphicForCategory(category);
    graphic.clear();

    const isDiscrete = category.action === ProtocolItemActionEnum.Discrete;

    if (isDiscrete) {
      // MODE DISCRET : Affichage en points
      for (const reading of readings) {
        if (reading.type === ReadingTypeEnum.DATA) {
          const xPos = this.xAxis.getPosFromDateTime(reading.dateTime);
          const yPos = this.yAxis.getPosFromLabel(reading.name);
          if (yPos < 0) continue; // Skip si la position n'est pas trouvée
          
          const prefs = this.getObservablePreferencesForReading(reading.name);
          const color = prefs?.color ?? 'green';
          const strokeWidth = prefs?.strokeWidth ?? 4;
          
          graphic.circle(xPos, yPos, strokeWidth / 2);
          graphic.setFillStyle({ color });
          graphic.fill();
        }
      }
    } else {
      // MODE CONTINU : Affichage en lignes step-line
      const firstReading = readings[0];
      if (!firstReading) return;

      const startY = this.yAxis.getPosFromLabel(firstReading.name);
      if (startY < 0) return; // Skip si catégorie en mode Background

      const start = {
        x: this.yAxis?.getAxisStart()?.x ?? 0,
        y: startY,
      };

      const last = { x: start.x, y: start.y };

      for (let i = 1; i < readings.length; i++) {
        const reading = readings[i];
        if (!reading) throw new Error('No reading found');

        const yPos =
          reading.type === ReadingTypeEnum.STOP
            ? -1
            : this.yAxis.getPosFromLabel(reading.name);
        
        const xPos = this.xAxis.getPosFromDateTime(reading.dateTime);
        
        const horizontalPrefs = this.getObservablePreferencesForReading(
          readings[i - 1]?.name || firstReading.name
        );
        const horizontalColor = horizontalPrefs?.color ?? 'green';
        const horizontalStrokeWidth = horizontalPrefs?.strokeWidth ?? 2;
        
        // Segment horizontal (du point précédent vers la position X du reading actuel)
        graphic.moveTo(last.x, last.y);
        graphic.lineTo(xPos, last.y);
        graphic.setStrokeStyle({
          color: horizontalColor,
          width: horizontalStrokeWidth,
        });
        graphic.stroke();

        // Segment vertical si changement d'observable (et si position Y valide)
        if (yPos >= 0) {
          graphic.moveTo(xPos, last.y);
          graphic.lineTo(xPos, yPos);
          graphic.setStrokeStyle({
            color: 'grey',
            width: 1,
          });
          graphic.stroke();
        }

        last.x = xPos;
        last.y = yPos;
      }
    }
  }

  /**
   * Dessine une catégorie en mode Background (zones sur le fond du graphique).
   * 
   * Pour chaque observable de la catégorie, on dessine une zone colorée/motif
   * sur TOUTE la hauteur de la zone centrale du graphique pendant que
   * l'observable est "actif" (entre le moment où il est sélectionné et le moment
   * où un autre observable de la même catégorie est sélectionné).
   */
  private drawCategoryBackground(categoryEntry: {
    category: ProtocolItem;
    readings: IReading[];
  }) {
    const category = categoryEntry.category;
    const readings = categoryEntry.readings;
    const graphic = this.getOrCreateGraphicForCategory(category);
    graphic.clear();

    // Les catégories discrètes n'ont pas de mode Background cohérent
    // (pas de notion de "zone active")
    if (category.action === ProtocolItemActionEnum.Discrete) {
      return;
    }

    if (readings.length === 0) return;

    // Récupérer les limites de la zone de données
    const bottomLeft = this.yAxis.getAxisStart() as {x: number, y: number};
    const topRight = {
      x: this.xAxis.getAxisEnd().x,
      y: this.yAxis.getAxisEnd().y,
    } as {x: number, y: number};
    
    const zoneHeight = Math.abs(topRight.y - bottomLeft.y);
    const zoneTopY = topRight.y;

    // Parcourir les readings pour trouver les zones actives de chaque observable
    for (let i = 0; i < readings.length; i++) {
      const reading = readings[i];
      if (!reading || reading.type !== ReadingTypeEnum.DATA) continue;

      // Trouver le reading suivant pour déterminer la fin de la zone
      const nextReading = readings[i + 1];
      if (!nextReading) continue;

      const startX = this.xAxis.getPosFromDateTime(reading.dateTime);
      const endX = this.xAxis.getPosFromDateTime(nextReading.dateTime);
      const zoneWidth = endX - startX;

      if (zoneWidth <= 0) continue;

      // Récupérer les préférences de l'observable
      const prefs = this.getObservablePreferencesForReading(reading.name);
      const color = prefs?.color ?? category.graphPreferences?.color ?? 'green';
      const pattern = prefs?.backgroundPattern ?? category.graphPreferences?.backgroundPattern ?? BackgroundPatternEnum.Solid;

      if (pattern === BackgroundPatternEnum.Solid) {
        // Couleur unie avec transparence
        graphic
          .rect(startX, zoneTopY, zoneWidth, zoneHeight)
          .fill({ color, alpha: 0.2 });
      } else {
        // Motif
        const patternTexture = createPatternTexture(this.app, pattern, color);
        if (patternTexture) {
          graphic
            .rect(startX, zoneTopY, zoneWidth, zoneHeight)
            .fill({
              texture: patternTexture,
              color: 0xffffff,
            });
        }
      }
    }
  }

  /**
   * Dessine une catégorie en mode Frise (bandeau horizontal).
   * 
   * Le bandeau a la hauteur allouée à la catégorie sur l'axe Y et est découpé
   * en zones colorées selon l'observable actif à chaque moment.
   */
  private drawCategoryFrieze(categoryEntry: {
    category: ProtocolItem;
    readings: IReading[];
  }) {
    const category = categoryEntry.category;
    const readings = categoryEntry.readings;
    const graphic = this.getOrCreateGraphicForCategory(category);
    graphic.clear();

    // Les catégories discrètes en mode Frieze affichent les points
    // sur un bandeau coloré
    if (category.action === ProtocolItemActionEnum.Discrete) {
      // Pour le mode discret en frise, on dessine juste les points
      // sur le bandeau
      const friezeInfo = this.yAxis.getFriezeInfo(category.id);
      if (!friezeInfo) return;

      for (const reading of readings) {
        if (reading.type === ReadingTypeEnum.DATA) {
          const xPos = this.xAxis.getPosFromDateTime(reading.dateTime);
          const yPos = friezeInfo.centerY;
          
          const prefs = this.getObservablePreferencesForReading(reading.name);
          const color = prefs?.color ?? 'green';
          const strokeWidth = prefs?.strokeWidth ?? 4;
          
          graphic.circle(xPos, yPos, strokeWidth / 2);
          graphic.setFillStyle({ color });
          graphic.fill();
        }
      }
      return;
    }

    if (readings.length === 0) return;

    // Récupérer les informations de frieze depuis l'axe Y
    const friezeInfo = this.yAxis.getFriezeInfo(category.id);
    if (!friezeInfo) {
      console.warn(`Frieze info not found for category ${category.id}`);
      return;
    }

    // friezeInfo.endY est le haut du bandeau (Y plus petit dans le système de coordonnées)
    // friezeInfo.startY est le bas du bandeau (Y plus grand)
    const friezeTopY = friezeInfo.endY;
    const friezeHeight = friezeInfo.height;

    // Parcourir les readings pour dessiner les zones du bandeau
    // Chaque zone va de la date du reading actuel jusqu'à la date du reading suivant
    for (let i = 0; i < readings.length; i++) {
      const reading = readings[i];
      if (!reading || reading.type !== ReadingTypeEnum.DATA) continue;

      // Position X de début = date/heure du reading actuel
      const segmentStartX = this.xAxis.getPosFromDateTime(reading.dateTime);

      // Trouver le reading suivant pour déterminer la fin de la zone
      const nextReading = readings[i + 1];
      if (!nextReading) continue; // Pas de segment pour le dernier reading

      const segmentEndX = this.xAxis.getPosFromDateTime(nextReading.dateTime);
      const segmentWidth = segmentEndX - segmentStartX;

      if (segmentWidth <= 0) continue;

      // Récupérer les préférences de l'observable
      const prefs = this.getObservablePreferencesForReading(reading.name);
      const color = prefs?.color ?? category.graphPreferences?.color ?? 'green';
      const pattern = prefs?.backgroundPattern ?? category.graphPreferences?.backgroundPattern ?? BackgroundPatternEnum.Solid;

      if (pattern === BackgroundPatternEnum.Solid) {
        // Couleur unie
        graphic
          .rect(segmentStartX, friezeTopY, segmentWidth, friezeHeight)
          .fill({ color, alpha: 0.6 });
        
        // Bordure pour délimiter les zones
        graphic
          .rect(segmentStartX, friezeTopY, segmentWidth, friezeHeight)
          .stroke({ color: color, width: 1 });
      } else {
        // Motif
        const patternTexture = createPatternTexture(this.app, pattern, color);
        if (patternTexture) {
          graphic
            .rect(segmentStartX, friezeTopY, segmentWidth, friezeHeight)
            .fill({
              texture: patternTexture,
              color: 0xffffff,
            });
        }
        // Bordure
        graphic
          .rect(segmentStartX, friezeTopY, segmentWidth, friezeHeight)
          .stroke({ color: color, width: 1 });
      }
    }
  }

  /**
   * Récupère les préférences graphiques d'un observable avec héritage depuis sa catégorie parente.
   * 
   * @param observableName - Nom de l'observable (utilisé pour trouver l'observable dans le protocole)
   * @returns Préférences graphiques avec héritage appliqué, ou null si aucune préférence
   */
  private getObservablePreferencesForReading(observableName: string): IGraphPreferences | null {
    if (!this.protocol || !this.protocol._items) {
      return null;
    }

    // Parcourir les catégories pour trouver l'observable
    for (const category of this.protocol._items) {
      if (category.type !== 'category' || !category.children) {
        continue;
      }

      // Chercher l'observable par son nom
      const observable = category.children.find(
        (obs) => obs.name === observableName && obs.type === 'observable'
      );

      if (observable) {
        // Si l'observable a des préférences, les retourner
        if (observable.graphPreferences) {
          return observable.graphPreferences;
        }

        // Sinon, retourner les préférences de la catégorie parente
        if (category.graphPreferences) {
          return category.graphPreferences;
        }

        // Aucune préférence trouvée
        return null;
      }
    }

    // Observable non trouvé
    return null;
  }

  /**
   * Redessine une catégorie entière selon son mode d'affichage.
   * 
   * @param observableId - ID de l'observable qui a changé
   */
  public redrawObservable(observableId: string) {
    if (!this.protocol || !this.protocol._items) {
      return;
    }

    // Trouver l'observable dans le protocole
    let targetCategory: ProtocolItem | null = null;

    for (const category of this.protocol._items) {
      if (category.children) {
        const observable = category.children.find((o) => o.id === observableId);
        if (observable) {
          targetCategory = category;
          break;
        }
      }
    }

    if (!targetCategory) {
      return;
    }

    const category = targetCategory;

    // Trouver la catégorie dans readingsPerCategory
    const categoryEntry = this.readingsPerCategory.find(
      (r) => r.category.id === category.id
    );

    if (!categoryEntry) {
      return;
    }

    // Redessiner la catégorie selon son mode d'affichage
    const displayMode = category.graphPreferences?.displayMode ?? DisplayModeEnum.Normal;

    switch (displayMode) {
      case DisplayModeEnum.Background:
        this.drawCategoryBackground(categoryEntry);
        break;
      case DisplayModeEnum.Frieze:
        this.drawCategoryFrieze(categoryEntry);
        break;
      default:
        this.drawCategoryNormal(categoryEntry);
        break;
    }
  }
}
