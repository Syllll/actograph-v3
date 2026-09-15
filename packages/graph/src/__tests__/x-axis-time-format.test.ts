jest.mock('pixi.js', () => {
  class MockDisplayObject {
    eventMode = 'auto';
    visible = true;
    x = 0;
    y = 0;
    rotation = 0;
    children: unknown[] = [];
    scale = { set: jest.fn() };
    addChild(child: unknown) {
      this.children.push(child);
      return child;
    }
    destroy() {}
    clear() {
      return this;
    }
  }

  return {
    Application: class {},
    Container: MockDisplayObject,
    Graphics: MockDisplayObject,
  };
});

import { Application } from 'pixi.js';
import {
  ObservationModeEnum,
  ReadingTypeEnum,
  TimeDisplayFormatEnum,
  type IObservation,
} from '@actograph/core';
import { xAxis } from '../pixi-app/axis/x-axis';
import type { YAxis } from '../pixi-app/axis/y-axis';

function makeObservation(): IObservation {
  return {
    id: 1,
    name: 'test',
    mode: ObservationModeEnum.Calendar,
    readings: [
      {
        type: ReadingTypeEnum.START,
        dateTime: new Date('2024-01-01T06:00:00Z'),
        name: 'start',
      },
      {
        type: ReadingTypeEnum.DATA,
        dateTime: new Date('2024-01-01T07:00:00Z'),
        name: 'On',
      },
      {
        type: ReadingTypeEnum.STOP,
        dateTime: new Date('2024-01-01T09:00:00Z'),
        name: 'stop',
      },
    ],
  } as IObservation;
}

describe('xAxis time format relabel', () => {
  it('relabels existing ticks without dropping them or changing their count', () => {
    const axis = new xAxis(
      { screen: { width: 800, height: 600 } } as Application,
      {} as YAxis,
    );
    axis.setData(makeObservation());

    expect(axis.hasTicks()).toBe(true);
    const countAfterSetData = axis.getTickLabels().length;
    expect(countAfterSetData).toBeGreaterThan(0);

    axis.setGraphRenderOptions({
      timeDisplayFormat: TimeDisplayFormatEnum.HourMinute,
    });
    const hourMinuteLabels = [...axis.getTickLabels()];
    expect(hourMinuteLabels).toHaveLength(countAfterSetData);

    axis.setGraphRenderOptions({
      timeDisplayFormat: TimeDisplayFormatEnum.HourMinuteSecond,
    });
    const hourMinuteSecondLabels = [...axis.getTickLabels()];
    expect(hourMinuteSecondLabels).toHaveLength(countAfterSetData);
    expect(hourMinuteSecondLabels).not.toEqual(hourMinuteLabels);
    expect(hourMinuteSecondLabels.every((label) => label.includes(':'))).toBe(true);
  });
});
