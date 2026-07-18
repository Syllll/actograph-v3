/**
 * Formats d'affichage du temps sur le graphe (axe X et label de survol).
 *
 * `Auto` reproduit le comportement historique : la granularité affichée
 * s'adapte automatiquement à la durée totale de l'observation
 * (voir formatAxisLabel / formatChronoAxisLabel dans @actograph/graph).
 * Les autres valeurs forcent une granularité fixe, choisie par l'utilisateur.
 */
export enum TimeDisplayFormatEnum {
  Auto = 'auto',
  /** JJ.MM.AAAA hh:mn:sec:ms */
  Full = 'full',
  /** JJ.MM.AAAA */
  DateOnly = 'dateOnly',
  /** hh:mn */
  HourMinute = 'hourMinute',
  /** hh:mn:sec */
  HourMinuteSecond = 'hourMinuteSecond',
  /** mn:sec */
  MinuteSecond = 'minuteSecond',
  /** sec (secondes seules, sans ms) */
  Second = 'second',
  /** mn:sec:ms */
  MinuteSecondMs = 'minuteSecondMs',
}
