import { onMounted, onUnmounted, reactive, ref } from 'vue';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import { useObservation } from 'src/composables/use-observation';
import { IObservation, IProtocol, IReading, ReadingTypeEnum, ObservationModeEnum } from '@services/observations/interface';
import {
  ProtocolItem,
  protocolService,
  ProtocolItemTypeEnum,
} from '@services/observations/protocol.service';
import { useDuration } from 'src/composables/use-duration';
import { CHRONOMETER_T0 } from '@utils/chronometer.constants';

/**
 * État partagé du graphique AmCharts.
 */
const sharedState = reactive({
  root: null as am5.Root | null,
  chart: null as am5xy.XYChart | null,
});

/**
 * Composable Vue pour gérer le graphique d'activité avec AmCharts.
 * 
 * Ce composable encapsule toute la logique d'initialisation, de chargement des données
 * et de rendu du graphique avec AmCharts.
 * 
 * @param options - Options d'initialisation du graphique
 * @param options.init - Configuration d'initialisation
 * @param options.init.containerRef - Référence Vue au conteneur HTML qui accueillera le graphique
 */
export const useAmChartsGraph = (options?: {
  init?: {
    containerRef: any;
  };
}) => {
  const observation = useObservation();
  const duration = useDuration();

  // Si des options d'initialisation sont fournies, créer et initialiser AmCharts
  if (options?.init) {
    /**
     * Hook appelé lorsque le composant est monté dans le DOM.
     */
    onMounted(async () => {
      // Validation des options d'initialisation
      if (!options.init) {
        throw new Error('No init options provided');
      }

      if (!options.init.containerRef) {
        throw new Error('No containerRef provided');
      }

      const containerElement = options.init.containerRef.value;
      if (!containerElement) {
        throw new Error('Container element not found');
      }

      // Vérification que le composable observation est disponible
      if (!observation || !observation.sharedState) {
        throw new Error('Observation composable not available (use-amcharts-graph.ts)');
      }

      // Récupération de l'observation courante depuis le composable
      const obs = observation.sharedState.currentObservation as IObservation;
      if (!obs) {
        throw new Error('No observation found (use-amcharts-graph.ts)');
      }

      // Récupération des readings et du protocole depuis les états partagés
      const readings = observation.readings?.sharedState?.currentReadings ?? [];
      const protocol = observation.protocol?.sharedState?.currentProtocol ?? null;
      
      // Enrichissement de l'observation avec les readings et le protocole
      obs.readings = readings as IReading[];
      obs.protocol = protocol as IProtocol;

      // Création de la racine AmCharts
      const root = am5.Root.new(containerElement);
      sharedState.root = root;

      // Application du thème animé
      root.setThemes([am5themes_Animated.new(root)]);

      // Création du graphique XY
      const chart = root.container.children.push(
        am5xy.XYChart.new(root, {
          panX: true,
          panY: true,
          wheelX: 'panX',
          wheelY: 'zoomX',
          pinchZoomX: true,
          layout: root.verticalLayout,
        })
      );
      sharedState.chart = chart;

      // Préparation des données pour AmCharts
      const chartData = prepareChartData(obs, duration);

      // Configuration de l'axe X (temps)
      const xAxis = chart.xAxes.push(
        am5xy.DateAxis.new(root, {
          baseInterval: { timeUnit: 'millisecond', count: 1 },
          renderer: am5xy.AxisRendererX.new(root, {
            minGridDistance: 50,
          }),
        })
      );

      // Création d'un mapping observable -> index pour l'axe Y
      const observableLabels = chartData.observables.map((obs) => obs.name);
      const observableToIndex = new Map<string, number>();
      observableLabels.forEach((label, index) => {
        observableToIndex.set(label, index);
      });

      // Création de l'axe Y avec les observables comme catégories
      const yAxis = chart.yAxes.push(
        am5xy.CategoryAxis.new(root, {
          categoryField: 'category',
          renderer: am5xy.AxisRendererY.new(root, {}),
        } as am5xy.ICategoryAxisSettings<am5xy.AxisRendererY>)
      );

      // Configuration de l'axe Y avec les observables
      yAxis.data.setAll(observableLabels.map((label) => ({ category: label })));

      // Création des séries pour chaque catégorie
      chartData.categories.forEach((categoryData, index) => {
        if (categoryData.data.length === 0) {
          return; // Skip empty categories
        }

        const series = chart.series.push(
          am5xy.StepLineSeries.new(root, {
            name: categoryData.categoryName,
            xAxis: xAxis,
            yAxis: yAxis,
            valueYField: 'category',
            valueXField: 'date',
            categoryYField: 'category',
            stroke: am5.color(categoryData.color || '#008000'),
            fill: am5.color(categoryData.color || '#008000'),
            noRisers: false,
            tooltip: am5.Tooltip.new(root, {
              labelText: '{categoryY}: {valueX}',
            }),
          })
        );

        // Transformation des données pour AmCharts
        // AmCharts StepLineSeries avec CategoryAxis nécessite des points avec date (timestamp) et category
        const seriesData = categoryData.data
          .filter((point) => point.observable && observableToIndex.has(point.observable))
          .map((point) => ({
            date: point.date.getTime(),
            category: point.observable,
          }));

        if (seriesData.length > 0) {
          series.data.setAll(seriesData);
        }
      });

      // Configuration du curseur pour l'interaction
      chart.set('cursor', am5xy.XYCursor.new(root, {
        behavior: 'zoomX',
        xAxis: xAxis,
      }));

      // Configuration du scrollbar
      chart.set('scrollbarX', am5.Scrollbar.new(root, {
        orientation: 'horizontal',
      }));

      console.info('AmCharts graph initialized');
    });

    /**
     * Hook appelé lorsque le composant est démonté du DOM.
     */
    onUnmounted(() => {
      if (sharedState.root) {
        sharedState.root.dispose();
        sharedState.root = null;
        sharedState.chart = null;
      }
    });
  }

  return {
    sharedState,
  };
};

/**
 * Prépare les données pour AmCharts à partir d'une observation.
 * 
 * @param observation - Observation complète avec readings et protocol
 * @param duration - Composable pour formater les durées
 * @returns Données formatées pour AmCharts
 */
function prepareChartData(
  observation: IObservation,
  duration: ReturnType<typeof useDuration>
) {
  if (!observation.readings || !observation.protocol) {
    throw new Error('Observation must have readings and protocol');
  }

  // Récupération des observables depuis le protocole
  const observables = getObservables(observation.protocol);
  
  // Groupement des readings par catégorie
  const readingsPerCategory = groupReadingsByCategory(
    observation.readings,
    observation.protocol
  );

  // Couleurs pour les catégories
  const colors = ['#008000', '#0066cc', '#cc6600', '#cc0066', '#6600cc', '#00cccc'];

  // Préparation des données par catégorie
  const categories = readingsPerCategory.map((categoryEntry, index) => {
    const categoryReadings = categoryEntry.readings.filter(
      (r) => r.type === ReadingTypeEnum.DATA || r.type === ReadingTypeEnum.STOP
    );

    if (categoryReadings.length === 0) {
      return {
        categoryName: categoryEntry.category.name,
        color: colors[index % colors.length],
        data: [],
      };
    }

    // Tri des readings par date
    const sortedReadings = [...categoryReadings].sort(
      (a, b) => a.dateTime.getTime() - b.dateTime.getTime()
    );

    // Conversion en points pour le graphique
    // Format step-line : chaque point maintient la valeur jusqu'au point suivant
    const data: Array<{ date: Date; observable: string }> = [];

    if (sortedReadings.length === 0) {
      return {
        categoryName: categoryEntry.category.name,
        color: colors[index % colors.length],
        data: [],
      };
    }

    // Premier point : début avec le premier observable
    const firstReading = sortedReadings[0];
    if (firstReading && firstReading.type !== ReadingTypeEnum.STOP) {
      data.push({
        date: firstReading.dateTime,
        observable: firstReading.name,
      });
    }

    // Points suivants : transitions entre observables
    for (let i = 1; i < sortedReadings.length; i++) {
      const reading = sortedReadings[i];
      if (!reading) continue;

      if (reading.type === ReadingTypeEnum.STOP) {
        // Point de fin : on maintient le dernier observable jusqu'à la fin
        const previousReading = sortedReadings[i - 1];
        if (previousReading && previousReading.type !== ReadingTypeEnum.STOP) {
          data.push({
            date: reading.dateTime,
            observable: previousReading.name,
          });
        }
      } else {
        // Transition vers un nouvel observable
        // D'abord, on maintient l'observable précédent jusqu'à ce point (segment horizontal)
        const previousReading = sortedReadings[i - 1];
        if (previousReading && previousReading.type !== ReadingTypeEnum.STOP) {
          data.push({
            date: reading.dateTime,
            observable: previousReading.name,
          });
        }
        // Ensuite, on passe au nouvel observable (transition verticale)
        data.push({
          date: reading.dateTime,
          observable: reading.name,
        });
      }
    }

    return {
      categoryName: categoryEntry.category.name,
      color: colors[index % colors.length],
      data,
    };
  });

  return {
    observables,
    categories,
  };
}

/**
 * Récupère tous les observables depuis un protocole.
 * 
 * @param protocol - Protocole contenant les items
 * @returns Liste de tous les observables (aplatis)
 */
function getObservables(protocol: IProtocol): ProtocolItem[] {
  const items = protocolService.parseProtocolItems(protocol);
  const observables: ProtocolItem[] = [];
  
  function extractObservables(items: ProtocolItem[]) {
    for (const item of items) {
      if (item.type === ProtocolItemTypeEnum.Observable) {
        observables.push(item);
      } else if (item.children) {
        extractObservables(item.children);
      }
    }
  }
  
  extractObservables(items);
  return observables;
}

/**
 * Groupe les readings par catégorie selon le protocole.
 * 
 * @param readings - Liste des readings à grouper
 * @param protocol - Protocole contenant les catégories
 * @returns Readings groupés par catégorie
 */
function groupReadingsByCategory(
  readings: IReading[],
  protocol: IProtocol
): Array<{ category: ProtocolItem; readings: IReading[] }> {
  const categories = protocolService.parseProtocolItems(protocol).filter(
    (item) => item.type === ProtocolItemTypeEnum.Category
  );
  
  const readingsPerCategory: Array<{ category: ProtocolItem; readings: IReading[] }> = [];
  
  // Initialisation avec des listes vides pour chaque catégorie
  for (const category of categories) {
    readingsPerCategory.push({
      category,
      readings: [],
    });
  }
  
  // Groupement des readings de type DATA par catégorie
  for (const reading of readings) {
    if (reading.type === ReadingTypeEnum.DATA) {
      const obsName = reading.name;
      
      // Recherche de la catégorie qui contient un observable avec le même nom
      const categoryEntry = readingsPerCategory.find((r) =>
        r.category.children?.some((o) => o.name === obsName)
      );
      
      if (categoryEntry) {
        categoryEntry.readings.push(reading);
      }
    }
  }
  
  // Ajout du reading STOP à toutes les catégories
  const lastReading = readings[readings.length - 1];
  if (lastReading && lastReading.type === ReadingTypeEnum.STOP) {
    for (const categoryEntry of readingsPerCategory) {
      categoryEntry.readings.push(lastReading);
    }
  }
  
  return readingsPerCategory;
}

