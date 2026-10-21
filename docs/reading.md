# Relevés : collecte, édition et synchronisation

Référence bureau revue le 11 octobre 2026. Un relevé (`reading`) porte un nom, une description optionnelle, un type et un horodatage dans une observation. Les types frontend sont dans `front/src/services/observations/interface.ts`, les types communs dans `packages/core/src/`.

## Types et temps

| Type | Valeur | Sens |
|---|---|---|
| START | `start` | Début de session |
| STOP | `stop` | Fin de session |
| PAUSE_START | `pause_start` | Début de pause |
| PAUSE_END | `pause_end` | Reprise |
| DATA | `data` | Observable ou commentaire |

Un DATA référence l'observable par **son nom**, pas par un ID de protocole. Un commentaire ajouté dans la table est un DATA dont le nom commence par `# `.

Les objets locaux utilisent `Date` ; `readingService.createMany` et `updateMany` sérialisent les objets Date en chaînes ISO avec millisecondes, attendues par la validation backend `IsDateString`.

- **Calendrier** : date/heure réelle.
- **Chronomètre** : `dateTime = CHRONOMETER_T0 + durée`, t0 étant le 9 février 1989 à 00:00:00 UTC.
- **Vidéo** : mode chronomètre ; `dateTime = t0 + video.currentTime`, y compris avant le premier Rec.

L'interface affiche des dates/heures en calendrier et des durées en chronomètre. Le changement de mode reste possible après création seulement si la chronique n'a pas démarré, ne contient pas de relevés et n'a pas de vidéo attachée. Voir [parcours bureau](desktop.md).

## Session de collecte en direct, au chronomètre ou en vidéo

La barre `ObservationSessionBar` utilise les actions communes dans `observation-session-actions.ts` :

- Démarrer appelle `startTimer`, crée START au premier démarrage de la session
  courante, même en présence d'anciens START. Reprendre termine une pause de
  la session en mémoire. Les marqueurs historiques ne font pas apparaître
  Terminer et ne déclenchent pas l'initialisation automatique d'observables.
- Pause appelle `pauseTimer` ; elle ne crée pas STOP.
- Terminer demande confirmation, appelle `stopTimer`, crée STOP et déclenche `autoCorrectReadings(true)`.
- La fin de vidéo met en pause sans appliquer la confirmation/correction du parcours Terminer.

En calendrier, les observables sont verrouillés pendant la pause ; en chronomètre, on peut saisir au temps figé. Aucun PAUSE_START/PAUSE_END n'est créé automatiquement pour une vidéo. Les états continus traversent les pauses, et STOP clôture les segments. Voir [pauses](pauses.md) pour les règles du graphe et des statistiques.

## Édition dans la table

`front/src/pages/userspace/observation/_components/readings-side/` regroupe la table, la barre d'outils et les dialogues :

- Le bouton **+** copie le relevé sélectionné juste après celui-ci, avec le même
  horodatage, type, nom et description. Sans sélection, il copie le dernier
  relevé ; dans une table vide, il crée le premier relevé. Aucun dialogue ne
  s'ouvre. La nouvelle ligne est sélectionnée et le tableau défile pour la
  montrer, en tenant compte du sens de tri. Une recherche active est effacée
  lors de l'ajout pour ne pas masquer la nouvelle ligne.
- Cliquer sur une ligne, entrer dans un de ses champs ou utiliser Entrée/Espace
  sur la ligne permet de la sélectionner. Le crayon ouvre son formulaire
  d'édition. Les touches des champs conservent leur comportement habituel.
- Ajout d'un commentaire.
- Le libellé d'un observable s'édite directement dans la ligne. La flèche
  adjacente propose les observables du protocole regroupés par catégorie.
  Les notes et l'horodatage sont conservés lors du changement de libellé. Un
  libellé vide est annulé ; Échap restaure la valeur précédente. Le crayon
  reste disponible pour la description et les autres champs.
- Les horodatages utilisent des chiffres à position fixe :
  `JJ/MM/AAAA HH:mm:ss.SSS` en calendrier, `DDDj HH:mm:ss.SSS` en durée.
  La saisie peut commencer dans n'importe quel segment et avancer à la suite.
  Les séparateurs ne se déplacent pas et les chiffres excédentaires ne
  débordent pas. Les jours des durées existantes peuvent dépasser trois
  chiffres. Entrée ou la perte de focus valide ; Échap revient à la valeur
  persistée. Une date impossible, une heure inexistante dans le fuseau ou
  une durée hors plage reste en erreur sans remplacer l'horodatage enregistré.
- Le brouillon d'un horodatage reste modifiable et validable quand une ligne
  sort puis revient dans la zone de défilement virtuelle, ou reçoit son ID.
- Recherche par nom, description ou ID et compteur de résultats.
- Remplacement des occurrences de la recherche dans les noms après confirmation.
- Suppression individuelle et effacement complet avec confirmation.
- Tri chronologique ; les relevés qui partagent le même instant gardent un ordre
  stable via `sortOrder`, persisté en base et conservé dans les fichiers
  `.jchronic`. Aucun décalage artificiel de l'horodatage n'est appliqué. Les
  anciennes chroniques sans ce champ restent compatibles et leur ouverture
  ne déclenche pas de réécriture des relevés.

Le panneau se dimensionne selon le contenu, avec un splitter pour l'ajuster. Le bandeau `ReadingsAfterLastStopBanner` signale les relevés après le dernier STOP. Ces données restent visibles pour correction ; ne pas supposer qu'elles ont été effacées.

## Parcours de saisie manuelle

L'entrée **Saisie manuelle** de Nouvelle chronique conserve le choix dans
`observation.meta.entryMode = 'manual'`. Le mode temporel reste Calendrier ou
Chronomètre. La création propose un protocole nouveau ou la copie d'un
protocole existant. Ce choix survit à la réouverture et à l'export/réimport.
Les actions de timer sont inactives dans ce parcours, y compris lorsqu'un
ancien callback les appelle. L'ajout par les observables copie le contexte
temporel sélectionné sans nécessiter de START ni injecter l'heure courante.

## Synchronisation avec l'API locale

`use-observation/use-readings.ts` maintient l'état courant et l'état déjà synchronisé. Les créations locales reçoivent un `tempId` UUID pour les corréler aux lignes renvoyées par le backend. La synchronisation détermine les créations, mises à jour et suppressions, puis utilise les opérations par lot du service.

```typescript
import { readingService } from '@services/observations/reading.service';
import { ReadingTypeEnum } from '@services/observations/interface';

await readingService.createMany({
  observationId: 1,
  readings: [{
    name: 'Lecture',
    type: ReadingTypeEnum.DATA,
    dateTime: new Date('2026-10-11T09:01:00.000Z'),
    tempId: 'identifiant-temporaire-unique',
  }],
});

await readingService.updateMany({
  observationId: 1,
  readings: [{
    id: 12,
    name: 'Lecture individuelle',
    description: 'Description corrigée',
    type: ReadingTypeEnum.DATA,
    dateTime: new Date('2026-10-11T09:01:00.000Z'),
  }],
});

await readingService.deleteMany({ observationId: 1, ids: [12] });
```

Le service frontend n'expose pas de méthode `update()` individuelle : même pour une seule ligne, utiliser `updateMany`. Les mises à jour prennent les données complètes de chaque relevé (nom, type et date, plus description/tempId si présents). La suppression backend est logique (`deletedAt`).

Cette synchronisation concerne le frontend et son **API locale SQLite** ; elle n'est pas un transfert cloud. Les fichiers `.jchronic` et l'autosave sont décrits dans [chroniques](chronic.md).

## API Backend

Les routes sous `/observations/readings` vérifient JWT, rôles et accès à l'observation.

| Méthode | Route | Corps / usage |
|---|---|---|
| POST | `/observations/readings` | `{ observationId, readings: [...] }` pour création |
| PATCH | `/observations/readings` | `{ observationId, readings: [...] }` avec IDs pour mise à jour |
| POST | `/observations/readings/delete` | `{ observationId, ids: [...] }` |
| GET | `/observations/readings/paginate` | Pagination, `observationId`, `searchString` |

Pour les paramètres de pagination complets et les validations, consulter `api/src/core/observations/controllers/reading.controller.ts` et le client `front/src/services/observations/reading.service.ts`.

## Correction automatique

Le calcul partagé vit dans `packages/core/src/utils/reading-auto-correct.ts`. Il renvoie les relevés corrigés et des codes `reason` stables. `AUTO_CORRECT_SYNTH_NAMES` définit les noms synthétiques ; l'application traduit ces valeurs via `front/src/composables/use-observation/auto-correct-i18n.ts`.

Le composable applique les corrections aux données locales, puis les synchronise. La table permet une correction à la demande via `AutoCorrectReadingsDialog`. Terminer lance aussi ce parcours de correction ; Pause et la fin vidéo ne le font pas.

Les tests du core et des utilitaires frontend sont lancés depuis leurs dossiers par `yarn test --runInBand`. La [revue historique](reviews/20250115000000-auto-correct-shared-Sylvain-Meylan.md) conserve le contexte d'introduction du module.

## Dépannage

- Si une édition ne persiste pas, vérifier observation active, IDs/tempIds et réponse de synchronisation dans l'API.
- Si la date est refusée, vérifier le format ISO 8601, le fuseau et la sérialisation en chaîne ; garder les millisecondes.
- En chronomètre/vidéo, vérifier la conversion à partir de t0, pas à partir de l'heure murale.
- Si les noms ne correspondent plus au protocole, rechercher les renommages et les homonymes ; voir [protocoles](protocol.md).
- Pour l'intégration vidéo et les limites du média local, voir la [documentation de la feature](features/20250115000000-integration-video-Sylvain-Meylan.md).
