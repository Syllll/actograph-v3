import { onMounted, onUnmounted, reactive, ref } from 'vue';
import { PixiApp } from './pixi-app';
import { useObservation } from 'src/composables/use-observation';
import { IObservation, IProtocol, IReading } from '@services/observations/interface';

const sharedState = reactive({
  pixiApp: null as PixiApp | null,
});

export const useGraph = (options?: {
  init?: {
    canvasRef: any;
  };
}) => {
  const observation = useObservation();

  if (options?.init) {
    // Create the pixi app
    const pixiApp = new PixiApp();
    sharedState.pixiApp = pixiApp;

    onMounted(async () => {
      if (!options.init) {
        throw new Error('No init options provided');
      }

      if (!options.init.canvasRef) {
        throw new Error('No canvasRef provided');
      }

      await pixiApp.init({
        view: options.init.canvasRef.value.canvasRef,
      });

      const obs = observation.sharedState.currentObservation as IObservation;
      if (!obs) {
        throw new Error('No observation found (use-graph.ts)');
      }
      const readings = observation.readings.sharedState.currentReadings;
      const protocol = observation.protocol.sharedState.currentProtocol;
      obs.readings = readings as IReading[];
      obs.protocol = protocol as IProtocol;

      // Set the data
      pixiApp.setData(obs);

      // Draw the graph
      pixiApp.draw();

      console.info('Pixi app initialized');
    });

    onUnmounted(() => {
      pixiApp.destroy();
      sharedState.pixiApp = null;
    });
  }
  
}