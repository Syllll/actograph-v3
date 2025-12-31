import { boot } from 'quasar/wrappers';
import { createI18n } from 'vue-i18n';
import messages from '@i18n/index';

export type MessageLanguages = keyof typeof messages;
export type MessageSchema = (typeof messages)['fr'];

declare module 'vue-i18n' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface DefineLocaleMessage extends MessageSchema {}

  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface DefineDateTimeFormat {}

  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface DefineNumberFormat {}
}

export default boot(({ app }) => {
  const i18n = createI18n({
    locale: 'fr',
    legacy: false,
    messages,
  });

  app.use(i18n);
});

