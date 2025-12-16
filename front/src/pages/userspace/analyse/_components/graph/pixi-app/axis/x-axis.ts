import { Application, Container, Graphics, Text } from 'pixi.js'
import { BaseGroup } from '../lib/base-group';
import { BaseGraphic } from '../lib/base-graphic';
import { IReading, IObservation, ObservationModeEnum } from '@services/observations/interface';
import { yAxis } from './y-axis';
import { useDuration } from 'src/composables/use-duration';
import { CHRONOMETER_T0 } from '@utils/chronometer.constants';

/**
 * Pas de temps disponibles pour les graduations de l'axe X.
 * 
 * Ces valeurs définissent les intervalles possibles pour les ticks temporels.
 * Le système choisira automatiquement le pas le plus approprié selon la plage
 * de temps couverte par les readings.
 * 
 * Les valeurs sont en millisecondes et couvrent des plages de 10ms à 20 ans.
 */
const timeSteps = {
  '10ms': 10,
  '100ms': 100,
  '1s': 1000,
  '10s': 10 * 1000,
  '1m': 60 * 1000,
  '10m': 60 * 10 * 1000,
  '30m': 60 * 30 * 1000,
  '1h': 60 * 60 * 1000,
  '2h': 60 * 60 * 2 * 1000,
  '4h': 60 * 60 * 4 * 1000,
  '6h': 60 * 60 * 6 * 1000,
  '8h': 60 * 60 * 8 * 1000,
  '12h': 60 * 60 * 12 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '2d': 24 * 60 * 60 * 2 * 1000,
  '3d': 24 * 60 * 60 * 3 * 1000,
  '4d': 24 * 60 * 60 * 4 * 1000,
  '5d': 24 * 60 * 60 * 5 * 1000,
  '6d': 24 * 60 * 60 * 6 * 1000,
  '7d': 24 * 60 * 60 * 7 * 1000,
  '8d': 24 * 60 * 60 * 8 * 1000,
  '1w': 24 * 60 * 60 * 7 * 1000,
  '2w': 24 * 60 * 60 * 14 * 1000,
  '3w': 24 * 60 * 60 * 21 * 1000,
  '4w': 24 * 60 * 60 * 28 * 1000,
  '1M': 24 * 60 * 60 * 30 * 1000,
  '2M': 24 * 60 * 60 * 60 * 1000,
  '3M': 24 * 60 * 60 * 90 * 1000,
  '6M': 24 * 60 * 60 * 180 * 1000,
  '1y': 24 * 60 * 60 * 365 * 1000,
  '2y': 24 * 60 * 60 * 365 * 2 * 1000,
  '3y': 24 * 60 * 60 * 365 * 3 * 1000,
  '4y': 24 * 60 * 60 * 365 * 4 * 1000,
  '5y': 24 * 60 * 60 * 365 * 5 * 1000,
  '6y': 24 * 60 * 60 * 365 * 6 * 1000,
  '10y': 24 * 60 * 60 * 365 * 10 * 1000,
  '20y': 24 * 60 * 60 * 365 * 20 * 1000,
}

/**
 * Classe représentant l'axe X (horizontal) du graphique d'activité.
 * 
 * Cet axe affiche la timeline temporelle basée sur les readings de l'observation.
 * Il gère :
 * - Le calcul automatique du pas de temps optimal pour les graduations
 * - La conversion des dates/heures en positions X sur le canvas
 * - L'affichage des ticks et labels temporels
 * 
 * L'axe X est positionné en bas du graphique et s'étend horizontalement.
 * Il dépend de l'axe Y pour connaître sa position verticale.
 */
export class xAxis extends BaseGroup {
  /** Objet graphique utilisé pour dessiner l'axe et les ticks */
  private graphic: BaseGraphic;
  
  /** Liste des readings utilisés pour calculer la plage temporelle */
  private readings: IReading[] = [];
  
  /** 
   * Conteneur pour les labels textuels de l'axe X.
   * Les labels affichent soit des dates/heures (mode calendrier) soit des durées (mode chronomètre),
   * selon le mode de l'observation.
   */
  private labelsContainer: Container;
  
  /** Référence à l'axe Y pour connaître sa position et s'aligner */
  private yAxis: yAxis;
  
  /** 
   * Facteur de conversion : pixels par milliseconde.
   * Utilisé pour convertir une date/heure en position X sur le canvas.
   */
  private pixelsPerMsec = 0;
  
  /** Timestamp de début de l'axe (en millisecondes) */
  private axisStartTimeInMsec = 0;
  
  /** Timestamp de fin de l'axe (en millisecondes) */
  private axisEndTimeInMsec = 0;

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
   * Liste des ticks (graduations) sur l'axe X.
   * Chaque tick représente un moment dans le temps avec sa date/heure et sa position.
   */
  private ticks: {
    dateTime: Date,
    label: string,
    pos?: number,
  }[] = [];

  /** Position de départ de l'axe (à gauche, aligné avec le début de l'axe Y) */
  private axisStart: {
    x: number,
    y: number,
  } | null = null;

  /** Position de fin de l'axe (à droite) */
  private axisEnd: {
    x: number,
    y: number,
  } | null = null;

  /** Instance du composable useDuration pour formater les durées en mode chronomètre */
  private duration = useDuration();

  /**
   * Retourne la position de départ de l'axe (copie pour éviter les mutations).
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
    
  constructor(app: Application, yAxis: yAxis) {
    super(app);

    // Sauvegarde de la référence à l'axe Y pour connaître sa position
    this.yAxis = yAxis;

    // Création de l'objet graphique pour dessiner l'axe et les ticks
    this.graphic = new BaseGraphic(this.app);
    this.addChild(this.graphic);

    // Création du conteneur pour les labels textuels
    this.labelsContainer = new Container();
    this.addChild(this.labelsContainer);
  }

  /**
   * Convertit une date/heure en position X sur le canvas.
   * 
   * Cette méthode est utilisée par la zone de données pour positionner
   * les readings sur l'axe temporel.
   * 
   * @param dateTime - Date/heure à convertir (Date ou string)
   * @returns Position X en pixels
   * @throws Error si l'axe Y n'a pas encore été initialisé
   */
  public getPosFromDateTime(dateTime: Date | string): number {
    // Conversion de la date en timestamp (millisecondes)
    const dateTimeInMsec = new Date(dateTime).getTime();

    // Récupération de la position de départ de l'axe Y (qui sert d'origine)
    const axisStart = this.yAxis.getAxisStart();
    if (!axisStart || !axisStart.x) {
      throw new Error('No axis start found');
    }

    // Calcul de la position X :
    // - On part de la position de départ de l'axe X (alignée avec l'axe Y)
    // - On ajoute la différence de temps multipliée par le facteur de conversion
    const pos = axisStart.x + (dateTimeInMsec - this.axisStartTimeInMsec) * this.pixelsPerMsec;

    return pos;
  }

  /**
   * Convertit une position X sur le canvas en date/heure.
   * 
   * Cette méthode est l'inverse de getPosFromDateTime et permet de déterminer
   * la date/heure correspondant à une position X donnée sur l'axe temporel.
   * 
   * @param xPos - Position X en pixels sur le canvas (doit être dans le même système de coordonnées que getPosFromDateTime)
   * @returns Date/heure correspondante
   * @throws Error si l'axe n'a pas encore été initialisé ou si pixelsPerMsec est 0
   */
  public getDateTimeFromPos(xPos: number): Date {
    // Vérification que le facteur de conversion est initialisé
    if (this.pixelsPerMsec === 0) {
      throw new Error('Axis not initialized: pixelsPerMsec is 0');
    }

    // Vérification que le timestamp de début est initialisé
    if (this.axisStartTimeInMsec === 0) {
      throw new Error('Axis not initialized: axisStartTimeInMsec is 0');
    }

    // Récupération de la position de départ de l'axe Y (qui sert d'origine)
    const axisStart = this.yAxis.getAxisStart();
    if (!axisStart || axisStart.x === undefined) {
      throw new Error('No axis start found');
    }

    // Calcul de la différence en pixels depuis le début de l'axe
    const pixelsFromStart = xPos - axisStart.x;

    // Conversion en millisecondes : pixels / (pixels par milliseconde)
    const timeDiffInMsec = pixelsFromStart / this.pixelsPerMsec;

    // Calcul du timestamp final : début de l'axe + différence de temps
    const dateTimeInMsec = this.axisStartTimeInMsec + timeDiffInMsec;

    // Création et retour de la date
    return new Date(dateTimeInMsec);
  }

  /**
   * Efface tous les éléments de l'axe X.
   * 
   * Cette méthode supprime les labels, réinitialise les ticks et le facteur de conversion,
   * puis appelle clear() de la classe parente pour nettoyer les graphiques.
   */
  public clear() {
    // Suppression de tous les labels
    this.labelsContainer.removeChildren();

    // Réinitialisation des ticks et du facteur de conversion
    this.ticks = [];
    this.pixelsPerMsec = 0;

    // Nettoyage des graphiques (ligne d'axe, ticks)
    super.clear();
  }

  /**
   * Configure les données de l'observation dans l'axe X.
   * 
   * Cette méthode :
   * 1. Extrait les readings de l'observation
   * 2. Calcule la plage temporelle (min/max)
   * 3. Détermine le pas de temps optimal pour les graduations
   * 4. Génère la liste des ticks avec leurs dates/heures et labels
   * 
   * Le système choisit automatiquement un pas de temps qui donne environ 5 ticks principaux,
   * en sélectionnant le pas le plus proche de l'idéal parmi les timeSteps disponibles.
   * 
   * Les labels des ticks sont formatés selon le mode de l'observation :
   * - Mode chronomètre : durées au format compact (ex: "2j 3h 15m 30s 500ms")
   * - Mode calendrier : dates/heures au format français (ex: "15-01-2024 10:30:45.123")
   * 
   * @param observation - Observation contenant les readings
   * @throws Error si aucun reading n'est trouvé
   */
  public setData(observation: IObservation) {
    super.setData(observation);

    // Récupération des readings depuis l'observation
    const readings = observation.readings;
    if (!readings?.length) {
      throw new Error('No readings found');
    }

    this.readings = readings;

    // Les readings sont supposés être triés par date/heure
    // Le premier est le plus ancien, le dernier est le plus récent
    const minReading = readings[0];
    const maxReading = readings[readings.length - 1];

    // Conversion des dates en timestamps (millisecondes)
    const minTimeInMsec = new Date(minReading.dateTime).getTime();
    const maxTimeInMsec = new Date(maxReading.dateTime).getTime();

    // Calcul du pas de temps idéal pour avoir environ 5 ticks principaux
    // Cela donne une bonne lisibilité sans surcharger l'axe
    const idealTimeStep = (maxTimeInMsec - minTimeInMsec) / 5;

    // Recherche du pas de temps le plus proche de l'idéal parmi les timeSteps disponibles
    let bestTimeStep: keyof typeof timeSteps | null = null;
    let diff = Number.MAX_SAFE_INTEGER;

    for (const timeStep of Object.keys(timeSteps)) {
      const timeStepValue = timeSteps[timeStep as keyof typeof timeSteps];
      const delta = Math.abs(timeStepValue - idealTimeStep);
      if (delta < diff) {
        bestTimeStep = timeStep as keyof typeof timeSteps;
        diff = delta;
      }
    }
    if (!bestTimeStep) {
      throw new Error('No best time step found');
    }

    // Récupération de la valeur du pas de temps optimal (en millisecondes)
    const mainTimeStepInMsec = timeSteps[bestTimeStep];

    const ticks: {
      dateTime: Date,
      label: string,
    }[] = [];

    // Calcul intelligent du premier tick :
    // On veut que les ticks soient alignés sur des valeurs "rondes" du pas de temps.
    // Par exemple, si le premier reading est à 00:00:11.000 et le pas est de 10 secondes,
    // on veut commencer l'axe à 00:00:10.000 pour avoir des ticks tous les 10 secondes.

    // Arrondi pour trouver le premier tick aligné sur le pas de temps
    const firstTickTimeInMsec = Math.round(minTimeInMsec / mainTimeStepInMsec) * mainTimeStepInMsec;

    // Génération des ticks en avançant par pas de temps jusqu'à dépasser la fin
    let currentTimeInMsec = firstTickTimeInMsec;
    while (currentTimeInMsec <= (maxTimeInMsec + mainTimeStepInMsec)) {
      // On n'affiche que les ticks qui sont dans la plage des readings
      if (currentTimeInMsec >= minTimeInMsec) {
        const dateTime = new Date(currentTimeInMsec);
        
        // Formatage du label selon le mode de l'observation
        // En mode chronomètre : afficher une durée (format compact : "Xj Yh Zm Ws Vms")
        // En mode calendrier : afficher la date/heure (format français : dd-MM-yyyy HH:mm:ss.xxx)
        let label: string;
        if (this.observation?.mode === ObservationModeEnum.Chronometer) {
          // Mode chronomètre : formater comme une durée depuis t0
          // CHRONOMETER_T0 est la date de référence définie dans @utils/chronometer.constants.ts
          // La durée est calculée comme la différence entre dateTime et CHRONOMETER_T0
          label = this.duration.formatFromDate(dateTime, CHRONOMETER_T0);
        } else {
          // Mode calendrier : formater comme une date/heure au format français
          // Format : dd-MM-yyyy HH:mm:ss.xxx (ex: 15-01-2024 10:30:45.123)
          label = dateTime.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3,
          }).replace(/\//g, '-');
        }
        
        ticks.push({ 
          dateTime,
          label,
        });
      }

      // Passage au tick suivant
      currentTimeInMsec += mainTimeStepInMsec;
    }

    // Sauvegarde des ticks calculés
    this.ticks = ticks;
  }

  /**
   * Dessine l'axe X avec tous ses éléments (ligne, flèche, ticks, labels).
   * 
   * Cette méthode :
   * 1. Calcule les positions de départ et de fin de l'axe (alignées avec l'axe Y)
   * 2. Calcule le facteur de conversion pixels/millisecondes
   * 3. Dessine la ligne principale de l'axe
   * 4. Dessine une flèche à droite de l'axe
   * 5. Dessine les ticks (graduations) pour chaque moment temporel
   * 6. Affiche les labels avec les dates/heures (inclinés à 45°)
   * 
   * L'axe est positionné horizontalement en bas du graphique, aligné avec
   * le début de l'axe Y.
   */
  public draw(): void {
    // Nettoyage du graphique et des labels avant de redessiner
    this.graphic.clear();
    this.graphic.x = 0;
    this.graphic.y = 0;
    this.labelsContainer.removeChildren();
    this.labelsContainer.x = 0;
    this.labelsContainer.y = 0;
    
    // Réinitialiser la position du xAxis pour garantir un positionnement correct
    this.x = 0;
    this.y = 0;
    this.scale.set(1);
    this.rotation = 0;

    const width = this.app.screen.width;

    // L'axe X commence à la position de départ de l'axe Y (alignement)
    // Cette position est le point d'origine du graphique (coin inférieur gauche)
    const xAxisStart = this.yAxis.getAxisStart();
    if (!xAxisStart || !xAxisStart.x || !xAxisStart.y) {
      throw new Error('No x axis start found');
    }
    this.axisStart = xAxisStart as {x: number, y: number};

    // L'axe X se termine à 90% de la largeur de l'écran
    // Cela laisse 10% de marge à droite pour la flèche et les labels
    const xAxisEnd = {
      x: width * 0.9,
      y: this.yAxis.getAxisStart().y,
    };
    if (!xAxisEnd || !xAxisEnd.x || !xAxisEnd.y) {
      throw new Error('No x axis end found');
    }
    this.axisEnd = xAxisEnd  as {x: number, y: number};

    // Dessin de la ligne principale de l'axe
    this.graphic.moveTo(xAxisStart.x, xAxisStart.y);
    this.graphic.lineTo(xAxisEnd.x, xAxisEnd.y);

    this.graphic.setStrokeStyle({
      color: this.styleOptions.axis.color,
      width: this.styleOptions.axis.width,
    });

    this.graphic.stroke();

    // Dessin d'une flèche remplie à droite de l'axe
    // La flèche pointe vers la droite et indique la direction du temps
    this.graphic.moveTo(xAxisEnd.x, xAxisEnd.y);
    this.graphic.lineTo(xAxisEnd.x - 10, xAxisEnd.y - 10);
    this.graphic.lineTo(xAxisEnd.x - 10, xAxisEnd.y + 10);
    this.graphic.lineTo(xAxisEnd.x, xAxisEnd.y);
    this.graphic.closePath();
    this.graphic.fill({ color: this.styleOptions.axis.color });

    // Calcul du facteur de conversion pixels/millisecondes
    // On réserve 20px à droite pour la flèche (10% de la largeur de l'axe)
    const axisLengthInPixels = (xAxisEnd.x - xAxisStart.x) - 20;
    const startReading = this.readings[0];
    
    // Vérification que les ticks ont été générés
    if (this.ticks.length === 0) {
      console.warn('No ticks generated for X axis');
      return;
    }
    
    const endTickTimeInMsecs = new Date(this.ticks[this.ticks.length - 1].dateTime).getTime();
    
    // La plage temporelle commence au premier reading et se termine au dernier tick
    const startTimeInMsecs = new Date(startReading.dateTime).getTime();
    const endTimeInMsecs = endTickTimeInMsecs;
    this.axisStartTimeInMsec = startTimeInMsecs;
    this.axisEndTimeInMsec = endTimeInMsecs;
    
    const axisTimeLengthInMsec = endTimeInMsecs - startTimeInMsecs;

    // Calcul du facteur de conversion : combien de pixels pour une milliseconde
    // Ce facteur sera utilisé pour convertir n'importe quelle date en position X
    const pixelsPerMsec = axisLengthInPixels / axisTimeLengthInMsec;
    this.pixelsPerMsec = pixelsPerMsec;

    // Dessin des ticks (graduations) pour chaque moment temporel
    for (const tick of this.ticks) {
      // Conversion de la date/heure du tick en position X
      const tickTimeInMsec = new Date(tick.dateTime).getTime();
      const tickXpos = xAxisStart.x + (tickTimeInMsec - this.axisStartTimeInMsec) * pixelsPerMsec;
      
      // Sauvegarde de la position du tick
      tick.pos = tickXpos;

      // Dessin d'un tick vertical (ligne perpendiculaire à l'axe)
      // Le tick s'étend de 10px au-dessus à 10px en-dessous de l'axe
      this.graphic.moveTo(tickXpos, xAxisStart.y - 10);
      this.graphic.lineTo(tickXpos, xAxisStart.y + 10);
      this.graphic.setStrokeStyle({
        color: this.styleOptions.tick.color,
        width: this.styleOptions.tick.width,
      });
      this.graphic.stroke();

      // Création et positionnement du label textuel
      // Le label contient soit une date/heure (mode calendrier) soit une durée (mode chronomètre)
      // Le formatage a été effectué lors de la génération des ticks dans setData()
      const label = new Text({
        text: tick.label,
        style: {
          fontSize: this.styleOptions.label.fontSize,
          fill: this.styleOptions.label.color,
          fontFamily: this.styleOptions.label.fontFamily,
        },
      });
      // Positionnement du label sous l'axe
      label.x = tickXpos;
      label.y = xAxisStart.y + 12;
      // Ancrage du label : légèrement décalé à gauche et aligné en haut
      label.anchor.set(-0.05, 0);
      // Rotation de 45° pour éviter le chevauchement des labels
      label.angle = 45;
      // Forcer la visibilité et la mise à jour du label
      label.visible = true;
      label.alpha = 1;
      this.labelsContainer.addChild(label);
    }
    
    // Forcer la mise à jour de la visibilité des conteneurs après avoir ajouté tous les labels
    this.labelsContainer.visible = true;
    this.labelsContainer.alpha = 1;
    this.visible = true;
    this.alpha = 1;
  }
}