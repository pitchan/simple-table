# CSS Reference — BEM, SCSS & Accessibilité (GCM GUI)

> 📌 **Source de vérité** pour les règles CSS/SCSS du projet.
> Consulté on-demand par l'agent CSS ou via la skill d'audit.

---

## 1. Naming BEM

### Convention
```
.block {}
.block__element {}
.block--modifier {}
.block__element--modifier {}
```

### Exemples
```scss
// ✅ CORRECT
.user-card {}
.user-card__avatar {}
.user-card__name {}
.user-card--highlighted {}

// ❌ ÉVITER
.userCard {}           // camelCase
.user-card .avatar {}  // cascade implicite
.user-card-avatar {}   // pas de séparateur BEM
```

### Règle Angular
Un composant = un bloc BEM. Le nom du bloc correspond au sélecteur du composant.

---

## 2. Structure des fichiers

```
src/styles/
├── _constants.scss         # Variables (couleurs, tailles, breakpoints, z-index)
├── _mixins.scss            # Mixins réutilisables
├── _markdown.scss          # Styles markdown
├── bootstrap-variables.scss # Override Bootstrap
├── styles.scss             # Point d'entrée global
├── styles-app-loading.scss # Loader initial
└── themes/                 # Thèmes Angular Material
    ├── blubox/
    ├── capgemini/
    ├── citrus/
    ├── nature/
    ├── sith/
    └── stellar/
```

**Règles :**
- Styles globaux uniquement dans `src/styles/`
- Un fichier `.scss` par composant Angular
- Pas de styles transverses non documentés

---

## 3. Tokens du projet

### Variables obligatoires
```scss
// ✅ Utiliser les tokens
@import 'styles/constants';

.my-component {
  color: $text-primary;
  background: $bg-surface;
  padding: $spacing-md;
  z-index: $z-dropdown;
}

// ❌ INTERDIT
.my-component {
  color: #333333;        // Couleur hardcodée
  z-index: 9999;         // Magic number
}
```

### Z-index scale
Utiliser uniquement les tokens définis (plage 100-400).

---

## 4. Angular Component Styles

### Isolation avec :host
```scss
// ✅ Toujours commencer par :host
:host {
  display: block;
  
  &[disabled] {
    opacity: 0.5;
    pointer-events: none;
  }
  
  &.compact {
    padding: 0.5rem;
  }
}
```

### Profondeur maximale : 3 niveaux
```scss
// ✅ CORRECT
.block__element {
  .nested-item { }
}

// ❌ ÉVITER (trop profond)
.block .element .child .grandchild { }
```

### ::ng-deep (LEGACY)
```scss
// ⚠️ Uniquement si ABSOLUMENT nécessaire
:host ::ng-deep { // TODO: Remove ::ng-deep
  .mat-form-field {
    // Justification: [raison technique]
  }
}
```

---

## 5. Accessibilité RGAA / WCAG AA

### 5.1 Focus visible (OBLIGATOIRE)
```scss
// ✅ CORRECT
.interactive-element {
  &:focus-visible {
    outline: 2px solid $focus-color;
    outline-offset: 2px;
  }
}

// ❌ INTERDIT
.interactive-element {
  outline: none; // Jamais sans alternative !
}
```

### 5.2 Contrastes
| Élément | Ratio minimum |
|---------|---------------|
| Texte normal | 4.5:1 |
| Texte large (18px+ ou 14px bold) | 3:1 |
| Composants UI, icônes | 3:1 |

### 5.3 Navigation clavier
- Ne jamais cacher visuellement un élément focusable
- `tabindex` géré côté HTML, pas CSS
- Pas de `pointer-events: none` sur éléments interactifs

### 5.4 Media queries accessibilité
```scss
// Respect des préférences utilisateur
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}

@media (prefers-contrast: more) {
  .subtle-text {
    color: $text-primary; // Plus de contraste
  }
}
```

---

## 6. États visuels obligatoires

Tout élément interactif DOIT définir :
```scss
.interactive-element {
  // État par défaut
  background: $bg-default;
  
  // Survol
  &:hover {
    background: $bg-hover;
  }
  
  // Focus clavier
  &:focus-visible {
    outline: 2px solid $focus-color;
  }
  
  // Actif (clic)
  &:active {
    background: $bg-active;
  }
  
  // Désactivé
  &:disabled,
  &[aria-disabled="true"] {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
```

---

## 7. Mixins réutilisables

```scss
// Dans src/styles/_mixins.scss

@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

@mixin truncate-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@mixin focus-ring {
  &:focus-visible {
    outline: 2px solid $focus-color;
    outline-offset: 2px;
  }
}

// Utilisation
.centered-box {
  @include flex-center;
  @include focus-ring;
}
```

---

## 8. Anti-patterns

| ❌ Anti-pattern | ✅ Solution |
|-----------------|-------------|
| `#id-selector` | `.class-selector` |
| `!important` (hors themes) | Spécificité correcte |
| `::ng-deep` sans TODO | Chercher alternative |
| `outline: none` | `:focus-visible` avec outline |
| Couleurs hardcodées | Tokens `_constants.scss` |
| `z-index: 9999` | Tokens z-index |
| Sélecteurs > 3 niveaux | Restructurer BEM |
| `* { }` global | Cibler spécifiquement |

---

## 9. Exemples Avant / Après

### Exemple 1 : Bouton accessible
```scss
// ❌ AVANT
.btn {
  background: #007bff;
  color: white;
  outline: none;
}

// ✅ APRÈS
.btn {
  background: $btn-primary-bg;
  color: $btn-primary-text;
  
  &:hover {
    background: $btn-primary-hover;
  }
  
  &:focus-visible {
    outline: 2px solid $focus-color;
    outline-offset: 2px;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
```

### Exemple 2 : Card BEM
```scss
// ❌ AVANT
.card .header .title { }
.card .content p { }

// ✅ APRÈS
.card {}
.card__header {}
.card__title {}
.card__content {}
.card--featured {}
```

---

## 10. Validation

```bash
# Linter SCSS
npx stylelint "src/**/*.scss"

# Vérifier ::ng-deep
git diff --cached | grep "::ng-deep"

# Vérifier !important
git diff --cached | grep "!important"
```

---

## 11. Code Review Checklist

- [ ] Aucun nouveau `::ng-deep`
- [ ] Aucun `!important` hors `src/styles/themes/`
- [ ] Tokens utilisés (`_constants.scss`, `_mixins.scss`)
- [ ] Naming BEM cohérent
- [ ] Pas de duplication de styles existants
- [ ] Breakpoints du projet utilisés
- [ ] z-index dans la plage définie (100-400)
- [ ] Pas de couleurs hardcodées
- [ ] Sélecteurs ≤ 3 niveaux
- [ ] `:host` pour l'isolation
- [ ] `:focus-visible` sur éléments interactifs
- [ ] États hover/focus/disabled définis

---

## 12. Ressources

- [Angular Component Styles](https://v16.angular.io/guide/component-styles)
- [SCSS Best Practices](https://sass-lang.com/documentation/style-guide)
- [BEM Methodology](http://getbem.com/)
- [Material Theming Guide](https://material.angular.io/guide/theming)
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [RGAA 4.1](https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/)
