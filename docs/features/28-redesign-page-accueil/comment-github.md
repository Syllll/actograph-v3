# Plan d'implémentation - Redesign de la page d'accueil

## Résumé

Redesign complet de la page d'accueil avec une disposition asymétrique plus simple et intuitive :
- **Zone "Chronique active"** agrandie (2/3 de la largeur, 2 cases verticalement)
- **Intégration des actions principales** (Protocole, Observation, Graphe, Stats) dans la zone chronique active
- **Fusion** de "Centre d'aide" et "En savoir plus" en une seule zone "Aide & Informations"
- **Simplification du drawer** sur la page d'accueil pour éviter la redondance

## Checklist d'implémentation

### Phase 1 : Restructuration de la page d'accueil
- [ ] Modifier le layout principal (grille 2x2 → layout asymétrique 1/3 - 2/3)
- [ ] Créer le composant `HelpAndInfo` (fusion de FirstSteps et Advertisement)
- [ ] Intégrer HelpAndInfo dans la page d'accueil

### Phase 2 : Réorganisation du composant ActiveChronicle
- [ ] Restructurer en 3 sections distinctes
- [ ] Ajouter la section "Actions principales" avec grille 2x2 (Protocole, Observation, Graphe, Stats)
- [ ] Gérer les états disabled et tooltips pour Graphe et Statistiques
- [ ] Réorganiser les actions secondaires

### Phase 3 : Adaptation du drawer
- [ ] Détecter la page d'accueil dans le drawer
- [ ] Masquer/simplifier la carte chronique sur la page d'accueil
- [ ] Conserver la carte complète sur les autres pages

### Phase 4 : Nettoyage
- [ ] Vérifier la cohérence de toutes les fonctionnalités
- [ ] Supprimer les composants obsolètes (FirstSteps, Advertisement) si code intégré
- [ ] Tests finaux

## Fichiers à créer

```
front/src/pages/userspace/home/_components/help-and-info/Index.vue
```

## Fichiers à modifier

```
front/src/pages/userspace/home/Index.vue
front/src/pages/userspace/home/_components/active-chronicle/Index.vue
front/src/pages/userspace/_components/drawer/Index.vue
```

## Notes techniques

- Utiliser les classes Quasar pour le layout (`row`, `col-4`, `col-8`, `col-12`)
- Réutiliser la logique existante pour les états disabled et la navigation
- Maintenir la cohérence avec le drawer pour les tooltips et messages d'erreur

## Voir le plan détaillé

Pour plus de détails, voir : `docs/features/28-redesign-page-accueil/28-redesign-page-accueil.md`

