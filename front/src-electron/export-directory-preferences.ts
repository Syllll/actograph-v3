import fs from 'fs';
import path from 'path';

export type ExportContext = 'chronicle' | 'graph';

interface SaveDialogPathOptions {
  defaultPath?: string;
  exportContext?: ExportContext;
}

interface SaveDialogSelection {
  canceled: boolean;
  filePath?: string;
}

type ExportDirectories = Partial<Record<ExportContext, string>>;

function isExportContext(value: unknown): value is ExportContext {
  return value === 'chronicle' || value === 'graph';
}

/** Local preferences only: no directory is added to a chronicle or cloud data. */
export class ExportDirectoryPreferences {
  constructor(
    private readonly preferencesFilePath: string,
    private readonly onError?: (error: unknown) => void
  ) {}

  resolveDefaultPath(
    options: SaveDialogPathOptions,
    defaultDirectory: string
  ): string {
    if (options.defaultPath && path.isAbsolute(options.defaultPath)) {
      return options.defaultPath;
    }

    const fileName = options.defaultPath || 'chronique.jchronic';
    if (!isExportContext(options.exportContext)) {
      return path.join(defaultDirectory, fileName);
    }

    const rememberedDirectory = this.readDirectories()[options.exportContext];
    const directory =
      rememberedDirectory && this.isAvailableDirectory(rememberedDirectory)
        ? rememberedDirectory
        : defaultDirectory;
    return path.join(directory, fileName);
  }

  rememberSelection(
    context: ExportContext | undefined,
    selection: SaveDialogSelection
  ): void {
    if (
      !isExportContext(context) ||
      selection.canceled ||
      !selection.filePath ||
      !path.isAbsolute(selection.filePath)
    ) {
      return;
    }

    const directory = path.dirname(selection.filePath);
    if (!this.isAvailableDirectory(directory)) {
      return;
    }

    const directories = { ...this.readDirectories(), [context]: directory };
    const temporaryFilePath = `${this.preferencesFilePath}.${process.pid}.tmp`;
    try {
      fs.mkdirSync(path.dirname(this.preferencesFilePath), { recursive: true });
      fs.writeFileSync(
        temporaryFilePath,
        JSON.stringify({ version: 1, directories }),
        { encoding: 'utf8', mode: 0o600 }
      );
      fs.renameSync(temporaryFilePath, this.preferencesFilePath);
    } catch (error) {
      // A preference write must never prevent the selected export from proceeding.
      this.onError?.(error);
    } finally {
      try {
        if (fs.existsSync(temporaryFilePath)) fs.unlinkSync(temporaryFilePath);
      } catch (error) {
        this.onError?.(error);
      }
    }
  }

  private isAvailableDirectory(directory: string): boolean {
    try {
      if (!fs.statSync(directory).isDirectory()) return false;
      fs.accessSync(directory, fs.constants.W_OK);
      return true;
    } catch {
      // A removed folder or disconnected volume falls back to Documents/Actograph.
      return false;
    }
  }

  private readDirectories(): ExportDirectories {
    try {
      const preferences: unknown = JSON.parse(
        fs.readFileSync(this.preferencesFilePath, 'utf8')
      );
      if (!preferences || typeof preferences !== 'object') return {};
      const { version, directories } = preferences as {
        version?: unknown;
        directories?: unknown;
      };
      if (version !== 1 || !directories || typeof directories !== 'object') {
        return {};
      }

      const result: ExportDirectories = {};
      for (const context of ['chronicle', 'graph'] as const) {
        const directory = (directories as Record<string, unknown>)[context];
        if (typeof directory === 'string' && path.isAbsolute(directory)) {
          result[context] = directory;
        }
      }
      return result;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.onError?.(error);
      }
      return {};
    }
  }
}
