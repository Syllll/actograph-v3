/**
 * Explicit migration imports for bundling compatibility
 * 
 * When the API is bundled with esbuild, glob patterns like '**/*.ts'
 * don't work. This file explicitly imports all migrations for TypeORM.
 * 
 * IMPORTANT: Migrations must be listed in chronological order!
 */

import { Init1741279932330 } from '../../migrations/1741279932330-init';
import { addLicense1742079939246 } from '../../migrations/1742079939246-add-license';
import { dropTables1742245824090 } from '../../migrations/1742245824090-drop-tables';
import { addObservationModule1742245965719 } from '../../migrations/1742245965719-add-observation-module';
import { addProtocolItems1742460309452 } from '../../migrations/1742460309452-add-protocol-items';
import { newReadingFields1742551461889 } from '../../migrations/1742551461889-new-reading-fields';
import { addIndexes1742551502761 } from '../../migrations/1742551502761-add-indexes';
import { fix1742993904122 } from '../../migrations/1742993904122-fix';
import { addTempId1745247869971 } from '../../migrations/1745247869971-add-temp-id';
import { AddVideoPathAndModeToObservation1746000000000 } from '../../migrations/1746000000000-add-video-path-and-mode-to-observation';

// Export all migrations as an array for TypeORM configuration
// Order matters! Migrations are run in the order they appear in this array.
export const AllMigrations = [
  Init1741279932330,
  addLicense1742079939246,
  dropTables1742245824090,
  addObservationModule1742245965719,
  addProtocolItems1742460309452,
  newReadingFields1742551461889,
  addIndexes1742551502761,
  fix1742993904122,
  addTempId1745247869971,
  AddVideoPathAndModeToObservation1746000000000,
];
