# Import .chronic v1

**Statut** : ✅ **Implémenté**

## Description

Cette feature implémente le support de l'import des fichiers `.chronic` (format v1 binaire) dans ActoGraph v3. Le format `.chronic` est un format legacy de la version 1 d'ActoGraph qui utilise Qt DataStream pour la sérialisation binaire.

---

## Plan d'implémentation

### Phase 1 : Bibliothèque Qt DataStream

#### 1.1 Créer la bibliothèque de parsing Qt DataStream
**Fichiers à créer** :
- `api/src/core/observations/services/observation/import/chronic-v1/qtdatastream/`
  - `index.ts`
  - `src/buffer.ts` : Buffer personnalisé avec gestion de position de lecture
  - `src/types.ts` : Types de base (QString, QInt, QDouble, QDateTime, etc.)
  - `src/util.ts` : Utilitaires de conversion (dates juliennes, etc.)
  - `src/serialization.ts` : Sérialisation
  - `src/socket.ts` : Socket Qt
  - `src/transform.ts` : Transformations de stream

**Tâches** :
- [x] Créer la bibliothèque complète pour parser Qt DataStream
- [x] Implémenter les types de base (QString, QInt, QDouble, QDateTime, etc.)
- [x] Créer un buffer personnalisé avec gestion de position de lecture
- [x] Implémenter les utilitaires de conversion
- [x] Ajouter la dépendance `int64-buffer` dans `api/package.json`

### Phase 2 : Types TypeScript

#### 2.1 Créer les types pour le format v1
**Fichiers à créer** :
- `api/src/core/observations/services/observation/import/chronic-v1/types/chronic-v1.types.ts`

**Tâches** :
- [x] Créer `IChronicV1` : Structure principale du fichier .chronic
- [x] Créer `IProtocolNodeV1` : Structure récursive du protocole
- [x] Créer `IReadingV1` et `IReadingEntryV1` : Structure des readings
- [x] Créer `IModeManagerV1` : Gestionnaire de mode
- [x] Créer `IGraphManagerV1` : Gestionnaire de graphique
- [x] Créer `IExtensionDataV1` : Données d'extension

### Phase 3 : Parsers

#### 3.1 Parser principal
**Fichiers à créer** :
- `api/src/core/observations/services/observation/import/chronic-v1/parser/chronic-parser.ts`

**Tâches** :
- [x] Créer le parser principal qui coordonne le parsing de toutes les sections
- [x] Support des versions 1, 2 et 3 du format
- [x] Validation des données essentielles

#### 3.2 Parsers spécialisés
**Fichiers à créer** :
- `api/src/core/observations/services/observation/import/chronic-v1/parser/protocol-parser.ts`
- `api/src/core/observations/services/observation/import/chronic-v1/parser/reading-parser.ts`
- `api/src/core/observations/services/observation/import/chronic-v1/parser/mode-manager-parser.ts`
- `api/src/core/observations/services/observation/import/chronic-v1/parser/graph-manager-parser.ts`
- `api/src/core/observations/services/observation/import/chronic-v1/parser/extension-data-parser.ts`

**Tâches** :
- [x] Parser protocole : Parse la structure hiérarchique récursive du protocole
- [x] Parser readings : Parse les readings avec leurs métadonnées
- [x] Parser mode-manager : Parse le gestionnaire de mode (calendar/chronometer)
- [x] Parser graph-manager : Parse le gestionnaire de graphique (simplifié, métadonnées ignorées)
- [x] Parser extension-data : Parse les données d'extension (version 3 uniquement)

### Phase 4 : Convertisseurs

#### 4.1 Convertisseur protocole
**Fichiers à créer** :
- `api/src/core/observations/services/observation/import/chronic-v1/converter/protocol-converter.ts`

**Tâches** :
- [x] Convertir la structure récursive v1 → structure plate v3
- [x] Transformation : arbre de nœuds → catégories contenant des observables
- [x] Préservation de l'ordre via `indexInParentContext`

#### 4.2 Convertisseur readings
**Fichiers à créer** :
- `api/src/core/observations/services/observation/import/chronic-v1/converter/reading-converter.ts`

**Tâches** :
- [x] Convertir les readings v1 → format normalisé v3
- [x] Mapping des flags textuels → ReadingTypeEnum
- [x] Validation des données

### Phase 5 : Intégration dans le service d'import

#### 5.1 Intégration dans le service
**Fichiers à modifier** :
- `api/src/core/observations/services/observation/import.ts`
- `api/src/core/observations/controllers/observation.controller.ts`

**Tâches** :
- [x] Modifier `parseFile()` : Détection et parsing des fichiers `.chronic`
- [x] Modifier `normalizeImportData()` : Conversion des données v1 vers format normalisé
- [x] Ajouter les parsers et convertisseurs v1
- [x] Modifier le controller pour passer le Buffer directement pour les fichiers `.chronic`

---

## Fichiers créés/modifiés

### Backend

**Créés** :
- `api/src/core/observations/services/observation/import/chronic-v1/qtdatastream/` (bibliothèque complète)
- `api/src/core/observations/services/observation/import/chronic-v1/types/chronic-v1.types.ts`
- `api/src/core/observations/services/observation/import/chronic-v1/parser/chronic-parser.ts`
- `api/src/core/observations/services/observation/import/chronic-v1/parser/protocol-parser.ts`
- `api/src/core/observations/services/observation/import/chronic-v1/parser/reading-parser.ts`
- `api/src/core/observations/services/observation/import/chronic-v1/parser/mode-manager-parser.ts`
- `api/src/core/observations/services/observation/import/chronic-v1/parser/graph-manager-parser.ts`
- `api/src/core/observations/services/observation/import/chronic-v1/parser/extension-data-parser.ts`
- `api/src/core/observations/services/observation/import/chronic-v1/converter/protocol-converter.ts`
- `api/src/core/observations/services/observation/import/chronic-v1/converter/reading-converter.ts`

**Modifiés** :
- `api/src/core/observations/services/observation/import.ts`
- `api/src/core/observations/controllers/observation.controller.ts`
- `api/package.json` : Ajout de `int64-buffer`

---

## Notes techniques

### Support des versions

Le système supporte les trois versions du format `.chronic` :
- **Version 1** : Structure de base
- **Version 2** : Ajout de `autoPosButtons` et `buttonsWidth`
- **Version 3** : Ajout de `extensionData`

### Conversion des données

#### Protocole
- **Structure v1** : Arbre récursif avec nœud racine, catégories et observables
- **Structure v3** : Structure plate avec catégories contenant des observables
- **Préservation** : Ordre des catégories et observables via `indexInParentContext`
- **Ignoré** : Métadonnées d'affichage (positions, couleurs, formes)

#### Readings
- **Mapping des types** :
  - `'start'` → `ReadingTypeEnum.START`
  - `'stop'` → `ReadingTypeEnum.STOP`
  - `'pause_start'` / `'pausestart'` → `ReadingTypeEnum.PAUSE_START`
  - `'pause_end'` / `'pauseend'` → `ReadingTypeEnum.PAUSE_END`
  - `'data'` → `ReadingTypeEnum.DATA`
  - Autres → `ReadingTypeEnum.DATA` (par défaut)
- **Préservation** : Dates et noms conservés tels quels
- **Ignoré** : IDs (nouveaux IDs générés automatiquement)

### Métadonnées ignorées

Les métadonnées suivantes du format v1 sont ignorées lors de l'import car elles ne sont pas utilisées dans v3 :
- Positions des boutons (bX, bY, bWidth, bHeight)
- Couleurs et formes des éléments du protocole
- Configuration du graphique (layers, axes, etc.)
- Fichiers média (vidéo/audio)
- Mode calendar/chronometer
- Données d'extension

### Gestion des erreurs

- **Version non supportée** : Message clair indiquant la version détectée
- **Buffer invalide** : Erreur avec détails sur la section problématique
- **Champs manquants** : Validation des champs essentiels (name, protocol, readings)

Toutes les erreurs sont encapsulées dans des `BadRequestException` avec des messages descriptifs pour l'utilisateur.

---

## Améliorations futures possibles

1. **Amélioration du parser graph-manager** :
   - Implémentation complète du parsing si nécessaire
   - Préservation de certaines métadonnées graphiques si demandé

2. **Support des fichiers média** :
   - Import des chemins de fichiers vidéo/audio
   - Copie des fichiers média si nécessaire

3. **Tests automatisés** :
   - Tests unitaires pour chaque parser
   - Tests d'intégration avec fichiers réels
   - Tests de conversion avec différents scénarios

4. **Optimisation** :
   - Amélioration des performances pour les gros fichiers
   - Gestion de la mémoire pour les fichiers volumineux

