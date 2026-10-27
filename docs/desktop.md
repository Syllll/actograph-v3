# Parcours dans l'application bureau

Guide du parcours bureau, revu le 26 octobre 2026. Pour installer l'application, utiliser la [page de téléchargement](https://actograph.io/fr/download). Pour développer, consulter le [README](../README.md).

## Accès et accueil

Au lancement, Electron attend l'API locale et connecte automatiquement le compte de la machine. Le premier accès propose le mode étudiant gratuit ou l'activation pro avec une clé. Le compte cloud actograph.io est une connexion séparée, accessible depuis le tiroir ; il n'est pas nécessaire pour créer et analyser des chroniques locales.

**Mes chroniques** regroupe les chroniques locales, les actions de création/import et la chronique ouverte. Le tiroir peut se réduire en rail d'icônes avec infobulles. La navigation de la chronique ouverte propose **Protocole**, **Observation**, **Graphe** et **Statistiques**. Graphe et Statistiques sont désactivés tant qu'aucun relevé n'est présent.

Le menu trois points de chaque ligne, dans la liste récente comme dans la liste complète, permet de supprimer une chronique après confirmation de son nom. Les fichiers exportés et les copies cloud sont conservés. Une session en cours ou en pause doit être terminée avant la suppression. Pour la chronique ouverte, les écritures en cours sont attendues avant sa fermeture.

## Créer ou ouvrir une chronique

La création propose quatre entrées :

- **Calendrier** : événements horodatés en date et heure réelles.
- **Chronomètre** : événements exprimés en durées relatives.
- **Vidéo** : chronomètre lié au temps d'une vidéo locale sélectionnée.
- **Saisie manuelle** : saisie depuis des notes d'observation, avec dates/heures
  réelles ou durées relatives. Choisir un protocole nouveau ou à copier. Un
  protocole nouveau mène à son éditeur ; après copie, la page Observation
  s'ouvre directement. Aucun enregistrement ne démarre.

Saisir le nom et, si utile, une description. Le protocole peut être vide ou copié depuis une chronique existante ; les sélecteurs de copie affichent les sources contenant au moins une catégorie. Une chronique ouverte mène à la page Observation. Sans protocole utilisable, cette page propose de créer ou importer un protocole avant d'enregistrer.

Le changement Calendrier/Chronomètre demande confirmation. Il est disponible avant le démarrage, sans relevés et sans vidéo attachée. Dès qu'il existe des relevés ou une vidéo, le changement est refusé. La vidéo reste un mode chronomètre avec `videoPath`, pas une troisième valeur d'`ObservationModeEnum`.

## Préparer le protocole

Créer des catégories puis des observables ponctuels ou continus. L'éditeur propose les champs d'ajout sur place, les modales d'édition et le glisser-déposer pour l'ordre. Le champ d'ajout d'observable s'ouvre à la demande depuis sa catégorie. Les touches saisies dans ces champs ne déclenchent pas les raccourcis d'observation.

Les noms d'observables doivent être uniques dans le protocole : les relevés les référencent par leur nom. Renommer ou modifier la description d'un observable peut mettre à jour les relevés associés lorsque la correspondance est non ambiguë. Voir [protocoles](protocol.md).

## Enregistrer une observation

En dehors du mode manuel, la barre de session regroupe **Démarrer / Pause /
Reprendre**, le mode et l'horloge. **Terminer** apparaît seulement pendant une
session réellement démarrée, y compris pendant sa pause :

1. **Démarrer** commence une nouvelle session ; **Reprendre** reprend une pause de la session courante.
2. **Pause** suspend l'enregistrement sans clôturer la session.
3. **Terminer** demande confirmation, crée le relevé STOP, remet le timer à l'arrêt et lance la correction automatique des relevés.

À l'ouverture, le statut est **Aucune observation en cours**, même si la chronique
contient d'anciens START, STOP ou PAUSE. L'horloge est neutre et Terminer est
absent. Après démarrage, le statut devient **Observation en cours**, puis
**Observation en pause** après Pause. Sans protocole utilisable, Démarrer est
désactivé. En calendrier, les boutons d'observables sont verrouillés pendant
une pause réelle ; en chronomètre, ils restent utilisables au temps figé après
démarrage. Avec une vidéo, les horodatages suivent `t0 + video.currentTime` et
aucun relevé de pause n'est créé automatiquement. La fin de la vidéo met en
pause ; elle n'applique pas le parcours Terminer. Voir [pauses](pauses.md).

En saisie manuelle, la barre affiche une notice dédiée. Les boutons de protocole
créent des relevés au temps de la sélection ou du dernier relevé. Il n'y a ni
REC, ni Pause, ni Terminer, ni création automatique de START/STOP. Ces marqueurs
peuvent être saisis via le type des lignes pour borner une journée observée.

La table permet de chercher par nom, description ou ID, d'éditer sur place, de supprimer et de remplacer les occurrences d'une recherche. Le bouton **+**, dans l'en-tête Libellé, copie la sélection ou le dernier relevé ; dans une table vide, il crée le premier relevé. Un petit **+** sur la séparation sous un relevé apparaît au survol, au focus ou après un contact tactile et copie précisément ce relevé. Les brouillons sont validés avant l'ajout ; le focus passe ensuite à l'horodatage de la nouvelle ligne. Une recherche active est conservée, avec une action pour révéler l'ajout si nécessaire.

Le choix d'un observable utilise un sélecteur commun à la cellule et au formulaire, organisé en colonnes par catégorie. Un repère coloré aide à relire les libellés. Un espace après le dernier relevé permet de le remonter sous l'en-tête sans ajouter de donnée. L'effacement complet demande confirmation. La table trie les relevés par temps ; le panneau ajuste sa largeur au contenu et peut être redimensionné. Un bandeau signale les relevés postérieurs au dernier STOP. Voir [relevés](reading.md).

## Analyser

Le **Graphe** utilise PixiJS pour les événements ponctuels et les segments continus. Il propose zoom, déplacement, réglages de temps et personnalisation des catégories/observables (couleur, épaisseur, motif, mode normal, fond ou frise). Le menu **Axes** règle la taille du texte des deux axes et l'orientation des dates. L'export PNG propose un fond transparent pour le graphe, la légende et leur combinaison. Les contrôles d'export sont dans la barre de la page ; consulter [graphiques](graph.md) pour les formats et les contraintes de rendu.

Les **Statistiques** proposent les vues générales, par catégorie, mensuelles et conditionnelles. L'export des données est en Excel ou CSV selon la vue ; les vues nécessitant plusieurs feuilles imposent Excel. Les graphiques statistiques peuvent être exportés en PNG/JPG. Le calcul partagé vit dans `packages/core/src/statistics/` et l'interface dans `front/src/composables/use-statistics/`.

La page Observation permet de détacher des panneaux dans des fenêtres secondaires. `use-popout` et `use-window-sync` assurent leur coordination avec la fenêtre principale.

## Enregistrer, récupérer et échanger

Les données courantes sont persistées dans SQLite. L'export **`.jchronic`** produit un fichier portable ; **Enregistrer sous** crée une copie sous un nouveau nom. L'import accepte `.jchronic` et le format binaire `.chronic` de la V1. Le fichier exporté conserve le chemin vidéo mais ne transporte pas la vidéo elle-même.

Les exports de chroniques et de graphes retiennent chacun le dernier dossier choisi sur cette machine, y compris après redémarrage. Annuler un dialogue ne change pas ce choix. Si le dossier n'est plus disponible, le dialogue revient au dossier Actograph habituel.

L'autosave vérifie les changements toutes les 10 minutes, conserve au maximum 20 fichiers et nettoie au démarrage ceux de plus de 7 jours. L'accueil permet de retrouver les fichiers de récupération. Voir [chroniques et fichiers](chronic.md).

Le cloud permet d'envoyer et de récupérer des chroniques après connexion avec l'email ou l'identifiant historique. Les actions de transfert sont explicites dans l'interface. Le nuage connecté ouvre une confirmation de déconnexion ; le changement de compte se fait dans la modale cloud. Voir [authentification cloud](authentification.md#cloud-actographio).

## Repères pour maintenir ce guide

Les sources principales sont `use-chronicle-actions`, `use-chronicle-navigation`, `CreateObservationDialog`, `ObservationSessionBar`, `ModeToggle`, les composants `readings-side`, le tiroir et les composables d'autosave/cloud dans `front/src/`. Les captures des revues de septembre sont des preuves historiques, pas une référence visuelle de toutes les évolutions suivantes.
