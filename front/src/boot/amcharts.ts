import { boot } from 'quasar/wrappers';
import * as am5 from '@amcharts/amcharts5';

/**
 * Boot file pour AmCharts
 * 
 * Configure la licence AmCharts 5 au démarrage de l'application.
 * Cette licence doit être ajoutée avant toute création de graphique AmCharts.
 * 
 * La clé de licence est récupérée depuis la variable d'environnement AMCHART5_LICENCE_KEY
 * définie dans le fichier .env du projet.
 */
export default boot(() => {
  // Récupération de la clé de licence depuis les variables d'environnement
  const licenseKey = process.env.AMCHART5_LICENCE_KEY;
  
  if (licenseKey) {
    // Add AmCharts 5 license
    am5.addLicense(licenseKey);
  } else {
    console.warn(
      '[AmCharts Boot] AMCHART5_LICENCE_KEY not found in environment variables. ' +
      'AmCharts will run in trial mode with watermark.'
    );
  }
});

