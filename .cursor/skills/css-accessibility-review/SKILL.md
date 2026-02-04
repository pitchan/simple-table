---
name: css-accessibility-review
description: 'On css/scss creation or to automatically review and validate all CSS/SCSS code for accessibility, BEM conventions, and project standards'
---

# Skill — CSS/SCSS creation & Accessibility Review

## ⚠️ OBLIGATOIRE
**Cette skill DOIT être utilisée automatiquement pour toute tâche impliquant du CSS/SCSS :**
- ✅ Création de nouveaux fichiers CSS/SCSS
- ✅ Modification de fichiers CSS/SCSS existants
- ✅ Audit CSS d'un composant ou fichier
- ✅ Revue d'accessibilité RGAA / WCAG AA
- ✅ Refactoring CSS/SCSS
- ✅ Vérification avant merge/PR
- ✅ Analyse de conformité BEM

## Instructions
1. **OBLIGATOIRE** : Adopte le rôle de l'agent CSS (`.github/agents/css.agent.md`)
2. **OBLIGATOIRE** : Consulte la référence détaillée (`.github/docs/css.reference.md`)
3. Analyse le code SCSS fourni ou à créer
4. Execute ce script :
```bash
bash ./scripts/hello.sh
```
5. Produis un rapport structuré et **note explicitement dans le tchat que la skill CSS a été utilisée** :

### Format de sortie attendu
```markdown
## 📋 Rapport CSS & Accessibilité

### ❌ Non-conformités
- [ ] [Sévérité: Critique/Majeure/Mineure] Description du problème
  - Fichier: `path/to/file.scss`
  - Ligne: XX
  - Règle enfreinte: [BEM|A11Y|Performance|Convention]

### ⚠️ Risques identifiés
- Description du risque potentiel

### ✅ Points conformes
- Ce qui est bien fait

### 🔧 Recommandations
1. Action corrective prioritaire
2. Amélioration suggérée

### 📝 Correctif proposé (si applicable)
```scss
// Code corrigé
```

## Contraintes
- Pas de théorie inutile — être concis et actionnable
- Décisions normatives basées sur la référence projet
- Priorité absolue à l'accessibilité
- Proposer des correctifs concrets, pas juste des critiques

## Checklist d'audit
- [ ] Naming BEM respecté
- [ ] Pas de `::ng-deep` non justifié
- [ ] Pas de `!important` hors themes
- [ ] Tokens du projet utilisés (couleurs, z-index, spacing)
- [ ] `:host` utilisé pour l'isolation
- [ ] Profondeur sélecteurs ≤ 3
- [ ] `:focus-visible` sur éléments interactifs
- [ ] États hover/focus/disabled définis
- [ ] Contrastes WCAG AA respectés
- [ ] Navigation clavier non cassée

## Exemple d'invocation
> "Audite le CSS de ce composant pour conformité BEM et accessibilité"
> "Vérifie que ce fichier SCSS respecte nos conventions projet"
> "Review CSS avant PR"
