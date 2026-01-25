/**
 * Script to automatically generate entity and migration index files
 * 
 * This script scans the codebase and generates:
 * - src/database/all-entities.ts (from all .entity.ts files)
 * - src/database/all-migrations.ts (from migrations .ts files)
 * 
 * Run this script before building with esbuild to ensure all entities
 * and migrations are included in the bundle.
 * 
 * Usage: node scripts/generate-indexes.js
 */

const fs = require('fs');
const path = require('path');

const API_ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(API_ROOT, 'src');
const MIGRATIONS_DIR = path.join(API_ROOT, 'migrations');
const DATABASE_DIR = path.join(SRC_DIR, 'database');

/**
 * Recursively find all files matching a pattern
 */
function findFiles(dir, pattern, files = []) {
  if (!fs.existsSync(dir)) return files;
  
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and other non-essential directories
      if (item !== 'node_modules' && item !== 'dist' && item !== '.git') {
        findFiles(fullPath, pattern, files);
      }
    } else if (pattern.test(item)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Extract entity class name from a TypeScript file
 * Looks for: @Entity() decorator followed by export class ClassName
 */
function extractClassName(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Match: @Entity(...) followed by export class ClassName
  // The @Entity decorator indicates this is the actual TypeORM entity
  const match = content.match(/@Entity\([^)]*\)\s*(?:export\s+)?class\s+(\w+)/);
  if (match) {
    return match[1];
  }
  
  // Fallback: if no @Entity decorator found, try to match export class
  const fallbackMatch = content.match(/export\s+class\s+(\w+)/);
  if (fallbackMatch) {
    return fallbackMatch[1];
  }
  
  return null;
}

/**
 * Extract entity dependencies from a TypeScript file
 * Looks for imports from other .entity files
 */
function extractEntityDependencies(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const dependencies = [];
  
  // Match imports from entity files: import { ClassName } from '...entity'
  // This covers both relative paths and alias paths like @auth-jwt/entities/user-jwt.entity
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"][^'"]*\.entity['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    // Extract class names from the import (handle multiple imports like { A, B })
    const imports = match[1].split(',').map(s => s.trim()).filter(s => s);
    dependencies.push(...imports);
  }
  
  return dependencies;
}

/**
 * Topological sort of entities based on their dependencies
 * Entities that are dependencies of others should come first
 */
function topologicalSortEntities(entities) {
  // Build dependency graph
  const entityMap = new Map(); // className -> entity object
  const dependencyGraph = new Map(); // className -> Set of dependency classNames
  
  for (const entity of entities) {
    entityMap.set(entity.className, entity);
    const deps = extractEntityDependencies(entity.filePath);
    // Filter to only include dependencies that are actual entities in our list
    const entityDeps = deps.filter(dep => entities.some(e => e.className === dep));
    dependencyGraph.set(entity.className, new Set(entityDeps));
  }
  
  // Kahn's algorithm for topological sort
  const result = [];
  const visited = new Set();
  const visiting = new Set();
  
  function visit(className) {
    if (visited.has(className)) return;
    if (visiting.has(className)) {
      // Circular dependency - just continue (TypeORM can handle some circular refs)
      console.warn(`Warning: Circular dependency detected involving ${className}`);
      return;
    }
    
    visiting.add(className);
    
    // Visit dependencies first
    const deps = dependencyGraph.get(className) || new Set();
    for (const dep of deps) {
      visit(dep);
    }
    
    visiting.delete(className);
    visited.add(className);
    
    if (entityMap.has(className)) {
      result.push(entityMap.get(className));
    }
  }
  
  // Visit all entities
  for (const entity of entities) {
    visit(entity.className);
  }
  
  return result;
}

/**
 * Generate the all-entities.ts file
 */
function generateEntitiesIndex() {
  console.log('Scanning for entity files...');
  
  const entityFiles = findFiles(SRC_DIR, /\.entity\.ts$/);
  
  if (entityFiles.length === 0) {
    console.warn('No entity files found!');
    return;
  }
  
  console.log(`Found ${entityFiles.length} entity files`);
  
  // Extract class names and relative paths
  const entities = [];
  for (const filePath of entityFiles) {
    const className = extractClassName(filePath);
    if (className) {
      // Get relative path from database/ directory
      const relativePath = path.relative(DATABASE_DIR, filePath)
        .replace(/\\/g, '/') // Convert Windows paths to Unix
        .replace(/\.ts$/, ''); // Remove .ts extension
      
      entities.push({ className, relativePath, filePath });
    } else {
      console.warn(`Could not extract class name from: ${filePath}`);
    }
  }
  
  // Sort entities topologically based on dependencies
  // Entities that are dependencies of others (e.g., UserJwt is used by User) come first
  // This is important for TypeORM metadata resolution in bundled mode
  const sortedEntities = topologicalSortEntities(entities);
  
  // Generate the file content
  const imports = sortedEntities.map(e => 
    `import { ${e.className} } from '${e.relativePath}';`
  ).join('\n');
  
  const exports = sortedEntities.map(e => `  ${e.className},`).join('\n');
  
  const content = `/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 * 
 * This file is automatically generated by scripts/generate-indexes.js
 * Run \`yarn generate:indexes\` to regenerate.
 * 
 * Generated: ${new Date().toISOString()}
 * Entities found: ${sortedEntities.length}
 * 
 * IMPORTANT: Entities are sorted topologically based on their dependencies.
 * Entities that are referenced by other entities (e.g., UserJwt is used by User)
 * are listed first. This ordering is critical for TypeORM metadata resolution
 * when the API is bundled with esbuild.
 */

${imports}

// Export all entities as an array for TypeORM configuration
// Order matters! Dependencies must be loaded before entities that reference them.
export const AllEntities = [
${exports}
];
`;

  const outputPath = path.join(DATABASE_DIR, 'all-entities.ts');
  fs.writeFileSync(outputPath, content);
  console.log(`✅ Generated ${outputPath} with ${sortedEntities.length} entities`);
}

/**
 * Generate the all-migrations.ts file
 */
function generateMigrationsIndex() {
  console.log('Scanning for migration files...');
  
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.warn('Migrations directory not found!');
    return;
  }
  
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.ts') && !f.startsWith('.'))
    .sort(); // Sort alphabetically (which is chronological for timestamp-named files)
  
  if (files.length === 0) {
    console.warn('No migration files found!');
    return;
  }
  
  console.log(`Found ${files.length} migration files`);
  
  // Extract class names
  const migrations = [];
  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const className = extractClassName(filePath);
    
    if (className) {
      const relativePath = `../../migrations/${file.replace(/\.ts$/, '')}`;
      migrations.push({ className, relativePath, file });
    } else {
      console.warn(`Could not extract class name from: ${file}`);
    }
  }
  
  // Generate the file content
  const imports = migrations.map(m => 
    `import { ${m.className} } from '${m.relativePath}';`
  ).join('\n');
  
  const exports = migrations.map(m => `  ${m.className},`).join('\n');
  
  const content = `/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 * 
 * This file is automatically generated by scripts/generate-indexes.js
 * Run \`yarn generate:indexes\` to regenerate.
 * 
 * Generated: ${new Date().toISOString()}
 * Migrations found: ${migrations.length}
 * 
 * IMPORTANT: Migrations are listed in chronological order (by filename).
 */

${imports}

// Export all migrations as an array for TypeORM configuration
// Order matters! Migrations are run in the order they appear in this array.
export const AllMigrations = [
${exports}
];
`;

  const outputPath = path.join(DATABASE_DIR, 'all-migrations.ts');
  fs.writeFileSync(outputPath, content);
  console.log(`✅ Generated ${outputPath} with ${migrations.length} migrations`);
}

/**
 * Main function
 */
function main() {
  console.log('🔄 Generating TypeORM index files...\n');
  
  // Ensure database directory exists
  if (!fs.existsSync(DATABASE_DIR)) {
    fs.mkdirSync(DATABASE_DIR, { recursive: true });
  }
  
  generateEntitiesIndex();
  console.log('');
  generateMigrationsIndex();
  
  console.log('\n✅ All index files generated successfully!');
}

main();
