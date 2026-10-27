/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions":["node","node-addons"]}
 */
import { mount } from '@vue/test-utils';
import ObservablePicker from './ObservablePicker.vue';

jest.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));

const groups = [
  { id: 'a', name: 'Activity', color: '#123456', names: ['Walking', 'Sitting'] },
  { id: 'b', name: 'Context', color: '#654321', names: ['Outside'] },
];
const global = { directives: { 'close-popup': {} }, stubs: { QIcon: true } };

it('shows category columns and the current selection, then emits only an observable name', async () => {
  const wrapper = mount(ObservablePicker, { props: { groups, modelValue: 'Sitting' }, global });
  expect(wrapper.findAll('.observable-picker__category')).toHaveLength(2);
  expect(wrapper.find('[data-observable-option="Sitting"]').attributes('aria-pressed')).toBe('true');
  await wrapper.find('[data-observable-option="Outside"]').trigger('click');
  expect(wrapper.emitted('select')).toEqual([['Outside']]);
  wrapper.unmount();
});

it('supports arrow navigation and native keyboard buttons while keeping free input filters', async () => {
  const wrapper = mount(ObservablePicker, { attachTo: document.body, props: { groups }, global });
  const buttons = wrapper.findAll('button');
  (buttons[0].element as HTMLButtonElement).focus();
  await buttons[0].trigger('keydown', { key: 'ArrowDown' });
  expect(document.activeElement).toBe(buttons[1].element);
  await buttons[1].trigger('keydown', { key: 'End' });
  expect(document.activeElement).toBe(buttons[2].element);
  await wrapper.setProps({ search: 'walk' });
  expect(wrapper.findAll('button')).toHaveLength(1);
  await wrapper.setProps({ search: 'A free label' });
  expect(wrapper.find('[role="status"]').text()).toBe('readingsUi.freeLabelAutocompleteHint');
  wrapper.unmount();
});
