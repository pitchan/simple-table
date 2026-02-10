# SimpleTableV2 Component

Refactored table component using Strategy Pattern for flexible data source handling.

## Features

- ✅ **Multiple Data Source Types**
  - Array data (client-side sort/filter/pagination)
  - FilterableDataSource (server-side pagination)
  - Custom DataSource implementations
  
- ✅ **Built-in Features**
  - Sorting (MatSort integration)
  - Pagination (MatPaginator integration)
  - Row selection (SelectionModel)
  - Sticky columns and headers
  - Column width configuration
  - Loading overlay
  - Responsive mode

- ✅ **Column Types**
  - text, date, number, badge
  - link (clickable with events)
  - button (action buttons with icons)
  - selector (checkbox column)

## Architecture

### Strategy Pattern

The component uses different strategies to handle different data source types:

```
SimpleTableV2Component
├── ArrayTableStrategy (for T[])
│   └── Uses MatTableDataSource
├── FilterableDataSourceStrategy (for FilterableDataSource)
│   └── Bridges observables to signals
└── TableStrategyFactory (auto-detection)
```

### Key Benefits

1. **Separation of Concerns**: Data management separated from UI
2. **Extensibility**: Easy to add new data source types
3. **Testability**: Strategies can be tested independently
4. **Backward Compatible**: Works with existing FilterableDataSource implementations

## Usage

### With FilterableDataSource (Server-side pagination)

```typescript
import { SimpleTableV2Component, TableConfig } from './simple-table-v2';

@Component({
  template: `
    <app-simple-table-v2
      [data]="dataSource"
      [config]="tableConfig"
      (hyperlinkClick)="onLinkClick($event)">
    </app-simple-table-v2>
  `,
  imports: [SimpleTableV2Component],
})
export class MyComponent {
  dataSource = new ProductLineDataSource(/*...*/);
  
  tableConfig: TableConfig = {
    id: 'my-table',
    columns: [
      { id: 'name', header: 'Name', type: 'link', sortable: true },
      { id: 'date', header: 'Date', type: 'date', sortable: true },
    ],
    features: { sort: true, pagination: true },
    defaultPageSize: 1000,
  };
}
```

### With Array Data (Client-side)

```typescript
@Component({
  template: `
    <app-simple-table-v2
      [data]="users"
      [config]="tableConfig">
    </app-simple-table-v2>
  `,
  imports: [SimpleTableV2Component],
})
export class MyComponent {
  users = [
    { id: 1, name: 'John', email: 'john@example.com' },
    { id: 2, name: 'Jane', email: 'jane@example.com' },
  ];
  
  tableConfig: TableConfig = {
    id: 'users-table',
    columns: [
      { id: 'name', header: 'Name', sortable: true },
      { id: 'email', header: 'Email', sortable: true },
    ],
  };
}
```

## API Reference

### Inputs

| Input | Type | Description |
|-------|------|-------------|
| `data` | `T[]` \| `DataSource<T>` \| `FilterableDataSource` | Data source |
| `config` | `TableConfig<T>` | Table configuration |
| `selection` | `SelectionModel<T>` | Optional selection model |
| `debug` | `boolean` | Enable debug logging |

### Outputs

| Output | Type | Description |
|--------|------|-------------|
| `rowClick` | `EventEmitter<T>` | Emitted when row is clicked |
| `hyperlinkClick` | `EventEmitter<{row: T, column: string}>` | Emitted when link is clicked |
| `selectionChange` | `EventEmitter<SelectionModel<T>>` | Emitted when selection changes |
| `sortChange` | `EventEmitter<Sort>` | Emitted when sort changes |
| `pageChange` | `EventEmitter<PageEvent>` | Emitted when page changes |

### Row Selection

Le composant supporte la sélection de lignes via le `SelectionModel` du CDK Angular. L'UI s'adapte automatiquement au mode de sélection configuré.

#### Mode Multiple (plusieurs lignes sélectionnables)

```typescript
import { SelectionModel } from '@angular/cdk/collections';

@Component({
  template: `
    <app-simple-table-v2
      [data]="employees"
      [config]="tableConfig"
      [selection]="selection"
      (selectionChange)="onSelectionChange($event)">
    </app-simple-table-v2>
  `
})
export class MyComponent {
  // true = mode multiple
  selection = new SelectionModel<Employee>(true, []);
  
  onSelectionChange(selection: SelectionModel<Employee>) {
    console.log('Lignes sélectionnées:', selection.selected);
  }
}
```

**Comportement en mode multiple** :
- ✅ Checkbox "Select All" visible dans le header
- ✅ Permet de sélectionner/désélectionner toutes les lignes
- ✅ Plusieurs lignes peuvent être sélectionnées simultanément

#### Mode Single (une seule ligne sélectionnable)

```typescript
import { SelectionModel } from '@angular/cdk/collections';

@Component({
  template: `
    <app-simple-table-v2
      [data]="employees"
      [config]="tableConfig"
      [selection]="selection"
      (selectionChange)="onSelectionChange($event)">
    </app-simple-table-v2>
  `
})
export class MyComponent {
  // false = mode single
  selection = new SelectionModel<Employee>(false, []);
  
  onSelectionChange(selection: SelectionModel<Employee>) {
    console.log('Ligne sélectionnée:', selection.selected[0]);
  }
}
```

**Comportement en mode single** :
- 🚫 Checkbox "Select All" masquée dans le header
- ✅ Une seule ligne peut être sélectionnée à la fois
- ✅ Sélectionner une nouvelle ligne désélectionne automatiquement la précédente

> **Note** : Le composant détecte automatiquement le mode via `selection.isMultipleSelection()` et adapte l'UI en conséquence. Aucune configuration supplémentaire n'est nécessaire.

### TableConfig

```typescript
interface TableConfig<T> {
  id: string;                      // Unique identifier
  columns: TableColumnDef<T>[];    // Column definitions
  features?: TableFeatures;        // Feature flags
  initialState?: Partial<TableState>; // Initial state
  pageSizeOptions?: number[];      // Page size options
  defaultPageSize?: number;        // Default page size
  stickyHeader?: boolean;          // Sticky header
  responsive?: boolean;            // Responsive mode
}
```

### TableColumnDef

```typescript
interface TableColumnDef<T> {
  id: string;                      // Unique column identifier
  header: string;                  // Header text
  i18n?: string;                   // Translation key
  type?: 'text' | 'date' | 'number' | 'badge' | 'link' | 'button';
  accessor?: (row: T) => any;      // Value accessor
  formatter?: (value: any, row: T) => string; // Value formatter
  sortable?: boolean;              // Enable sorting
  sortAccessor?: (row: T) => string | number | Date; // Custom sort
  width?: { min: number; max: number; initial: number }; // Width config
  sticky?: boolean | 'start' | 'end'; // Sticky position
  hidden?: boolean;                // Hidden by default
  tooltip?: boolean;               // Show tooltip on overflow
  actions?: ActionDef[];           // Action buttons
}
```

## Migration from SimpleTableComponent

1. Update import:
```typescript
// Before
import { SimpleTableComponent } from './simple-table';

// After
import { SimpleTableV2Component } from './simple-table-v2';
```

2. Update template:
```html
<!-- Before -->
<app-simple-table
  [data]="dataSource"
  [options]="simpleTableOptions"
  ...>
</app-simple-table>

<!-- After -->
<app-simple-table-v2
  [data]="dataSource"
  [config]="tableConfig"
  ...>
</app-simple-table-v2>
```

3. Update config structure:
```typescript
// Before: SimpleTableConfig
{
  name: 'my-table',
  columns: [
    { name: 'fieldName', i18n: 'LABEL', sortable: true }
  ]
}

// After: TableConfig
{
  id: 'my-table',
  columns: [
    { id: 'fieldName', header: 'LABEL', sortable: true }
  ]
}
```

## Examples

See `examples/` folder for complete examples:
- `product-line-search.example.ts` - FilterableDataSource usage
- `users-list.example.ts` - Array data usage

## Testing

```typescript
import { TestBed } from '@angular/core/testing';
import { SimpleTableV2Component } from './simple-table-v2.component';

describe('SimpleTableV2Component', () => {
  it('should create strategy for array data', () => {
    const component = TestBed.createComponent(SimpleTableV2Component).componentInstance;
    component.data = [{ id: 1 }];
    component.config = { id: 'test', columns: [] };
    component.ngOnInit();
    
    expect(component['strategy']).toBeDefined();
  });
});
```

## Column Width Management

**SimpleTableV2** automatically manages column widths based on the column type. You rarely need to specify `width` manually.

### Default Widths by Type

| Type | Min (px) | Max (px) | Initial (px) |
|------|----------|----------|--------------|
| text | 120 | 420 | 200 |
| date | 120 | 180 | 140 |
| number | 90 | 160 | 110 |
| badge | 100 | 200 | 120 |
| link | 100 | 300 | 150 |
| button | 60 | 120 | 80 |
| selector | 48 | 48 | 48 |
| editable | 120 | 420 | 200 |
| custom | 100 | 400 | 150 |

### Usage

**Recommended (automatic):**
```typescript
{
  id: 'name',
  header: 'Name',
  type: 'link',  // Uses link defaults: 100-300px @ 150px
  sortable: true,
}
```

**Override for special cases:**
```typescript
{
  id: 'description',
  header: 'Description',
  type: 'text',
  width: { min: 200, max: 800, initial: 400 },  // Custom width
  tooltip: true,
}
```

### Benefits

- ✅ **Consistency**: All tables use the same width conventions
- ✅ **Less code**: No need to specify widths for every column
- ✅ **Easy maintenance**: Change defaults in one place (`DEFAULT_COLUMN_WIDTHS`)
- ✅ **Responsive**: Widths automatically adapt to column type

### Migration Note

If you have existing tables with hardcoded `width` values, they will continue to work (explicit values override defaults). However, consider removing them to benefit from automatic width management.

## Future Enhancements

- [x] Column resizing with drag handles
- [ ] Column reordering (drag & drop)
- [ ] Column filtering UI
- [ ] Editable cells
- [x] State persistence (localStorage)
- [ ] Export functionality
- [ ] Custom cell templates
- [ ] Virtual scrolling support
