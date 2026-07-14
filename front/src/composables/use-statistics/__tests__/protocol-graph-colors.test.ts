import { DEFAULT_GRAPH_COLOR } from '@actograph/core';
import {
  resolveCategoryGraphColor,
  resolveObservableChartColor,
} from '@services/observations/protocol-graph-preferences.utils';
import { IProtocol } from '@services/observations/interface';

const makeProtocol = (): IProtocol =>
  ({
    id: 'proto-1',
    _items: [
      {
        id: 'cat-1',
        name: 'Catégorie',
        type: 'category',
        graphPreferences: { color: '#ff0000' },
        children: [
          {
            id: 'obs-1',
            name: 'Obs 1',
            type: 'observable',
            graphPreferences: { color: '#0000ff' },
          },
          {
            id: 'obs-2',
            name: 'Obs 2',
            type: 'observable',
          },
        ],
      },
    ],
  }) as IProtocol;

describe('protocol graph color resolution', () => {
  it('resolveCategoryGraphColor retombe sur DEFAULT_GRAPH_COLOR sans protocole', () => {
    expect(resolveCategoryGraphColor('cat-1', null)).toBe(DEFAULT_GRAPH_COLOR);
  });

  it('resolveCategoryGraphColor lit la couleur de catégorie', () => {
    expect(resolveCategoryGraphColor('cat-1', makeProtocol())).toBe('#ff0000');
  });

  it('resolveObservableChartColor utilise la couleur propre de l\'observable', () => {
    expect(resolveObservableChartColor('obs-1', 'cat-1', makeProtocol())).toBe('#0000ff');
  });

  it('resolveObservableChartColor hérite la couleur de catégorie', () => {
    expect(resolveObservableChartColor('obs-2', 'cat-1', makeProtocol())).toBe('#ff0000');
  });

  it('resolveObservableChartColor retombe sur DEFAULT_GRAPH_COLOR sans protocole', () => {
    expect(resolveObservableChartColor('obs-1', 'cat-1', null)).toBe(DEFAULT_GRAPH_COLOR);
  });
});
