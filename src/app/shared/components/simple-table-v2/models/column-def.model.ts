/**
 * Enriched column definition for SimpleTableV2Component
 * Combines SimpleTable features + KISS plan patterns
 */
export interface TableColumnDef<T = any> {
  /** Unique column identifier (used for tracking, storage keys) */
  id: string;

  /** Display header text (raw text or i18n key) */
  header: string;

  /** Translation key for header (i18n) - takes precedence over header if provided */
  i18n?: string;

  /** Column type determines rendering strategy */
  type?: 'text' | 'date' | 'number' | 'badge' | 'link' | 'button' | 'editable' | 'selector' | 'custom' | 'icon';

  /** Accessor function to extract value from row (for display/sort/filter) */
  accessor?: (row: T) => any;

  /** Formatter function to transform value for display */
  formatter?: (value: any, row: T) => string;

  /** Enable sorting on this column */
  sortable?: boolean;

  /** Custom sort accessor (if different from accessor) */
  sortAccessor?: (row: T) => string | number | Date;

  /** Enable filtering on this column */
  filterable?: boolean;

  /** Filter configuration */
  filter?: {
    kind: 'text' | 'select' | 'dateRange' | 'numberRange';
    options?: { value: any; label: string }[];
  };

  /** Editable configuration */
  editable?: {
    kind: 'text' | 'select' | 'number' | 'date';
    validator?: (value: any) => boolean;
    commitOnBlur?: boolean;
  };

  /** Action buttons/links configuration */
  actions?: {
    kind: 'button' | 'link';
    label?: string;
    icon?: string;
    handlerId: string;
  }[];

  /** Width configuration */
  width?: {
    min: number;
    max: number;
    initial: number;
  };

  /** Enable column resizing (default: true) */
  resizable?: boolean;

  /** Auto-sizing strategy */
  autoSize?: 'content' | 'type' | 'fixed';

  /** Sticky column position */
  sticky?: 'start' | 'end' | boolean;

  /** Hidden by default */
  hidden?: boolean;

  /** Show tooltip on overflow */
  tooltip?: boolean;

  /** Max number of lines to display in cell (line-clamp). When null/undefined, clamp is disabled. */
  clamp?: number | null;

  /** Column group identifier */
  group?: string;

  /** Custom cell component (for type: 'custom') */
  cellComponent?: any;
}

/**
 * Table state (persistable to localStorage)
 */
export interface TableState {
  /** Column order (array of column IDs) */
  columnOrder: string[];

  /** Column widths (columnId → width in pixels) */
  columnWidths: Record<string, number>;

  /** Current sort state */
  sort: {
    active: string;
    direction: 'asc' | 'desc' | '';
  };

  /** Active filters (columnId → filter value) */
  filters: Record<string, any>;

  /** Display density */
  density?: 'compact' | 'normal' | 'comfortable';

  /** Hidden columns (columnId → hidden) */
  hiddenColumns?: Record<string, boolean>;
}

/**
 * Filter state per column (for ArrayTableStrategy pipeline).
 * Used as Record<colId, ColumnFilterState> in signals.
 */
export interface ColumnFilterState {
  value: any;
  kind?: 'text' | 'select' | 'dateRange' | 'numberRange';
}

/**
 * Partial state update (patch)
 */
export interface TableStatePatch {
  columnOrder?: string[];
  columnWidths?: Partial<Record<string, number>>;
  sort?: Partial<TableState['sort']>;
  filters?: Partial<Record<string, any>>;
  density?: TableState['density'];
  hiddenColumns?: Partial<Record<string, boolean>>;
}

/**
 * Table features flags
 */
export interface TableFeatures {
  resize?: boolean;
  filter?: boolean;
  sort?: boolean;
  reorder?: boolean;
  edit?: boolean;
  selection?: boolean;
  pagination?: boolean;
  /** Use CDK virtual scroll with grid layout (Option A). When true, header and body are divs in a grid. */
  virtualScroll?: boolean;
}

/**
 * Column resize mode options
 * - 'fit': Total table width remains constant, resizing affects adjacent column (PrimeNG default)
 * - 'expand': Table width changes, horizontal scroll appears when needed
 */
export type ColumnResizeMode = 'fit' | 'expand';

/**
 * Configuration de la hauteur dynamique de la table.
 *
 * La hauteur est calculée via : computedHeight = min(parentHeight, maxHeight).
 * La table ne déborde jamais de son parent.
 *
 * `minHeight` est une **recommandation** (warning debug si le parent fournit moins),
 * pas une contrainte absolue.
 */
export interface TableHeightConfig {
  /**
   * Hauteur maximale en px (défaut : 2000).
   * Empêche la table de devenir excessivement haute.
   */
  maxHeight?: number;
  /**
   * Hauteur minimale recommandée en px (défaut : 600).
   * Valeur indicative : si le parent fournit moins, la table
   * s'adapte à la hauteur du parent sans déborder.
   * Un warning est émis en mode debug si parentHeight < minHeight.
   */
  minHeight?: number;
}

/** Valeurs par défaut pour la configuration de hauteur */
export const DEFAULT_TABLE_HEIGHT: Required<TableHeightConfig> = {
  minHeight: 600,
  maxHeight: 2000,
};

/**
 * Table configuration
 */
export interface TableConfig<T = any> {
  /** Table identifier (for localStorage preferences) */
  id: string;

  /** Column definitions */
  columns: TableColumnDef<T>[];

  /** Feature flags */
  features?: TableFeatures;

  /** Initial state */
  initialState?: Partial<TableState>;

  /** Page size options for paginator */
  pageSizeOptions?: number[];

  /** Default page size */
  defaultPageSize?: number;

  /** Sticky header */
  stickyHeader?: boolean;

  /** Responsive mode */
  responsive?: boolean;

  /**
   * Column resize mode (PrimeNG-style)
   * - 'fit': Resizing affects adjacent column, total width stays constant (default)
   * - 'expand': Table width changes, allows horizontal scroll
   */
  columnResizeMode?: ColumnResizeMode;

  /** Enable/disable column resizing globally (default: true) */
  resizableColumns?: boolean;

  /** Configuration de la hauteur dynamique */
  height?: TableHeightConfig;

  /**
   * Adapter: map legacy global filter string to per-column filter state (for Array strategy).
   * Enables screen-by-screen migration without breaking existing filterPredicate usage.
   */
  globalFilterAdapter?: (global: string) => Record<string, ColumnFilterState>;

  /**
   * Apply per-column filters (AND between columns) for Array strategy.
   * If not provided, default text match is used.
   */
  filterApply?: (rows: any[], filtersState: Record<string, ColumnFilterState>) => any[];

  /** Optional: row id accessor for trackBy / selection (e.g. for virtual scroll) */
  rowIdAccessor?: (row: any) => string | number;
}

/**
 * Default column width by type (in pixels)
 */
export const DEFAULT_COLUMN_WIDTHS: Record<string, { min: number; max: number; initial: number }> = {
  text: { min: 120, max: 420, initial: 200 },
  date: { min: 120, max: 120, initial: 120 },
  number: { min: 90, max: 160, initial: 110 },
  badge: { min: 100, max: 200, initial: 120 },
  link: { min: 100, max: 420, initial: 150 },
  button: { min: 60, max: 120, initial: 80 },
  icon: { min: 48, max: 80, initial: 48 },
  selector: { min: 48, max: 48, initial: 48 },
  editable: { min: 120, max: 200, initial: 200 },
  custom: { min: 100, max: 400, initial: 150 },
};
