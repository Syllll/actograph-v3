<template>
  <input
    ref="inputElement"
    class="reading-time-input"
    type="text"
    inputmode="numeric"
    autocomplete="off"
    spellcheck="false"
    :value="draft"
    :aria-label="ariaLabel"
    :aria-invalid="displayInvalid ? 'true' : undefined"
    :maxlength="draft.length"
    :style="{ width: `${draft.length + 1}ch` }"
    @focus="onFocus"
    @blur="onBlur"
    @keydown.stop="onKeydown"
    @beforeinput="onBeforeInput"
    @input="onInput"
    @paste.prevent="onPaste"
    @cut.prevent="onCut"
  />
</template>

<script lang="ts">
import { computed, defineComponent, nextTick, PropType, ref, watch } from 'vue';
import {
  hasSegmentedTimeShape,
  isValidSegmentedTime,
  overwriteSegmentedDigits,
  SegmentedTimeKind,
} from 'src/utils/segmented-time';

export default defineComponent({
  name: 'ReadingTimeInput',
  props: {
    modelValue: { type: String, required: true },
    kind: { type: String as PropType<SegmentedTimeKind>, required: true },
    ariaLabel: { type: String, required: true },
    invalid: { type: Boolean, default: false },
    // Separate the persisted source from drafts retained by a virtualized table between mounts.
    savedValue: { type: String, default: undefined },
  },
  emits: ['update:modelValue', 'commit', 'cancel'],
  setup(props, { emit }) {
    const inputElement = ref<HTMLInputElement>();
    const draft = ref(props.modelValue);
    const focused = ref(false);
    let originalValue = props.savedValue ?? props.modelValue;
    const dirty = ref(props.modelValue !== originalValue);
    const invalidDraft = ref(!isValidSegmentedTime(props.modelValue, props.kind));
    const displayInvalid = computed(() => props.invalid || invalidDraft.value);
    let committing = false;

    watch(() => props.modelValue, (value) => {
      if (value === draft.value || (focused.value && dirty.value)) return;
      draft.value = value;
      originalValue = props.savedValue ?? value;
      dirty.value = value !== originalValue;
      invalidDraft.value = !isValidSegmentedTime(value, props.kind);
    });

    watch(() => props.savedValue, (value) => {
      if (value === undefined) return;
      originalValue = value;
      dirty.value = draft.value !== value;
    });

    const change = (value: string, caret?: number) => {
      draft.value = value;
      dirty.value = value !== originalValue;
      invalidDraft.value = !isValidSegmentedTime(value, props.kind);
      emit('update:modelValue', value);
      if (caret !== undefined) {
        // Keep the native value synchronous for rapid digit entry, then restore the caret after Vue's patch.
        if (inputElement.value) {
          inputElement.value.value = value;
          inputElement.value.setSelectionRange(caret, caret);
        }
        void nextTick(() => inputElement.value?.setSelectionRange(caret, caret));
      }
    };

    const selection = () => ({
      start: inputElement.value?.selectionStart ?? 0,
      end: inputElement.value?.selectionEnd ?? 0,
    });
    const enterDigits = (text: string) => {
      const { start, end } = selection();
      const result = overwriteSegmentedDigits(draft.value, text, start, end);
      change(result.text, result.caret);
    };
    const clearSelection = () => {
      const { start, end } = selection();
      if (start === end) return;
      change(overwriteSegmentedDigits(draft.value, '', start, end).text, start);
    };
    const erase = (backward: boolean) => {
      const { start, end } = selection();
      if (end > start) { clearSelection(); return; }
      let index = backward ? start - 1 : start;
      while (index >= 0 && index < draft.value.length && !/[\d_]/.test(draft.value[index])) index += backward ? -1 : 1;
      if (index < 0 || index >= draft.value.length) return;
      change(`${draft.value.slice(0, index)}_${draft.value.slice(index + 1)}`, index);
    };
    const commit = () => {
      if (!dirty.value) return;
      invalidDraft.value = !isValidSegmentedTime(draft.value, props.kind);
      if (invalidDraft.value) return;
      if (committing) return;
      committing = true;
      const committedValue = draft.value;
      emit('commit', committedValue);
      void nextTick(() => {
        committing = false;
        if (props.invalid) return;
        originalValue = props.savedValue ?? committedValue;
        dirty.value = draft.value !== committedValue;
      });
    };
    const onFocus = () => { focused.value = true; };
    const onBlur = () => { commit(); focused.value = false; };
    const onKeydown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      if (/^\d$/.test(event.key)) { event.preventDefault(); enterDigits(event.key); return; }
      if (event.key === 'Backspace' || event.key === 'Delete') { event.preventDefault(); erase(event.key === 'Backspace'); return; }
      if (event.key === 'Enter') { event.preventDefault(); commit(); return; }
      if (event.key === 'Escape') {
        event.preventDefault();
        change(props.savedValue ?? originalValue);
        invalidDraft.value = false;
        emit('cancel');
        return;
      }
      if (['/', ':', '.', ' ', 'j'].includes(event.key)) {
        event.preventDefault();
        const { start } = selection();
        // Digit entry already advances across separators. Accept explicitly typed separators without skipping a segment.
        if (draft.value[start - 1] === event.key) return;
        const separator = draft.value.indexOf(event.key, start);
        if (separator < 0) return;
        let caret = separator + 1;
        while (caret < draft.value.length && !/[\d_]/.test(draft.value[caret])) caret++;
        inputElement.value?.setSelectionRange(caret, caret);
        return;
      }
      if (event.key.length === 1) event.preventDefault();
    };
    const onBeforeInput = (rawEvent: Event) => {
      const event = rawEvent as InputEvent;
      if (event.inputType === 'insertText' && event.data !== null) {
        event.preventDefault();
        if (/^\d+$/.test(event.data)) enterDigits(event.data);
      } else if (event.inputType === 'deleteContentBackward' || event.inputType === 'deleteContentForward') {
        event.preventDefault();
        erase(event.inputType === 'deleteContentBackward');
      }
    };
    const onInput = (event: Event) => {
      const element = event.target as HTMLInputElement;
      // Covers accessibility tools, autofill and browsers without beforeinput.
      if (hasSegmentedTimeShape(element.value, props.kind)) change(element.value);
      else element.value = draft.value;
    };
    const onCut = (event: ClipboardEvent) => {
      const { start, end } = selection();
      event.clipboardData?.setData('text/plain', draft.value.slice(start, end));
      clearSelection();
    };
    const onPaste = (event: ClipboardEvent) => {
      const text = event.clipboardData?.getData('text').trim() ?? '';
      if (hasSegmentedTimeShape(text, props.kind)) { change(text, text.length); return; }
      if (/^[\d\s/:.]+$/.test(text) && /\d/.test(text)) enterDigits(text);
    };

    return { inputElement, draft, displayInvalid, onFocus, onBlur, onKeydown, onBeforeInput, onInput, onPaste, onCut };
  },
});
</script>

<style scoped>
.reading-time-input {
  border: 1px solid transparent;
  border-radius: 3px;
  padding: 3px 4px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-variant-numeric: tabular-nums;
  max-width: 100%;
}
.reading-time-input:focus {
  border-color: var(--q-primary);
  outline: 1px solid var(--q-primary);
  background: rgba(255, 255, 255, 0.08);
}
.reading-time-input[aria-invalid='true'] {
  border-color: var(--q-negative);
}
</style>
