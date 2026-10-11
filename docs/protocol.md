# Protocoles

Référence de l'application bureau, revue le 11 octobre 2026. Un protocole est associé à une observation et organise des catégories contenant des observables. Il guide les boutons de collecte et le graphe.

## Contrat de données

Les types frontend vivent dans `front/src/services/observations/interface.ts` ; les types partagés dans `packages/core/src/`. Le backend persiste `Protocol.items` comme une **chaîne JSON**. Le frontend l'hydrate en `_items` pour l'édition et la réactivité.

```typescript
interface ProtocolItem {
  id: string;                      // UUID local au protocole
  name: string;
  description?: string;
  type: 'category' | 'observable';
  action?: 'continuous' | 'discrete';
  order?: number;
  children?: ProtocolItem[];        // Observables d'une catégorie
  graphPreferences?: IGraphPreferences;
}
```

`Continuous` désigne un observable continu ; `Discrete` un événement ponctuel. Les préférences graphiques comprennent couleur, épaisseur, motif, visibilité et modes `normal`, `background` ou `frieze`, avec héritage depuis la catégorie. Elles font partie du protocole et sont transportées lors des copies et exports.

## Création et copie

La création de l'observation initialise son protocole côté backend. Le service frontend `protocolService` n'expose pas de méthode `create()` autonome. Pour copier un protocole existant, il expose :

```typescript
await protocolService.cloneProtocol(sourceObservationId, targetObservationId);
```

La source et la cible doivent être différentes et accessibles à l'utilisateur. Les sélecteurs de création/import ne proposent que des sources contenant au moins une catégorie. Le clonage et l'import réattribuent les IDs et préservent les préférences graphiques, y compris les références portables aux catégories de support.

## Ajouter et éditer

Dans l'UI, les catégories peuvent être ajoutées sur place. Le bouton d'une catégorie ouvre à la demande le champ d'ajout d'observable. Les événements clavier de ces champs sont isolés des raccourcis de collecte. Les modales permettent l'édition détaillée.

Exemples du service frontend actuel :

```typescript
import {
  protocolService,
  ProtocolItemActionEnum,
  ProtocolItemTypeEnum,
} from '@services/observations/protocol.service';

const category = await protocolService.addCategory({
  protocolId: 1,
  name: 'Activité',
  order: 0,
});

const observable = await protocolService.addObservable({
  protocolId: 1,
  parentId: category.id,
  name: 'Lecture',
  action: ProtocolItemActionEnum.Continuous,
  order: 0,
});

await protocolService.editItem({
  id: observable.id,
  protocolId: 1,
  type: ProtocolItemTypeEnum.Observable,
  description: 'Lecture individuelle',
});
```

Dans une page frontend, importer ce service via `@services/observations/protocol.service`. `addCategory` et `addObservable` prennent des DTO **sans `type`** ; le service ajoute ce champ au payload HTTP. Chaque observable appartient à une catégorie (`parentId`).

Les relevés DATA identifient l'observable par **son nom**, pas par son UUID. `isObservableNameInUse` empêche les doublons de nom dans l'éditeur. Lors d'un renommage ou d'une modification de description, `EditObservableModal` met aussi à jour les relevés correspondants si le nom précédent permet une correspondance non ambiguë. Les fichiers anciens contenant des homonymes ne permettent pas cette cascade fiable.

## Réordonner, déplacer et supprimer

Le glisser-déposer réordonne catégories et observables via les valeurs `order`. `moveObservableToCategory` supprime l'item source puis le recrée dans la catégorie cible, en préservant son nom, sa description, son action et ses préférences graphiques. Son UUID change ; ne pas supposer une identité stable après ce déplacement.

```typescript
await protocolService.deleteItem(observable.id, 1);
```

La suppression d'un item du protocole ne doit pas être confondue avec la suppression des relevés : ceux-ci portent des noms et peuvent rester présents après une modification du protocole. Vérifier les relevés et les avertissements avant l'analyse.

## Récupération et préférences

```typescript
const protocol = await protocolService.findOneFromObservationId(1);
const categories = protocol._items ?? [];

await protocolService.updateItemGraphPreferences(1, category.id, {
  color: '#336699',
  strokeWidth: 2,
});
```

`findOneFromObservationId` hydrate `_items` et revient à un tableau vide si le JSON n'est pas lisible. `getItemGraphPreferences` lit les valeurs propres d'un item ; `getObservableGraphPreferencesWithInheritance` calcule les valeurs héritées. Voir [graphiques](graph.md) et [moteur v2](graph-engine-v2.md).

## Routes API

Les routes sont sous `/observations/protocols`, protégées par JWT et les contrôles d'accès au propriétaire de l'observation.

| Méthode | Route relative | Usage |
|---|---|---|
| GET | `/paginate` | Liste paginée |
| GET | `/from-observation/:observationId` | Protocole d'une observation |
| POST | `/clone` | `{ sourceObservationId, targetObservationId }` |
| POST | `/item` | Ajout avec `protocolId`, `type`, nom et parent si observable |
| PATCH | `/item/:id` | Modification d'un item |
| DELETE | `/item/:protocolId/:itemId` | Suppression d'un item |
| GET / PATCH | `/item/:protocolId/:itemId/graph-preferences` | Lecture / mise à jour des préférences |
| GET | `/observable/:protocolId/:observableId/graph-preferences-with-inheritance` | Préférences héritées |

Le contrat exact des DTO et des validations est dans `api/src/core/observations/controllers/protocol.controller.ts`, les traitements dans `services/protocol/` et le client dans `front/src/services/observations/protocol.service.ts`.

## Dépannage

- Si l'arbre est vide, vérifier `items`, son parsing vers `_items` et l'observation active.
- Si un ajout est refusé, vérifier le nom, la catégorie parente et le `protocolId`, puis la réponse HTTP.
- Si des relevés semblent associés à plusieurs observables, rechercher des homonymes hérités d'un ancien fichier.
- Après modification des types partagés, reconstruire core pour l'API ; voir [monorepo](monorepo-build.md).
