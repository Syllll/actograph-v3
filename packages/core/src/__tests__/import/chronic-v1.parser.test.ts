import fs from 'fs';
import path from 'path';
import {
  ChronicV1Parser,
  normalizeChronicV1Data,
} from '../../import/chronic-v1';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

function readFixture(name: string): Buffer {
  return fs.readFileSync(path.join(FIXTURES_DIR, name));
}

describe('ChronicV1Parser - import .chronic v1', () => {
  const parser = new ChronicV1Parser();

  describe('parse + normalize (sample-v3.chronic)', () => {
    // Fichier .chronic réel (version 3) : protocole à 4 catégories, 0 relevés.
    // Historiquement, ce fichier levait "Buffer size must be a multiple of
    // 16-bits" à cause du GraphManagerV1Parser désaligné.
    it('parse et normalise sans planter malgré un graphManager au format non reconnu', () => {
      const buffer = readFixture('sample-v3.chronic');

      const chronic = parser.parse(buffer);
      const normalized = normalizeChronicV1Data(chronic);

      expect(normalized.observation.name).toBe('Test');
      expect(normalized.observation.mode).toBe('calendar');
      expect(normalized.protocol).toBeDefined();
      expect(normalized.protocol?.categories?.length ?? 0).toBe(4);
      expect(normalized.readings).toHaveLength(0);

      const categories = normalized.protocol?.categories ?? [];
      expect(categories.find((category) => category.name === 'Evénement')?.action).toBe('discrete');
      expect(categories.find((category) => category.name === 'Lieu')?.graphPreferences?.displayMode).toBe(
        'background',
      );
    });

    it('expose un graphManager réinitialisé mais structurellement valide', () => {
      const chronic = parser.parse(readFixture('sample-v3.chronic'));

      expect(chronic.graphManager).toBeDefined();
      expect(Array.isArray(chronic.graphManager.layers)).toBe(true);
    });
  });

  describe('parse + normalize (sample-v3-with-readings.chronic)', () => {
    // Fichier .chronic réel (version 3) avec 1 catégorie et 93 relevés.
    it('importe le protocole et les relevés', () => {
      const buffer = readFixture('sample-v3-with-readings.chronic');

      const chronic = parser.parse(buffer);
      const normalized = normalizeChronicV1Data(chronic);

      expect(normalized.observation.name).toBe('decrochage gruau');
      expect(normalized.observation.mode).toBe('calendar');
      expect(normalized.protocol?.categories?.length ?? 0).toBe(1);
      expect(normalized.readings.length).toBeGreaterThan(0);

      const firstReading = normalized.readings[0];
      expect(firstReading).toBeDefined();
      expect(firstReading.dateTime).toBeInstanceOf(Date);
    });
  });

  describe('robustesse', () => {
    it('lève une ParseError pour une version non supportée', () => {
      // Buffer avec un QDouble "version" = 42.0 (non supportée)
      const buf = Buffer.alloc(8);
      buf.writeDoubleBE(42.0, 0);

      expect(() => parser.parse(buf)).toThrow(/non supportée/);
    });
  });
});
