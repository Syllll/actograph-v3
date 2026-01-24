/**
 * Explicit entity imports for bundling compatibility
 *
 * When the API is bundled with esbuild, glob patterns do not work.
 * This file explicitly imports all entities for TypeORM.
 */

// Core entities
export { License } from '../core/security/entities/license.entity';
export { Observation } from '../core/observations/entities/observation.entity';
export { Reading } from '../core/observations/entities/reading.entity';
export { Protocol } from '../core/observations/entities/protocol.entity';
export { ActivityGraph } from '../core/observations/entities/activity-graph.entity';
export { User } from '../core/users/entities/user.entity';

// General entities
export { UserJwt } from '../general/auth-jwt/entities/user-jwt.entity';

// Export all entities as an array for TypeORM configuration
import { License } from '../core/security/entities/license.entity';
import { Observation } from '../core/observations/entities/observation.entity';
import { Reading } from '../core/observations/entities/reading.entity';
import { Protocol } from '../core/observations/entities/protocol.entity';
import { ActivityGraph } from '../core/observations/entities/activity-graph.entity';
import { User } from '../core/users/entities/user.entity';
import { UserJwt } from '../general/auth-jwt/entities/user-jwt.entity';

export const AllEntities = [
  License,
  Observation,
  Reading,
  Protocol,
  ActivityGraph,
  User,
  UserJwt,
];
