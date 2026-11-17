# Import et export CSV et Excel de la chronique chargée

17 novembre 2026. Plan d’implémentation fondé sur les sources et la proposition approuvée `output/import-export-proposal/CONCEPTION.md` du dépôt parent.

## Invariants

Les imports du protocole ne modifient jamais les relevés, leurs noms, leurs temps ou leur ordre. Les différences protocole/relevés constituent des avertissements persistants, jamais une correction automatique ni un rejet. Les DATA commençant par `#` et les marqueurs de session ne sont pas des observables inconnus. Les doublons sont conservés.

Les actions concernent uniquement la chronique chargée. Ajouter est le choix initial ; remplacer exige un choix explicite, une confirmation et une sauvegarde complète récupérable. Aucun import pendant un enregistrement. Un import est atomique et vérifie que l’état n’a pas changé depuis l’aperçu.

## Répartition et étapes

1. Core : contrat JSON partagé, tableaux versionnés communs au CSV/XLSX, lecture CSV stricte, validation des structures et temps, diagnostic non mutatif. Tests d’aller-retour et de données invalides.
2. API : instantané cohérent avec révision calculée, aperçus puis application transactionnelle avec contrôle de révision et permission de propriétaire. Copie complète de la chronique persistée en base dans la transaction avant remplacement, récupérable depuis l’accueil. Réutilisation du modèle protocole JSON et des transactions TypeORM, sans appeler les opérations de renommage en cascade.
3. Front : boutons dans les deux en-têtes approuvés, import CSV/XLSX via ExcelJS existant, sélection de feuille, aperçu des erreurs et avertissements, choix Ajouter/Remplacer, sauvegarde et confirmation. Synchronisation préalable avec `waitForPendingReadingSynchronization`, puis rechargement des données après succès. Export complet, même si une recherche est active.
4. Diagnostic persistant partagé dans Relevés/Protocole et avertissement dans Graphe/Statistiques. Réutiliser les lignes rouges existantes et proposer un filtre effaçable. Vérifier largeur du panneau, clair/sombre et clavier.

## Contrat core

Module public `packages/core/src/exchange/index.ts`, réexporté par `@actograph/core`.

`TabularExchangeDocument` est une union de deux documents :

```ts
{ format: 'actograph-tabular', version: 1, kind: 'readings',
  mode: ObservationModeEnum,
  readings: Array<{ order: number; type: ReadingTypeEnum;
    name: string | null; description: string | null; time: string | number }> }
{ format: 'actograph-tabular', version: 1, kind: 'protocol',
  items: IProtocolItem[] }
```

`order` conserve la position explicite, en particulier pour les événements simultanés. En calendrier `time` est ISO 8601 avec fuseau explicite et précision milliseconde. En chronomètre `time` est un entier de millisecondes depuis le zéro technique `1989-02-09T00:00:00.000Z` ; ce zéro ne figure pas dans les colonnes utilisateur. Les durées de plus de 24 heures restent entières. Les identifiants de protocole sont des références d’échange propres au document ; l’API les remappe et remappe `supportCategoryId`.

Fonctions prévues :

- `createReadingsExchange(readings, mode)` et `createProtocolExchange(items)` : instantanés portables.
- `exchangeDocumentToTable(document): string[][]` et `parseExchangeTable(table, kind, mode?)` : matrice commune CSV/Excel. Première ligne de métadonnées `[actograph-tabular, 1, kind, mode]`, deuxième ligne d’en-têtes stables. Les fichiers externes sans métadonnées utilisent des en-têtes explicites ; aucun mode de temps n’est deviné.
- `parseDelimitedText(text): string[][]` et `serializeDelimitedText(table, delimiter?)` : UTF-8/BOM, virgule, point-virgule et tabulation, guillemets et sauts de ligne.
- `validateExchangeDocument(value, expectedKind?, mode?)` : résultat `{ valid, errors, warnings }` ; chaque diagnostic possède `code`, `message`, `row?`.
- `exchangeReadingsToReadings(document)` : IReading avec Date et sortOrder.
- `diagnoseProtocolCorrespondence(readings, items)` : nombres et libellés absents/ambigus, sans modifier les arguments.

CSV et XLSX stockent les mêmes colonnes. Les préférences graphiques et meta sont du JSON explicite, préservant les propriétés absentes et les valeurs nulles ; les catégories vides ont leur propre ligne. ExcelJS écrit les cellules textuelles en type string et refuse les cellules formules à l’import. Les erreurs de cellule/date/type empêchent tout import, les problèmes de session et de correspondance avertissent sans modifier les données.

## Contrat HTTP de coordination

Contrat adopté :

- `GET observations/:id/exchange` : `{ revision, observation: { name, mode }, readings: ReadingExchangeDocument, protocol: ProtocolExchangeDocument }`.
- `POST observations/:id/exchange/preview` : corps `{ kind, mode: 'add' | 'replace', document }`, réponse `{ revision, kind, mode, counts: { existing, incoming, added, removed }, diagnostics, canApply }`.
- `POST observations/:id/exchange/apply` : même corps avec `revision` et `confirmReplace?: true`, réponse `{ imported, diagnostics, backup?: { id, name }, revision }`.
- `POST observations/:id/exchange/legacy-protocol` : fichier multipart `file` `.chronic`, limite 20 MiB, réponse `ProtocolExchangeDocument`, sans écriture en base. Extraction du protocole seulement.

Les diagnostics HTTP ajoutent `severity: 'error' | 'warning'` aux diagnostics core. Révision SHA256 sur relevés ET protocole, recalcul et mutations dans la même transaction. La sauvegarde est une copie persistée complète de la chronique, créée avant remplacement dans la même transaction. Elle est récupérable depuis l’accueil. Un échec annule à la fois le remplacement et cette copie.

L’ajout protocole conserve les éléments existants et leurs préférences. Les correspondances utilisent le type, le nom exact et le parent exact ; un homonyme ambigu est signalé. Le remplacement conserve les préférences existantes correspondantes quand le tableau n’en fournit pas. Les préférences des éléments existants correspondants restent conservées ; les préférences importées s’appliquent aux nouveaux éléments. Aucun relevé n’est écrit pendant ces opérations.

## Vérifications

Aller-retour CSV et matrice XLSX : accents, délimiteurs, guillemets, retours de ligne, noms ressemblant à des formules, millisecondes, durée longue, mode calendrier, ordre simultané, catégories vides, préférences héritées et références de support. Refus des dates ambiguës/invalides, formules et colonnes tronquées. Tests API : accès, validation réelle, rollback, révision obsolète, sauvegarde et absence totale de mutation des relevés lors d’import protocole. Front : typecheck, tests ciblés et contrôle de l’interface existante.

## Conventions et limites connues

TypeORM, Vue `defineComponent` avec `setup`, composants DCard/DPage existants. Core reste pur TypeScript sans dépendance de framework. La référence IKB `recipes/glutamat/auto-implement/index.md` est absente ; le README courant attribue ce processus aux skills `imp-*`, non disponibles dans le catalogue de cette session. Les conventions techniques applicables ont été lues. La modification préexistante `front/yarn.lock` doit être conservée. Pas de commit ni de publication.


## Compatibilité ActoGraph V1 vérifiée

`Logic/Chronic/Data/src/DataList.cc:549` exporte un fichier `.txt` avec quatre lignes d’en-tête : `# Data export file`, `# Data mod (0: chronometer, 1: calendar)`, code mode, `# Flag, time, name`. Chaque relevé contient type, temps et nom séparés par deux tabulations. `parseLegacyReadingsText` respecte ce format exact, conserve les noms et l’ordre, puis produit le document partagé. Les libellés contenant des tabulations sont conservés ; un saut de ligne non échappé dans un nom est impossible à distinguer d’une nouvelle ligne et provoque une erreur au lieu d’une perte.

Le mode chronomètre V1 utilise semaines, jours et `HH:mm:ss.zzz`, conservés à la milliseconde même au-delà de 24 heures. Le calendrier V1 utilise `dd/MM/yyyy HH:mm:ss.zzz` sans fuseau. L’utilisateur doit choisir explicitement le fuseau IANA d’origine ; les dates impossibles et les heures inexistantes ou ambiguës au changement d’heure sont refusées. Aucun fuseau local n’est déduit silencieusement.

L’interface V1 exporte le protocole comme image PNG (`Gui/Organisation/TreeArea/SidePart.qml:78`), sans export tabulaire autonome trouvé. `extractChronicV1Protocol` est proposé depuis le point d’entrée Node `@actograph/core/import/chronic-v1` pour extraire le protocole d’une sauvegarde `.chronic`. Il vérifie les noms et la structure avant conversion : aucune catégorie arbitraire et aucun nom de remplacement. Une structure incompatible est refusée pour éviter une perte. Les attributs graphiques V1 non représentables directement restent archivés dans `meta.legacyV1`. Les données des relevés ne sont jamais utilisées ni écrites par cette extraction.

L’ancien normaliseur `.chronic` n’est pas employé pour les relevés : son convertisseur remplace certains noms vides, et le lecteur Qt actuel ignore le timeSpec des dates. La nouvelle fonction limite donc volontairement l’extraction `.chronic` au protocole. Pour récupérer les relevés V1, utiliser l’export texte de V1.

V1 propose aussi un rapport ODS de relevés bruts via `ExportToOds::ExportReadingData`, avec en-têtes et cellules fusionnées. L’import direct ODS n’est pas couvert par ExcelJS ni par cette fonctionnalité. Ne pas présenter ce rapport comme un simple XLSX réimportable.

## Résultat final des vérifications et de la revue

La revue indépendante SOL a été suivie de la correction de tous les points signalés. Les régressions couvrent l’ordre effectif des sauvegardes lorsque les relevés mélangent `sortOrder` nul et explicite, les types V1 non pris en charge par le convertisseur, les DATA sans nom, les références graphiques devenues orphelines après conservation des préférences, l’ordre du protocole après déplacement ou ajout et l’import dans une chronique manuelle contenant un START sans STOP. Ces corrections ne modifient pas les relevés sources lors d’un import de protocole. Les références graphiques orphelines restent des avertissements non bloquants.

Résultats après corrections :

- API : suite complète, **15 suites et 139 tests réussis**, compilation TypeScript sans émission réussie, sous Node 20. Les tests couvrent les transactions SQLite, permissions, sauvegardes récupérables, concurrence, absence de mutation des relevés et routes HTTP, y compris le multipart `.chronic`.
- Core : build TypeScript réussi et **23 suites complètes, 208 tests réussis**, dont **34 tests ciblés** dans `tabular-exchange.test.ts` et `legacy-protocol.test.ts`. Ces deux suites incluent deux fichiers `.chronic` réels du dépôt, noms bruts, non-mutation, CSV à trois séparateurs, protection anti-formules réversible, dates avec fuseau, rejet des heures DST ambiguës, millisecondes, durées longues, ordre simultané, préférences héritées et catégories vides.
- Frontend : dernier contrôle complet avant publication, **485 tests réussis** et contrôle TypeScript réussi. Les vérifications incluent les échanges XLSX binaires avec ExcelJS. La compilation de l’interface de production Electron avec `--skip-pkg` a réussi sur une copie temporaire des sources identiques, sans le hook de construction API.
- Contrôle visuel effectué par le parent sur une démo rendant les composants réels, à **1440 et 1024 pixels de largeur**. Le filtre d’anomalies a été appliqué puis effacé : **20 lignes, puis 1, puis 20**. Les captures sont conservées dans [exchange-ui-check](/home/syl/workdir/symalgo/actograph/output/exchange-ui-check).

La compilation API réelle a également réussi dans une sortie temporaire propre, suivie de la réécriture des alias et du contrôle du bundle esbuild avec la configuration TypeScript du projet. Les fonctions d’échange et l’extraction Node du protocole V1 sont présentes dans ce bundle. Les deux opérateurs TypeScript `satisfies` ont été remplacés par des annotations explicites compatibles avec Vite 2 et son esbuild.

Ces vérifications locales ne couvrent pas l’exécution dans Electron natif ni PostgreSQL. Le contrôle visuel sur la démo ne constitue pas un test de bout en bout dans l’application Electron installée. La publication bureau prévue est la version mineure **3.1.0**, tag `prod-v3.1.0` ; les quatre constructions natives, signatures et fichiers de mise à jour doivent être validés dans la CI avant de confirmer sa disponibilité publique. La modification préexistante de `front/yarn.lock` est exclue des commits de cette fonctionnalité.

La première tentative `prod-v3.1.0` a été interrompue avant publication : GitHub refuse désormais le runner macOS 14 ARM64, retiré le 2 novembre 2026. Ce tag est conservé sans déplacement. La reprise prévue est **3.1.1**, après remplacement ciblé du runner par `macos-15`, adaptation des chemins des artefacts et ajout d’un contrôle des dix fichiers bureau obligatoires avant publication. Aucun installeur 3.1.0 n’a été annoncé comme disponible.
