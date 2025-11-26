/**
 * Centralized notification system composable
 * Provides a unified interface for displaying notifications, warnings, and messages
 */

import { useQuasar } from 'quasar';

export type NotificationType = 'info' | 'warning' | 'error' | 'success';

export interface NotificationOptions {
  type?: NotificationType;
  message: string;
  caption?: string;
  timeout?: number;
  position?: 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  actions?: Array<{
    label: string;
    handler: () => void;
    color?: string;
  }>;
  persistent?: boolean;
}

/**
 * Composable for managing notifications
 * Provides methods to show different types of notifications
 */
export const useNotifications = () => {
  const $q = useQuasar();

  const methods = {
    /**
     * Show a notification
     * 
     * @param options - Notification options
     */
    notify: (options: NotificationOptions) => {
      const {
        type = 'info',
        message,
        caption,
        timeout = 5000,
        position = 'top',
        actions = [],
        persistent = false,
      } = options;

      $q.notify({
        type,
        message,
        caption,
        timeout: persistent ? 0 : timeout,
        position,
        actions,
      });
    },

    /**
     * Show an info notification
     * 
     * @param message - Message to display
     * @param options - Additional options
     */
    info: (message: string, options?: Omit<NotificationOptions, 'type' | 'message'>) => {
      methods.notify({
        type: 'info',
        message,
        ...options,
      });
    },

    /**
     * Show a warning notification
     * 
     * @param message - Message to display
     * @param options - Additional options
     */
    warning: (message: string, options?: Omit<NotificationOptions, 'type' | 'message'>) => {
      methods.notify({
        type: 'warning',
        message,
        timeout: 6000, // Longer timeout for warnings
        ...options,
      });
    },

    /**
     * Show an error notification
     * 
     * @param message - Message to display
     * @param options - Additional options
     */
    error: (message: string, options?: Omit<NotificationOptions, 'type' | 'message'>) => {
      methods.notify({
        type: 'negative',
        message,
        timeout: 8000, // Longer timeout for errors
        ...options,
      });
    },

    /**
     * Show a success notification
     * 
     * @param message - Message to display
     * @param options - Additional options
     */
    success: (message: string, options?: Omit<NotificationOptions, 'type' | 'message'>) => {
      methods.notify({
        type: 'positive',
        message,
        ...options,
      });
    },

    /**
     * Show a contextual warning for disabled features
     * 
     * @param feature - Name of the feature (e.g., 'Graph', 'Stats')
     * @param reason - Reason why the feature is disabled
     */
    showFeatureWarning: (feature: string, reason: string) => {
      methods.warning(`${feature} indisponible`, {
        caption: reason,
        timeout: 7000,
      });
    },

    /**
     * Show a warning when Graph is disabled
     */
    showGraphWarning: () => {
      methods.showFeatureWarning(
        'Graphique d\'activité',
        'Aucun relevé disponible. Créez des relevés dans la page Observation.'
      );
    },

    /**
     * Show a warning when Stats is disabled
     */
    showStatsWarning: () => {
      methods.showFeatureWarning(
        'Statistiques',
        'Aucun relevé disponible. Créez des relevés dans la page Observation.'
      );
    },
  };

  return {
    methods,
  };
};

