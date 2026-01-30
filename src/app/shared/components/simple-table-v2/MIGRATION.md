# Migration Guide: SimpleTable → SimpleTableV2

Guide de migration du composant SimpleTable vers SimpleTableV2 avec architecture Strategy Pattern.

## Vue d'ensemble des changements

### Améliorations architecturales

✅ **Strategy Pattern**: Séparation data management / UI  
✅ **Signals internes**: Réactivité avec signals Angular 16  
✅ **FilterableDataSource compatible**: Fonctionne avec les 20+ DataSources existantes  
✅ **API backward compatible**: Inputs/Outputs similaires  

### Différences principales

| Aspect | SimpleTable (old) | SimpleTableV2 (new) |
|--------|------------------|---------------------|
| Architecture | Monolithique (529 lignes) | Strategy Pattern (~180 lignes composant) |
| Data handling | if/else branches | Strategies interchangeables |
| Réactivité | Subscriptions manuelles | Signals + computed |
| Configuration | `options: SimpleTableConfig` | `config: TableConfig` |
| Column def | `SimpleTableColumn` | `TableColumnDef<T>` (enrichi) |

## Migration Step-by-Step

### Step 1: Imports

```typescript
// ❌ Avant
import { SimpleTableComponent } from 'src/app/shared/components/simple-table/simple-table.component';
import { SimpleTableColumn, SimpleTableConfig } from 'src/app/shared/components/simple-table/simple-table-column.interface';

// ✅ Après
import { SimpleTableV2Component } from 'src/app/shared/components/simple-table-v2/simple-table-v2.component';
import { TableColumnDef, TableConfig } from 'src/app/shared/components/simple-table-v2/models/column-def.model';
```

### Step 2: Template

```html
<!-- ❌ Avant -->
<app-simple-table
  [data]="dataSource"
  [options]="simpleTableOptions"
  [selection]="checklistSelection"
  [showConfig]="true"
  [tableColumnDefaultConfig]="simpleTableColumnDefaultConfig"
  [pageSizeOptions]="[100, 200, 500, 1000, 2000, 5000]"
  [pageSize]="1000"
  (hyperlinkClick)="onHyperlinkClick($event)">
</app-simple-table>

<!-- ✅ Après -->
<app-simple-table-v2
  [data]="dataSource"
  [config]="tableConfig"
  [selection]="checklistSelection"
  [debug]="false"
  (hyperlinkClick)="onHyperlinkClick($event)">
</app-simple-table-v2>
```

### Step 3: Configuration

#### Cas 1: Avec FilterableDataSource (product-line/search)

```typescript
// ❌ Avant
export class SearchProductLineComponent {
  dataSource: ProductLineDataSource;
  
  simpleTableOptions: SimpleTableConfig = {
    name: 'product-line-search',
    columns: [
      { name: 'name', i18n: 'PAGES.PRODUCT_LINE.SEARCH.LABELS.LABEL_NAME', type: 'link', sortable: true },
      { name: 'description', i18n: 'PAGES.PRODUCT_LINE.SEARCH.LABELS.LABEL_DESCRIPTION', sortable: true },
      { name: 'language', i18n: 'PAGES.PRODUCT_LINE.SEARCH.LABELS.LABEL_LANGUAGE', sortable: true },
      { name: 'type', i18n: 'PAGES.PRODUCT_LINE.SEARCH.LABELS.LABEL_TYPE', sortable: true },
    ],
    responsive: true,
    stickyHeader: true,
    paginator: true,
  };
  
  pageSizeOptions = [100, 200, 500, 1000, 2000, 5000];
  pageSize = 1000;
}

// ✅ Après
export class SearchProductLineComponent {
  dataSource: ProductLineDataSource;
  
  tableConfig: TableConfig<ProductLineSearchObject> = {
    id: 'product-line-search',
    columns: [
      { 
        id: 'name', 
        header: 'PAGES.PRODUCT_LINE.SEARCH.LABELS.LABEL_NAME', 
        type: 'link', 
        sortable: true,
        sticky: 'start',
        width: { min: 150, max: 400, initial: 250 }
      },
      { 
        id: 'description', 
        header: 'PAGES.PRODUCT_LINE.SEARCH.LABELS.LABEL_DESCRIPTION', 
        sortable: true,
        tooltip: true,
        width: { min: 200, max: 500, initial: 300 }
      },
      { 
        id: 'language', 
        header: 'PAGES.PRODUCT_LINE.SEARCH.LABELS.LABEL_LANGUAGE', 
        sortable: true,
        width: { min: 120, max: 200, initial: 150 }
      },
      { 
        id: 'type', 
        header: 'PAGES.PRODUCT_LINE.SEARCH.LABELS.LABEL_TYPE', 
        sortable: true,
        width: { min: 150, max: 300, initial: 200 }
      },
    ],
    features: {
      sort: true,
      pagination: true,
      selection: true,
    },
    defaultPageSize: 1000,
    pageSizeOptions: [100, 200, 500, 1000, 2000, 5000],
    stickyHeader: true,
    responsive: true,
  };
}
```

#### Cas 2: Avec Array (client-side)

```typescript
// ❌ Avant
export class MyComponent {
  data: MyData[] = [...];
  
  simpleTableOptions: SimpleTableConfig = {
    name: 'my-table',
    columns: [
      { name: 'field1', i18n: 'LABEL_1' },
      { name: 'field2', i18n: 'LABEL_2' },
    ],
  };
}

// ✅ Après
export class MyComponent {
  data: MyData[] = [...];
  
  tableConfig: TableConfig<MyData> = {
    id: 'my-table',
    columns: [
      { id: 'field1', header: 'LABEL_1' },
      { id: 'field2', header: 'LABEL_2' },
    ],
    features: {
      sort: true,
      pagination: true,
    },
  };
}
```

### Step 4: Enrichir les colonnes (optionnel)

Profitez des nouvelles fonctionnalités de `TableColumnDef`:

```typescript
{
  id: 'description',
  header: 'Description',
  type: 'text',
  sortable: true,
  
  // 🆕 Nouveau: accessor custom
  accessor: (row) => row.description,
  
  // 🆕 Nouveau: formatter custom
  formatter: (value, row) => value ? value.substring(0, 100) + '...' : '',
  
  // 🆕 Nouveau: sortAccessor custom
  sortAccessor: (row) => row.description?.toLowerCase() ?? '',
  
  // 🆕 Nouveau: width configuration
  width: { min: 200, max: 500, initial: 300 },
  
  // 🆕 Nouveau: tooltip
  tooltip: true,
}
```

### Step 5: Events (inchangés)

Les events sont backward compatible:

```typescript
// ❌ / ✅ Identique
onHyperlinkClick(event: { row: ProductLineSearchObject; column: string }): void {
  if (event.column === 'name') {
    this.router.navigate(['/product-line', event.row.id]);
  }
}
```

## Cas d'usage spécifiques

### Migration avec FilterableDataSource

**Aucun changement côté DataSource requis !**

Le `FilterableDataSourceStrategy` gère automatiquement:
- ✅ Pagination serveur (via `loadPage()`)
- ✅ Tri serveur (via `sort.sortChange`)
- ✅ Bridge `dataToRender$` → `dataOfRange$` (comme `tvsItemSize`)
- ✅ Observables `loading$`, `length$`, etc.

```typescript
// ✅ Aucun changement nécessaire
this.dataSource = new ProductLineDataSource(
  this.searchService,
  this.snackBar,
  this.translateService
);

// Le FilterableDataSourceStrategy détecte automatiquement le type
```

### Migration avec Array simple

Le `ArrayTableStrategy` gère automatiquement:
- ✅ Tri client-side (MatTableDataSource)
- ✅ Pagination client-side (MatPaginator)
- ✅ Accessor intelligent (dates, arrays, objects avec .code)

```typescript
// ✅ Fonctionne immédiatement
this.data = [
  { id: 1, name: 'Item 1', date: new Date() },
  { id: 2, name: 'Item 2', date: new Date() },
];
```

## Breaking Changes

### ⚠️ Changements de nomenclature

| Old | New | Notes |
|-----|-----|-------|
| `options` | `config` | Input renommé |
| `options.name` | `config.id` | Propriété renommée |
| `SimpleTableColumn.name` | `TableColumnDef.id` | Propriété renommée |
| `SimpleTableColumn.i18n` | `TableColumnDef.header` ou `.i18n` | i18n optionnel maintenant |
| `showConfig` | - | Retiré temporairement (à réimplémenter) |
| `tableColumnDefaultConfig` | `config.initialState` | Structure changée |

### ⚠️ Fonctionnalités non encore portées

Ces fonctionnalités de SimpleTable ne sont pas encore dans V2:

- ❌ TableConfigEditor (column show/hide, reorder UI)
- ❌ Column resizing (drag handles)
- ❌ LocalStorage persistence
- ❌ Custom cell templates via ng-template

**Roadmap**: Ces features seront ajoutées dans les prochaines itérations.

## Checklist de migration

- [ ] Importer SimpleTableV2Component
- [ ] Mettre à jour le template (`app-simple-table` → `app-simple-table-v2`)
- [ ] Renommer `options` → `config`
- [ ] Renommer `name` → `id` dans les colonnes
- [ ] Adapter `SimpleTableConfig` → `TableConfig`
- [ ] (Optionnel) Enrichir colonnes avec accessor/formatter/width
- [ ] Tester avec FilterableDataSource ou array
- [ ] Vérifier les events (hyperlinkClick, etc.)
- [ ] Valider le tri et la pagination

## Exemple complet: product-line/search

Voir [examples/product-line-search.example.ts](./examples/product-line-search.example.ts) pour un exemple complet de migration.

## Support

Pour questions ou problèmes:
1. Vérifier [README.md](./README.md) pour documentation API
2. Consulter les examples dans `examples/`
3. Activer `[debug]="true"` pour logs détaillés
4. Vérifier la console pour messages du factory

## Performance

SimpleTableV2 améliore les performances:

- ✅ **Moins de subscriptions manuelles**: Utilise `takeUntilDestroyed`
- ✅ **OnPush optimisé**: Change detection déclenchée uniquement quand nécessaire
- ✅ **Signals**: Réactivité fine-grained (computed ne recalcule que si dépendances changent)
- ✅ **Pas de re-render inutiles**: Strategy gère les updates de façon optimale

## Rollback

Si problème, rollback simple:

1. Remettre `app-simple-table` dans le template
2. Restaurer imports `SimpleTableComponent`
3. Garder `options` existant

Les deux composants peuvent **coexister** pendant la transition.
