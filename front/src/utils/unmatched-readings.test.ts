import { unmatchedReadings } from './unmatched-readings';
import { IReading, IProtocolItem, ReadingTypeEnum, ProtocolItemTypeEnum } from '@services/observations/interface';

describe('unmatched readings', () => {
  it('keeps unknown data only, recomputing against the current protocol without changing rows', () => {
    const rows = [
      { type: ReadingTypeEnum.DATA, name: 'Unknown' },
      { type: ReadingTypeEnum.DATA, name: null },
      { type: ReadingTypeEnum.DATA, name: '' },
      { type: ReadingTypeEnum.DATA, name: '# note' },
      { type: ReadingTypeEnum.START, name: 'Start' },
      { type: ReadingTypeEnum.DATA, name: 'Known' },
    ] as IReading[];
    const items = [{ id: 'a', name: 'A', type: ProtocolItemTypeEnum.Category, children: [{ id: 'b', name: 'Known', type: ProtocolItemTypeEnum.Observable }] }] as IProtocolItem[];
    expect(unmatchedReadings(rows, items)).toEqual([rows[0], rows[1], rows[2]]);
    items[0].children!.push({ id: 'c', name: 'Unknown', type: ProtocolItemTypeEnum.Observable });
    expect(unmatchedReadings(rows, items)).toEqual([rows[1], rows[2]]);
    expect(rows.map((row) => row.name)).toEqual(['Unknown', null, '', '# note', 'Start', 'Known']);
  });
});
