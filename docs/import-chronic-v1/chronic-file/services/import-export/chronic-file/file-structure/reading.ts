import qtdatastream from '../qtdatastream';
const types = qtdatastream.types;

export interface IReadingEntry {
  version?: number;
  id: number;
  name: string;
  flag: string;
  time: Date;
}

export interface IReading {
  version?: number;
  hasLinkedVideoFile: boolean;
  hasLinkedAudioFile: boolean;
  mediaFilePath: string;
  dataManagerType: string;
  readings: IReadingEntry[];
}

const exportReadingToBuffer = (reading: IReadingEntry): Buffer => {
  const buffer = Buffer.from([]);

  Buffer.concat([buffer, new types.QDouble(3).toBuffer()]);
  Buffer.concat([buffer, new types.QInt(reading.id).toBuffer()]);
  Buffer.concat([buffer, new types.QString(reading.name).toBuffer()]);
  Buffer.concat([buffer, new types.QString(reading.flag).toBuffer()]);
  Buffer.concat([buffer, new types.QDateTime(reading.time).toBuffer()]);

  return buffer;
};

const importReadingFromBuffer = (buffer: Buffer): IReadingEntry => {
  const version = types.QDouble.read(buffer);

  let id = -1;
  let name: string;
  let flag: string;
  let time: Date;

  if (version === 1) {
    name = types.QString.read(buffer);
    flag = types.QString.read(buffer);
    time = types.QDateTime.read(buffer);
  } else if (version === 2) {
    name = types.QString.read(buffer);
    flag = types.QString.read(buffer);
    time = types.QDateTime.read(buffer);
  } else if (version === 3) {
    id = types.QInt.read(buffer);
    name = types.QString.read(buffer);
    flag = types.QString.read(buffer);
    time = types.QDateTime.read(buffer);
  } else {
    throw new Error(`Version ${version} is not supported`);
  }

  return {
    version,
    id,
    name,
    flag,
    time,
  };
};

export const exportToBuffer = (reading: IReading, options: {}): Buffer => {
  const buffer = Buffer.from([]);

  Buffer.concat([buffer, new types.QDouble(reading.version).toBuffer()]);
  Buffer.concat([
    buffer,
    new types.QBool(reading.hasLinkedVideoFile).toBuffer(),
  ]);
  Buffer.concat([
    buffer,
    new types.QBool(reading.hasLinkedAudioFile).toBuffer(),
  ]);
  Buffer.concat([buffer, new types.QString(reading.mediaFilePath).toBuffer()]);

  Buffer.concat([buffer, new types.QString('RAM').toBuffer()]); // Data manager type

  Buffer.concat([buffer, new types.QInt(reading.readings.length).toBuffer()]);
  for (const entry of reading.readings) {
    Buffer.concat([buffer, exportReadingToBuffer(entry)]);
  }

  return buffer;
};

export const importFromBuffer = (buffer: Buffer, options: {}): any => {
  const version = types.QDouble.read(buffer);
  let hasLinkedVideoFile: boolean;
  let hasLinkedAudioFile: boolean;
  let mediaFilePath: string;
  let dataManagerType: string;
  const readings: IReadingEntry[] = [];

  if (version === 1) {
    hasLinkedVideoFile = types.QBool.read(buffer);
    hasLinkedAudioFile = types.QBool.read(buffer);
    mediaFilePath = types.QString.read(buffer);
    dataManagerType = types.QString.read(buffer);

    const numOfReadings = types.QInt.read(buffer);
    for (let i = 0; i < numOfReadings; i++) {
      readings.push(importReadingFromBuffer(buffer));
    }
  } else if (version === 2) {
    hasLinkedVideoFile = types.QBool.read(buffer);
    hasLinkedAudioFile = types.QBool.read(buffer);
    mediaFilePath = types.QString.read(buffer);
    dataManagerType = types.QString.read(buffer);

    const numOfReadings = types.QInt.read(buffer);
    for (let i = 0; i < numOfReadings; i++) {
      readings.push(importReadingFromBuffer(buffer));
    }
  } else if (version === 3) {
    hasLinkedVideoFile = types.QBool.read(buffer);
    hasLinkedAudioFile = types.QBool.read(buffer);
    mediaFilePath = types.QString.read(buffer);
    dataManagerType = types.QString.read(buffer);

    const numOfReadings = types.QInt.read(buffer);
    for (let i = 0; i < numOfReadings; i++) {
      readings.push(importReadingFromBuffer(buffer));
    }
  } else {
    throw new Error(`Version ${version} is not supported`);
  }

  return {
    version,
    hasLinkedVideoFile,
    hasLinkedAudioFile,
    mediaFilePath,
    dataManagerType,
    readings,
  };
};
