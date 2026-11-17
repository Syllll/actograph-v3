import {
  BackgroundPatternEnum,
  DisplayModeEnum,
  ObservationModeEnum,
  ProtocolItemActionEnum,
  ProtocolItemTypeEnum,
  ReadingTypeEnum,
} from '../enums';
import { IProtocolItem } from '../types/protocol.types';
import { IReading } from '../types/reading.types';
import {
  ExchangeDiagnostic,
  ExchangeParseError,
  ExchangeValidationResult,
  ProtocolCorrespondenceDiagnostic,
  ProtocolExchangeDocument,
  ReadingExchangeDocument,
  TabularExchangeDocument,
  ExchangeKind,
} from './types';

export const EXCHANGE_CHRONOMETER_ZERO_MS = Date.parse('1989-02-09T00:00:00.000Z');
const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const optionalText = (value: unknown): boolean =>
  value === undefined || value === null || typeof value === 'string';
const enumValue = (value: unknown, values: object): boolean =>
  Object.values(values).includes(value);

/** Require an explicit timezone and reject calendar overflow instead of JS date coercion. */
export function isExchangeCalendarTime(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/.exec(
      value,
    );
  if (!match) return false;
  const [, year, month, day, hour, minute, second, , zone] = match;
  const y = Number(year),
    m = Number(month),
    d = Number(day);
  if (
    m < 1 ||
    m > 12 ||
    d < 1 ||
    d > new Date(Date.UTC(y, m, 0)).getUTCDate() ||
    Number(hour) > 23 ||
    Number(minute) > 59 ||
    Number(second) > 59
  )
    return false;
  if (zone !== 'Z' && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4, 6)) > 59))
    return false;
  return Number.isFinite(Date.parse(value));
}

export function createReadingsExchange(
  readings: readonly IReading[],
  mode: ObservationModeEnum,
): ReadingExchangeDocument {
  const ordered = readings
    .map((reading, index) => ({ reading, index }))
    .sort(
      (a, b) =>
        a.reading.dateTime.getTime() - b.reading.dateTime.getTime() ||
        (a.reading.sortOrder ?? a.reading.id ?? a.index) -
          (b.reading.sortOrder ?? b.reading.id ?? b.index) ||
        a.index - b.index,
    );
  return {
    format: 'actograph-tabular',
    version: 1,
    kind: 'readings',
    mode,
    readings: ordered.map(({ reading }, order) => ({
      order,
      type: reading.type,
      name: reading.name ?? null,
      description: reading.description ?? null,
      time:
        mode === ObservationModeEnum.Chronometer
          ? reading.dateTime.getTime() - EXCHANGE_CHRONOMETER_ZERO_MS
          : reading.dateTime.toISOString(),
    })),
  };
}

/** Only exchange references survive export; no source IDs are part of the portable file. */
export function createProtocolExchange(items: readonly IProtocolItem[]): ProtocolExchangeDocument {
  const ids = new Map<string, string>();
  let next = 0;
  const allocate = (nodes: readonly IProtocolItem[]): void =>
    nodes.forEach((item) => {
      ids.set(item.id, `item-${++next}`);
      if (item.children) allocate(item.children);
    });
  allocate(items);
  const clone = (nodes: readonly IProtocolItem[]): IProtocolItem[] =>
    nodes.map((item) => {
      const result = JSON.parse(JSON.stringify(item)) as IProtocolItem;
      result.id = ids.get(item.id)!;
      if (result.graphPreferences?.supportCategoryId) {
        const sourceReference = result.graphPreferences.supportCategoryId;
        if (!ids.has(sourceReference)) ids.set(sourceReference, `missing-support-${++next}`);
        result.graphPreferences.supportCategoryId = ids.get(sourceReference)!;
      }
      if (item.children) result.children = clone(item.children);
      return result;
    });
  return { format: 'actograph-tabular', version: 1, kind: 'protocol', items: clone(items) };
}

export function exchangeReadingsToReadings(document: ReadingExchangeDocument): IReading[] {
  const validation = validateExchangeDocument(document, 'readings');
  if (!validation.valid) throw new ExchangeParseError(validation.errors);
  return [...document.readings]
    .sort((a, b) => a.order - b.order)
    .map((reading) => ({
      name: reading.name,
      description: reading.description,
      type: reading.type,
      dateTime: new Date(
        document.mode === ObservationModeEnum.Chronometer
          ? EXCHANGE_CHRONOMETER_ZERO_MS + Number(reading.time)
          : String(reading.time),
      ),
      sortOrder: reading.order,
    }));
}

export function diagnoseProtocolCorrespondence(
  readings: readonly Pick<IReading, 'type' | 'name'>[],
  items: readonly IProtocolItem[],
): ProtocolCorrespondenceDiagnostic {
  const counts = new Map<string, number>();
  const visit = (nodes: readonly IProtocolItem[]): void =>
    nodes.forEach((item) => {
      if (item.type === ProtocolItemTypeEnum.Observable)
        counts.set(item.name, (counts.get(item.name) ?? 0) + 1);
      if (item.children) visit(item.children);
    });
  visit(items);
  const unknownNames = new Set<string>(),
    ambiguousNames = new Set<string>();
  let unknownReadingCount = 0,
    ambiguousReadingCount = 0;
  for (const reading of readings) {
    if (reading.type !== ReadingTypeEnum.DATA || reading.name?.startsWith('#')) continue;
    const name = reading.name ?? '';
    if (!name || !counts.has(name)) {
      unknownReadingCount++;
      unknownNames.add(name);
    } else if (counts.get(name)! > 1) {
      ambiguousReadingCount++;
      ambiguousNames.add(name);
    }
  }
  return {
    unknownReadingCount,
    unknownNames: [...unknownNames],
    ambiguousReadingCount,
    ambiguousNames: [...ambiguousNames],
    duplicateObservableNames: [...counts].filter(([, count]) => count > 1).map(([name]) => name),
  };
}

function validateReadings(
  value: Record<string, unknown>,
  errors: ExchangeDiagnostic[],
  warnings: ExchangeDiagnostic[],
  mode?: ObservationModeEnum,
): void {
  if (!enumValue(value.mode, ObservationModeEnum) || (mode !== undefined && value.mode !== mode))
    errors.push({ code: 'mode', message: 'Mode temporel incompatible ou absent.' });
  if (!Array.isArray(value.readings)) {
    errors.push({ code: 'readings', message: 'Liste de relevés absente.' });
    return;
  }
  const orders = new Set<number>();
  const signatures = new Set<string>();
  let session = false,
    paused = false;
  value.readings.forEach((reading: unknown, index: number) => {
    const row = index + 3;
    if (!isObject(reading)) {
      errors.push({ code: 'reading', message: 'Relevé invalide.', row });
      return;
    }
    if (!integer(reading.order) || orders.has(reading.order))
      errors.push({ code: 'order', message: 'Ordre entier positif ou nul et unique requis.', row });
    else orders.add(reading.order);
    if (!enumValue(reading.type, ReadingTypeEnum))
      errors.push({ code: 'type', message: 'Type de relevé inconnu.', row });
    if (!optionalText(reading.name) || !optionalText(reading.description))
      errors.push({ code: 'text', message: 'Libellé et commentaire doivent être du texte.', row });
    const timeValid =
      value.mode === ObservationModeEnum.Chronometer
        ? integer(reading.time) &&
          Number.isFinite(new Date(EXCHANGE_CHRONOMETER_ZERO_MS + reading.time).getTime())
        : isExchangeCalendarTime(reading.time);
    if (!timeValid)
      errors.push({
        code: 'time',
        message: 'Temps invalide : millisecondes entières ou date ISO avec fuseau requis.',
        row,
      });
    const signature = JSON.stringify([
      reading.time,
      reading.type,
      reading.name,
      reading.description,
    ]);
    if (signatures.has(signature))
      warnings.push({ code: 'duplicate', message: 'Doublon potentiel conservé.', row });
    signatures.add(signature);
    let inconsistent = false;
    if (reading.type === ReadingTypeEnum.START) {
      inconsistent = session;
      session = true;
      paused = false;
    }
    if (reading.type === ReadingTypeEnum.STOP) {
      inconsistent = !session;
      session = false;
      paused = false;
    }
    if (reading.type === ReadingTypeEnum.PAUSE_START) {
      inconsistent = !session || paused;
      paused = true;
    }
    if (reading.type === ReadingTypeEnum.PAUSE_END) {
      inconsistent = !session || !paused;
      paused = false;
    }
    if (inconsistent)
      warnings.push({
        code: 'session',
        message: 'Marqueur de session incohérent, conservé sans correction.',
        row,
      });
  });
  if (session)
    warnings.push({
      code: 'session_open',
      message: 'Session sans fin, conservée sans correction.',
    });
}

function validateProtocol(
  value: Record<string, unknown>,
  errors: ExchangeDiagnostic[],
  warnings: ExchangeDiagnostic[],
): void {
  if (!Array.isArray(value.items)) {
    errors.push({ code: 'items', message: 'Liste du protocole absente.' });
    return;
  }
  const ids = new Set<string>(),
    categories = new Set<string>(),
    references: string[] = [],
    names = new Map<string, number>();
  const visit = (items: unknown[], category: boolean): void =>
    items.forEach((item, index) => {
      const row = index + 3;
      if (!isObject(item)) {
        errors.push({ code: 'item', message: 'Élément de protocole invalide.', row });
        return;
      }
      if (typeof item.id !== 'string' || !item.id || ids.has(item.id))
        errors.push({ code: 'id', message: 'Référence de protocole absente ou dupliquée.', row });
      else {
        ids.add(item.id);
        if (category) categories.add(item.id);
      }
      if (
        item.type !== (category ? ProtocolItemTypeEnum.Category : ProtocolItemTypeEnum.Observable)
      )
        errors.push({
          code: 'structure',
          message: 'Une catégorie contient uniquement des observables.',
          row,
        });
      if (typeof item.name !== 'string' || !item.name.trim() || !optionalText(item.description))
        errors.push({
          code: 'name',
          message: 'Nom non vide et description textuelle requis.',
          row,
        });
      if (!category && typeof item.name === 'string')
        names.set(item.name, (names.get(item.name) ?? 0) + 1);
      if (item.action !== undefined && !enumValue(item.action, ProtocolItemActionEnum))
        errors.push({ code: 'action', message: 'Action de protocole invalide.', row });
      if (item.order !== undefined && !integer(item.order))
        errors.push({ code: 'order', message: 'Ordre de protocole invalide.', row });
      if (item.meta !== undefined && item.meta !== null && !isObject(item.meta))
        errors.push({ code: 'meta', message: 'Métadonnées invalides.', row });
      if (item.graphPreferences !== undefined) {
        const prefs = item.graphPreferences;
        if (!isObject(prefs))
          errors.push({ code: 'preferences', message: 'Préférences graphiques invalides.', row });
        else {
          const invalid =
            (prefs.color !== undefined && typeof prefs.color !== 'string') ||
            (prefs.strokeWidth !== undefined &&
              (typeof prefs.strokeWidth !== 'number' ||
                !Number.isFinite(prefs.strokeWidth) ||
                prefs.strokeWidth <= 0)) ||
            (prefs.displayMode !== undefined && !enumValue(prefs.displayMode, DisplayModeEnum)) ||
            (prefs.backgroundPattern !== undefined &&
              !enumValue(prefs.backgroundPattern, BackgroundPatternEnum)) ||
            (prefs.visible !== undefined && typeof prefs.visible !== 'boolean') ||
            !optionalText(prefs.supportCategoryId) ||
            !optionalText(prefs.supportCategoryName);
          if (invalid)
            errors.push({
              code: 'preferences',
              message: 'Valeur de préférence graphique invalide.',
              row,
            });
          if (typeof prefs.supportCategoryId === 'string' && prefs.supportCategoryId)
            references.push(prefs.supportCategoryId);
        }
      }
      if (item.children !== undefined && !Array.isArray(item.children))
        errors.push({ code: 'children', message: 'Enfants de protocole invalides.', row });
      if (Array.isArray(item.children)) {
        if (!category && item.children.length)
          errors.push({
            code: 'structure',
            message: 'Un observable ne peut pas avoir d’enfants.',
            row,
          });
        else visit(item.children, false);
      }
    });
  visit(value.items, true);
  references.forEach((reference) => {
    if (!categories.has(reference))
      warnings.push({
        code: 'support_reference',
        message: `Catégorie de support introuvable : ${reference}`,
      });
  });
  names.forEach((count, name) => {
    if (count > 1)
      warnings.push({ code: 'ambiguous_observable', message: `Nom d’observable ambigu : ${name}` });
  });
}

export function validateExchangeDocument(
  value: unknown,
  expectedKind?: ExchangeKind,
  mode?: ObservationModeEnum,
): ExchangeValidationResult {
  const errors: ExchangeDiagnostic[] = [],
    warnings: ExchangeDiagnostic[] = [];
  if (!isObject(value))
    return {
      valid: false,
      errors: [{ code: 'document', message: 'Document tabulaire invalide.' }],
      warnings,
    };
  if (value.format !== 'actograph-tabular' || value.version !== 1)
    errors.push({ code: 'version', message: 'Format ou version de fichier non pris en charge.' });
  if (expectedKind !== undefined && value.kind !== expectedKind)
    errors.push({
      code: 'kind',
      message: 'Le fichier ne contient pas le type de données attendu.',
    });
  if (value.kind === 'readings') validateReadings(value, errors, warnings, mode);
  else if (value.kind === 'protocol') validateProtocol(value, errors, warnings);
  else errors.push({ code: 'kind', message: 'Contenu du fichier inconnu.' });
  return { valid: errors.length === 0, errors, warnings };
}

export function assertValidExchangeDocument(document: TabularExchangeDocument): void {
  const validation = validateExchangeDocument(document);
  if (!validation.valid) throw new ExchangeParseError(validation.errors);
}
