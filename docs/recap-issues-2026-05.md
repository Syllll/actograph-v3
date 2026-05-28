# Récap mise à jour issues GitHub — mai 2026

**Date** : 28 mai 2026
**Dépôt** : [Syllll/actograph-v3](https://github.com/Syllll/actograph-v3)
**Board** : [Project #2](https://github.com/users/Syllll/projects/2)
**Périmètre** : 56 issues ouvertes au début, comparaison avec l'état réel du code (233 commits depuis la dernière mise à jour de `docs/issues-status.md` en janvier 2025).

---

## Résultat global

| Avant | Après |
|---|---|
| **56 issues ouvertes** dont la plupart en "Backlog" malgré du code livré | **25 issues ouvertes** reflétant l'état réel |
| Dernière analyse : janvier 2025 | Synchro mai 2026 |

- ✅ **31 issues fermées** (livrées et vérifiées dans le code)
- 🟡 **8 issues commentées** avec ce qui reste à faire (partielles, restent ouvertes)
- ❌ **4 issues laissées telles quelles** (non implémentées, à planifier)
- 📂 **8 EPICs** + **4 issues de gestion projet** restent ouverts par nature

Chaque issue fermée a reçu un commentaire détaillé listant les fichiers / commits prouvant l'implémentation.

---

## ✅ Issues fermées (31)

### Socle technique & déploiement
- **#1** Squelette Windows
- **#12** Squelette macOS
- **#10** Version bureau (Electron desktop)
- **#3** Activation clé licence pro
- **#2** Mise à jour automatique (electron-updater)
- **#25** Fenêtre + statut au démarrage
- **#27** Autosave + restauration après crash
- **#28** Dossier Actograph par défaut pour exports
- **#24** Système de warnings et notifications

### Protocole d'observation
- **#5** Création de protocole
- **#14** Mini template par défaut quand protocole vidé
- **#29** Architecture du modèle de données protocole
- **#30** Format de stockage `.jchronic`

### Module d'observation
- **#6** Création de relevés in situ
- **#8** Création d'une nouvelle chronique
- **#16** Liste des relevés
- **#17** Export des chroniques
- **#20** Relevés à partir d'une vidéo
- **#21** Modification des relevés
- **#37** Spike intégration vidéo (couvert par #20)

### Visualisation graphique
- **#7** Consulter le graphique (couvert par #15)
- **#15** Visualiser/paramétrer/interagir
- **#18** Export du graphe (PNG/JPEG)
- **#31** Zoom et pan sur le graphe
- **#47** Personnalisation des symboles (couleurs, traits, motifs, héritage)

### Statistiques
- **#22** Tableau Général
- **#23** Stats par catégorie (camemberts, histogrammes, mode avancé ET/OU)

### Cloud & sync
- **#36** Architecture cloud
- **#48** Cloud pour transfert des chroniques

### Sub-issues page d'accueil (#4)
- **#55** Bloc « Vos chroniques »
- **#56** Bloc « Chronique active »

---

## 🟡 Issues partielles (8) — restent ouvertes avec commentaire

| # | Sujet | Reste à faire |
|---|---|---|
| **#11** | App mobile/tablette | Recette UX, build/publication iOS, tests tablettes |
| **#13** | Non-blocage installation/update | Indicateurs visuels longs jobs, gestion explicite |
| **#26** | Fichier de traçage SAV | UI pour exporter/envoyer les logs (logs déjà persistés) |
| **#32** | Statistiques croisées | Vraie matrice catégorie × catégorie + visualisations dédiées |
| **#34** | Desktop/tablette/mobile | Recette tablette + iOS |
| **#35** | Aide intégrée | Didacticiel embarqué + FAQ offline |
| **#39** | Version web | Déploiement production + auth multi-user |
| **#57** | Bloc Centre d'aide (sub #4) | Didacticiel intégré, doc/FAQ embarquée |

---

## ❌ Issues non implémentées (4) — à planifier

| # | Sujet | Note |
|---|---|---|
| **#19** | RAZ du graph (retour paramètres auto) | Aucune fonction de reset trouvée — quick win |
| **#33** | Annotations audio synchronisées | Rien dans le code — chantier à part entière |
| **#53** | Header (sub #4) | Pas de composant Header dédié |
| **#54** | Footer (sub #4) | Mentions légales, contact, lien actograph.io |

---

## 📂 EPICs et gestion projet (12) — laissés ouverts

**EPICs** (#38, #40, #41, #42, #43, #44, #45, #46) : à fermer manuellement quand toutes leurs sub-issues seront fermées.

**Gestion projet** (#49 Réunions, #50 Initialisation, #51 Doc, #52 Pilotage) : récurrents par nature.

**#4 Page d'accueil** : reste ouvert tant que #53 / #54 / #57 ne sont pas livrés.

---

## Gros chantiers restants identifiés

1. **Recette MVP** : valider en recette les ~15 features « fermées techniquement »
2. **Mobile** (#11, #34) : finition UX, iOS, tablettes
3. **Aide intégrée** (#35, #57) : didacticiel embarqué + FAQ offline
4. **Header/Footer accueil** (#53, #54) : layout + mentions légales
5. **Quick wins** : #19 (RAZ graph), #26 (UI export logs)
6. **Chantiers de fond** : #33 (audio), #32 (vraies stats croisées), #39 (déploiement web)

---

## Méthodologie

- Récupération des issues via le **MCP GitHub** branché sur `Syllll/actograph-v3`
- Analyse croisée avec :
  - `docs/issues-status.md` (analyse interne de janvier 2025)
  - Code des dossiers `front/`, `api/`, `mobile/`, `packages/`
  - 233 commits depuis janvier 2025
  - Plans dans `docs/plans/` et features dans `docs/features/`
- Mise à jour de masse via API GitHub (PAT fine-grained avec permissions Issues)
- Chaque fermeture est accompagnée d'un commentaire listant les fichiers / commits qui prouvent l'implémentation

---

*Document généré le 28 mai 2026. Pour régénérer, voir `docs/issues-status.md` (à mettre à jour) et le script `/tmp/update_issues.py`.*
