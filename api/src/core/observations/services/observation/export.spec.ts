import { Export } from './export';
import { Observation } from '../../entities/observation.entity';
import { ObservationLocalMeta } from '../../entities/observation-local-meta.entity';
import { ObservationModeEnum, ObservationType } from '@actograph/core';

describe('Export - local meta purity', () => {
  const observationService = {
    findOne: jest.fn(),
  };
  const observationRepository = {};
  const protocolService = {
    findOne: jest.fn(),
  };
  const readingService = {};

  const exportService = new Export(
    observationService as any,
    observationRepository as any,
    protocolService as any,
    readingService as any,
  );

  const baseObservation: Observation = {
    id: 42,
    name: 'Test chronicle',
    description: 'A test',
    type: ObservationType.Normal,
    mode: ObservationModeEnum.Calendar,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    localMeta: {
      id: 99,
      archived: true,
      isProtocol: true,
      usedFor: ['copil', 'other'],
      usedForOther: 'workshop notes',
      note: 'machine-local annotation',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ObservationLocalMeta,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    observationService.findOne.mockResolvedValue({
      ...baseObservation,
      protocol: undefined,
      readings: [],
    });
  });

  it('does not include local meta fields in .jchronic export', async () => {
    const exportData = await exportService.exportObservation(42, 1);
    const serialized = JSON.stringify(exportData);

    expect(serialized).not.toContain('localMeta');
    expect(serialized).not.toContain('archived');
    expect(serialized).not.toContain('isProtocol');
    expect(serialized).not.toContain('usedFor');
    expect(serialized).not.toContain('usedForOther');
    expect(serialized).not.toContain('machine-local annotation');
    expect(serialized).not.toContain('workshop notes');

    expect(exportData.observation).toEqual({
      name: 'Test chronicle',
      description: 'A test',
      mode: ObservationModeEnum.Calendar,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
  });
});
