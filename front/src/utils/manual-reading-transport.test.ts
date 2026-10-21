import { readingService } from '../services/observations/reading.service';
import { ReadingTypeEnum } from '../services/observations/interface';
import { api } from '../../lib-improba/boot/axios';

jest.mock('../../lib-improba/boot/axios', () => ({ api: jest.fn() }));
jest.mock('../services/utils/http.utils', () => ({
  __esModule: true, default: { apiUrl: () => 'http://localhost:3236' },
}));

describe('manual reading API transport', () => {
  const post = jest.fn().mockResolvedValue({ data: [] });
  const patch = jest.fn().mockResolvedValue({ data: [] });
  const dateTime = new Date('2026-10-20T08:00:00.123Z');
  const reading = { id: 3, name: 'A', type: ReadingTypeEnum.DATA, dateTime, tempId: 'unique-copy', sortOrder: 0 };

  beforeEach(() => {
    jest.mocked(api).mockReturnValue({ post, patch } as never);
    jest.clearAllMocks();
    jest.spyOn(console, 'debug').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('sends the exact ISO millisecond and order on creation without altering the source Date', async () => {
    await readingService.createMany({ observationId: 7, readings: [reading] });
    expect(post).toHaveBeenCalledWith('http://localhost:3236/observations/readings', {
      observationId: 7, readings: [{ ...reading, dateTime: '2026-10-20T08:00:00.123Z' }],
    });
    expect(reading.dateTime).toBe(dateTime);
  });

  it('keeps sortOrder zero and tempId on update so equal-time placement survives saving', async () => {
    await readingService.updateMany({ observationId: 7, readings: [reading] });
    expect(patch).toHaveBeenCalledWith('http://localhost:3236/observations/readings', {
      observationId: 7, readings: [expect.objectContaining({ id: 3, tempId: 'unique-copy', sortOrder: 0, dateTime: '2026-10-20T08:00:00.123Z' })],
    });
  });
});
