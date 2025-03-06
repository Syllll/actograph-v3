import { useI18n } from 'vue-i18n';
import { QVueGlobals, Dialog, QDialogOptions } from 'quasar';

/*
//
// Use example for a prompt dialo
// Other use cases are possible with "options: {...}" instead of "prompt: {...}"
// For details: https://quasar.dev/quasar-plugins/dialog
//
const dialogResult = await createDialog(
  {
    title: 'Nom du server',
    message: 'Saisissez un nouveau nom',
    prompt: {
      model: server.name,
      type: 'text' // optional
    },
    cancel: true,
    persistent: true
  }
)
if(dialogResult === false) return
// Use dialogResult here

// Use this instead of prompt to show a dialog with radio options
options: {
  type: 'radio',
  model: 'opt1',
  isValid: val => val === 'opt2',
  // inline: true
  items: [
    { label: 'Option 1', value: 'opt1', color: 'secondary' },
    { label: 'Option 2', value: 'opt2' },
    { label: 'Option 3', value: 'opt3' }
  ]
},

*/

export const createErrorDialog = async (err: any): Promise<any> => {
  return await createDialog({
    title: 'Erreur détectée',
    message: `${err.message} : ${err.response.data.message}`,
    cancel: false,
    persistent: true,
  });
};

export const createDialog = (
  options: QDialogOptions,
  actions?: {
    onOk?: (data: any) => any;
    onCancel?: () => any;
    onDismiss?: () => any;
  }
): any => {
  const defaultActions = {
    onOk: (data: any) => (data !== undefined ? data : true),
    onCancel: () => false,
    onDismiss: () => false,
  };

  const _actions = { ...defaultActions, ...actions };

  return new Promise((resolve, reject) => {
    Dialog.create({ ...options, color: 'accent-medium' })
      .onOk(async (data: any) => {
        const res = await _actions.onOk(data);
        resolve(res);
      })
      .onCancel(async () => {
        // console.log('>>>> Cancel')
        const res = await _actions.onCancel();
        resolve(res);
      })
      .onDismiss(async () => {
        const res = await _actions.onDismiss();
        // console.log('I am triggered on both OK and Cancel')
      });
  });
};

// *****************
// To remove after refactoring the asssociated code.
// This should NOT be used.
// *****************

interface Options {
  type?: string;
  validLength?: number;
  cancel?: boolean;
  persistent?: boolean;
  validate?: (value: any) => boolean;
  items?: any[];
}

export function updateDialog(
  quasar: QVueGlobals,
  model: string,
  i18nInput: string,
  options: Options = {}
) {
  const i18n = useI18n();

  const defaultTextValidation = (text: string) =>
    text?.length > (options?.validLength ?? 2);

  return quasar.dialog({
    title: i18n.t(i18nInput),
    message: `${i18n.t('admin.pleaseChange')} "${i18n.t(i18nInput)}"`,
    cancel: options?.cancel ?? true,
    persistent: options?.persistent ?? false,
    prompt: {
      type: <any>options?.type ?? 'text', // optional
      model,
      isValid: options.validate ?? defaultTextValidation,
    },
  });
}

export function updateCheckboxDialog(
  quasar: QVueGlobals,
  model: string[],
  i18nInput: string,
  options: Options = {}
) {
  const i18n = useI18n();

  const defaultIsValid = (items: string | readonly any[]) => items.length > 0;

  return quasar.dialog({
    title: i18n.t(i18nInput),
    message: `${i18n.t('admin.pleaseChange')} "${i18n.t(i18nInput)}"`,
    options: {
      type: 'checkbox',
      model,
      isValid: options.validate ?? defaultIsValid,
      // inline: true
      items: options.items ?? [],
    },
    cancel: options?.cancel ?? true,
    persistent: options?.persistent ?? false,
  });
}

// *****************
