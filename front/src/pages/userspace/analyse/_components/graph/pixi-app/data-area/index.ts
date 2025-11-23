import { Application, Rectangle, Text, Container, Graphics } from 'pixi.js';
import { BaseGroup } from '../lib/base-group';
import {
  IReading,
  IObservation,
  ReadingTypeEnum,
  ObservationModeEnum,
} from '@services/observations/interface';
import { yAxis } from '../axis/y-axis';
import { xAxis } from '../axis/x-axis';
import {
  ProtocolItem,
  protocolService,
} from '@services/observations/protocol.service';
import { BaseGraphic } from '../lib/base-graphic';
import { useDuration } from 'src/composables/use-duration';
import { CHRONOMETER_T0 } from '@utils/chronometer.constants';

/**
 * Classe représentant la zone de données du graphique d'activité.
 * 
 * Cette zone affiche les readings sous forme de segments de ligne :
 * - Les readings de type DATA sont visualisés comme des transitions entre observables
 * - Les readings sont groupés par catégorie du protocole
 * - Chaque catégorie a son propre graphique pour dessiner ses readings
 * 
 * La zone gère également l'interaction avec la souris :
 * - Affichage de lignes en pointillés pour suivre le curseur
 * - Lignes de référence horizontale et verticale depuis l'origine
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
   * - Tous les graphiques des catégories
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

    // Nettoyage de tous les graphiques des catégories
    for (const graphicEntry of this.graphicPerCategory) {
      graphicEntry.graphic.clear();
    }
  }

  /**
   * Dessine la zone de données avec tous ses éléments.
   * 
   * Cette méthode :
   * 1. Dessine un rectangle transparent pour la zone interactive (fond)
   * 2. Dessine les readings pour chaque catégorie
   * 
   * Le rectangle de fond sert de zone de détection pour les événements souris.
   */
  public draw(): void {
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

    // Dessin des readings pour chaque catégorie
    for (const categoryEntry of this.readingsPerCategory) {
      this.drawCategory(categoryEntry);
    }
  }

  /**
   * Dessine les readings d'une catégorie sous forme de segments de ligne.
   * 
   * Les readings sont visualisés comme une ligne qui :
   * - Commence au premier reading sur son observable
   * - Se déplace horizontalement vers la droite jusqu'à la date du reading suivant
   * - Se déplace verticalement vers le nouvel observable (si changement)
   * - Continue ainsi jusqu'au reading STOP
   * 
   * Les segments horizontaux (maintenus sur le même observable) sont en vert épais.
   * Les segments verticaux (transitions entre observables) sont en gris fin.
   * 
   * @param categoryEntry - Entrée contenant la catégorie et ses readings
   */
  private drawCategory(categoryEntry: {
    category: ProtocolItem;
    readings: IReading[];
  }) {
    const category = categoryEntry.category;
    const readings = categoryEntry.readings;

    // Recherche ou création du graphique pour cette catégorie
    // Chaque catégorie a son propre graphique pour faciliter la gestion
    let graphicEntry = this.graphicPerCategory.find(
      (g) => g.category.id === category.id
    );
    if (!graphicEntry) {
      // Création d'un nouveau graphique pour cette catégorie
      const graphic = new BaseGraphic(this.app);
      this.addChild(graphic);
      (<any>graphic).__catId = category.id; // Stockage de l'ID pour référence
      this.graphicPerCategory.push({
        category,
        graphic,
      });
    }
    
    // Vérification que le graphique existe bien
    graphicEntry = this.graphicPerCategory.find(
      (g) => g.category.id === category.id
    );
    if (!graphicEntry) {
      throw new Error('Graphic not found for category');
    }

    const graphic = graphicEntry.graphic;

    // Récupération du premier reading pour initialiser la position de départ
    const firstReading = readings[0];
    if (!firstReading) {
      throw new Error('No readings found');
    }

    // Position de départ : début de l'axe Y (horizontalement) et position de l'observable (verticalement)
    const start = {
      x: this.yAxis?.getAxisStart()?.x ?? 0,
      y: this.yAxis.getPosFromLabel(firstReading.name),
    };

    // Positionnement du "stylo" graphique au point de départ
    graphic.moveTo(start.x, start.y);
    const last = {
      x: start.x,
      y: start.y,
    };

    // Parcours de tous les readings suivants pour dessiner les segments
    for (let i = 1; i < readings.length; i++) {
      const reading = readings[i];
      if (!reading) {
        throw new Error('No reading found');
      }

      // Calcul de la position Y :
      // - Si c'est un reading STOP, on utilise -1 (hors écran) pour fermer le segment
      // - Sinon, on récupère la position de l'observable correspondant
      const yPos =
        reading.type === ReadingTypeEnum.STOP
          ? -1
          : this.yAxis.getPosFromLabel(reading.name);
      
      // Calcul de la position X à partir de la date/heure du reading
      const xPos = this.xAxis.getPosFromDateTime(reading.dateTime);
      
      // Dessin d'un segment horizontal vers la droite jusqu'à la date du reading
      // Ce segment maintient la position Y actuelle (même observable)
      graphic.lineTo(xPos, last.y);
      graphic.setStrokeStyle({
        color: 'green', // Vert pour les segments horizontaux (maintien sur l'observable)
        width: 2,
      });
      graphic.stroke();

      // Dessin d'un segment vertical si nécessaire (changement d'observable)
      // Ce segment n'est dessiné que si la position Y est valide (pas de STOP)
      if (yPos >= 0) {
        graphic.lineTo(xPos, yPos);
        graphic.setStrokeStyle({
          color: 'grey', // Gris pour les segments verticaux (transitions)
          width: 1,
        });
        graphic.stroke();
      }

      // Mise à jour de la position actuelle pour le prochain segment
      last.x = xPos;
      last.y = yPos;
    }
  }
}
