import type { IReading } from '@services/observations/interface';

export const readingKey = (reading: IReading): string =>
  reading.tempId ? `tempId-${reading.tempId}` : `id-${reading.id}`;

export const sameReading = (
  left: IReading | null | undefined,
  right: IReading | null | undefined,
): boolean => {
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.tempId && right.tempId) return left.tempId === right.tempId;
  return left.id != null && right.id != null && left.id === right.id;
};
