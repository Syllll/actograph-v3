#!/usr/bin/env node

/**
 * Script pour corriger les types d3-dispatch incompatibles avec TypeScript 4.5.4
 * 
 * Le fichier @types/d3-dispatch utilise une syntaxe TypeScript 5.0+ (const type parameters)
 * qui n'est pas compatible avec TypeScript 4.5.4 utilisé dans ce projet.
 * 
 * Ce script remplace le fichier index.d.ts problématique par une version compatible.
 */

const fs = require('fs');
const path = require('path');

const d3DispatchTypesPath = path.join(__dirname, '../node_modules/@types/d3-dispatch/index.d.ts');

// Contenu compatible avec TypeScript 4.5.4
const compatibleContent = `// Type declarations for d3-dispatch
// Compatible with TypeScript 4.5.4
// This file replaces the official @types/d3-dispatch which uses TypeScript 5.0+ syntax

export function dispatch<This extends object, EventMap extends Record<string, any[]>>(
  ...types: string[]
): Dispatch<This, EventMap>;

export interface Dispatch<This extends object, EventMap extends Record<string, any[]>> {
  on(typenames: string, callback: (this: This, ...args: any[]) => void): this;
  on(typenames: string, callback: null): this;
  copy(): Dispatch<This, EventMap>;
  call(type: string, ...args: any[]): void;
  apply(type: string, that: This, args: any[]): void;
}
`;

// Vérifier si le fichier existe
if (fs.existsSync(d3DispatchTypesPath)) {
  try {
    // Lire le contenu actuel
    const currentContent = fs.readFileSync(d3DispatchTypesPath, 'utf8');
    
    // Vérifier si le fichier utilise la syntaxe TypeScript 5.0+ problématique
    if (currentContent.includes('const EventNames extends')) {
      console.log('Fixing d3-dispatch types for TypeScript 4.5.4 compatibility...');
      fs.writeFileSync(d3DispatchTypesPath, compatibleContent, 'utf8');
      console.log('✓ d3-dispatch types fixed successfully');
    } else {
      console.log('✓ d3-dispatch types already compatible');
    }
  } catch (error) {
    console.warn('Warning: Could not fix d3-dispatch types:', error.message);
  }
} else {
  console.log('ℹ d3-dispatch types not found (may not be installed yet)');
}









