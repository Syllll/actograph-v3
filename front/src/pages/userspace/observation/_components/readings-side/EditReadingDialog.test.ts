/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions":["node","node-addons"]}
 */
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, ref, defineComponent } from 'vue';
import { ReadingTypeEnum } from '@actograph/core';
import { type IProtocolItem, ProtocolItemTypeEnum } from '@services/observations/interface';
import EditReadingDialog from './EditReadingDialog.vue';

jest.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
jest.mock('src/composables/use-observation', () => ({ useObservation: () => mockObservation }));
jest.mock('quasar', () => {
  const actual = jest.requireActual('quasar');
  return { ...actual, useDialogPluginComponent: Object.assign(() => ({
    dialogRef: ref(null), onDialogHide: jest.fn(), onDialogOK: mockOK, onDialogCancel: jest.fn(),
  }), { emits: actual.useDialogPluginComponent.emits }) };
});
const mockOK = jest.fn();
const origin = new Date('2026-10-21T08:00:00.000Z');
const mockObservation = {
  isChronometerMode: ref(false),
  sharedState: { currentObservation: { meta: { timeZone: 'Europe/Paris' } } },
  protocol: { sharedState: { currentProtocol: { _items: [] as IProtocolItem[] } } },
  chronometerMethods: {
    dateToDuration: (date: Date) => +date - +origin,
    durationToDate: (ms: number) => new Date(+origin + ms),
  },
};
const slot = { template: '<div><slot /></div>' };
const wrappers: VueWrapper[] = [];
const open = (minDateTime?: Date) => {
  const wrapper = mount(EditReadingDialog, {
    props: { reading: { name: 'End', type: ReadingTypeEnum.STOP, dateTime: origin }, minDateTime },
    global: { directives: { 'close-popup': {} }, stubs: { QDialog: slot, QCard: slot, QCardSection: slot, QCardActions: slot, QInput: defineComponent({ setup(_, { expose }) { expose({ focus: jest.fn() }); return () => null; } }), QSelect: true, QTooltip: true, QMenu: true, QIcon: true, QBtn: true, QItem: true, QItemSection: true, QDate: true, QTime: true, QPopupProxy: true } },
  });
  wrappers.push(wrapper);
  return wrapper;
};
beforeEach(() => { mockOK.mockClear(); mockObservation.isChronometerMode.value = false; mockObservation.protocol.sharedState.currentProtocol._items = []; });
afterEach(() => { for (const wrapper of wrappers.splice(0)) wrapper.unmount(); });

it.each([
  ['31/02/2026', '10:00:00.000'], ['21/10/2026', '24:00:00.000'],
  ['21/10/2026', '10:60:00.000'], ['21/10/2026', '10:00:60.000'],
  ['29/03/2026', '02:30:00.000'], ['__/10/2026', '10:00:00.000'],
])('rejects %s %s in the edit dialog without emitting a save', async (date, time) => {
  const wrapper = open();
  wrapper.vm.state.datePart = date;
  wrapper.vm.state.timePart = time;
  await nextTick();
  expect(wrapper.vm.isValid).toBe(false);
  expect(wrapper.get('[role="alert"]').text()).toContain('readingsUi.invalidTimestamp');
  wrapper.vm.onOKClick();
  expect(mockOK).not.toHaveBeenCalled();
});

it('prevents closing the sequence at or before the last reading', async () => {
  const wrapper = open(origin);
  expect(wrapper.vm.isValid).toBe(false);
  expect(wrapper.get('[role="alert"]').text()).toContain('readingsUi.endMustFollowReadings');
  wrapper.vm.state.timePart = '10:10:00.000';
  await nextTick();
  expect(wrapper.vm.isValid).toBe(true);
  wrapper.vm.onOKClick();
  expect(mockOK).toHaveBeenCalledWith(expect.objectContaining({ dateTime: new Date(+origin + 600000) }));
});

it.each([['hours', 24], ['minutes', 60], ['seconds', 60], ['milliseconds', 1000], ['days', -1], ['hours', 'bad'], ['minutes', ''], ['seconds', null]])('rejects invalid duration segment %s=%p', async (part, value) => {
  mockObservation.isChronometerMode.value = true;
  const wrapper = open();
  Object.assign(wrapper.vm.state, { [part]: value });
  await nextTick();
  expect(wrapper.vm.isValid).toBe(false);
  wrapper.vm.onOKClick();
  expect(mockOK).not.toHaveBeenCalled();
});


it('changes only the label through the common picker and still accepts a free label', () => {
  mockObservation.protocol.sharedState.currentProtocol._items = [{
    id: 'activity', name: 'Activity', type: ProtocolItemTypeEnum.Category,
    children: [{ id: 'walking', name: 'Walking', type: ProtocolItemTypeEnum.Observable }],
  }];
  const wrapper = open();
  wrapper.vm.state.description = 'Keep these notes';
  expect(wrapper.vm.observableGroups[0].names).toEqual(['Walking']);
  wrapper.vm.chooseObservable('Walking');
  wrapper.vm.onOKClick();
  expect(mockOK).toHaveBeenLastCalledWith(expect.objectContaining({
    name: 'Walking', dateTime: origin, type: ReadingTypeEnum.STOP, description: 'Keep these notes',
  }));
  wrapper.vm.state.name = 'An unlisted free label';
  wrapper.vm.onOKClick();
  expect(mockOK).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'An unlisted free label', dateTime: origin }));
});
