# Configuration des colonnes - Implémentation complète

## ✅ Changements implémentés

### 1. **Adaptateur de types** (`adapters/config-adapter.ts`)
- Conversion bidirectionnelle entre `TableConfig<T>` (simple-table-v2) et format table-config-editor
- Mapping des propriétés : `id` ↔ `name`, `header` ↔ `i18n`, `width.initial` ↔ `minWidth`
- Gestion du sticky : `'start'|'end'|boolean` → `boolean` (end devient false)
- Filtrage automatique des colonnes système (`select`, `configButton`)
- Force un groupe unique `'default'` pour simplicité

### 2. **Interface utilisateur** (HTML)
- Ajout colonne `configButton` en dernière position du header
- Bouton `<mat-icon>more_vert</mat-icon>` avec tooltip "Configure columns"
- `MatMenu` avec `xPosition="before"` pour ouverture à gauche
- Intégration `<app-table-config-editor>` dans le menu
- Gestion du `stopPropagation` pour empêcher fermeture du menu

### 3. **Styles CSS** (SCSS)
- `.config-column` : Largeur fixe 56px, alignement centré
- `.config-button` : Bouton 40x40px avec icône 20px
- Sticky end appliqué à la colonne config
- Menu config : largeur max 400px, hauteur max 600px avec scroll
- Override styles Material pour meilleur UX du menu

### 4. **Logique TypeScript**
**Imports ajoutés :**
- `ConfigAdapter` depuis `./adapters`
- `TableConfigEditorComponent`
- Types depuis `table-expandable-rows` et `table-tree-view`
- Constante `LOCAL_STORAGE_TREE_TABLE_PERFERENCES`

**Propriétés ajoutées :**
- `@Input() showConfigEditor = true` : Toggle affichage config
- `adaptedOptions: ExpandableTableConfig` : Config adaptée pour editor
- `adaptedTableConfig: TableColumnDefaultConfig` : Metadata pour editor

**Méthodes ajoutées :**
- `initializeConfigAdapter()` : Initialise l'adaptateur au démarrage
- `handleConfigChange(config)` : Gère changements depuis editor
  - Reconversion via adaptateur
  - Mise à jour `config.columns` (ordre, visibilité, sticky)
  - Rebuild `displayedColumns` et `visibleColumns`
  - Mise à jour `columnWidths` Map
  - Sauvegarde localStorage
  - Refresh view
- `handleAutoResize(resize)` : Reset largeurs colonnes
  - Reset `columnWidths` aux valeurs par défaut
  - Mise à jour CSS custom properties
  - Sauvegarde localStorage
- `loadConfigFromLocalStorage()` : Charge config au démarrage
  - Parse JSON depuis `localStorage.getItem()`
  - Merge avec config par défaut (préserve définitions)
  - Réordonne colonnes selon ordre sauvegardé
  - Gestion erreurs avec fallback
- `saveConfigToLocalStorage(config)` : Persiste config
  - Sérialise en JSON
  - Clé : `TreeTablePreference-${config.id}`

**Cycle de vie modifié :**
```typescript
ngOnInit(): void {
  this.validateInputs();
  this.loadConfigFromLocalStorage();    // ← NOUVEAU
  this.initializeColumns();
  this.initializeStrategy();
  this.initializeConfigAdapter();       // ← NOUVEAU
}
```

**displayedColumns build :**
```typescript
displayedColumns = [
  'select',           // Si selection activée
  ...visibleColumns,  // Colonnes visibles
  'configButton'      // Si showConfigEditor = true
]
```

### 5. **Traductions i18n**
Ajout clé `"CONFIGURE_COLUMNS": "Configure columns"` dans :
- `src/assets/i18n/en-us.json`
- `src/assets/i18n/en-gb.json`

## 🎯 Fonctionnalités activées

✅ **Réorganisation des colonnes** : Drag & drop dans le menu  
✅ **Visibilité des colonnes** : Toggle avec icône eye/eye_off  
✅ **Colonnes sticky** : Toggle avec icône lock/lock_open  
✅ **Persistance localStorage** : Config sauvegardée automatiquement  
✅ **Auto-resize colonnes** : Bouton "horizontal_distribute" reset largeurs  
✅ **Chargement config au démarrage** : Restaure préférences utilisateur  

## 🔧 Limitations connues

❌ **Sticky 'end' non supporté dans UI** : Converti en `false` dans l'adaptateur  
❌ **Multi-groupes désactivé** : Forcé à 1 groupe 'default' (Generic Dictionary nécessitera un wrapper)  
❌ **Responsive toggle masqué** : `hasResponsiveOption="false"` car géré différemment  

## 📝 Usage

```typescript
// Configuration basique
<app-simple-table-v2
  [data]="myData"
  [config]="tableConfig"
  [showConfigEditor]="true">  <!-- Active le bouton config -->
</app-simple-table-v2>

// Désactiver la configuration
<app-simple-table-v2
  [data]="myData"
  [config]="tableConfig"
  [showConfigEditor]="false"> <!-- Masque le bouton config -->
</app-simple-table-v2>
```

## 🧪 Tests à effectuer

1. **Réorganisation** : Drag & drop colonnes, vérifier ordre persisté
2. **Visibilité** : Toggle eye, vérifier colonne cachée/affichée
3. **Sticky** : Toggle lock, vérifier colonnes fixées à gauche
4. **Persistance** : Refresh page, vérifier config restaurée
5. **Auto-resize** : Cliquer bouton, vérifier largeurs réinitialisées
6. **Multi-configs** : Tester 2 tables différentes avec IDs différents
7. **Selection + Config** : Vérifier checkbox + config button coexistent
8. **Errors handling** : Tester avec localStorage corrompu

## 🔄 Prochaines étapes (optionnel)

- [ ] Créer `multi-structure-table` wrapper pour Generic Dictionary
- [ ] Ajouter support sticky 'end' dans table-config-editor
- [ ] Tests unitaires pour ConfigAdapter
- [ ] Tests E2E pour persistence localStorage
- [ ] Documentation utilisateur avec screenshots

## 📊 Impact code

- **Fichiers créés** : 2 (`config-adapter.ts`, `adapters/index.ts`)
- **Fichiers modifiés** : 5 (component.ts, component.html, component.scss, 2x i18n)
- **Lignes ajoutées** : ~350 (dont ~140 adaptateur, ~210 component)
- **Dépendances** : Aucune nouvelle (réutilise table-config-editor existant)
- **Breaking changes** : Aucun (opt-in via `showConfigEditor`)
