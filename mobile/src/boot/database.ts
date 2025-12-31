import { boot } from 'quasar/wrappers';
import { sqliteService } from '@database/sqlite.service';

export default boot(async () => {
  console.log('Initializing SQLite database...');
  
  try {
    await sqliteService.initialize();
    console.log('SQLite database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize SQLite database:', error);
    // On ne throw pas l'erreur pour permettre à l'app de démarrer
    // même si SQLite n'est pas disponible (mode web sans jeep-sqlite)
  }
});

