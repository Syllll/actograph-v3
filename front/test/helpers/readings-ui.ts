import { computed, defineComponent, h, type PropType } from 'vue';
import type { IReading } from '../../src/services/observations/interface';

/** Render production row slots while controlling the virtual table's public API.
 * jsdom has no layout, so pixel geometry belongs to browser verification.
 */
export const scrollToReading = jest.fn();

export const QTableStub = defineComponent({
  name: 'QTable',
  inheritAttrs: false,
  props: {
    rows: { type: Array as PropType<IReading[]>, default: () => [] },
    columns: { type: Array, default: () => [] },
    pagination: { type: Object, default: () => ({ descending: false }) },
    rowKey: { type: Function, required: true },
  },
  emits: ['update:pagination'],
  setup(props, { slots, expose }) {
    const filteredSortedRows = computed(() => [...props.rows].sort((a, b) => {
      const difference = new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
      return props.pagination.descending ? -difference : difference;
    }));
    expose({ filteredSortedRows, scrollTo: scrollToReading });
    return () => h('table', { class: 'q-table' }, [
      h('thead', slots.header?.({ cols: props.columns })),
      h('tbody', filteredSortedRows.value.map((row, rowIndex) =>
        slots.body?.({ row, rowIndex, cols: props.columns, key: props.rowKey(row) }),
      )),
    ]);
  },
});

const nativeSlot = (name: string, tag: string) => defineComponent({
  name,
  inheritAttrs: false,
  props: ['props'],
  setup(_props, { attrs, slots }) {
    return () => h(tag, attrs, slots.default?.());
  },
});

const QBtnStub = defineComponent({
  name: 'QBtn',
  inheritAttrs: false,
  props: ['icon', 'disable', 'label'],
  emits: ['click'],
  setup(props, { attrs, emit, slots }) {
    return () => h('button', {
      ...attrs,
      type: 'button',
      disabled: Boolean(props.disable),
      'data-icon': props.icon,
      onClick: (event: Event) => emit('click', event),
    }, [props.label, slots.default?.()]);
  },
});

const QInputStub = defineComponent({
  name: 'QInput',
  inheritAttrs: false,
  props: ['modelValue'],
  emits: ['update:modelValue', 'clear'],
  setup(props, { attrs, emit, expose }) {
    let input: HTMLInputElement | null = null;
    expose({ focus: () => input?.focus() });
    return () => h('input', {
      ...attrs,
      ref: (element: unknown) => { input = element as HTMLInputElement | null; },
      value: props.modelValue,
      onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value),
    });
  },
});

export const readingsUiGlobal = {
  mocks: { $t: (key: string) => key },
  directives: { 'close-popup': {} },
  stubs: {
    QTable: QTableStub,
    QTr: nativeSlot('QTr', 'tr'),
    QTd: nativeSlot('QTd', 'td'),
    QTh: nativeSlot('QTh', 'th'),
    QBtn: QBtnStub,
    QInput: QInputStub,
    QIcon: nativeSlot('QIcon', 'span'),
    QTooltip: defineComponent({ render: () => null }),
    QMenu: defineComponent({ render: () => null }),
    QList: nativeSlot('QList', 'div'),
    QItem: nativeSlot('QItem', 'div'),
    QItemSection: nativeSlot('QItemSection', 'span'),
    ReadingsAfterLastStopBanner: true,
    AutoCorrectReadingsDialog: true,
  },
};
