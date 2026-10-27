import { TimeDisplayFormatEnum } from '@actograph/core';
import { graphRenderOptionsFromMeta } from './graph-render-meta';

it('uses the same normalized axes for analysis and independent mini-graphs', () => {
  expect(graphRenderOptionsFromMeta(null)).toMatchObject({
    xAxisFontSize: 12, yAxisFontSize: 12, xAxisLabelOrientation: 45,
    timeDisplayFormat: TimeDisplayFormatEnum.Auto,
  });
  expect(graphRenderOptionsFromMeta({ graphXAxisFontSize: 24, graphYAxisFontSize: 5,
    graphXAxisLabelOrientation: -45, timeDisplayFormat: 'invalid' })).toMatchObject({
    xAxisFontSize: 24, yAxisFontSize: 10, xAxisLabelOrientation: -45,
    timeDisplayFormat: TimeDisplayFormatEnum.Auto,
  });
});
