import { Notify } from 'quasar';

export const notify = (options: {
  message: string;
  color?: string;
  closeBtn?: boolean | string;
  position?:
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | 'top'
    | 'bottom'
    | 'left'
    | 'right'
    | 'center';
}) => {
  Notify.create({
    position: options.position ?? undefined,
    message: options.message,
    color: options.color ?? 'accent-medium',
    closeBtn: options.closeBtn,
  });
};
