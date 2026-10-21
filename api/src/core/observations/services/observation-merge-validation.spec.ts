import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { ReadingTypeEnum } from '@actograph/core';
import { ObservationService } from './observation/index.service';

it('rejects invalid source timestamps before creating a merged observation', async () => {
  const source = (id: number, dateTime: Date) => ({
    id, user: { id: 7 }, readings: [{ id, name: 'Data', type: ReadingTypeEnum.DATA, dateTime }],
  });
  const service = {
    findOne: jest.fn().mockResolvedValueOnce(source(1, new Date(NaN)))
      .mockResolvedValueOnce(source(2, new Date('2026-10-21T08:00:00Z'))),
    create: jest.fn(),
  };
  await expect(ObservationService.prototype.merge.call(service as unknown as ObservationService, {
    userId: 7, sourceObservationId1: 1, sourceObservationId2: 2, name: 'Merge',
  })).rejects.toBeInstanceOf(BadRequestException);
  expect(service.create).not.toHaveBeenCalled();
});
