import { ObservationModeEnum, ReadingTypeEnum } from '../enums';
import { parseCalendarDateTimeInTimeZone } from '../utils/observation-time-zone';
import { assertValidExchangeDocument } from './documents';
import { ExchangeParseError, ReadingExchangeDocument } from './types';

export interface LegacyReadingsOptions {
  mode?: ObservationModeEnum;
  timeZone?: string;
}
export function isLegacyReadingsText(text: string): boolean {
  return (
    text
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/, 1)[0]
      .trim() === '# Data export file'
  );
}

/** ActoGraph V1 DataList::exportToTextFile, with no inferred calendar timezone. */
export function parseLegacyReadingsText(
  text: string,
  options: LegacyReadingsOptions = {},
): ReadingExchangeDocument {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const fail = (message: string, row?: number): never => {
    throw new ExchangeParseError([{ code: 'legacy', message, ...(row ? { row } : {}) }]);
  };
  if (
    !isLegacyReadingsText(text) ||
    lines[1]?.trim() !== '# Data mod (0: chronometer, 1: calendar)' ||
    lines[3]?.trim() !== '# Flag, time, name'
  )
    fail('En-tête ActoGraph V1 invalide.');
  const modeCode = lines[2]?.trim();
  if (modeCode !== '0' && modeCode !== '1') fail('Mode ActoGraph V1 inconnu.', 3);
  const mode = modeCode === '0' ? ObservationModeEnum.Chronometer : ObservationModeEnum.Calendar;
  if (options.mode !== undefined && options.mode !== mode)
    fail('Le mode du fichier V1 ne correspond pas à celui de la chronique.', 3);
  if (mode === ObservationModeEnum.Calendar && !options.timeZone)
    fail('Choisissez explicitement le fuseau horaire du fichier calendrier V1.');
  const aliases: Record<string, ReadingTypeEnum> = {
    start: ReadingTypeEnum.START,
    stop: ReadingTypeEnum.STOP,
    data: ReadingTypeEnum.DATA,
    pause_start: ReadingTypeEnum.PAUSE_START,
    pausestart: ReadingTypeEnum.PAUSE_START,
    pause_end: ReadingTypeEnum.PAUSE_END,
    pauseend: ReadingTypeEnum.PAUSE_END,
  };
  const readings: ReadingExchangeDocument['readings'] = [];
  for (let index = 4; index < lines.length; index++) {
    const line = lines[index];
    if (line === '' && index === lines.length - 1) continue;
    const first = line.indexOf('\t\t'),
      second = line.indexOf('\t\t', first + 2);
    if (first < 0 || second < 0)
      fail('Ligne V1 invalide : trois champs séparés par deux tabulations requis.', index + 1);
    const flag = line.slice(0, first),
      timeText = line.slice(first + 2, second),
      name = line.slice(second + 2);
    const type = aliases[flag];
    if (!type) fail(`Type de relevé V1 non pris en charge : ${flag}`, index + 1);
    let time: string | number;
    if (mode === ObservationModeEnum.Chronometer) {
      const match = /^(\d+) ([0-6]) ([01]\d|2[0-3]):([0-5]\d):([0-5]\d)\.(\d{3})$/.exec(timeText);
      if (!match) fail('Durée V1 invalide : semaines jours HH:mm:ss.zzz attendu.', index + 1);
      const parts = match!;
      time =
        (((Number(parts[1]) * 7 + Number(parts[2])) * 24 + Number(parts[3])) * 60 +
          Number(parts[4])) *
          60000 +
        Number(parts[5]) * 1000 +
        Number(parts[6]);
    } else {
      if (!/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}\.\d{3}$/.test(timeText))
        fail('Horodatage calendrier V1 invalide.', index + 1);
      const date = parseCalendarDateTimeInTimeZone(timeText, options.timeZone!, 'reject');
      if (!date)
        fail('Date V1 invalide, heure inexistante ou ambiguë dans le fuseau choisi.', index + 1);
      time = date!.toISOString();
    }
    readings.push({ order: readings.length, type, name, description: null, time });
  }
  const document: ReadingExchangeDocument = {
    format: 'actograph-tabular',
    version: 1,
    kind: 'readings',
    mode,
    readings,
  };
  assertValidExchangeDocument(document);
  return document;
}
