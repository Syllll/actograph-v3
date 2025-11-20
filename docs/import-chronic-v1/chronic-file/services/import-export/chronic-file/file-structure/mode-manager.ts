import qtdatastream from '../qtdatastream';
const types = qtdatastream.types;

export interface IModeManager {
  currentMode: 'calendar' | 'chronometer';
}

const modeFromNumber = (mode: number): 'calendar' | 'chronometer' => {
  if (mode === 0) {
    return 'chronometer';
  } else if (mode === 1) {
    return 'calendar';
  } else {
    throw new Error(`Mode ${mode} is not supported (1)`);
  }
};

const modeToNumber = (mode: string): number => {
  if (mode === 'chronometer') {
    return 0;
  } else if (mode === 'cakendar') {
    return 1;
  } else {
    throw new Error(`Mode ${mode} is not supported (2)`);
  }
};

export const exportToBuffer = (
  modeManager: IModeManager,
  options: {},
): Buffer => {
  const buffer = Buffer.from([]);

  Buffer.concat([buffer, new types.QUInt(modeManager.currentMode).toBuffer()]);

  return buffer;
};

export const importFromBuffer = (buffer: Buffer, options: {}): IModeManager => {
  const currentModeAsNumber = types.QUInt.read(buffer);
  const currentMode = modeFromNumber(currentModeAsNumber);

  return {
    currentMode,
  };
};
