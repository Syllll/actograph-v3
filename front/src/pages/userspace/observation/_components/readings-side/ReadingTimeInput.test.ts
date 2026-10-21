/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions":["node","node-addons"]}
 */
import { mount, VueWrapper } from '@vue/test-utils';
import ReadingTimeInput from './ReadingTimeInput.vue';

const wrappers: VueWrapper[] = [];
const mountInput = (props: Record<string, unknown> = {}) => {
  const wrapper = mount(ReadingTimeInput, { props: {
    modelValue: '21/10/2026 12:34:56.789', kind: 'calendar', ariaLabel: 'Horodatage', ...props,
  } });
  wrappers.push(wrapper);
  return wrapper;
};
const caret = (wrapper: VueWrapper, start: number, end = start) => {
  (wrapper.get('input').element as HTMLInputElement).setSelectionRange(start, end);
};
const value = (wrapper: VueWrapper) => (wrapper.get('input').element as HTMLInputElement).value;
const type = async (wrapper: VueWrapper, text: string) => {
  for (const key of text) await wrapper.get('input').trigger('keydown', { key });
};
const paste = async (wrapper: VueWrapper, text: string) => {
  await wrapper.get('input').trigger('paste', { clipboardData: { getData: () => text } });
};
afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); });

describe('inline segmented reading time editor', () => {
  it('accepts continuous digit entry without shifting date or time separators', async () => {
    const wrapper = mountInput();
    caret(wrapper, 0, 23);
    await type(wrapper, '25122027235959123');
    expect(value(wrapper)).toBe('25/12/2027 23:59:59.123');
    await wrapper.get('input').trigger('keydown', { key: 'Enter' });
    expect(wrapper.emitted('commit')).toEqual([['25/12/2027 23:59:59.123']]);
  });
  it('can start at minutes and continue through seconds and milliseconds', async () => {
    const wrapper = mountInput();
    caret(wrapper, 14);
    await type(wrapper, '1234567');
    expect(value(wrapper)).toBe('21/10/2026 12:12:34.567');
  });
  it('allows a click inside minutes to overwrite only its second digit', async () => {
    const wrapper = mountInput();
    caret(wrapper, 15);
    await type(wrapper, '9');
    expect(value(wrapper)).toBe('21/10/2026 12:39:56.789');
  });
  it('does not overflow milliseconds or append characters at the end', async () => {
    const wrapper = mountInput();
    caret(wrapper, 22);
    await type(wrapper, '1234');
    expect(value(wrapper)).toBe('21/10/2026 12:34:56.781');
  });
  it('supports full formatted paste and partial digits starting at minutes', async () => {
    const wrapper = mountInput();
    await paste(wrapper, '29/02/2024 00:00:00.000');
    expect(value(wrapper)).toBe('29/02/2024 00:00:00.000');
    caret(wrapper, 14);
    await paste(wrapper, '12 34 567');
    expect(value(wrapper)).toBe('29/02/2024 00:12:34.567');
  });
  it('ignores malformed and alphabetic pastes', async () => {
    const wrapper = mountInput();
    await paste(wrapper, '2026-12-31');
    await paste(wrapper, 'hello');
    expect(value(wrapper)).toBe('21/10/2026 12:34:56.789');
  });
  it('moves to the next segment when a separator is typed', async () => {
    const wrapper = mountInput();
    caret(wrapper, 0);
    await type(wrapper, '2/11/2027');
    expect(value(wrapper)).toBe('21/11/2027 12:34:56.789');
    expect((wrapper.get('input').element as HTMLInputElement).selectionStart).toBe(11);
  });
  it('accepts explicitly typed separators after automatic advancement', async () => {
    const wrapper = mountInput();
    caret(wrapper, 0, 23);
    await type(wrapper, '25/12/2027 23:59:59.123');
    expect(value(wrapper)).toBe('25/12/2027 23:59:59.123');
  });
  it('leaves Tab and navigation keys available to the browser', async () => {
    const wrapper = mountInput();
    const input = wrapper.get('input').element;
    for (const key of ['Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']) {
      const event = new KeyboardEvent('keydown', { key, cancelable: true });
      input.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }
  });
  it('clears only digit slots and rejects incomplete commits', async () => {
    const wrapper = mountInput();
    caret(wrapper, 14);
    await wrapper.get('input').trigger('keydown', { key: 'Backspace' });
    expect(value(wrapper)).toBe('21/10/2026 1_:34:56.789');
    await wrapper.get('input').trigger('keydown', { key: 'Delete' });
    expect(value(wrapper)).toBe('21/10/2026 1_:34:56.789');
    await wrapper.get('input').trigger('blur');
    expect(wrapper.emitted('commit')).toBeUndefined();
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('true');
  });
  it('rejects impossible calendar dates without emitting commit', async () => {
    const wrapper = mountInput();
    await paste(wrapper, '29/02/2026 12:00:00.000');
    await wrapper.get('input').trigger('keydown', { key: 'Enter' });
    expect(wrapper.emitted('commit')).toBeUndefined();
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('true');
  });
  it('cancels an unfinished edit and restores the accepted value', async () => {
    const wrapper = mountInput();
    caret(wrapper, 14);
    await type(wrapper, '99');
    await wrapper.get('input').trigger('keydown', { key: 'Escape' });
    expect(value(wrapper)).toBe('21/10/2026 12:34:56.789');
    expect(wrapper.get('input').attributes('aria-invalid')).toBeUndefined();
    await wrapper.get('input').trigger('blur');
    expect(wrapper.emitted('commit')).toBeUndefined();
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });
  it('emits a valid changed value once across Enter followed by blur', async () => {
    const wrapper = mountInput();
    caret(wrapper, 14);
    await type(wrapper, '12');
    await wrapper.get('input').trigger('keydown', { key: 'Enter' });
    await wrapper.get('input').trigger('blur');
    expect(wrapper.emitted('commit')).toHaveLength(1);
  });
  it('preserves focused dirty drafts when synchronization updates their source', async () => {
    const wrapper = mountInput();
    await wrapper.get('input').trigger('focus');
    caret(wrapper, 14);
    await type(wrapper, '12');
    await wrapper.setProps({ modelValue: '21/10/2026 12:35:00.000' });
    expect(value(wrapper)).toBe('21/10/2026 12:12:56.789');
  });
  it('refreshes clean inputs after an external update', async () => {
    const wrapper = mountInput();
    await wrapper.setProps({ modelValue: '21/10/2026 12:35:00.000' });
    expect(value(wrapper)).toBe('21/10/2026 12:35:00.000');
  });
  it('exposes timezone validation supplied by the table', () => {
    const wrapper = mountInput({ invalid: true });
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('true');
  });
  it('supports duration days and rejects out-of-range hours', async () => {
    const wrapper = mountInput({ kind: 'duration', modelValue: '002j 12:34:56.789' });
    caret(wrapper, 0);
    await type(wrapper, '003');
    await wrapper.get('input').trigger('blur');
    expect(wrapper.emitted('commit')).toEqual([['003j 12:34:56.789']]);
    await paste(wrapper, '003j 25:34:56.789');
    await wrapper.get('input').trigger('blur');
    expect(wrapper.emitted('commit')).toHaveLength(1);
  });

  it.each(['Enter', 'blur'])('commits a valid virtualized draft after remount using %p without another edit', async (event) => {
    const savedValue = '21/10/2026 12:34:56.789';
    const first = mountInput({ savedValue });
    caret(first, 14);
    await type(first, '12');
    const draft = value(first);
    first.unmount();
    const remounted = mountInput({ modelValue: draft, savedValue });
    if (event === 'Enter') await remounted.get('input').trigger('keydown', { key: 'Enter' });
    else await remounted.get('input').trigger('blur');
    expect(remounted.emitted('commit')).toEqual([[draft]]);
  });
  it('keeps an incomplete virtualized draft visibly invalid on remount', async () => {
    const savedValue = '21/10/2026 12:34:56.789';
    const first = mountInput({ savedValue });
    caret(first, 14);
    await first.get('input').trigger('keydown', { key: 'Delete' });
    const draft = value(first);
    first.unmount();
    const remounted = mountInput({ modelValue: draft, savedValue });
    expect(remounted.get('input').attributes('aria-invalid')).toBe('true');
    await remounted.get('input').trigger('blur');
    expect(remounted.emitted('commit')).toBeUndefined();
  });
  it('restores persisted time when escaping a remounted pending draft', async () => {
    const savedValue = '21/10/2026 12:34:56.789';
    const wrapper = mountInput({ savedValue, modelValue: '21/10/2026 12:12:56.789' });
    await wrapper.get('input').trigger('keydown', { key: 'Escape' });
    expect(value(wrapper)).toBe(savedValue);
    await wrapper.get('input').trigger('blur');
    expect(wrapper.emitted('commit')).toBeUndefined();
  });
  it('restores the latest persisted source while retaining pending drafts during synchronization', async () => {
    const wrapper = mountInput({ savedValue: '21/10/2026 12:34:56.789', modelValue: '21/10/2026 12:12:56.789' });
    await wrapper.get('input').trigger('focus');
    await wrapper.setProps({ savedValue: '21/10/2026 13:34:56.789' });
    expect(value(wrapper)).toBe('21/10/2026 12:12:56.789');
    await wrapper.get('input').trigger('keydown', { key: 'Escape' });
    expect(value(wrapper)).toBe('21/10/2026 13:34:56.789');
  });
  it('cancels a remounted DST-rejected draft back to the persisted wall time', async () => {
    const savedValue = '29/03/2026 01:30:00.000';
    const wrapper = mountInput({
      savedValue, modelValue: '29/03/2026 02:30:00.000', invalid: true,
      onCancel: () => { void wrapper.setProps({ modelValue: savedValue, invalid: false }); },
    });
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('true');
    await wrapper.get('input').trigger('keydown', { key: 'Escape' });
    expect(value(wrapper)).toBe(savedValue);
    expect(wrapper.get('input').attributes('aria-invalid')).toBeUndefined();
    await wrapper.get('input').trigger('blur');
    expect(wrapper.emitted('commit')).toBeUndefined();
  });
  it('supports mobile beforeinput digit entry with the same mask', () => {
    const wrapper = mountInput();
    caret(wrapper, 14);
    const event = new InputEvent('beforeinput', { inputType: 'insertText', data: '12', cancelable: true });
    wrapper.get('input').element.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(value(wrapper)).toBe('21/10/2026 12:12:56.789');
  });
});
