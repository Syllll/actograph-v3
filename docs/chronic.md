# Chroniques, import et export

Référence bureau revue le 11 octobre 2026. Une **chronique** correspond à l'observation, ses métadonnées, son protocole et ses relevés. Les données courantes sont persistées en SQLite ; l'export fichier est une opération distincte. Le détail de la collecte et de la synchronisation locale est dans [relevés](reading.md).

## Formats proposés

| Format | Import bureau | Export bureau | Contenu |
|---|---|---|---|
| `.jchronic` | Oui | Oui | JSON portable ActoGraph v3 |
| `.chronic` | Oui | Non | Format binaire historique V1, converti à l'import |
| CSV / Excel | Pas de parcours d'import de chronique dans l'interface actuelle | Exports de données statistiques selon la vue | Tableaux, pas une chronique complète |

Les anciens exemples de `parseFile`, `exportReadingsToCsv` ou `exportReadingsToExcel` ne correspondent pas à des méthodes du service d'import/export bureau actuel. Les exports statistiques utilisent `use-statistics-export` ; les exports du graphe sont décrits dans [graph.md](graph.md).

## Format `.jchronic`

L'API exporte la version de **format** `1.0.0`, distincte de la version de l'application. Exemple minimal :

```json
{
  "version": "1.0.0",
  "exportedAt": "2026-10-11T12:00:00.000Z",
  "observation": {
    "name": "Chronique de démonstration",
    "mode": "calendar",
    "createdAt": "2026-10-11T09:00:00.000Z",
    "updatedAt": "2026-10-11T10:00:00.000Z"
  },
  "protocol": {
    "name": "Protocole",
    "items": [
      {
        "type": "category",
        "name": "Activité",
        "order": 0,
        "children": [
          {
            "type": "observable",
            "name": "Lecture",
            "action": "continuous",
            "order": 0
          }
        ]
      }
    ]
  },
  "readings": [
    { "name": "Début", "type": "start", "dateTime": "2026-10-11T09:00:00.000Z" },
    { "name": "Lecture", "type": "data", "dateTime": "2026-10-11T09:01:00.000Z" },
    { "name": "Fin", "type": "stop", "dateTime": "2026-10-11T09:10:00.000Z" }
  ]
}
```

Les champs optionnels comprennent descriptions, `observation.videoPath`, `observation.meta` (ex. disposition `uiScale`) et préférences graphiques des items. L'export retire les IDs de base et les UUID d'items ; les références graphiques aux catégories sont rendues portables puis résolues lors de l'import. Les dates des relevés sont sérialisées en ISO 8601 UTC.

La vidéo n'est **pas** incorporée : seul son chemin est conservé. Sur une autre machine, il faut disposer du média et sélectionner un chemin valable. En mode chronomètre, les dates représentent `t0 + durée`, avec t0 au 9 février 1989 à 00:00:00 UTC.

## Export et Enregistrer sous

Le client frontend demande `GET /observations/:id/export`. L'API contrôle l'accès à l'observation, charge protocole/relevés et construit le JSON portable. Electron affiche le dialogue de sauvegarde et écrit le fichier :

```typescript
import { exportService } from '@services/observations/export.service';

const filePath = await exportService.exportObservation(currentObservation);
```

L'observation doit avoir un ID persisté. Une annulation du dialogue ne constitue pas une erreur d'export.

**Enregistrer sous** utilise `exportService.saveAsObservation(observation, newName)` : construction d'un export avec le nouveau nom, réimport comme une nouvelle observation et écriture du fichier. Cette action crée une copie ; elle ne renomme pas simplement l'original.

## Import

Depuis Mes chroniques, sélectionner `.jchronic` ou `.chronic`. Le bridge Electron lit le JSON en texte, et le `.chronic` binaire via `readFileBinary` sans conversion UTF-8 destructrice. Le service crée un `File` et l'envoie à `POST /observations/import` en multipart, champ `file` :

```typescript
import { importService } from '@services/observations/import.service';

const observation = await importService.importFromFile(filePath);
```

L'API détecte le format, parse et normalise la chronique, puis crée observation, protocole et relevés avec de nouveaux IDs. L'import se fait pour l'utilisateur local connecté. Le frontend recharge l'observation importée.

Pour le format V1, le parser partagé se trouve dans `packages/core/src/import/chronic-v1/`. Les clés techniques provenant du fichier sont transformées en éléments du protocole et relevés V3. Ne pas présenter le format V1 comme du JSON, ni tenter une lecture texte de son contenu binaire.

La route HTTP et le traitement d'import sont aussi utilisables par un client web fournissant un `File`, mais `importService.importFromFile` et les dialogues de fichier bureau nécessitent Electron.

## Autosave et récupération

`use-autosave` détecte les changements de la chronique ouverte et vérifie la sauvegarde toutes les **10 minutes**. Il appelle l'export API pour obtenir les données persistées récentes, puis écrit un fichier `autosave_<id>_<nom>_<timestamp>.jchronic` dans le dossier autosave exposé par Electron.

- Au maximum **20** fichiers sont conservés après sauvegarde.
- Au démarrage, le nettoyage supprime les fichiers de plus de **7 jours**.
- Le sélecteur de récupération permet de choisir un fichier à restaurer via le parcours d'import.
- L'export manuel peut nettoyer les autosaves de la chronique correspondante.

L'autosave de fichier complète la persistance SQLite ; une édition encore non synchronisée avec l'API doit d'abord terminer sa synchronisation.

## Cloud

La connexion actograph.io est distincte du JWT local. `use-cloud` et `actographCloudService` gèrent la liste distante, l'envoi et la récupération des chroniques via les actions explicites de l'interface. Les données locales restent utilisables hors ligne. Voir [authentification cloud](authentification.md#cloud-actographio) et [parcours bureau](desktop.md).

## Sources et dépannage

- Export : `api/src/core/observations/services/observation/export.ts` et `front/src/services/observations/export.service.ts`.
- Import : `api/src/core/observations/services/observation/import/` et `front/src/services/observations/import.service.ts`.
- Actions : `front/src/composables/use-chronicle-actions/`.
- Autosave : `front/src/composables/use-autosave/` et `front/src/services/observations/autosave.service.ts`.

Si un import échoue, contrôler le format et la réponse API avant de modifier le fichier. Si le graphe est vide après import, vérifier le protocole, les relevés et la correspondance des noms. Une vidéo absente ne signifie pas que les relevés sont perdus. Un échec de dialogue ou de lecture native doit être diagnostiqué côté Electron, un rejet de données côté API.
