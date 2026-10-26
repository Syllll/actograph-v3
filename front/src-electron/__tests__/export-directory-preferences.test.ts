import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  ExportDirectoryPreferences,
  type ExportContext,
} from '../export-directory-preferences';

describe('export directory preferences', () => {
  let temporaryDirectory: string;
  let defaultDirectory: string;
  let chronicleDirectory: string;
  let graphDirectory: string;
  let preferencesFilePath: string;
  let preferences: ExportDirectoryPreferences;

  beforeEach(() => {
    temporaryDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'actograph-export-')
    );
    defaultDirectory = path.join(temporaryDirectory, 'Documents', 'Actograph');
    chronicleDirectory = path.join(temporaryDirectory, 'Chroniques');
    graphDirectory = path.join(temporaryDirectory, 'Images');
    preferencesFilePath = path.join(
      temporaryDirectory,
      'userData',
      'exports.json'
    );
    for (const directory of [
      defaultDirectory,
      chronicleDirectory,
      graphDirectory,
      path.dirname(preferencesFilePath),
    ]) {
      fs.mkdirSync(directory, { recursive: true });
    }
    preferences = new ExportDirectoryPreferences(preferencesFilePath);
  });

  afterEach(() => {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  test('uses Documents/Actograph and the proposed filename on first export', () => {
    expect(
      preferences.resolveDefaultPath(
        { exportContext: 'chronicle', defaultPath: 'essai.jchronic' },
        defaultDirectory
      )
    ).toBe(path.join(defaultDirectory, 'essai.jchronic'));
    expect(fs.existsSync(preferencesFilePath)).toBe(false);
  });

  test('persists distinct chronicle and graph directories across instances', () => {
    preferences.rememberSelection('chronicle', {
      canceled: false,
      filePath: path.join(chronicleDirectory, 'essai.jchronic'),
    });
    new ExportDirectoryPreferences(preferencesFilePath).rememberSelection(
      'graph',
      {
        canceled: false,
        filePath: path.join(graphDirectory, 'graphe.png'),
      }
    );

    const reopenedPreferences = new ExportDirectoryPreferences(
      preferencesFilePath
    );
    expect(
      reopenedPreferences.resolveDefaultPath(
        { exportContext: 'chronicle', defaultPath: 'autre.jchronic' },
        defaultDirectory
      )
    ).toBe(path.join(chronicleDirectory, 'autre.jchronic'));
    // PNG, JPEG and SVG deliberately share the same context.
    for (const extension of ['png', 'jpeg', 'svg']) {
      expect(
        reopenedPreferences.resolveDefaultPath(
          { exportContext: 'graph', defaultPath: `graphe.${extension}` },
          defaultDirectory
        )
      ).toBe(path.join(graphDirectory, `graphe.${extension}`));
    }
  });

  test('an explicit absolute path takes priority without changing preferences', () => {
    preferences.rememberSelection('chronicle', {
      canceled: false,
      filePath: path.join(chronicleDirectory, 'essai.jchronic'),
    });
    const storedPreferences = fs.readFileSync(preferencesFilePath, 'utf8');
    const explicitPath = path.join(graphDirectory, 'copie.jchronic');
    expect(
      preferences.resolveDefaultPath(
        { exportContext: 'chronicle', defaultPath: explicitPath },
        defaultDirectory
      )
    ).toBe(explicitPath);
    expect(fs.readFileSync(preferencesFilePath, 'utf8')).toBe(
      storedPreferences
    );
  });

  test('cancellation or a missing selection never overwrites the last folder', () => {
    preferences.rememberSelection('graph', {
      canceled: false,
      filePath: path.join(graphDirectory, 'graphe.png'),
    });
    const storedPreferences = fs.readFileSync(preferencesFilePath, 'utf8');
    preferences.rememberSelection('graph', {
      canceled: true,
      filePath: path.join(chronicleDirectory, 'annule.png'),
    });
    preferences.rememberSelection('graph', { canceled: false });
    expect(fs.readFileSync(preferencesFilePath, 'utf8')).toBe(
      storedPreferences
    );
  });

  test('dialogs without context retain their original path and do not persist', () => {
    preferences.rememberSelection('graph', {
      canceled: false,
      filePath: path.join(graphDirectory, 'graphe.png'),
    });
    const storedPreferences = fs.readFileSync(preferencesFilePath, 'utf8');
    expect(
      preferences.resolveDefaultPath(
        { defaultPath: 'rapport.txt' },
        defaultDirectory
      )
    ).toBe(path.join(defaultDirectory, 'rapport.txt'));
    expect(preferences.resolveDefaultPath({}, defaultDirectory)).toBe(
      path.join(defaultDirectory, 'chronique.jchronic')
    );
    preferences.rememberSelection(undefined, {
      canceled: false,
      filePath: path.join(chronicleDirectory, 'rapport.txt'),
    });
    expect(fs.readFileSync(preferencesFilePath, 'utf8')).toBe(
      storedPreferences
    );
  });

  test('a removed directory or a path that became a file falls back to default', () => {
    preferences.rememberSelection('graph', {
      canceled: false,
      filePath: path.join(graphDirectory, 'graphe.png'),
    });
    fs.rmdirSync(graphDirectory);
    const options = {
      exportContext: 'graph' as const,
      defaultPath: 'graphe.svg',
    };
    expect(preferences.resolveDefaultPath(options, defaultDirectory)).toBe(
      path.join(defaultDirectory, 'graphe.svg')
    );
    fs.writeFileSync(
      graphDirectory,
      'a file now occupies the old directory path'
    );
    expect(preferences.resolveDefaultPath(options, defaultDirectory)).toBe(
      path.join(defaultDirectory, 'graphe.svg')
    );
  });

  test.each([
    '{corrupted',
    'null',
    '[]',
    '{"version":2,"directories":{}}',
    '{"version":1,"directories":{"graph":12,"chronicle":"relative/path"}}',
  ])(
    'invalid preference data falls back and can be repaired: %s',
    (contents) => {
      fs.writeFileSync(preferencesFilePath, contents);
      expect(
        preferences.resolveDefaultPath(
          { exportContext: 'graph', defaultPath: 'graphe.png' },
          defaultDirectory
        )
      ).toBe(path.join(defaultDirectory, 'graphe.png'));
      expect(() =>
        preferences.rememberSelection('graph', {
          canceled: false,
          filePath: path.join(graphDirectory, 'graphe.png'),
        })
      ).not.toThrow();
      expect(
        new ExportDirectoryPreferences(preferencesFilePath).resolveDefaultPath(
          { exportContext: 'graph', defaultPath: 'graphe.svg' },
          defaultDirectory
        )
      ).toBe(path.join(graphDirectory, 'graphe.svg'));
    }
  );

  test('unknown contexts, relative selections and unavailable folders are ignored', () => {
    preferences.rememberSelection('report' as ExportContext, {
      canceled: false,
      filePath: path.join(graphDirectory, 'rapport.txt'),
    });
    preferences.rememberSelection('graph', {
      canceled: false,
      filePath: 'relative/graphe.png',
    });
    preferences.rememberSelection('graph', {
      canceled: false,
      filePath: path.join(temporaryDirectory, 'missing', 'graphe.png'),
    });
    expect(fs.existsSync(preferencesFilePath)).toBe(false);
  });

  test('unavailable preference storage does not block the selected export', () => {
    const blockedPath = path.join(temporaryDirectory, 'blocked');
    fs.writeFileSync(blockedPath, 'not a directory');
    const onError = jest.fn();
    const blockedPreferences = new ExportDirectoryPreferences(
      path.join(blockedPath, 'exports.json'),
      onError
    );
    expect(() =>
      blockedPreferences.rememberSelection('graph', {
        canceled: false,
        filePath: path.join(graphDirectory, 'graphe.png'),
      })
    ).not.toThrow();
    expect(onError).toHaveBeenCalled();
    expect(
      blockedPreferences.resolveDefaultPath(
        { exportContext: 'graph', defaultPath: 'graphe.png' },
        defaultDirectory
      )
    ).toBe(path.join(defaultDirectory, 'graphe.png'));
  });
});
