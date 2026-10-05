/* eslint-env jest */
const initSqlJs = require('sql.js/dist/sql-asm.js');
const { sqliteService } = require('../src/database/sqlite.service');
const { observationService } = require('../src/services/observation.service');
const { protocolService } = require('../src/services/protocol.service');
const { protocolRepository } = require('../src/database/repositories/protocol.repository');
const { readingRepository } = require('../src/database/repositories/reading.repository');
const { importService } = require('../src/services/import.service');
const { exportService } = require('../src/services/export.service');
const { useChronicle } = require('../src/composables/use-chronicle');
const { useProtocolDraft } = require('../src/composables/use-protocol-draft');
const { useEditMode } = require('../src/composables/use-edit-mode');
const { arrangeCategoryCards } = require('../src/utils/category-layout');
const { toSafeFileStem, toChronicleFileName } = require('../src/utils/chronicle-name');
let db;

beforeEach(async () => {
  const SQL = await initSqlJs();
  db = new SQL.Database();
  sqliteService.db = {
    execute: async (sql) => db.run(sql),
    query: async (sql, values) => {
      const stmt = db.prepare(sql);
      if (values) stmt.bind(values.map((value) => value ?? null));
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return { values: rows };
    },
    run: async (sql, values) => {
      db.run(sql, values?.map((value) => value ?? null));
      return { changes: { changes: db.getRowsModified(), lastId: db.exec('SELECT last_insert_rowid()')[0].values[0][0] } };
    },
    executeSet: async (statements) => {
      db.run('BEGIN');
      try {
        for (const entry of statements) db.run(entry.statement, entry.values?.map((value) => value ?? null));
        db.run('COMMIT');
      } catch (error) { db.run('ROLLBACK'); throw error; }
    },
  };
  await sqliteService.runMigrations();
  db.run('PRAGMA foreign_keys = ON');
});
afterEach(() => { jest.restoreAllMocks(); useChronicle().methods.unloadChronicle(); delete global.window; delete global.requestAnimationFrame; db.close(); jest.useRealTimers(); });

async function sample() {
  return observationService.create({ name: 'Terrain', protocol: { categories: [
    { name: 'Posture', observables: [{ name: 'Assis' }, { name: 'Debout' }] },
    { name: 'Activité', observables: [{ name: 'Travail' }] },
  ] } });
}
const clone = (value) => JSON.parse(JSON.stringify(value));

test('two consecutive sessions keep all START/STOP boundaries', async () => {
  const observation = await sample();
  jest.useFakeTimers().setSystemTime(new Date('2026-09-09T10:00:00Z'));
  global.window = { setInterval, clearInterval };
  const chronicle = useChronicle();
  await chronicle.methods.loadChronicle(observation.id);
  await chronicle.methods.startRecording(['Assis']);
  jest.setSystemTime(new Date('2026-09-09T10:00:10Z'));
  await chronicle.methods.stopRecording();
  jest.setSystemTime(new Date('2026-09-09T11:00:00Z'));
  await chronicle.methods.startRecording(['Debout']);
  jest.setSystemTime(new Date('2026-09-09T11:00:10Z'));
  await chronicle.methods.stopRecording();
  expect((await observationService.getReadings(observation.id)).map((r) => r.type))
    .toEqual(['START', 'DATA', 'STOP', 'START', 'DATA', 'STOP']);
});

test('a failed initial DATA write rolls back the entire START', async () => {
  const observation = await sample();
  db.run("CREATE TRIGGER fail_data BEFORE INSERT ON readings WHEN NEW.type = 'DATA' BEGIN SELECT RAISE(ABORT, 'disk failure'); END");
  await expect(observationService.startRecording(observation.id, ['Assis'])).rejects.toThrow('disk failure');
  expect(await observationService.getReadings(observation.id)).toEqual([]);
});

test('stopping during a pause closes the pause in the same batch', async () => {
  const observation = await sample();
  await observationService.startRecording(observation.id, ['Assis']);
  await observationService.pauseRecording(observation.id);
  await observationService.stopRecording(observation.id);
  expect((await observationService.getReadings(observation.id)).map((r) => r.type))
    .toEqual(['START', 'DATA', 'PAUSE_START', 'PAUSE_END', 'STOP']);
});

test('renaming keeps historical readings attached and leaves other chronicles intact', async () => {
  const observation = await sample();
  const other = await sample();
  await readingRepository.addData(observation.id, 'Assis');
  await readingRepository.addData(other.id, 'Assis');
  const protocol = await protocolService.getByObservationId(observation.id);
  await protocolService.updateItem(protocol[0].children[0].id, { name: 'Assis renommé' });
  expect((await observationService.getReadings(observation.id))[0].name).toBe('Assis renommé');
  expect((await observationService.getReadings(other.id))[0].name).toBe('Assis');
});

test('names are unique across categories, including case and surrounding spaces', async () => {
  const observation = await sample();
  const categories = await protocolService.getByObservationId(observation.id);
  await expect(protocolService.addObservable(observation.id, categories[1].id, ' ASSIS ')).rejects.toThrow('protocole');
  await expect(protocolService.updateItem(categories[1].children[0].id, { name: 'Assis' })).rejects.toThrow('protocole');
});

test('deleting an observable or category with readings is rejected', async () => {
  const observation = await sample();
  const categories = await protocolService.getByObservationId(observation.id);
  await readingRepository.addData(observation.id, 'Assis');
  await expect(protocolService.deleteItem(categories[0].children[0].id)).rejects.toThrow('relevés');
  await expect(protocolService.deleteItem(categories[0].id)).rejects.toThrow('relevés');
  expect((await protocolService.getByObservationId(observation.id))[0].children).toHaveLength(2);
});

test('draft changes do not modify the original protocol or its persisted data', async () => {
  const observation = await sample();
  const categories = await protocolService.getByObservationId(observation.id);
  const draft = useProtocolDraft();
  draft.begin(categories);
  draft.rename(categories[0].children[0].id, 'Modifié');
  draft.remove(categories[1].id);
  draft.addCategory('Nouveau', 'continuous');
  expect(categories[0].children[0].name).toBe('Assis');
  expect(await protocolService.getByObservationId(observation.id)).toEqual(categories);
  draft.begin(categories);
  expect(draft.categories.value).toEqual(categories);
});

test('saving a draft preserves IDs, adds parent/child pairs and renames readings atomically', async () => {
  const observation = await sample();
  const original = await protocolService.getByObservationId(observation.id);
  await readingRepository.addData(observation.id, 'Assis');
  const draft = useProtocolDraft();
  draft.begin(original);
  draft.rename(original[0].children[0].id, 'Repos');
  const category = draft.addCategory('Lieu', 'continuous');
  draft.addObservable(category.id, 'Dehors');
  await protocolRepository.saveDraft(observation.id, draft.categories.value, 1.5);
  const saved = await protocolService.getByObservationId(observation.id);
  expect(saved[0].id).toBe(original[0].id);
  expect(saved[2].children[0].parent_id).toBe(saved[2].id);
  expect(saved[2].children[0].name).toBe('Dehors');
  expect((await observationService.getReadings(observation.id))[0].name).toBe('Repos');
  expect((await observationService.getById(observation.id)).observation.meta.uiScale).toBe(1.5);
});

test('a failed draft update rolls back reading renames too', async () => {
  const observation = await sample();
  const draft = clone(await protocolService.getByObservationId(observation.id));
  await readingRepository.addData(observation.id, 'Assis');
  draft[0].children[0].name = 'Échec';
  db.run("CREATE TRIGGER fail_update BEFORE UPDATE ON protocol_items WHEN NEW.name = 'Échec' BEGIN SELECT RAISE(ABORT, 'disk failure'); END");
  await expect(protocolRepository.saveDraft(observation.id, draft, 1)).rejects.toThrow('disk failure');
  expect((await observationService.getReadings(observation.id))[0].name).toBe('Assis');
  expect((await protocolService.getByObservationId(observation.id))[0].children[0].name).toBe('Assis');
});

test('ambiguous file import rolls back instead of silently mixing categories', async () => {
  const observation = await sample();
  const exported = JSON.parse((await exportService.exportToJchronic(observation.id)).content);
  exported.protocol.items[1].children[0].name = 'Assis';
  const result = await importService.importJchronic(JSON.stringify(exported), 'test.jchronic');
  expect(result.success).toBe(false);
  expect(result.error).toMatch(/protocole/);
  expect(await observationService.getAll()).toHaveLength(1);
});

test.each([320, 360, 768])('cards fit at %i px without overlap at different scales', (width) => {
  for (const scale of [0.6, 1, 1.8]) {
    const cards = Array.from({ length: 6 }, (_, id) => ({ id, width: 150 * scale, height: 412 * scale }));
    const positions = arrangeCategoryCards(cards, width);
    const effectiveWidth = Math.min(150 * scale, width - 32);
    for (const [index, card] of cards.entries()) {
      const a = positions[card.id];
      expect(a.x).toBeGreaterThanOrEqual(16);
      expect(a.x + effectiveWidth).toBeLessThanOrEqual(width - 16);
      for (const other of cards.slice(index + 1)) {
        const b = positions[other.id];
        expect(a.x + effectiveWidth + 16 <= b.x || b.x + effectiveWidth + 16 <= a.x ||
          a.y + card.height + 16 <= b.y || b.y + other.height + 16 <= a.y).toBe(true);
      }
    }
  }
});

test('cancel restores positions and widths even without previously persisted metadata', () => {
  const edit = useEditMode();
  const categories = [{ id: 101, name: 'Posture', type: 'category', meta: null, children: [] }];
  edit.methods.initializePositions(categories);
  const before = clone(edit.sharedState.categoryPositions);
  edit.methods.enterEditMode();
  edit.methods.updateCategoryPosition(101, { x: 80, y: 250 });
  edit.methods.updateCategorySize(101, { width: 280 });
  edit.methods.cancelEditMode();
  expect(edit.sharedState.categoryPositions).toEqual(before);
  expect(edit.sharedState.categorySizes).toEqual({});
});


test('category and observable name swaps retain historical identity and new child parents', async () => {
  const observation = await sample();
  const draft = clone(await protocolService.getByObservationId(observation.id));
  await readingRepository.addData(observation.id, 'Assis');
  await readingRepository.addData(observation.id, 'Travail');
  [draft[0].name, draft[1].name] = [draft[1].name, draft[0].name];
  [draft[0].children[0].name, draft[1].children[0].name] = [draft[1].children[0].name, draft[0].children[0].name];
  draft[0].children.push({ id: -1, parent_id: draft[0].id, type: 'observable', name: 'Nouveau', sort_order: 3 });
  await protocolRepository.saveDraft(observation.id, draft, 1);
  const saved = await protocolService.getByObservationId(observation.id);
  expect(saved[0].children.find((item) => item.name === 'Nouveau').parent_id).toBe(draft[0].id);
  expect((await observationService.getReadings(observation.id)).map((item) => item.name)).toEqual(['Travail', 'Assis']);
});


test('a local file round trip retains protocol names, comments and session boundaries', async () => {
  const observation = await sample();
  await observationService.startRecording(observation.id, ['Assis']);
  await observationService.addComment(observation.id, 'Note terrain');
  await observationService.stopRecording(observation.id);
  const exported = await exportService.exportToJchronic(observation.id);
  const result = await importService.importJchronic(exported.content, 'terrain.jchronic');
  expect(result.success).toBe(true);
  const imported = await observationService.getById(result.observationId);
  expect(imported.protocol.flatMap((category) => category.children.map((item) => item.name))).toEqual(['Assis', 'Debout', 'Travail']);
  expect(imported.readings.map((reading) => [reading.type, reading.name ?? null])).toEqual([
    ['START', null], ['DATA', 'Assis'], ['DATA', '#Note terrain'], ['STOP', null],
  ]);
});

test('automatic layout compacts again when rendered cards become shorter', () => {
  const edit = useEditMode();
  const categories = [201, 202].map((id) => ({ id, name: String(id), type: 'category', children: [] }));
  edit.methods.initializePositions(categories);
  let height = 412;
  global.requestAnimationFrame = (callback) => callback();
  const container = { clientWidth: 320, querySelectorAll: () => categories.map((item) => ({
    getAttribute: () => String(item.id), offsetHeight: height,
  })) };
  edit.methods.measureHeights(container);
  height = 280;
  edit.methods.measureHeights(container);
  expect(edit.sharedState.categoryPositions[202].y).toBe(16 + 280 + 16);
});

test('saving both position and size preserves both metadata fields', async () => {
  const observation = await sample();
  const categories = await protocolService.getByObservationId(observation.id);
  const edit = useEditMode();
  edit.methods.initializePositions(categories);
  edit.methods.updateCategoryPosition(categories[0].id, { x: 16, y: 70 });
  edit.methods.updateCategorySize(categories[0].id, { width: 250 });
  await edit.methods.saveAllPositions();
  expect((await protocolService.getByObservationId(observation.id))[0].meta).toMatchObject({ position: { x: 16, y: 70 }, size: { width: 250 } });
});

test('import keeps reading comments and inserts readings atomically', async () => {
  const observation = await sample();
  await observationService.startRecording(observation.id, ['Assis']);
  const [start] = await observationService.getReadings(observation.id);
  await observationService.appendReadingComment(start.id, 'Début terrain', observation.id);
  await observationService.stopRecording(observation.id);
  const exported = (await exportService.exportToJchronic(observation.id)).content;

  const imported = await importService.importJchronic(exported, 'terrain.jchronic');
  expect(imported.success).toBe(true);
  expect(imported.readingsCount).toBe(3);
  expect((await observationService.getReadings(imported.observationId))[0].description).toBe('Début terrain');

  db.run("CREATE TRIGGER fail_stop BEFORE INSERT ON readings WHEN NEW.type = 'STOP' BEGIN SELECT RAISE(ABORT, 'disk failure'); END");
  const failed = await importService.importJchronic(exported, 'terrain.jchronic');
  expect(failed.success).toBe(false);
  expect(await observationService.getAll()).toHaveLength(2);
  expect(db.exec('SELECT COUNT(*) FROM readings')[0].values[0][0]).toBe(6);
});

const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const isParis = timezone === 'Europe/Paris';
const isToronto = timezone === 'America/Toronto';
const parisTest = isParis ? test : test.skip;
const torontoTest = isToronto ? test : test.skip;

test('UTC storage preserves exact instants across both occurrences and their boundaries', () => {
  const { toReadingDateTimeString } = require('../src/utils/date-time');
  const transition = Date.parse(isToronto ? '2026-11-01T06:00:00.000Z' : '2026-10-25T01:00:00.000Z');
  for (const offset of [-3600000, -1, 0, 3599999, 3600000]) {
    const instant = new Date(transition + offset);
    const stored = toReadingDateTimeString(instant);
    expect(stored).toBe(instant.toISOString());
    expect(new Date(stored).getTime()).toBe(instant.getTime());
  }
});

test('ordinary live readings store UTC while showing the phone local time', async () => {
  const observation = await sample();
  jest.useFakeTimers().setSystemTime(new Date('2026-02-01T09:15:30.123Z'));
  await observationService.startRecording(observation.id, ['Assis']);
  const readings = await observationService.getReadings(observation.id);
  expect(readings.map((reading) => reading.date)).toEqual([
    '2026-02-01T09:15:30.123Z',
    '2026-02-01T09:15:30.123Z',
  ]);
  const { toAbsoluteTimeString } = require('../src/utils/date-time');
  expect(toAbsoluteTimeString(readings[0].date, true)).toBe(isToronto ? '04:15:30.123' : '10:15:30.123');
});

test('new chronicles record the device timezone and retain caller metadata', async () => {
  const localZone = require('../../packages/core/src/utils/observation-time-zone').getLocalTimeZone();
  const observation = await observationService.create({
    name: 'Zone origine',
    meta: { timeZone: 'America/Los_Angeles', importedMarker: { source: 'test' } },
  });
  expect(observation.meta).toEqual({
    timeZone: localZone,
    importedMarker: { source: 'test' },
  });
});

test('Jchronic and cloud round-trips preserve origin timezone, unknown metadata, and UTC readings', async () => {
  const observation = await sample();
  const originZone = isToronto ? 'Europe/Paris' : 'America/Los_Angeles';
  await observationService.updateMeta(observation.id, {
    timeZone: originZone,
    vendorMetadata: { retained: true, revision: 7 },
  });
  jest.useFakeTimers().setSystemTime(new Date('2026-02-01T09:15:30.123Z'));
  await observationService.startRecording(observation.id, ['Assis']);
  jest.setSystemTime(new Date('2026-02-01T09:16:30.123Z'));
  await observationService.stopRecording(observation.id);

  const exported = await exportService.exportToJchronic(observation.id);
  const payload = JSON.parse(exported.content);
  expect(payload.observation.meta).toMatchObject({
    timeZone: originZone,
    vendorMetadata: { retained: true, revision: 7 },
  });
  expect(payload.readings.map(({ dateTime }) => dateTime)).toEqual([
    '2026-02-01T09:15:30.123Z',
    '2026-02-01T09:15:30.123Z',
    '2026-02-01T09:16:30.123Z',
  ]);

  const { actographCloudService } = require('../src/services/actograph-cloud.service');
  const upload = jest.spyOn(actographCloudService, 'uploadChronicle').mockResolvedValue({ success: true });
  const download = jest.spyOn(actographCloudService, 'downloadChronicle').mockResolvedValue({ success: true, content: exported.content });
  const cloud = require('../src/composables/use-cloud').useCloud();
  cloud.sharedState.isAuthenticated = false;
  expect(await cloud.methods.uploadChronicle(observation.id)).toMatchObject({ success: true });
  expect(upload).toHaveBeenCalledTimes(1);
  const uploadedPayload = JSON.parse(upload.mock.calls[0][2]);
  expect(uploadedPayload.observation.meta).toMatchObject({ timeZone: originZone, vendorMetadata: { retained: true, revision: 7 } });
  expect(uploadedPayload.readings.map(({ dateTime }) => dateTime)).toEqual(payload.readings.map(({ dateTime }) => dateTime));

  const downloaded = await cloud.methods.downloadChronicle({
    id: 42,
    name: 'origine.jchronic',
    createdAt: '',
    updatedAt: '',
    isJchronic: true,
  });
  expect(download).toHaveBeenCalledWith(42, { binary: false });
  expect(downloaded.success).toBe(true);
  const imported = await observationService.getById(downloaded.observationId);
  expect(imported.observation.meta).toMatchObject({
    timeZone: originZone,
    vendorMetadata: { retained: true, revision: 7 },
  });
  expect(imported.readings.map(({ date }) => date)).toEqual(payload.readings.map(({ dateTime }) => dateTime));
});

test('legacy Jchronic chronicle without origin keeps its missing timezone when continued', async () => {
  const observation = await sample();
  const payload = JSON.parse((await exportService.exportToJchronic(observation.id)).content);
  delete payload.observation.meta;
  payload.readings = [{ type: 'start', dateTime: '2026-02-01T09:15:30.123Z' }];
  const imported = await importService.importJchronic(JSON.stringify(payload), 'legacy.jchronic');
  expect(imported.success).toBe(true);
  jest.useFakeTimers().setSystemTime(new Date('2026-02-01T09:16:30.123Z'));
  await observationService.toggleObservable(imported.observationId, 'Assis');
  expect((await observationService.getById(imported.observationId)).observation.meta).toBeNull();
  expect((await observationService.getReadings(imported.observationId)).map(({ date }) => date)).toEqual([
    '2026-02-01T09:15:30.123Z',
    '2026-02-01T09:16:30.123Z',
  ]);
});

test('duplicating for a new session resets origin timezone to the current device zone', async () => {
  const observation = await sample();
  await observationService.updateMeta(observation.id, {
    timeZone: isToronto ? 'Europe/Paris' : 'America/Los_Angeles',
    vendorMetadata: { retained: true },
  });
  const duplicate = await observationService.duplicateWithoutReadings(observation.id);
  expect(duplicate.meta).toMatchObject({
    timeZone: require('../../packages/core/src/utils/observation-time-zone').getLocalTimeZone(),
    vendorMetadata: { retained: true },
  });
  expect(await observationService.getReadings(duplicate.id)).toEqual([]);
});

test('chronicle clock and date formatter use the chronicle origin timezone', async () => {
  const observation = await sample();
  await observationService.updateMeta(observation.id, { timeZone: 'Asia/Tokyo' });
  jest.useFakeTimers().setSystemTime(new Date('2026-02-01T09:15:30.123Z'));
  global.window = { setInterval, clearInterval };
  const chronicle = useChronicle();
  await chronicle.methods.loadChronicle(observation.id);
  await chronicle.methods.startRecording(['Assis']);
  expect(chronicle.sharedState.currentChronicle.meta.timeZone).toBe('Asia/Tokyo');
  expect(chronicle.formattedTime.value).toBe('18:15:30');
  const { toAbsoluteTimeString } = require('../src/utils/date-time');
  expect(toAbsoluteTimeString('2026-02-01T09:15:30.123Z', true, 'Asia/Tokyo')).toBe('18:15:30.123');
});

test('fall-back session preserves instants and exact durations in UTC', async () => {
  const observation = await sample();
  const transition = Date.parse(isToronto ? '2026-11-01T06:00:00.000Z' : '2026-10-25T01:00:00.000Z');
  jest.useFakeTimers().setSystemTime(new Date(transition - 10 * 60 * 1000));
  await observationService.startRecording(observation.id, ['Assis']);
  jest.setSystemTime(new Date(transition + 5 * 60 * 1000));
  await observationService.pauseRecording(observation.id);
  jest.setSystemTime(new Date(transition + 20 * 60 * 1000));
  await observationService.resumeRecording(observation.id);
  jest.setSystemTime(new Date(transition + 30 * 60 * 1000));
  await observationService.addComment(observation.id, 'Passage répété');
  jest.setSystemTime(new Date(transition + 45 * 60 * 1000));
  await observationService.stopRecording(observation.id);

  const readings = await observationService.getReadings(observation.id);
  expect(readings.map(({ type }) => type)).toEqual([
    'START', 'DATA', 'PAUSE_START', 'PAUSE_END', 'DATA', 'STOP',
  ]);
  expect(readings.every(({ date }) => date.endsWith('Z'))).toBe(true);
  const instants = readings.map(({ date }) => new Date(date).getTime());
  expect(instants).toEqual([
    transition - 10 * 60 * 1000,
    transition - 10 * 60 * 1000,
    transition + 5 * 60 * 1000,
    transition + 20 * 60 * 1000,
    transition + 30 * 60 * 1000,
    transition + 45 * 60 * 1000,
  ]);

  const activeDuration = (instants[2] - instants[0]) + (instants[5] - instants[3]);
  const pausedDuration = instants[3] - instants[2];
  expect(activeDuration).toBe(40 * 60 * 1000);
  expect(pausedDuration).toBe(15 * 60 * 1000);

  const { calculateGeneralStatistics } = require('../../packages/core/src/statistics/general-statistics');
  const stats = calculateGeneralStatistics(readings.map((reading) => ({
    id: reading.id,
    name: reading.name ?? null,
    description: reading.description ?? null,
    type: reading.type.toLowerCase(),
    dateTime: new Date(reading.date),
  })), []);
  expect(stats).toMatchObject({
    totalDuration: 55 * 60 * 1000,
    pauseDuration: 15 * 60 * 1000,
    observationDuration: 40 * 60 * 1000,
    pauseCount: 1,
  });
});

test('spring-forward session duration remains elapsed-time accurate in UTC', async () => {
  const observation = await sample();
  const transition = Date.parse(isToronto ? '2026-03-08T07:00:00.000Z' : '2026-03-29T01:00:00.000Z');
  jest.useFakeTimers().setSystemTime(new Date(transition - 10 * 60 * 1000));
  await observationService.startRecording(observation.id, ['Assis']);
  jest.setSystemTime(new Date(transition + 10 * 60 * 1000));
  await observationService.stopRecording(observation.id);
  const readings = await observationService.getReadings(observation.id);
  expect(readings.map(({ date }) => date)).toEqual([
    new Date(transition - 10 * 60 * 1000).toISOString(),
    new Date(transition - 10 * 60 * 1000).toISOString(),
    new Date(transition + 10 * 60 * 1000).toISOString(),
  ]);
  expect(new Date(readings[2].date).getTime() - new Date(readings[0].date).getTime())
    .toBe(20 * 60 * 1000);
});

test('Jchronic import keeps UTC instants during a repeated hour from another zone', async () => {
  const observation = await sample();
  const exported = JSON.parse((await exportService.exportToJchronic(observation.id)).content);
  exported.readings = [
    { type: 'start', dateTime: '2026-10-25T01:05:00.000Z' },
    { type: 'data', name: 'Assis', dateTime: '2026-10-25T01:06:00.000Z' },
    { type: 'stop', dateTime: '2026-10-25T01:10:00.000Z' },
  ];
  const imported = await importService.importJchronic(JSON.stringify(exported), 'second-passage.jchronic');
  expect(imported.success).toBe(true);
  expect((await observationService.getReadings(imported.observationId)).map(({ date }) => date)).toEqual([
    '2026-10-25T01:05:00.000Z',
    '2026-10-25T01:06:00.000Z',
    '2026-10-25T01:10:00.000Z',
  ]);
});

test('automatic correction serializes a repositioned reading in UTC', async () => {
  const observation = await sample();
  db.run("INSERT INTO readings (observation_id, type, date) VALUES (?, 'START', ?)", [observation.id, '2026-10-25T01:10:00.000Z']);
  db.run("INSERT INTO readings (observation_id, type, date) VALUES (?, 'STOP', ?)", [observation.id, '2026-10-25T01:15:00.000Z']);
  db.run("INSERT INTO readings (observation_id, type, date, name) VALUES (?, 'DATA', ?, 'Assis')", [observation.id, '2026-10-25T01:20:00.000Z']);
  const { autoCorrectReadings } = require('../src/composables/use-readings-auto-correct');
  await autoCorrectReadings(observation.id);
  const readings = await observationService.getReadings(observation.id);
  expect(readings.map(({ type }) => type)).toEqual(['START', 'DATA', 'STOP']);
  expect(readings.map(({ date }) => date)).toEqual([
    '2026-10-25T01:10:00.000Z',
    '2026-10-25T01:20:00.000Z',
    '2026-10-25T01:20:00.001Z',
  ]);
});

test('mixed wall-clock and imported UTC readings are ordered by instant, then ID', async () => {
  const observation = await sample();
  // In Toronto, the wall-clock value resolves to 15:00Z and the imported UTC
  // value to 14:00Z, while lexical ordering puts the wall-clock text first.
  db.run("INSERT INTO readings (observation_id, type, date) VALUES (?, 'START', ?)", [observation.id, '2026-01-01T10:00:00.000']);
  db.run("INSERT INTO readings (observation_id, type, date) VALUES (?, 'STOP', ?)", [observation.id, '2026-01-01T14:00:00.000Z']);
  db.run("INSERT INTO readings (observation_id, type, date) VALUES (?, 'DATA', ?)", [observation.id, '2026-01-01T15:00:00.000Z']);
  db.run("INSERT INTO readings (observation_id, type, date) VALUES (?, 'PAUSE_START', ?)", [observation.id, '2026-01-01T10:00:00.000']);

  const byInstant = await readingRepository.findByObservationId(observation.id);
  const expectedAscendingIds = isToronto ? [2, 1, 3, 4] : [1, 4, 2, 3];
  const expectedRecentIds = [...expectedAscendingIds].reverse();
  expect(byInstant.map(({ id }) => id)).toEqual(expectedAscendingIds);
  expect((await readingRepository.findRecentByObservationId(observation.id, 2)).map(({ id }) => id))
    .toEqual(expectedRecentIds.slice(0, 2));
  expect((await readingRepository.findRecentByObservationId(observation.id, -1)).map(({ id }) => id))
    .toEqual(expectedRecentIds);
  expect((await readingRepository.getLastReading(observation.id)).id).toBe(expectedAscendingIds.at(-1));
  expect((await readingRepository.getLastStartOrStop(observation.id)).id)
    .toBe(isToronto ? 1 : 2);
});

test('legacy wall-clock and new UTC readings retain exact mixed-format durations', async () => {
  const observation = await sample();
  const wallDate = '2026-01-01T10:00:00.000';
  const startInstant = new Date(wallDate).getTime();
  const stopInstant = startInstant + 2 * 60 * 60 * 1000;
  db.run("INSERT INTO readings (observation_id, type, date) VALUES (?, 'START', ?)", [observation.id, wallDate]);
  db.run("INSERT INTO readings (observation_id, type, date, name) VALUES (?, 'DATA', ?, 'Assis')", [observation.id, wallDate]);
  db.run("INSERT INTO readings (observation_id, type, date) VALUES (?, 'STOP', ?)", [observation.id, new Date(stopInstant).toISOString()]);

  const readings = await observationService.getReadings(observation.id);
  expect(readings.map(({ type }) => type)).toEqual(['START', 'DATA', 'STOP']);
  expect(new Date(readings[0].date).getTime()).toBe(startInstant);
  expect(new Date(readings[2].date).getTime()).toBe(stopInstant);
  const { calculateGeneralStatistics } = require('../../packages/core/src/statistics/general-statistics');
  const stats = calculateGeneralStatistics(readings.map((reading) => ({
    id: reading.id,
    name: reading.name ?? null,
    description: reading.description ?? null,
    type: reading.type.toLowerCase(),
    dateTime: new Date(reading.date),
  })), []);
  expect(stats.totalDuration).toBe(2 * 60 * 60 * 1000);
});

test('Jchronic export normalizes mixed legacy dates to UTC without mutating storage or inventing origin metadata', async () => {
  const observation = await sample();
  const importedPayload = JSON.parse((await exportService.exportToJchronic(observation.id)).content);
  delete importedPayload.observation.meta;
  importedPayload.readings = [];
  const imported = await importService.importJchronic(JSON.stringify(importedPayload), 'old-no-origin.jchronic');
  expect(imported.success).toBe(true);
  const legacyObservationId = imported.observationId;
  const wallDate = '2026-01-01T10:00:00.000';
  const startInstant = new Date(wallDate).getTime();
  const stopInstant = startInstant + 2 * 60 * 60 * 1000;
  db.run("INSERT INTO readings (observation_id, type, date) VALUES (?, 'START', ?)", [legacyObservationId, wallDate]);
  db.run("INSERT INTO readings (observation_id, type, date, name) VALUES (?, 'DATA', ?, 'Assis')", [legacyObservationId, wallDate]);
  db.run("INSERT INTO readings (observation_id, type, date) VALUES (?, 'STOP', ?)", [legacyObservationId, new Date(stopInstant).toISOString()]);

  const beforeExport = await observationService.getById(legacyObservationId);
  expect(beforeExport.observation.meta).toBeNull();
  const exported = JSON.parse((await exportService.exportToJchronic(legacyObservationId)).content);
  expect(Object.hasOwn(exported.observation, 'meta')).toBe(false);
  expect(exported.readings.map(({ dateTime }) => dateTime)).toEqual([
    new Date(startInstant).toISOString(),
    new Date(startInstant).toISOString(),
    new Date(stopInstant).toISOString(),
  ]);
  expect((await observationService.getReadings(legacyObservationId)).map(({ date }) => date)).toEqual([
    wallDate,
    wallDate,
    new Date(stopInstant).toISOString(),
  ]);

  const roundTrip = await importService.importJchronic(JSON.stringify(exported), 'portable-utc.jchronic');
  expect(roundTrip.success).toBe(true);
  const roundTripData = await observationService.getById(roundTrip.observationId);
  expect(roundTripData.observation.meta).toBeNull();
  expect(roundTripData.readings.map(({ date }) => date)).toEqual(exported.readings.map(({ dateTime }) => dateTime));
  const { calculateGeneralStatistics } = require('../../packages/core/src/statistics/general-statistics');
  const stats = calculateGeneralStatistics(roundTripData.readings.map((reading) => ({
    id: reading.id,
    name: reading.name ?? null,
    description: reading.description ?? null,
    type: reading.type.toLowerCase(),
    dateTime: new Date(reading.date),
  })), []);
  expect(stats.totalDuration).toBe(2 * 60 * 60 * 1000);
});

test('invalid origin timezone remains metadata but falls back to device-local display', async () => {
  const observation = await sample();
  await observationService.updateMeta(observation.id, {
    timeZone: 'Mars/Olympus',
    vendorMetadata: { retained: true },
  });
  const { getObservationTimeZone } = require('../../packages/core/src/utils/observation-time-zone');
  const { toAbsoluteTimeString } = require('../src/utils/date-time');
  expect(getObservationTimeZone((await observationService.getById(observation.id)).observation.meta)).toBeUndefined();
  expect(toAbsoluteTimeString('2026-02-01T09:15:30.123Z', true, 'Mars/Olympus'))
    .toBe(isToronto ? '04:15:30.123' : '10:15:30.123');
  const exported = JSON.parse((await exportService.exportToJchronic(observation.id)).content);
  expect(exported.observation.meta).toMatchObject({
    timeZone: 'Mars/Olympus',
    vendorMetadata: { retained: true },
  });
});

torontoTest('continuing an imported UTC chronicle in Toronto uses the real current instant', async () => {
  const observation = await sample();
  db.run("INSERT INTO readings (observation_id, type, date) VALUES (?, 'START', ?)", [observation.id, '2026-10-25T12:00:00.000Z']);
  jest.useFakeTimers().setSystemTime(new Date('2026-10-25T13:00:00.000Z'));
  await observationService.toggleObservable(observation.id, 'Assis');
  const readings = await observationService.getReadings(observation.id);
  expect(new Date(readings[1].date).getTime()).toBe(Date.parse('2026-10-25T13:00:00.000Z'));
});

test('file names keep readable ASCII and a chronicle extension', () => {
  expect(toSafeFileStem('Séance été')).toBe('Seance_ete');
  expect(toSafeFileStem('???')).toBe('chronique');
  expect(toChronicleFileName('Mon essai', true)).toBe('Mon_essai.jchronic');
  expect(toChronicleFileName('dossier/ancien.CHRONIC', false)).toBe('dossier_ancien.chronic');
});

test('a genuine backwards system-clock adjustment cannot reorder a live session', async () => {
  const observation = await sample();
  const { toAbsoluteDateTimeString } = require('../src/utils/date-time');
  jest.useFakeTimers().setSystemTime(new Date('2026-01-01T10:00:00.000Z'));
  const later = toAbsoluteDateTimeString(new Date(Date.now() + 3600 * 1000));
  db.run("INSERT INTO readings (observation_id, type, date) VALUES (?, 'START', ?)", [observation.id, later]);
  await observationService.toggleObservable(observation.id, 'Assis');
  await observationService.stopRecording(observation.id);
  const readings = await observationService.getReadings(observation.id);
  expect(readings.map((r) => r.type)).toEqual(['START', 'DATA', 'STOP']);
  expect(new Date(readings[1].date).getTime()).toBe(new Date(later).getTime() + 1);
  expect(new Date(readings[2].date).getTime()).toBe(new Date(later).getTime() + 2);
  expect(await observationService.isRecording(observation.id)).toBe(false);
});

test('switching chronicle stops the session of the one being left', async () => {
  const first = await sample();
  const second = await sample();
  global.window = { setInterval, clearInterval };
  const chronicle = useChronicle();
  await chronicle.methods.loadChronicle(first.id);
  await chronicle.methods.startRecording(['Assis']);
  await chronicle.methods.loadChronicle(second.id);
  expect(await observationService.isRecording(first.id)).toBe(false);
  expect((await observationService.getReadings(first.id)).pop().type).toBe('STOP');
  expect(chronicle.sharedState.isPlaying).toBe(false);
});

test('duplicate category names are renamed on import so the protocol stays editable', async () => {
  const observation = await sample();
  const exported = JSON.parse((await exportService.exportToJchronic(observation.id)).content);
  exported.protocol.items[1].name = ' posture ';
  const result = await importService.importJchronic(JSON.stringify(exported), 'test.jchronic');
  expect(result.success).toBe(true);
  expect(result.renamedCategoriesCount).toBe(1);
  const categories = await protocolService.getByObservationId(result.observationId);
  expect(categories.map((category) => category.name)).toEqual(['Posture', 'posture (2)']);
  await expect(protocolRepository.saveDraft(result.observationId, categories, 1)).resolves.toBeUndefined();
});

test('deleting a chronicle removes its protocol and readings only', async () => {
  const kept = await sample();
  const removed = await sample();
  await observationService.startRecording(removed.id, ['Assis']);
  await observationService.delete(removed.id);
  expect((await observationService.getAll()).map((o) => o.id)).toEqual([kept.id]);
  expect(db.exec('SELECT COUNT(*) FROM readings')[0].values[0][0]).toBe(0);
  expect(db.exec('SELECT COUNT(*) FROM protocols')[0].values[0][0]).toBe(1);
  expect(db.exec('SELECT COUNT(*) FROM protocol_items')[0].values[0][0]).toBe(5);
});

parisTest('clock change notice: an hour before the clock goes back, then during the repeated hour', () => {
  const { getClockChangeNotice } = require('../src/utils/clock-change');
  const at = (iso) => getClockChangeNotice(new Date(iso).getTime());
  expect(at('2026-10-24T23:59:00Z')).toBeNull();
  expect(at('2026-10-25T00:20:00Z')).toMatchObject({
    phase: 'upcoming',
    title: 'Changement d’heure dans 40 min',
    message: expect.stringContaining('À 03:00, l’horloge reculera d’une heure (retour à 02:00)'),
  });
  expect(at('2026-10-25T01:10:00Z')).toMatchObject({ phase: 'repeated', title: 'Heure répétée jusqu’à 03:00' });
  expect(at('2026-10-25T02:00:00Z')).toBeNull();
  expect(at('2026-03-29T00:30:00Z')).toBeNull();
});
