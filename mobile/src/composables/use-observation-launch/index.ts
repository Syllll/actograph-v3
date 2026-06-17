import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useChronicle } from '../use-chronicle';

/**
 * Handles navigation to the observation screen, including the
 * continue vs. new-session flow when readings already exist.
 */
export function useObservationLaunch() {
  const router = useRouter();
  const $q = useQuasar();
  const chronicle = useChronicle();

  const launchObservation = (options?: {
    onChronicleListChanged?: () => void | Promise<void>;
  }) => {
    if (!chronicle.sharedState.currentChronicle) {
      return;
    }

    if (!chronicle.hasReadings.value) {
      router.push({ name: 'observation' });
      return;
    }

    $q.dialog({
      title: 'Observation en cours',
      message: 'Cette chronique contient déjà des relevés. Que souhaitez-vous faire ?',
      options: {
        type: 'radio',
        model: 'continue',
        items: [
          { label: 'Continuer à la suite des relevés existants', value: 'continue' },
          { label: 'Repartir sur une nouvelle observation', value: 'new' },
        ],
      },
      cancel: true,
      persistent: true,
      ok: {
        label: 'Valider',
        color: 'accent',
      },
    }).onOk((choice: string) => {
      if (choice === 'continue') {
        router.push({ name: 'observation' });
        return;
      }

      if (choice !== 'new') {
        return;
      }

      const current = chronicle.sharedState.currentChronicle;
      if (!current) return;

      const sourceId = current.id;

      $q.dialog({
        title: 'Nouvelle observation',
        message:
          'Voulez-vous effacer tous les relevés et repartir sur une nouvelle chronique ? Les relevés actuels seront conservés dans la chronique d\'origine.',
        cancel: true,
        persistent: true,
        ok: {
          label: 'Repartir à zéro',
          color: 'negative',
        },
      }).onOk(async () => {
        try {
          const created = await chronicle.methods.duplicateForNewSession(sourceId);
          await options?.onChronicleListChanged?.();
          $q.notify({
            type: 'positive',
            message: 'Nouvelle chronique créée',
            caption: created.name,
            position: 'top',
          });
          router.push({ name: 'observation' });
        } catch (error) {
          console.error('Failed to start new observation session:', error);
          $q.notify({
            type: 'negative',
            message: 'Erreur lors de la création de la nouvelle chronique',
            caption: error instanceof Error ? error.message : 'Erreur inconnue',
            position: 'top',
          });
        }
      });
    });
  };

  return { launchObservation };
}
