import { Application, Rectangle } from 'pixi.js';
import { BaseGroup } from '../lib/base-group';
import {
  IReading,
  IObservation,
  ReadingTypeEnum,
} from '@services/observations/interface';
import { yAxis } from '../axis/y-axis';
import { xAxis } from '../axis/x-axis';
import {
  ProtocolItem,
  protocolService,
} from '@services/observations/protocol.service';
import { BaseGraphic } from '../lib/base-graphic';

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
    });
    
    // Masquage des lignes lorsque la souris quitte la zone
    this.graphicForBackground.on('pointerleave', (evt) => {
      this.pointerDashedLines.clear();
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
   * - Les readings groupés par catégorie
   * - Tous les graphiques des catégories
   */
  public clear() {
    super.clear();

    // Nettoyage des graphiques principaux
    this.graphicForBackground.clear();
    this.pointerDashedLines.clear();

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
