import { reactive } from 'vue';
import {
  IObservation,
  IProtocol,
  IReading,
} from '@services/observations/interface';
import { observationService } from '@services/observations/index.service';
import { readingService } from '@services/observations/reading.service';
import { protocolService } from '@services/observations/protocol.service';
import { useProtocol } from './use-protocol';

const sharedState = reactive({
  loading: false,
  currentObservation: null as IObservation | null,
  currentReadings: [] as IReading[],
  currentProtocol: null as IProtocol | null,
});

export const useObservation = (options?: { init?: boolean }) => {
  const { init = false } = options || {};

  const protocol = useProtocol({
    sharedStateFromObservation: sharedState,
  });

  if (init) {
  }

  const methods = {
    cloneExampleObservation: async () => {
      const exampleObservation =
        await observationService.cloneExampleObservation();
      return exampleObservation;
    },
    loadObservation: async (id: number) => {
      sharedState.loading = true;
      const response = await observationService.findOne(id);

      await methods._loadObservation(response);
    },
    _loadObservation: async (observation: IObservation) => {
      sharedState.loading = true;
      sharedState.currentObservation = null;
      sharedState.currentReadings = [];
      sharedState.currentProtocol = null;

      const r = await readingService.findWithPagination(
        {
          offset: 0,
          limit: 999999,
        },
        {
          observationId: observation.id,
        }
      );
      const readings = r.results;

      await protocol.methods.loadProtocol(observation);

      sharedState.currentReadings = readings;
      sharedState.currentObservation = observation;

      sharedState.loading = false;
    },
  };

  return {
    sharedState,
    methods,
    protocol,
  };
};
