# Review - Partage de la fonction d'auto-correction

## ✅ Points positifs

1. **Architecture propre** : La fonction est maintenant partagée dans `@actograph/core`, ce qui évite la duplication de code
2. **Fonction pure** : La fonction core est pure (pas de side effects), ce qui facilite les tests
3. **Types bien définis** : Les interfaces `IAutoCorrectAction` et `IAutoCorrectResult` sont bien structurées
4. **Conversion des types** : Le mobile convertit correctement entre `IReadingEntity` et `IReading`

## ⚠️ Problèmes identifiés

### 1. Mobile - Mise à jour incomplète des readings

**Problème** : Dans `mobile/src/composables/use-readings-auto-correct.ts`, on ne met à jour que le START reading (lignes 135-156), mais pas les autres readings qui pourraient avoir changé de date (STOP, pauses, etc.).

**Impact** : Les corrections de dates pour STOP et les pauses ne sont pas appliquées en base de données.

**Solution** : Mettre à jour tous les readings qui ont changé de date, pas seulement START.

### 2. Frontend - Suppression des readings

**Problème** : Dans `front/src/composables/use-observation/use-readings.ts`, quand `applyCorrections` est true, on remplace complètement `sharedState.currentReadings` par les `correctedReadings`. Cependant, les readings supprimés (marqués dans `actions` avec `type: 'remove_duplicate'`) ne sont pas explicitement supprimés avant le remplacement.

**Impact** : En fait, c'est OK car on remplace complètement la liste, mais il faudrait peut-être appeler `removeReading` pour chaque reading supprimé pour déclencher la synchronisation correctement.

**Note** : À vérifier si la synchronisation fonctionne correctement avec le remplacement complet.

### 3. Core - Préservation des IDs

**Problème** : Dans `packages/core/src/utils/reading-auto-correct.ts`, quand on applique les corrections (ligne 313-319), on crée de nouveaux readings avec seulement un `tempId`. Les IDs existants sont préservés dans `workingReadings`, mais il faudrait s'assurer que les IDs sont bien copiés dans les nouveaux readings créés.

**Impact** : Les nouveaux readings créés n'ont pas d'ID, ce qui est normal pour les nouveaux readings. Mais il faut s'assurer que les readings existants gardent leurs IDs.

**Note** : En fait, c'est OK car on travaille sur `workingReadings` qui contient les readings originaux avec leurs IDs, et on ne crée de nouveaux readings que pour les pauses manquantes.

### 4. Mobile - Gestion des tempIds

**Problème** : Dans le mobile, ligne 84, on note que "tempIds are not applicable in mobile (all readings are persisted)". Cependant, si on veut être cohérent avec le frontend, on devrait peut-être gérer les tempIds aussi.

**Impact** : Mineur, car en mobile tous les readings sont persistés immédiatement.

## 🔧 Corrections recommandées

### Correction 1 : Mettre à jour tous les readings modifiés dans le mobile

```typescript
// Dans mobile/src/composables/use-readings-auto-correct.ts
// Remplacer la section "4. Update START reading position" par :

// 4. Update all readings that have changed dates (from corrected readings)
const correctedReadings = result.correctedReadings;
if (correctedReadings.length > 0) {
  // Build a map of original readings by id
  const originalReadingsMap = new Map<number, IReadingEntity>();
  readings.forEach(r => {
    if (r.id) {
      originalReadingsMap.set(r.id, r);
    }
  });
  
  // Update all readings that have changed
  for (const correctedReading of correctedReadings) {
    if (!correctedReading.id) continue;
    
    const originalReading = originalReadingsMap.get(correctedReading.id);
    if (!originalReading) continue;
    
    const originalDate = new Date(originalReading.date);
    const correctedDate = correctedReading.dateTime instanceof Date 
      ? correctedReading.dateTime 
      : new Date(correctedReading.dateTime);
    
    if (originalDate.getTime() !== correctedDate.getTime()) {
      await readingRepository.update(correctedReading.id, {
        date: correctedDate.toISOString(),
      });
    }
  }
}
```

### Correction 2 : Vérifier la synchronisation dans le frontend

Vérifier que la synchronisation fonctionne correctement quand on remplace complètement `sharedState.currentReadings`. Si nécessaire, appeler `removeReading` pour chaque reading supprimé avant de remplacer la liste.

## 📝 Tests recommandés

1. **Test unitaire** pour la fonction core `autoCorrectReadings`
2. **Test d'intégration** pour vérifier que les corrections sont bien appliquées en base de données (mobile)
3. **Test d'intégration** pour vérifier que la synchronisation fonctionne correctement (frontend)

## ✅ Conclusion

L'architecture globale est bonne, mais il y a quelques améliorations à apporter, notamment pour mettre à jour tous les readings modifiés dans le mobile.

