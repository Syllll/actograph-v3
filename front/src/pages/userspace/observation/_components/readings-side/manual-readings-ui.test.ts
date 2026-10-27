/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions":["node","node-addons"]}
 */
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, reactive, ref, defineComponent, h, type App } from 'vue';
import { Dialog, Quasar, QTable } from 'quasar';
import { IReading, IProtocolItem, ReadingTypeEnum, ObservationModeEnum, ProtocolItemTypeEnum } from '@services/observations/interface';
import { QTableStub, readingsUiGlobal, scrollToReading } from '../../../../../../test/helpers/readings-ui';
import ReadingsTable from './ReadingsTable.vue';
import ReadingsToolbar from './ReadingsToolbar.vue';
import ReadingsSide from './Index.vue';

jest.mock('@actograph/core', () => ({
  ...jest.requireActual('@actograph/core'),
  getLocalTimeZone: () => 'Europe/Paris',
}));

jest.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
jest.mock('src/composables/use-observation', () => ({
  useObservation: () => mockObservation,
}));
jest.mock('src/composables/use-observation/use-readings', () => ({ useReadings: jest.fn() }));
jest.mock('@services/observations/protocol.service', () => ({
  ProtocolItemTypeEnum: { Category: 'category' },
}));
jest.mock('./EditReadingDialog.vue', () => ({ name: 'EditReadingDialog', render: () => null }));
jest.mock('./AddCommentDialog.vue', () => ({ name: 'AddCommentDialog', render: () => null }));
jest.mock('./AutoCorrectReadingsDialog.vue', () => ({ name: 'AutoCorrectReadingsDialog', render: () => null }));
jest.mock('./ReadingsConfirmDialog.vue', () => ({ name: 'ReadingsConfirmDialog', render: () => null }));
jest.mock('src/pages/userspace/_components/ReadingsAfterLastStopBanner.vue', () => ({
  name: 'ReadingsAfterLastStopBanner', render: () => null,
}));
jest.mock('quasar', () => ({
  ...jest.requireActual('quasar'),
  Dialog: { create: jest.fn() },
  useQuasar: () => ({ notify: mockNotify }),
}));

const mockNotify = jest.fn();
const origin = new Date('2026-10-20T08:00:00.000Z');
const reading = (tempId: string, offset = 0, extra: Partial<IReading> = {}): IReading => ({
  tempId,
  name: 'Observation ' + tempId,
  type: ReadingTypeEnum.DATA,
  dateTime: new Date(origin.getTime() + offset),
  ...extra,
} as IReading);

const makeObservation = () => {
  const sharedState = reactive({
    currentReadings: [] as IReading[],
    selectedReading: null as IReading | null,
  });
  return {
    sharedState: reactive({
      currentObservation: { id: 12, mode: ObservationModeEnum.Calendar, meta: { timeZone: 'Europe/Paris' } },
      currentDate: origin,
      elapsedTime: 0,
    }),
    isChronometerMode: ref(false),
    protocol: { sharedState: reactive({ currentProtocol: { _items: [] as IProtocolItem[] } }) },
    chronometerMethods: {
      dateToDuration: (date: Date) => date.getTime() - origin.getTime(),
      durationToDate: (milliseconds: number) => new Date(origin.getTime() + milliseconds),
    },
    readings: {
      sharedState,
      methods: {
        autoCorrectReadings: jest.fn(() => ({ actions: [] as Array<{ reason: string; type: string; description: string; newReading?: Partial<IReading> }>, correctedReadings: [] as IReading[], invalidReadings: [] as IReading[] })),
        selectReading: jest.fn((row: IReading) => { sharedState.selectedReading = row; }),
        addManualReading: jest.fn(),
        addReading: jest.fn(),
        updateReading: jest.fn((identity: Partial<IReading>, patch: Partial<IReading>) => {
          const row = sharedState.currentReadings.find((candidate) =>
            (identity.id != null && candidate.id === identity.id) ||
            (identity.tempId && candidate.tempId === identity.tempId),
          );
          if (row) Object.assign(row, patch);
        }),
        synchronizeReadings: jest.fn().mockResolvedValue(undefined),
        sortReadingsChronologically: jest.fn(() => {
          sharedState.currentReadings.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
        }),
      },
    },
  };
};

let mockObservation: ReturnType<typeof makeObservation>;
const wrappers: VueWrapper[] = [];
const mountTable = (rows: IReading[], attach = false) => {
  mockObservation.readings.sharedState.currentReadings = rows;
  const wrapper = mount(ReadingsTable, {
    ...(attach ? { attachTo: document.body } : {}),
    props: { readings: mockObservation.readings.sharedState.currentReadings }, global: readingsUiGlobal,
  });
  wrappers.push(wrapper);
  return wrapper;
};
const settle = async () => { await nextTick(); await nextTick(); await nextTick(); };
const tableRows = (wrapper: VueWrapper) => wrapper.findAll('tbody tr[data-reading-key]');

beforeEach(() => {
  mockObservation = makeObservation();
  jest.clearAllMocks();
  (Dialog.create as jest.Mock).mockReturnValue({ onOk: jest.fn().mockReturnThis() });
});

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  jest.useRealTimers();
});

describe('manual reading table selection', () => {
  it('selects a clicked row with visible and accessible selection state', async () => {
    const wrapper = mountTable([reading('one'), reading('two', 1000)]);
    await tableRows(wrapper)[1].trigger('click');
    expect(mockObservation.readings.methods.selectReading).toHaveBeenCalledWith(expect.objectContaining({ tempId: 'two' }));
    expect(tableRows(wrapper)[1].classes()).toContain('reading-row--selected');
    expect(tableRows(wrapper)[1].attributes('aria-selected')).toBe('true');
    expect(tableRows(wrapper)[0].attributes('aria-selected')).toBe('false');
    expect(tableRows(wrapper)[1].attributes('tabindex')).toBe('0');
  });

  it.each(['Enter', ' '])('selects a focused row using %p', async (key) => {
    const wrapper = mountTable([reading('one'), reading('two', 1000)]);
    await tableRows(wrapper)[1].trigger('keydown', { key });
    expect(mockObservation.readings.methods.selectReading).toHaveBeenCalledWith(expect.objectContaining({ tempId: 'two' }));
    expect(tableRows(wrapper)[1].attributes('aria-selected')).toBe('true');
  });

  it('selects a row when entering its inline editor without intercepting editor keys', async () => {
    const wrapper = mountTable([reading('one'), reading('two', 1000)]);
    const input = tableRows(wrapper)[1].find('input');
    await input.trigger('click');
    await input.trigger('focusin');
    expect(tableRows(wrapper)[1].classes()).toContain('reading-row--selected');
    mockObservation.readings.methods.selectReading.mockClear();
    await input.trigger('keydown', { key: ' ' });
    expect(mockObservation.readings.methods.selectReading).not.toHaveBeenCalled();
  });

  it('retains row identity, selection and an in-progress date draft when the server assigns an id', async () => {
    const row = reading('pending');
    const wrapper = mountTable([row]);
    await tableRows(wrapper)[0].trigger('click');
    const input = tableRows(wrapper)[0].find('input');
    await input.setValue('21/10/2026 11:12:13.456');
    const element = input.element;
    mockObservation.readings.sharedState.currentReadings[0].id = 42;
    await settle();
    expect(tableRows(wrapper)[0].attributes('aria-selected')).toBe('true');
    expect(tableRows(wrapper)[0].find('input').element).toBe(element);
    expect((tableRows(wrapper)[0].find('input').element as HTMLInputElement).value).toBe('21/10/2026 11:12:13.456');
  });

  it('recognizes a selected row after its object is replaced during synchronization', async () => {
    const wrapper = mountTable([reading('one')]);
    await tableRows(wrapper)[0].trigger('click');
    const replacement = reading('one', 0, { id: 42, name: 'Saved observation' });
    mockObservation.readings.sharedState.currentReadings.splice(0, 1, replacement);
    await settle();
    expect((tableRows(wrapper)[0].find('.readings-observable-input').element as HTMLInputElement).value).toBe('Saved observation');
    expect(tableRows(wrapper)[0].attributes('aria-selected')).toBe('true');
  });

  it('keeps inline time edits on the selected row and re-sorts readings', async () => {
    mockObservation.isChronometerMode.value = true;
    const wrapper = mountTable([reading('one'), reading('two', 1000)]);
    await tableRows(wrapper)[1].find('input').trigger('focusin');
    await tableRows(wrapper)[1].find('input').setValue('000j 00:00:02.125');
    await tableRows(wrapper)[1].find('input').trigger('blur');
    expect(new Date(mockObservation.readings.sharedState.currentReadings[1].dateTime).getTime()).toBe(origin.getTime() + 2125);
    expect(mockObservation.readings.methods.sortReadingsChronologically).toHaveBeenCalled();
    expect(tableRows(wrapper)[1].attributes('aria-selected')).toBe('true');
  });

  it('groups one local add action with editing and deletion', () => {
    const wrapper = mountTable([reading('one')]);
    const row = tableRows(wrapper)[0];
    expect(row.findAll('td:last-child button').map((button) => button.attributes('data-icon')))
      .toEqual(['add', 'edit', 'delete']);
    expect(row.findAll('button[data-icon="add"]')).toHaveLength(1);
    expect(wrapper.find('button[data-icon="content_copy"]').exists()).toBe(false);
  });
});

describe('manual reading visibility in the virtual table', () => {
  const advanceFrames = async (count = 6) => {
    for (let frame = 0; frame < count; frame += 1) {
      jest.advanceTimersByTime(16);
      await settle();
    }
  };

  it('waits for the completed virtual slice and tbody refocus before focusing a distant copy', async () => {
    jest.useFakeTimers();
    const wrapper = mountTable([reading('source'), reading('copy', 500000)], true);
    const content = wrapper.get('tbody').element;
    content.classList.add('q-virtual-scroll__content');
    content.tabIndex = -1;
    const sourceInput = tableRows(wrapper)[0].get('input').element as HTMLInputElement;
    sourceInput.focus();
    const copyRow = tableRows(wrapper)[1].element;
    const copyInput = copyRow.querySelector('input');
    // Model Quasar's two-ended slice update: the target mounts on its second
    // frame, and recycling the source restores focus to its virtual tbody.
    copyRow.remove();
    mockObservation.readings.sharedState.selectedReading = mockObservation.readings.sharedState.currentReadings[1];
    const focused = wrapper.vm.focusReading(mockObservation.readings.sharedState.currentReadings[1]);
    window.requestAnimationFrame(() => {
      content.focus();
      window.requestAnimationFrame(() => {
        content.appendChild(copyRow);
        wrapper.vm.onVirtualScroll();
      });
    });
    await settle();
    await advanceFrames();
    await focused;
    expect(scrollToReading).toHaveBeenLastCalledWith(1, 'center');
    expect(document.activeElement).toBe(copyInput);
    await advanceFrames();
    expect(document.activeElement).toBe(copyInput);
  });

  it('focuses an already rendered row when Quasar emits no virtual scroll event', async () => {
    jest.useFakeTimers();
    const wrapper = mountTable([reading('copy')], true);
    mockObservation.readings.sharedState.selectedReading = mockObservation.readings.sharedState.currentReadings[0];
    const focused = wrapper.vm.focusReading(mockObservation.readings.sharedState.currentReadings[0]);
    await settle();
    await advanceFrames();
    await focused;
    expect(document.activeElement).toBe(tableRows(wrapper)[0].get('input').element);
  });

  it.each(['selection', 'unmount', 'other-control'])('cancels pending focus after %s', async (reason) => {
    jest.useFakeTimers();
    const wrapper = mountTable([reading('copy'), reading('other', 1000)], true);
    mockObservation.readings.sharedState.selectedReading = mockObservation.readings.sharedState.currentReadings[0];
    const input = tableRows(wrapper)[0].get('input').element as HTMLInputElement;
    const focus = jest.spyOn(input, 'focus');
    const focused = wrapper.vm.focusReading(mockObservation.readings.sharedState.currentReadings[0]);
    await settle();
    if (reason === 'selection') mockObservation.readings.sharedState.selectedReading = mockObservation.readings.sharedState.currentReadings[1];
    if (reason === 'unmount') wrapper.unmount();
    if (reason === 'other-control') (tableRows(wrapper)[0].get('.readings-observable-input').element as HTMLInputElement).focus();
    await advanceFrames();
    await focused;
    expect(focus).not.toHaveBeenCalled();
    focus.mockRestore();
  });

  it.each([false, true])('scrolls to the selected inserted row with descending=%p', async (descending) => {
    const wrapper = mountTable([reading('first'), reading('middle', 3000), reading('last', 5000)]);
    wrapper.findComponent(QTableStub).vm.$emit('update:pagination', {
      sortBy: 'dateTime', descending, rowsPerPage: 0, page: 1,
    });
    await settle();
    scrollToReading.mockClear();
    const inserted = reading('inserted', 2000);
    mockObservation.readings.sharedState.currentReadings.push(inserted);
    mockObservation.readings.sharedState.selectedReading = inserted;
    await settle();
    const expectedIndex = descending ? 2 : 1;
    expect(scrollToReading).toHaveBeenLastCalledWith(expectedIndex, 'center');
    expect(tableRows(wrapper)[expectedIndex].attributes('aria-selected')).toBe('true');
  });

  it('scrolls to the correct index when editing moves a selected row in descending order', async () => {
    const wrapper = mountTable([reading('first'), reading('middle', 2000), reading('last', 5000)]);
    wrapper.findComponent(QTableStub).vm.$emit('update:pagination', {
      sortBy: 'dateTime', descending: true, rowsPerPage: 0, page: 1,
    });
    mockObservation.readings.sharedState.selectedReading = mockObservation.readings.sharedState.currentReadings[0];
    await settle();
    expect(scrollToReading).toHaveBeenLastCalledWith(2, 'center');
    mockObservation.readings.sharedState.currentReadings[0].dateTime = new Date(origin.getTime() + 9000);
    await settle();
    expect(scrollToReading).toHaveBeenLastCalledWith(0, 'center');
    expect(tableRows(wrapper)[0].attributes('aria-selected')).toBe('true');
  });

  it('does not request a negative scroll index if selection is outside the current filter', async () => {
    const wrapper = mountTable([reading('visible')]);
    scrollToReading.mockClear();
    mockObservation.readings.sharedState.selectedReading = reading('hidden');
    await settle();
    expect(scrollToReading).not.toHaveBeenCalled();
    expect(tableRows(wrapper)[0].attributes('aria-selected')).toBe('false');
  });
});

describe('direct observable editing', () => {
  it('edits a label directly without opening a dialog or saving partial text', async () => {
    const wrapper = mountTable([reading('one', 0, { description: 'Keep these notes' })]);
    const input = wrapper.find('.readings-observable-input');
    await input.trigger('focusin');
    await input.setValue('A new observable');
    expect(mockObservation.readings.sharedState.currentReadings[0].name).toBe('Observation one');
    await input.trigger('keydown', { key: 'Enter' });
    expect(mockObservation.readings.sharedState.currentReadings[0]).toMatchObject({ name: 'A new observable', description: 'Keep these notes' });
    expect(tableRows(wrapper)[0].attributes('aria-selected')).toBe('true');
    expect(Dialog.create).not.toHaveBeenCalled();
  });

  it('restores empty labels and Escape without changing the saved value', async () => {
    const wrapper = mountTable([reading('one')]);
    const input = wrapper.find('.readings-observable-input');
    await input.setValue('   ');
    await input.trigger('blur');
    expect((input.element as HTMLInputElement).value).toBe('Observation one');
    await input.setValue('Cancel this edit');
    await input.trigger('keydown', { key: 'Escape' });
    expect((input.element as HTMLInputElement).value).toBe('Observation one');
    expect(mockObservation.readings.methods.updateReading).not.toHaveBeenCalled();
  });

  it('keeps the label draft attached when its row receives a server ID', async () => {
    const wrapper = mountTable([reading('pending')]);
    const input = wrapper.find('.readings-observable-input');
    await input.setValue('Still editing');
    mockObservation.readings.sharedState.currentReadings[0].id = 33;
    await settle();
    expect((input.element as HTMLInputElement).value).toBe('Still editing');
    await input.trigger('blur');
    expect(mockObservation.readings.methods.updateReading).toHaveBeenCalledWith({ id: 33, tempId: 'pending' }, { name: 'Still editing' });
  });

  it('offers protocol observables beside the input and selects one without a dialog', async () => {
    const row = reading('one', 0, { description: 'Keep notes' });
    mockObservation.readings.sharedState.currentReadings = [row];
    mockObservation.protocol.sharedState.currentProtocol._items = [{
      id: 'category', name: 'Activity', type: ProtocolItemTypeEnum.Category,
      children: [{ id: 'walking', name: 'Walking', type: ProtocolItemTypeEnum.Observable }],
    }];
    const wrapper = mount(ReadingsTable, {
      props: { readings: mockObservation.readings.sharedState.currentReadings },
      global: { ...readingsUiGlobal, stubs: { ...readingsUiGlobal.stubs,
        QMenu: defineComponent({ setup: (_, { slots }) => () => h('div', slots.default?.()) }),
      } },
    });
    wrappers.push(wrapper);
    expect(wrapper.find('button[data-icon="arrow_drop_down"]').attributes('aria-label')).toBe('readingsUi.chooseObservable');
    await wrapper.find('[data-observable-option="Walking"]').trigger('click');
    expect(mockObservation.readings.sharedState.currentReadings[0]).toMatchObject({ name: 'Walking', description: 'Keep notes' });
    expect(Dialog.create).not.toHaveBeenCalled();
  });
});

describe('fixed timestamp table integration', () => {
  it('rejects impossible dates without persisting or silently normalizing them', async () => {
    const wrapper = mountTable([reading('one')]);
    const input = wrapper.find('.reading-time-input');
    await input.setValue('31/02/2026 12:00:00.000');
    await input.trigger('blur');
    expect(mockObservation.readings.sharedState.currentReadings[0].dateTime).toEqual(origin);
    expect(input.attributes('aria-invalid')).toBe('true');
    expect(mockObservation.readings.methods.sortReadingsChronologically).not.toHaveBeenCalled();
  });

  it('rejects a nonexistent local DST time and accepts a subsequent valid correction', async () => {
    const wrapper = mountTable([reading('one')]);
    const input = wrapper.find('.reading-time-input');
    await input.setValue('29/03/2026 02:30:00.000');
    await input.trigger('blur');
    await settle();
    expect(mockObservation.readings.sharedState.currentReadings[0].dateTime).toEqual(origin);
    expect(input.attributes('aria-invalid')).toBe('true');
    await input.setValue('29/03/2026 03:30:00.000');
    await input.trigger('blur');
    await settle();
    expect(mockObservation.readings.sharedState.currentReadings[0].dateTime.toISOString()).toBe('2026-03-29T01:30:00.000Z');
    expect(input.attributes('aria-invalid')).not.toBe('true');
  });

  it('retains the later pass of a repeated DST hour while editing milliseconds', async () => {
    const source = new Date('2026-10-25T01:30:00.000Z');
    const wrapper = mountTable([reading('one', 0, { dateTime: source })]);
    const input = wrapper.find('.reading-time-input');
    await input.setValue('25/10/2026 02:30:00.123');
    await input.trigger('blur');
    expect(mockObservation.readings.sharedState.currentReadings[0].dateTime.toISOString()).toBe('2026-10-25T01:30:00.123Z');
  });

  it('uses the local zone for a legacy chronicle without timeZone metadata and rejects its DST gap', async () => {
    mockObservation.sharedState.currentObservation.meta = {} as { timeZone: string };
    const wrapper = mountTable([reading('one')]);
    const input = wrapper.find('.reading-time-input');
    await input.setValue('29/03/2026 02:30:00.000');
    await input.trigger('blur');
    await settle();
    expect(input.attributes('aria-invalid')).toBe('true');
    expect(mockObservation.readings.sharedState.currentReadings[0].dateTime).toEqual(origin);
  });

  it('rejects a duration that would overflow the native Date range without persisting Invalid Date', async () => {
    mockObservation.isChronometerMode.value = true;
    const wrapper = mountTable([reading('one')]);
    const input = wrapper.find('.reading-time-input');
    await input.setValue('99999999j 23:59:59.999');
    await input.trigger('blur');
    await settle();
    expect(mockObservation.readings.sharedState.currentReadings[0].dateTime).toEqual(origin);
    expect(input.attributes('aria-invalid')).toBe('true');
    expect(mockObservation.readings.methods.sortReadingsChronologically).not.toHaveBeenCalled();
  });
});

describe('manual add table integration', () => {
  it('keeps the main add action next to the label header and out of the toolbar', async () => {
    const wrapper = mountTable([reading('one')]);
    const button = wrapper.find('thead button[data-icon="add"]');
    expect(button.attributes('aria-label')).toBe('readingsUi.addReadingTooltip');
    await button.trigger('click');
    expect(wrapper.emitted('add-reading')).toEqual([[undefined]]);
    const toolbar = mount(ReadingsToolbar, { global: readingsUiGlobal });
    wrappers.push(toolbar);
    expect(toolbar.find('button[data-icon="add"]').exists()).toBe(false);
  });

  it('emits the explicit source from the row action without requiring a hover', async () => {
    const wrapper = mountTable([reading('one', 0, { description: 'Source notes' }), reading('two', 1000)]);
    await tableRows(wrapper)[1].trigger('click');
    mockObservation.readings.methods.selectReading.mockClear();
    const button = tableRows(wrapper)[0].find('.readings-row-add');
    expect(button.attributes('aria-label')).toBe('readingsUi.addReadingFromSource');
    expect((button.element as HTMLButtonElement).tabIndex).toBe(0);
    await button.trigger('click');
    expect(wrapper.emitted('add-reading')?.[0][0]).toMatchObject({ tempId: 'one', dateTime: origin, description: 'Source notes' });
    expect(mockObservation.readings.methods.selectReading).not.toHaveBeenCalled();
    expect(tableRows(wrapper)).toHaveLength(2);
  });

  it.each(['Insert', '+'])('keeps the %p shortcut on a focused row without intercepting its controls', async (key) => {
    const wrapper = mountTable([reading('one')]);
    await tableRows(wrapper)[0].trigger('focusin');
    await tableRows(wrapper)[0].trigger('keydown', { key });
    expect(wrapper.emitted('add-reading')?.[0][0]).toMatchObject({ tempId: 'one' });
    await tableRows(wrapper)[0].find('input').trigger('keydown', { key });
    await tableRows(wrapper)[0].find('.readings-row-add').trigger('keydown', { key });
    expect(wrapper.emitted('add-reading')).toHaveLength(1);
  });

  it('commits the local source draft before forwarding its timestamp and notes for addition', async () => {
    mockObservation.readings.sharedState.currentReadings = [reading('one', 0, { description: 'Keep these notes' }), reading('two', 1000)];
    const wrapper = mount(ReadingsSide, { global: readingsUiGlobal });
    wrappers.push(wrapper);
    await tableRows(wrapper)[1].trigger('click');
    await tableRows(wrapper)[0].find('.reading-time-input').setValue('21/10/2026 11:12:13.456');
    await tableRows(wrapper)[0].find('.readings-row-add').trigger('click');
    await settle();
    expect(mockObservation.readings.methods.addManualReading).toHaveBeenCalledWith(expect.objectContaining({
      tempId: 'one', dateTime: new Date('2026-10-21T09:12:13.456Z'), description: 'Keep these notes',
    }));
  });

  it('keeps a search filter and offers an explicit reveal action for a hidden addition', async () => {
    mockObservation.readings.sharedState.currentReadings = [reading('first')];
    mockObservation.readings.methods.addManualReading.mockImplementation(() => {
      const added = reading('new');
      mockObservation.readings.sharedState.currentReadings.push(added);
      mockObservation.readings.sharedState.selectedReading = added;
      return added;
    });
    const wrapper = mount(ReadingsSide, { global: readingsUiGlobal });
    wrappers.push(wrapper);
    await wrapper.find('.readings-search__field').setValue('no matching rows');
    await wrapper.find('thead button[data-icon="add"]').trigger('click');
    await settle();
    expect(mockObservation.readings.methods.addManualReading).toHaveBeenCalledTimes(1);
    expect((wrapper.find('.readings-search__field').element as HTMLInputElement).value).toBe('no matching rows');
    expect(tableRows(wrapper)).toHaveLength(0);
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({
      message: 'readingsUi.addHiddenByFilter', actions: [expect.objectContaining({ label: 'readingsUi.clearFilter', handler: expect.any(Function) })],
    }));
  });

  it('keeps invalid drafts and prevents copying an older saved timestamp', async () => {
    mockObservation.readings.sharedState.currentReadings = [reading('one')];
    const wrapper = mount(ReadingsSide, { global: readingsUiGlobal });
    wrappers.push(wrapper);
    await wrapper.find('.reading-time-input').setValue('31/02/2026 12:00:00.000');
    await wrapper.find('thead button[data-icon="add"]').trigger('click');
    await settle();
    expect(mockObservation.readings.methods.addManualReading).not.toHaveBeenCalled();
    expect((wrapper.find('.reading-time-input').element as HTMLInputElement).value).toBe('31/02/2026 12:00:00.000');
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ message: 'readingsUi.addInvalidTimestamp' }));
  });

  it('commits a retained valid draft even when a filter has hidden its source row', async () => {
    const wrapper = mountTable([reading('one'), reading('two', 1000)]);
    await tableRows(wrapper)[0].find('.reading-time-input').setValue('21/10/2026 11:12:13.456');
    await wrapper.setProps({ readings: [mockObservation.readings.sharedState.currentReadings[1]] });
    expect(wrapper.vm.prepareForAdd()).toBe(true);
    expect(mockObservation.readings.sharedState.currentReadings.find((row) => row.tempId === 'one')?.dateTime.toISOString())
      .toBe('2026-10-21T09:12:13.456Z');
  });

  it('does not scroll when clicking a row or when the server assigns an ID', async () => {
    const wrapper = mountTable([reading('one'), reading('two', 1000)]);
    await settle();
    scrollToReading.mockClear();
    await tableRows(wrapper)[1].trigger('click');
    await settle();
    mockObservation.readings.sharedState.currentReadings[1].id = 88;
    await settle();
    expect(scrollToReading).not.toHaveBeenCalled();
  });
});

// Exercise Quasar itself as well as the controlled virtualization contract above.
describe('real Quasar table integration', () => {
  it('keeps a resized terminal workspace outside virtualized reading data and cleans its observer', async () => {
    jest.useFakeTimers();
    const OriginalResizeObserver = global.ResizeObserver;
    let onResize: () => void = () => undefined;
    const disconnect = jest.fn();
    global.ResizeObserver = jest.fn().mockImplementation((callback: () => void) => {
      onResize = callback;
      return { observe: jest.fn(), unobserve: jest.fn(), disconnect };
    });
    try {
      mockObservation.readings.sharedState.currentReadings = Array.from({ length: 500 }, (_, index) => reading(`row-${index}`, index * 1000));
      const wrapper = mount(ReadingsTable, {
        props: { readings: mockObservation.readings.sharedState.currentReadings },
        global: {
          ...readingsUiGlobal, directives: {},
          plugins: [{ install: (app: App) => Reflect.apply(Quasar.install, Quasar, [app, { config: {} }, { req: { headers: {} } }]) }],
          stubs: { ...readingsUiGlobal.stubs, QTable: false },
        },
      });
      await settle();
      jest.advanceTimersByTime(100);
      await settle();
      const middle = wrapper.get('.q-table__middle').element;
      Object.defineProperty(middle, 'clientHeight', { configurable: true, value: 600 });
      jest.spyOn(wrapper.get('thead').element, 'getBoundingClientRect').mockReturnValue({ height: 48 } as DOMRect);
      jest.spyOn(tableRows(wrapper)[0].element, 'getBoundingClientRect').mockReturnValue({ height: 28 } as DOMRect);
      onResize();
      await settle();
      expect(wrapper.get('.readings-workspace-spacer td').attributes('style')).toContain('height: 524px');
      expect(wrapper.findComponent(QTable).vm.filteredSortedRows).toHaveLength(500);
      expect(wrapper.get('.readings-workspace-spacer').attributes('data-reading-key')).toBeUndefined();
      Object.defineProperty(middle, 'clientHeight', { configurable: true, value: 300 });
      onResize();
      await settle();
      expect(wrapper.get('.readings-workspace-spacer td').attributes('style')).toContain('height: 224px');
      wrapper.unmount();
      expect(disconnect).toHaveBeenCalled();
    } finally {
      global.ResizeObserver = OriginalResizeObserver;
    }
  });

  it.each([false, true])('reveals and relocates an equal-time manual copy in a 500-row virtual table with descending=%p', async (descending) => {
    jest.useFakeTimers();
    mockObservation.isChronometerMode.value = true;
    const rowCount = 500;
    const sourceIndex = 70;
    mockObservation.readings.sharedState.currentReadings = Array.from(
      { length: rowCount }, (_, index) => reading(`existing-${index}`, index * 1000),
    );
    const wrapper = mount(ReadingsTable, {
      props: { readings: mockObservation.readings.sharedState.currentReadings },
      global: {
        ...readingsUiGlobal,
        directives: {},
        // Quasar's CommonJS build needs the SSR context argument even in jsdom.
        plugins: [{ install: (app: App) => Reflect.apply(Quasar.install, Quasar, [app, { config: {} }, { req: { headers: {} } }]) }],
        stubs: { ...readingsUiGlobal.stubs, QTable: false },
      },
    });
    wrappers.push(wrapper);
    await settle();
    jest.advanceTimersByTime(100);
    await settle();
    const table = wrapper.findComponent(QTable);
    table.vm.$emit('update:pagination', {
      sortBy: 'dateTime', descending, rowsPerPage: 0, page: 1,
    });
    await settle();
    const scroll = jest.spyOn(table.vm, 'scrollTo');
    expect(tableRows(wrapper).length).toBeLessThan(rowCount);
    const inserted = reading('inserted', sourceIndex * 1000);
    mockObservation.readings.sharedState.currentReadings.splice(sourceIndex + 1, 0, inserted);
    mockObservation.readings.sharedState.selectedReading = inserted;
    await settle();
    jest.advanceTimersByTime(100);
    await settle();
    const expectedIndex = descending ? rowCount - sourceIndex : sourceIndex + 1;
    expect(table.vm.filteredSortedRows[expectedIndex].tempId).toBe('inserted');
    expect(scroll).toHaveBeenLastCalledWith(expectedIndex, 'center');
    const selected = wrapper.find('tr[aria-selected="true"]');
    expect(selected.exists()).toBe(true);
    expect((selected.find('.readings-observable-input').element as HTMLInputElement).value).toBe('Observation inserted');
    expect(selected.classes()).toContain('reading-row--selected');

    // Edit the actual virtualized input so the row moves beyond the last event.
    await selected.find('input').setValue('000j 00:10:00.000');
    await selected.find('input').trigger('blur');
    await settle();
    jest.advanceTimersByTime(100);
    await settle();
    const relocatedIndex = descending ? 0 : rowCount;
    expect(table.vm.filteredSortedRows[relocatedIndex].tempId).toBe('inserted');
    expect(scroll).toHaveBeenLastCalledWith(relocatedIndex, 'center');
    const relocated = wrapper.find('tr[aria-selected="true"]');
    expect(relocated.exists()).toBe(true);
    expect((relocated.find('.readings-observable-input').element as HTMLInputElement).value).toBe('Observation inserted');
    expect((relocated.find('input').element as HTMLInputElement).value).toBe('000j 00:10:00.000');
  });
});


describe('automatic correction through the readings interface', () => {
  const mountSide = () => {
    const wrapper = mount(ReadingsSide, { global: readingsUiGlobal });
    wrappers.push(wrapper);
    return wrapper;
  };
  it('restores chronological display even when there is nothing else to correct', async () => {
    mockObservation.readings.sharedState.currentReadings = [reading('early'), reading('late', 1000)];
    const wrapper = mountSide();
    const table = wrapper.findComponent(ReadingsTable);
    (table.vm as unknown as { pagination: { descending: boolean } }).pagination.descending = true;
    await settle();
    expect(tableRows(wrapper)[0].attributes('data-reading-key')).toContain('late');
    await wrapper.find('button[data-icon="auto_fix_high"]').trigger('click');
    await settle();
    expect(tableRows(wrapper)[0].attributes('data-reading-key')).toContain('early');
    expect(mockObservation.readings.methods.autoCorrectReadings).toHaveBeenCalledWith(false);
  });

  it('blocks the wand for invalid drafts, even when the search filter hides them', async () => {
    mockObservation.readings.sharedState.currentReadings = [reading('one'), reading('two', 1000)];
    const wrapper = mountSide();
    await wrapper.find('.reading-time-input').setValue('31/02/2026 12:00:00.000');
    await settle();
    expect(wrapper.find('[role="alert"]').text()).toBe('readingsUi.invalidTimestamp');
    await wrapper.findComponent(ReadingsToolbar).vm.$emit('update:search', 'two');
    await settle();
    await wrapper.find('button[data-icon="auto_fix_high"]').trigger('click');
    expect(mockObservation.readings.methods.autoCorrectReadings).not.toHaveBeenCalled();
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ type: 'negative' }));
  });

  it('reports invalid persisted timestamps without opening the correction dialog', async () => {
    const invalid = reading('bad', 0, { dateTime: new Date(NaN) });
    mockObservation.readings.methods.autoCorrectReadings.mockReturnValueOnce({ actions: [], correctedReadings: [], invalidReadings: [invalid] });
    const wrapper = mountSide();
    await wrapper.find('button[data-icon="auto_fix_high"]').trigger('click');
    expect(Dialog.create).not.toHaveBeenCalled();
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ message: 'readingsUi.autoCorrectInvalidTimestamps' }));
  });

  it('leaves readings unchanged if end-time confirmation is cancelled', async () => {
    mockObservation.readings.sharedState.currentReadings = [reading('start', 0, { type: ReadingTypeEnum.START })];
    mockObservation.readings.methods.autoCorrectReadings.mockReturnValueOnce({
      actions: [{ reason: 'add_missing_stop', type: 'add_missing_pause', description: 'Add End', newReading: { type: ReadingTypeEnum.STOP, dateTime: new Date(+origin + 1) } }],
      correctedReadings: [], invalidReadings: [],
    });
    const wrapper = mountSide();
    await wrapper.find('button[data-icon="auto_fix_high"]').trigger('click');
    const confirmation = (Dialog.create as jest.Mock).mock.results[0].value.onOk;
    confirmation.mock.calls[0][0]();
    expect(Dialog.create).toHaveBeenCalledTimes(2);
    expect((Dialog.create as jest.Mock).mock.calls[1][0].componentProps).toMatchObject({ minDateTime: origin });
    expect(mockObservation.readings.methods.autoCorrectReadings).toHaveBeenCalledTimes(1);
    // Confirming the actual time is the only path that applies the changes.
    const end = new Date(+origin + 60000);
    const endDialog = (Dialog.create as jest.Mock).mock.results[1].value.onOk;
    endDialog.mock.calls[endDialog.mock.calls.length - 1][0]({ dateTime: end });
    expect(mockObservation.readings.methods.autoCorrectReadings).toHaveBeenLastCalledWith(true, end);
  });

  it('keeps the add button available with no readings', () => {
    const wrapper = mountSide();
    expect(tableRows(wrapper)).toHaveLength(0);
    expect(wrapper.find('button[data-icon="add"]').attributes('disabled')).toBeUndefined();
  });
});
