/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions":["node","node-addons"]}
 */
import { mount } from '@vue/test-utils';
import { reactive, ref, nextTick } from 'vue';
import { ReadingTypeEnum, type IReading } from '@actograph/core';
import StatisticsPage from '../pages/userspace/statistics/Index.vue';

jest.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
jest.mock('src/composables/use-observation', () => ({ useObservation: () => mockObservation }));
jest.mock('src/composables/use-statistics', () => ({ useStatistics: () => ({
  computedState: { canCalculateStatistics: ref(true) }, sharedState: { loading: false },
  methods: { loadGeneralStatistics: jest.fn().mockResolvedValue(undefined) },
}) }));
jest.mock('src/composables/use-statistics/use-statistics-export', () => ({ useStatisticsExport: () => ({}) }));
jest.mock('src/composables/use-license', () => ({ useLicense: () => ({ isStudentAccess: ref(false) }) }));
jest.mock('src/composables/use-app-resume', () => ({ emitChartsRefresh: jest.fn() }));
jest.mock('@lib-improba/components', () => ({ DPage: { template: '<main><slot /></main>' } }));
jest.mock('../pages/userspace/statistics/_components/GeneralStatisticsView.vue', () => ({ render: () => null }));
jest.mock('../pages/userspace/statistics/_components/CategoryStatisticsView.vue', () => ({ render: () => null }));
jest.mock('../pages/userspace/statistics/_components/ConditionalStatisticsView.vue', () => ({ render: () => null }));
jest.mock('../pages/userspace/_components/ReadingsAfterLastStopBanner.vue', () => ({ render: () => null }));

const mockObservation = {
  sharedState: reactive({ currentObservation: { id: 1 } }),
  readings: { sharedState: reactive({ currentReadings: [] as IReading[] }) },
};
const marker = (type: ReadingTypeEnum, ms: number) => ({ type, dateTime: new Date(ms), name: String(type) });
it.each([false, true])('warns without FIN with START=%p and clears the warning when FIN is added', async (hasStart) => {
  mockObservation.readings.sharedState.currentReadings = [
    ...(hasStart ? [marker(ReadingTypeEnum.START, 1000)] : []),
    marker(ReadingTypeEnum.DATA, 2000),
  ];
  const slot = { template: '<div><slot /></div>' };
  const wrapper = mount(StatisticsPage, { global: { directives: { 'close-popup': {} }, stubs: {
    DPage: slot, QTabs: true, QTab: true, QBtn: true, QSeparator: true, QBanner: slot,
    QIcon: true, QTabPanels: true, QTabPanel: true, QMenu: true,
  } } });
  expect(wrapper.get('[role="alert"]').text()).toContain('statisticsUi.missingStopWarning');
  mockObservation.readings.sharedState.currentReadings.push(marker(ReadingTypeEnum.STOP, 3000));
  await nextTick();
  expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  mockObservation.readings.sharedState.currentReadings.push(marker(ReadingTypeEnum.START, 4000));
  await nextTick();
  expect(wrapper.get('[role="alert"]').text()).toContain('statisticsUi.missingStopWarning');
  wrapper.unmount();
});
