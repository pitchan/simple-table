import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
  SimpleChanges,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { tap } from 'rxjs';
import { CommonModule, JsonPipe } from '@angular/common';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { SelectionModel } from '@angular/cdk/collections';
import { DataSource } from '@angular/cdk/collections';
import { FilterableDataSource } from 'src/app/core/data-sources/common-data-sources/filterable-data-source';
import { TableStrategyFactory } from './strategies/strategy.factory';
import { ITableStrategy } from './models/table-strategy.interface';
import { TableColumnDef, TableConfig, TableState, DEFAULT_COLUMN_WIDTHS, ColumnResizeMode, SelectionMode } from './models/column-def.model';
import { ResizableColumnDirective, ResizableColumnEvent } from './directives/resizable-column.directive';
import { TableResizeService } from './services/table-resize.service';
import { DomHandler } from './helpers/dom-handler';
import { TableConfigEditorComponentV2 } from './components/table-config-editor-v2/table-config-editor.component';
import { TableColumnFilterV2Component } from './components/table-column-filter-v2/table-column-filter-v2.component';
import { FilterList, FilterEvent } from './models/filter.model';
import { TableFilterService } from './services/table-filter.service';
import { PreventMenuCloseDirective } from './directives/prevent-menu-close.directive';

/**
 * SimpleTableV2Component - Refactored with Strategy Pattern
 * 
 * Supports multiple data source types via strategies:
 * - T[] (array) → ArrayTableStrategy
 * - FilterableDataSource → FilterableDataSourceStrategy (server-side pagination)
 * - DataSource<T> → Future: GenericDataSourceStrategy
 * 
 * Features:
 * - Sorting (MatSort)
 * - Pagination (MatPaginator)
 * - Column resizing
 * - Row selection
 * - Hyperlink columns
 * - Sticky columns/header
 * - Loading overlay
 * 
 * @example
 * ```html
 * <app-simple-table-v2
 *   [data]="productLineDataSource"
 *   [config]="tableConfig"
 *   [selection]="selectionModel"
 *   (rowClick)="onRowClick($event)"
 *   (hyperlinkClick)="onHyperlinkClick($event)">
 * </app-simple-table-v2>
 * ```
 */
@Component({
  selector: 'app-simple-table-v2',
  templateUrl: './simple-table-v2.component.html',
  styleUrls: ['./simple-table-v2.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    MatSortModule,
    MatPaginatorModule,
    MatCheckboxModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    TranslateModule,
    ResizableColumnDirective,
    TableConfigEditorComponentV2,
    TableColumnFilterV2Component,
    ScrollingModule,
    PreventMenuCloseDirective
  ],
  providers: [TableResizeService, TableFilterService],
})
export class SimpleTableV2Component<T> implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elementRef = inject(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly resizeService = inject(TableResizeService);
  private readonly filterService = inject(TableFilterService<T>);

  /** Flag to track if AfterViewInit has been called */
  private viewInitialized = false;

  /** Cache du wrapper pour éviter querySelector() répétés */
  private wrapperEl?: HTMLElement;

  /** Cache de l'élément table */
  private tableEl?: HTMLElement;

  /**
   * True quand la hauteur du parent est inférieure à minHeight.
   * La table enforce quand même minHeight (600px par défaut).
   * Exposé via @HostBinding pour que le parent puisse réagir en CSS :
   *
   * @example
   * ```scss
   * app-simple-table-v2.table--height-constrained {
   *   // adapter le layout si besoin
   * }
   * ```
   */
  @HostBinding('class.table--height-constrained')
  isHeightConstrained = false;

  /** ResizeObserver sur le parent pour recalculer la hauteur dynamiquement */
  private resizeObserver: ResizeObserver | null = null;

  // ========== INPUTS ==========
  /** Data source - can be an array, DataSource, or FilterableDataSource */
  @Input() data!: T[] | DataSource<T> | FilterableDataSource<T, unknown, MatPaginator>;

  /** Table configuration */
  @Input() config!: TableConfig<T>;

  /** Selection model optionnel (si non fourni et selectionMode !== 'none', la table en crée un en interne). */
  @Input() selection?: SelectionModel<T>;

  /** Enable debug logging */
  @Input() debug = false;

  /** Show column configuration editor (menu with column order, visibility, sticky). */
  @Input() showConfigEditor = false;

  /** Item size in px for CDK virtual scroll (fixed height per row, V1). */
  @Input() virtualScrollItemSize = 48;

  // ========== OUTPUTS ==========
  /** Row click event */
  @Output() rowClick = new EventEmitter<T>();

  /** Hyperlink click event */
  @Output() hyperlinkClick = new EventEmitter<{ row: T; column: string }>();

  /** Selection change event */
  @Output() selectionChange = new EventEmitter<SelectionModel<T>>();

  /** Sort change event (for external handling) */
  @Output() sortChange = new EventEmitter<Sort>();

  /** Page change event (for external handling) */
  @Output() pageChange = new EventEmitter<PageEvent>();

  // ========== VIEW CHILDREN ==========
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('resizeHelper') resizeHelper!: ElementRef<HTMLDivElement>;
  @ViewChild('gridTableElement', { read: ElementRef }) gridTableElementRef!: ElementRef<HTMLElement>;

  // ========== SELECTION (signals, config-driven) ==========
  // Les @Input() config et selection ne sont pas des signals : quand le parent les change,
  // il faut mettre à jour ces signals dans ngOnChanges pour que les computed() réagissent.
  // (Avec Angular 17+ et input(), on pourrait dériver tout en computed() sans ngOnChanges.)
  /** Mode de sélection issu de la config (synchronisé dans ngOnChanges). */
  private readonly selectionModeSignal = signal<SelectionMode | undefined>(undefined);
  /** Flag features.selection pour rétrocompat (synchronisé dans ngOnChanges). */
  private readonly selectionFeatureFlagSignal = signal<boolean | undefined>(undefined);
  /** Sélection passée en @Input (synchronisée dans ngOnChanges). */
  private readonly selectionInputSignal = signal<SelectionModel<T> | undefined>(undefined);
  /** Modèle de sélection interne quand selectionMode est single/multiple et aucun @Input selection. */
  private readonly selectionModel = signal<SelectionModel<T> | null>(null);

  /** Modèle effectif : input si fourni, sinon modèle interne si mode !== 'none'. */
  readonly effectiveSelection = computed(() => {
    const mode = this.selectionModeSignal();
    if (mode === 'none') return null;
    const input = this.selectionInputSignal();
    if (input !== undefined && input !== null) return input;
    return this.selectionModel();
  });

  /** Colonne sélection visible : selectionMode !== 'none' ou (rétrocompat) features.selection === true. */
  readonly selectionColumnVisible = computed(() => {
    const mode = this.selectionModeSignal();
    if (mode !== undefined) return mode !== 'none';
    return this.selectionFeatureFlagSignal() === true;
  });

  /** Mode multiple (Select All affiché) déduit de la config ou du modèle. */
  readonly isMultipleSelection = computed(() => {
    if (this.selectionModeSignal() === 'multiple') return true;
    return this.effectiveSelection()?.isMultipleSelection() ?? false;
  });

  // ========== STRATEGY (internal) ==========
  private strategy!: ITableStrategy<T>;

  // ========== PUBLIC STATE (synced from strategy) ==========
  /** Current page data - updated only when strategy emits */
  //tableData: T[] = [];
  /** Total count for paginator - updated only when strategy emits */
  //totalCount = 0;

  /** Loading state (signal synchronized from strategy) */
  readonly loading = computed(() => this.strategy.loading());
  tableData = computed(() => this.strategy.data());
  totalCount = computed(() => this.strategy.totalCount());

  // ========== DISPLAY STATE ==========
  displayedColumns: string[] = [];
  visibleColumns: TableColumnDef<T>[] = [];
  columnWidths = new Map<string, number>();

  // ========== COLUMN RESIZE STATE ==========
  /** Flag to block sort during resize (no setTimeout needed) */
  isResizing = false;

  // ========== CONFIG EDITOR STATE ==========
  editorOptions: any = { columns: { columns: [], groups: [] } };

  // ========== FILTER STATE ==========
  /** Map of filter lists per column (for TableColumnCustomFilterComponent) */
  columnFilterListMap = signal<Map<string, Array<FilterList>>>(new Map());
  /** Active filters per column */
  filteredColumnList: Array<FilterEvent> = [];
  /** Highlighted filter icons per column */
  filteredColumns: Record<string, boolean> = {};
  /** Original unfiltered data (cloned before any filtering) */
  cloneTableData: T[] = [];
  /** Trigger for filter list map changes (incremental signal update) */
  private readonly columnFilterListMapTrigger = signal(0);

  // ========== LIFECYCLE ==========
  ngOnInit(): void {
    if (this.debug) {
      console.group('[SimpleTableV2] Initialization');
      console.log('Config:', this.config);
      console.log('Data Type:', this.data?.constructor?.name);
    }

    this.validateInputs();
    this.syncSelectionState();
    this.ensureSelectionModel();
    const state = this.readTableStateFromStorage();
    if (state) this.applyTableStateToConfig(state);
    this.initializeColumns();
    this.initializeConfigEditor();
    this.initializeStrategy();

    if (this.debug) {
      console.groupEnd();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      this.syncSelectionState();
      this.ensureSelectionModel();
      if (!changes['config'].firstChange) {
        if (this.debug) {
          console.log('[SimpleTableV2] Config changed, reinitializing columns', changes['config'].currentValue);
        }
        const state = this.readTableStateFromStorage();
        if (state) this.applyTableStateToConfig(state);
        this.initializeColumns();
        this.initializeConfigEditor();
        if (this.viewInitialized) {
          this.applyInitialWidths();
        }
        this.cdr.markForCheck();
      }
    }
    if (changes['selection']) {
      this.selectionInputSignal.set(changes['selection'].currentValue ?? undefined);
      this.ensureSelectionModel();
    }

    // Handle data changes AFTER AfterViewInit
    // Before AfterViewInit, data is initialized in ngAfterViewInit()
    if (changes['data'] && this.viewInitialized && this.strategy) {
      const newData = changes['data'].currentValue;
      
      if (this.debug) {
        console.log('[SimpleTableV2] Data changed after init, reinitializing strategy', newData);
      }
      
      // Reinitialize strategy with new data
      this.strategy.initialize(newData);
    }
  }

  ngAfterViewInit(): void {
    // IMPORTANT: Initialize strategy first (required for FilterableDataSource),
    // then attach sort/paginator, then connect to the data stream.
    
    if (this.debug) {
      console.group('[SimpleTableV2] View Init');
      console.log('Sort present:', !!this.sort);
      console.log('Paginator present:', !!this.paginator);
    }

    this.strategy.initialize(this.data);
    this.attachPaginatorAndSort();
    this.connectStrategy();
    

    this.viewInitialized = true;

    // Apply initial column widths on TH elements (DOM is ready now)
    this.applyInitialWidths();

    this.setupContainerResizeObserverForFitLastColumn();

    this.cdr.markForCheck();

    if (this.debug) {
      console.groupEnd();
    }
  }

  /** When container is resized: in fit mode fill last column; in expand mode fill last column if no horizontal scroll. */
  private setupContainerResizeObserverForFitLastColumn(): void {
    const container = this.getWrapper();
    if (!container || this.resizeObserver) return;

    this.resizeObserver = new ResizeObserver(() => {
      if (this.columnResizeMode === 'fit') this.fitLastColumnToRemainingWidth();
      else if (this.columnResizeMode === 'expand') this.expandModeFillLastColumnIfNoScroll();
    });
    this.resizeObserver.observe(container);
  }

  // ========== CONFIG EDITOR ==========
  private initializeConfigEditor(): void {
    if (this.config?.columns) {
      // Map columns to the format expected by TableConfigEditor
      // It expects { columns: { columns: [], groups: [] } }
      // We assume single group for simplicity or check if grouping exists
      const groups = [...new Set(this.config.columns.map(c => c.group).filter(g => !!g))];
      
      this.editorOptions = {
        columns: {
          columns: this.config.columns,
          groups: groups.length > 0 ? groups : ['Default'] // Ensure at least one group so logic works
        }
      };
      
      // If no groups defined in columns, assign them to Default to match the groups array
      if (groups.length === 0) {
        this.config.columns.forEach(c => c.group = 'Default');
      }
    }
  }

  handleConfigChange(_event: any): void {
    const prevVisibleCount = this.displayedColumns.length;
    this.initializeColumns();
    if (this.columnResizeMode === 'fit' && this.displayedColumns.length > prevVisibleCount) {
      this.columnWidths.clear();
      this.applyColumnWidthsFromStateOrDefaults();
    }
    if (this.viewInitialized) this.applyInitialWidths();
    this.writeTableStateToStorage(this.buildTableState());
    this.cdr.markForCheck();
  }

  handleAutoResize(_event: boolean): void {
    const key = this.getTableStateStorageKey();
    if (!key) return;

    // Lire l'état actuel (storage ou build depuis config)
    const currentState = this.readTableStateFromStorage() ?? this.buildTableState();

    // Ne modifier que columnWidths : le vider
    const updatedState: TableState = {
      ...currentState,
      columnWidths: {}
    };

    // Sauvegarder (conserve order, hidden, sticky, etc.)
    this.writeTableStateToStorage(updatedState);

    // En mémoire : reset largeurs et repartir des défauts
    this.columnWidths.clear();
    this.applyColumnWidthsFromStateOrDefaults();

    if (this.viewInitialized) {
      this.applyInitialWidths();
    }
    this.cdr.markForCheck();
  }

  handleColumnResizeModeChange(mode: ColumnResizeMode): void {
    if (!this.config) return;
    const wasExpand = this.config.columnResizeMode === 'expand';
    this.config.columnResizeMode = mode;

    if (wasExpand && mode === 'fit') {
      // Reset column widths so they fit on screen (expand mode can have very wide columns + scroll)
      this.columnWidths.clear();
      this.applyColumnWidthsFromStateOrDefaults();
      if (this.viewInitialized) {
        this.applyInitialWidths(); // Uses rAF for fitLastColumnToRemainingWidth
        // Persist AFTER rAF so last column width is correct (skill: performance)
        requestAnimationFrame(() => {
          this.writeTableStateToStorage(this.buildTableState());
          this.cdr.markForCheck();
        });
        return; // Skip immediate persist below
      }
    } else if (this.viewInitialized) {
      if (this.columnResizeMode === 'fit') this.fitLastColumnToRemainingWidth();
      else if (this.columnResizeMode === 'expand') this.expandModeFillLastColumnIfNoScroll();
    }

    this.writeTableStateToStorage(this.buildTableState());
    this.cdr.markForCheck();
  }

  // ========== TABLE STATE PERSISTENCE (localStorage) ==========
  private getTableStateStorageKey(): string {
    return `tableState_${this.config?.id ?? ''}`;
  }

  private readTableStateFromStorage(): TableState | null {
    const key = this.getTableStateStorageKey();
    if (!key) return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as TableState;
      return parsed?.columnOrder ? parsed : null;
    } catch {
      return null;
    }
  }

  private applyTableStateToConfig(state: TableState): void {
    if (!this.config?.columns?.length) return;
    const order = state.columnOrder;
    if (order?.length) {
      const byId = new Map(this.config.columns.map(c => [c.id, c]));
      const ordered: TableColumnDef<T>[] = [];
      for (const id of order) {
        const col = byId.get(id);
        if (col) ordered.push(col);
      }
      for (const col of this.config.columns) {
        if (!order.includes(col.id)) ordered.push(col);
      }
      this.config.columns.length = 0;
      this.config.columns.push(...ordered);
    }
    this.config.columns.forEach(col => {
      if (state.hiddenColumns && col.id in state.hiddenColumns) col.hidden = state.hiddenColumns[col.id];
      if (state.stickyColumns && col.id in state.stickyColumns) col.sticky = state.stickyColumns[col.id];
    });
    if (state.columnWidths && typeof state.columnWidths === 'object') {
      Object.entries(state.columnWidths).forEach(([id, w]) => {
        if (id !== 'select') this.columnWidths.set(id, w);
      });
    }
    if (state.columnResizeMode === 'fit' || state.columnResizeMode === 'expand') {
      this.config!.columnResizeMode = state.columnResizeMode;
    }
  }

  private buildTableState(): TableState {
    const columns = this.config?.columns ?? [];
    const columnWidths: Record<string, number> = {};
    this.columnWidths.forEach((w, id) => {
        if (id !== 'select') columnWidths[id] = w;
    });
    return {
      columnOrder: columns.map(c => c.id),
      columnWidths,
      sort: { active: '', direction: '' },
      filters: {},
      hiddenColumns: Object.fromEntries(columns.map(c => [c.id, !!c.hidden])),
      stickyColumns: Object.fromEntries(columns.map(c => [c.id, c.sticky]).filter(([, v]) => v !== undefined)),
      columnResizeMode: this.columnResizeMode,
    };
  }

  private writeTableStateToStorage(state: TableState): void {
    const key = this.getTableStateStorageKey();
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore quota / private mode
    }
  }

  // ========== INITIALIZATION ==========
  private validateInputs(): void {
    if (!this.data) {
      console.error('[SimpleTableV2] ❌ CRITICAL: No data provided to [data] input');
    }
    if (!this.config) {
      console.error('[SimpleTableV2] ❌ CRITICAL: No config provided to [config] input');
    } else if (!this.config.columns || this.config.columns.length === 0) {
      console.warn('[SimpleTableV2] ⚠️ WARNING: Config provided but "columns" array is empty. Table will be empty.');
    }
  }

  private initializeColumns(): void {
    if (!this.config?.columns) {
      return;
    }

    // Filter visible columns
    this.visibleColumns = this.config.columns.filter(col => !col.hidden);

    // Build displayed columns array (add selector if selection enabled)
    this.displayedColumns = [];
    if (this.selectionColumnVisible() && this.effectiveSelection() != null) {
      this.displayedColumns.push('select');
    }
    this.displayedColumns.push(...this.visibleColumns.map(col => col.id));

    this.applyColumnWidthsFromStateOrDefaults();

    if (this.debug) {
      console.log('[SimpleTableV2] Columns initialized:', this.displayedColumns);
    }
  }

  /** Set column width only when not already set (state from localStorage has priority). */
  private applyColumnWidthsFromStateOrDefaults(): void {
    this.visibleColumns.forEach(col => {
      const current = this.columnWidths.get(col.id);
      if (current == null) {
        this.columnWidths.set(
          col.id,
          col.width?.initial ?? this.getDefaultWidthForType(col.type ?? 'text')
        );
      }
    });
  }

  private initializeStrategy(): void {
    this.strategy = TableStrategyFactory.create(
      this.data,
      this.destroyRef,
      this.cdr,
      {
        debug: this.debug,
        sortingDataAccessor: this.customSortingAccessor.bind(this),
        globalFilterAdapter: this.config?.globalFilterAdapter,
        filterApply: this.config?.filterApply,
      }
    );

    // NOTE: Do NOT call initialize() here!
    // Data must be initialized AFTER paginator and sort are attached
    // to ensure MatTableDataSource's combineLatest works correctly.
    // See ngAfterViewInit() for the correct initialization sequence.

    if (this.debug) {
      console.log('[SimpleTableV2] Strategy created:', this.strategy.constructor.name);
    }
  }

  private attachPaginatorAndSort(): void {
    // Attach sort and paginator to strategy
    // IMPORTANT: Order matters for FilterableDataSource (sort before paginator)
    if (this.sort && this.strategy.attachSort) {
      this.strategy.attachSort(this.sort);
    }

    if (this.paginator && this.strategy.attachPaginator) {
      this.strategy.attachPaginator(this.paginator);
    }

    if (this.debug) {
      console.log('[SimpleTableV2] Paginator and sort attached');
    }
  }

  private connectStrategy(): void {
    if (this.strategy.connect) {
      this.strategy.connect().pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => {
          // Save original data for filtering when data arrives and no filters are active
          const currentData = this.tableData();
          if (currentData && currentData.length > 0 && this.filteredColumnList.length === 0) {
            this.cloneTableData = [...currentData];
            if (this.debug) {
              console.log('[SimpleTableV2] Saved original data for filtering:', this.cloneTableData.length, 'rows');
            }
          }
        })
      ).subscribe();
    } else {
      // For strategies without connect (like ArrayTableStrategy), save data immediately
      setTimeout(() => {
        const currentData = this.tableData();
        if (currentData && currentData.length > 0 && this.filteredColumnList.length === 0) {
          this.cloneTableData = [...currentData];
          if (this.debug) {
            console.log('[SimpleTableV2] Saved original data for filtering:', this.cloneTableData.length, 'rows');
          }
        }
      });
    }

    if (this.debug) {
      console.log('[SimpleTableV2] Strategy connected');
    }
  }

  

  // ========== EVENT HANDLERS ==========
  onPageChangeEvent(event: PageEvent): void {
    this.strategy.onPageChange(event);
    this.pageChange.emit(event);
  }

  onSortChangeEvent(sort: Sort): void {
    this.strategy.onSortChange(sort);
    this.sortChange.emit(sort);
  }

  onRowClick(row: T): void {
    this.rowClick.emit(row);
  }

  onHyperlinkClick(event: Event, row: T, columnId: string): void {
    event.stopPropagation();
    this.hyperlinkClick.emit({ row, column: columnId });
  }

  // ========== FILTER HANDLERS ==========
  
  /**
   * Handle filter button click - build filterListMap for the column
   */
  onFilterButtonClick(columnId: string): void {
    this.viewFilter(columnId, false);
    this.columnFilterListMapTrigger.update(v => v + 1);
  }

  /**
   * Build filter list for a specific column (unique values from ORIGINAL data)
   * IMPORTANT: Always uses cloneTableData to keep all values visible even when unchecked
   * Adapted from TableTreeView.viewFilter()
   */
  private viewFilter(columnId: string, isReset = false): Array<FilterList> {
    const column = this.getColumn(columnId);
    if (!column) return [];

    // CRITICAL FIX: Always use cloneTableData (original unfiltered data)
    // NOT tableData() which is already filtered - this would hide unchecked items!
    const originalData = this.cloneTableData;
    if (!originalData || originalData.length === 0) {
      console.warn('[SimpleTableV2] No original data for filtering, using current data');
      return [];
    }

    // Find existing filter state to preserve checkbox values
    const existingFilterEvent = this.filteredColumnList.find(f => f.columnName === columnId);

    // Delegate to service (SOLID principle)
    const filterList = this.filterService.buildFilterList(
      columnId,
      column,
      originalData,
      (row, col) => this.getCellValue(row, col),
      (value, col) => this.filterService.formatDisplayValue(value, col),
      existingFilterEvent
    );
    
    // Update the map with new Map instance to trigger change detection
    const newMap = new Map(this.columnFilterListMap());
    newMap.set(columnId, filterList);
    this.columnFilterListMap.set(newMap);

    return filterList;
  }



  /**
   * Handle filter events from TableColumnCustomFilterComponent
   * Adapted from TableTreeView.filterTableByEvents()
   */
  handleFilterEvent(event: FilterEvent, columnId: string): void {
    if (this.debug) {
      console.log('[SimpleTableV2] Filter event:', event, 'for column:', columnId);
    }

    // Handle reset
    if (event.reset) {
      this.handleResetFilter(columnId);
      return;
    }

    // Update filteredColumnList
    const existingIndex = this.filteredColumnList.findIndex(f => f.columnName === columnId);
    if (existingIndex >= 0) {
      this.filteredColumnList[existingIndex] = event;
    } else {
      this.filteredColumnList.push(event);
    }

    // Mark column as filtered
    this.filteredColumns[columnId] = true;

    // Apply all filters
    this.applyAllFilters();
    
    this.cdr.markForCheck();
  }

  /**
   * Reset filter for a specific column
   */
  handleResetFilter(columnId: string): void {
    // Remove from filteredColumnList
    this.filteredColumnList = this.filteredColumnList.filter(
      f => f.columnName !== columnId
    );

    // Remove highlight
    delete this.filteredColumns[columnId];

    // Reapply remaining filters
    if (this.filteredColumnList.length === 0) {
      // No more filters, restore original data
      this.strategy.setFilteredData?.([...this.cloneTableData]);
    } else {
      this.applyAllFilters();
    }

    // Rebuild filterListMap for all columns (cross-column effect)
    this.displayedColumns.forEach(colId => {
      if (colId !== 'select') {
        this.viewFilter(colId, false);
      }
    });

    this.cdr.markForCheck();
  }

  /**
   * Apply all active filters (AND logic between columns)
   * Delegates to TableFilterService (SOLID principle)
   */
  private applyAllFilters(): void {
    const filtered = this.filterService.applyAllFilters(
      this.cloneTableData,
      this.filteredColumnList,
      (columnId) => this.getColumn(columnId),
      (row, col) => this.getCellValue(row, col),
      (value, col) => this.filterService.formatDisplayValue(value, col)
    );

    this.strategy.setFilteredData?.(filtered);
  }



  // ========== SELECTION ==========
  isAllSelected(): boolean {
    const sel = this.effectiveSelection();
    if (!sel) return false;
    const numSelected = sel.selected.length;
    const numRows = this.tableData().length;
    return numSelected === numRows && numRows > 0;
  }

  masterToggle(): void {
    const sel = this.effectiveSelection();
    if (!sel || !this.isMultipleSelection()) return;

    if (this.isAllSelected()) {
      sel.clear();
    } else {
      this.tableData().forEach(row => sel.select(row));
    }
    this.selectionChange.emit(sel);
  }

  toggleSelection(row: T): void {
    const sel = this.effectiveSelection();
    if (!sel) return;
    sel.toggle(row);
    this.selectionChange.emit(sel);
  }

  private syncSelectionState(): void {
    this.selectionModeSignal.set(this.config?.features?.selectionMode);
    this.selectionFeatureFlagSignal.set(this.config?.features?.selection);
    this.selectionInputSignal.set(this.selection ?? undefined);
  }

  private ensureSelectionModel(): void {
    const mode = this.selectionModeSignal();
    const input = this.selectionInputSignal();
    if (mode === 'single' || mode === 'multiple') {
      if (input === undefined || input === null) {
        this.selectionModel.set(new SelectionModel<T>(mode === 'multiple', []));
      } else {
        this.selectionModel.set(null);
      }
    } else {
      this.selectionModel.set(null);
    }
  }

  // ========== HELPERS ==========

  private getDefaultWidthForType(type: string): number {
    const widthConfig = DEFAULT_COLUMN_WIDTHS[type as keyof typeof DEFAULT_COLUMN_WIDTHS];
    return widthConfig ? widthConfig.initial : DEFAULT_COLUMN_WIDTHS['text'].initial;
  }

  private customSortingAccessor(item: T, columnId: string): string | number {
    const column = this.config.columns.find(c => c.id === columnId);
    
    // Use column's sortAccessor if provided
    if (column?.sortAccessor) {
      const value = column.sortAccessor(item);
      // Convert Date to number for sorting
      if (value instanceof Date) {
        return value.getTime();
      }
      return value;
    }

    // Use column's accessor if provided
    if (column?.accessor) {
      const value = column.accessor(item);
      return this.normalizeValueForSort(value, columnId);
    }

    // Fallback to property access
    const value = (item as Record<string, unknown>)[columnId];
    return this.normalizeValueForSort(value, columnId);
  }

  private normalizeValueForSort(value: any, columnId: string): string | number {
    if (value == null) return '';
    
    if (value instanceof Date) return value.getTime();
    
    if (typeof value === 'string' && columnId.toLowerCase().includes('date')) {
      const parsed = Date.parse(value);
      if (!isNaN(parsed)) return parsed;
    }
    
    if (typeof value === 'object' && 'code' in value) {
      return String(value.code).toLowerCase();
    }
    
    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];
      if (typeof first === 'object' && 'code' in first) {
        return String(first.code).toLowerCase();
      }
      return String(first).toLowerCase();
    }
    
    if (typeof value === 'string') return value.trim().toLowerCase();
    
    return value as string | number;
  }

  getColumn(columnId: string): TableColumnDef<T> | undefined {
    return this.config?.columns?.find(c => c.id === columnId);
  }

  getColumnHeader(column: TableColumnDef<T>): string {
    return column.i18n || column.header;
  }

  getCellValue(row: T, column: TableColumnDef<T>): any {
    if (column.accessor) {
      const value = column.accessor(row);
      return column.formatter ? column.formatter(value, row) : value;
    }
    const value = (row as Record<string, unknown>)[column.id];
    return column.formatter ? column.formatter(value, row) : value;
  }

  trackByColumnId(index: number, column: TableColumnDef<T>): string {
    return column.id;
  }

  trackByIndex(index: number): number {
    return index;
  }

  /** Stable trackBy for virtual scroll rows (arrow fn so `this` is bound when used as callback). */
  trackByRow = (index: number, row: T): string | number => {
    const config = this.config;
    if (config?.rowIdAccessor) return config.rowIdAccessor(row);
    const r = row as Record<string, unknown>;
    if (r != null && typeof r['id'] !== 'undefined') return r['id'] as string | number;
    return index;
  };

  /** Grid template columns string (one value per displayed column). Fallback so grid never gets an empty/invalid value. */
  gridTemplateColumns(): string {
    const cols = this.displayedColumns;
    if (!cols?.length) return '1fr';
    return cols.map((colId) => this.getColWidthStyle(colId)).join(' ');
  }

  /** Sort header click (grille unifiée : on met à jour la strategy et on synce MatSort pour attachSort). */
  onVirtualSortHeaderClick(columnId: string): void {
    if (this.config?.features?.sort === false) return;
    const sort = this.strategy.getSort?.() ?? { active: null, direction: 'asc' as 'asc' | 'desc' };
    const nextDir = sort.active === columnId && sort.direction === 'asc' ? 'desc' : 'asc';
    
    // Try to use strategy's setSort if available (e.g., FilterableDataSourceStrategy)
    const strategyHandledSort = this.strategy.setSort?.(columnId, nextDir);
    this.sortChange.emit({ active: columnId, direction: nextDir });
    
    // Fallback: Programmatically trigger MatSort for strategies without setSort()
    // Skip this if strategy has setSort() to avoid triggering server reload
    if (this.sort && !this.strategy.setSort) {
      this.sort.sort({ id: columnId, start: nextDir, disableClear: true });
    }
    
    this.cdr.markForCheck();
  }

  /**
   * Get sort state for a specific column (for displaying sort arrows)
   * @param columnId - Column identifier
   * @returns Object with isSorted and direction properties
   */
  getSortState(columnId: string): { isSorted: boolean; direction: 'asc' | 'desc' | '' } {
    const sort = this.strategy.getSort?.() ?? { active: null, direction: 'asc' as 'asc' | 'desc' };
    return {
      isSorted: sort.active === columnId,
      direction: sort.active === columnId ? sort.direction : ''
    };
  }

  // ========== COLUMN WIDTH MANAGEMENT ==========

  /**
   * Get the wrapper element (cached for performance)
   */
  private getWrapper(): HTMLElement | null {
    return this.wrapperEl ??= this.elementRef.nativeElement.querySelector('.simple-table-v2-container');
  }

  /**
   * Apply current column widths (from columnWidths map or defaults) as CSS variables on the container.
   * Header and body cells consume width via var(--col-{colId}-w).
   */
  private applyWidthsAsCssVarsToContainer(): void {
    const container = this.getWrapper();
    if (!container) return;

    let cumulativeLeft = 0;
    this.displayedColumns.forEach((colId) => {
      const w = this.getWidthForColumn(colId);
      const safe = this.cssSafeColId(colId);
      container.style.setProperty(`--col-${safe}-w`, `${w}px`);
      container.style.setProperty(`--col-${safe}-left`, `${cumulativeLeft}px`);
      cumulativeLeft += w;
    });
  }

  /** Width for a column (select = 48, else columnWidths or default by type). */
  private getWidthForColumn(colId: string): number {
    if (colId === 'select') return 48;
    const col = this.getColumn(colId);
    return this.columnWidths.get(colId) ?? this.getDefaultWidthForType(col?.type ?? 'text');
  }

  /**
   * Set last visible column width to fill available space and apply to DOM.
   * @param availableWidth - Width to distribute (container or wrapper clientWidth).
   * @param updateTableWidth - If true (expand mode), set grid-table width to new sum.
   */
  private setLastColumnToFillRemaining(availableWidth: number, updateTableWidth: boolean): void {
    if (this.displayedColumns.length < 2) return;
    const lastColId = this.displayedColumns[this.displayedColumns.length - 1]!;
    if (lastColId === 'select') return;

    let sumOthers = 0;
    for (let i = 0; i < this.displayedColumns.length - 1; i++) {
      sumOthers += this.getWidthForColumn(this.displayedColumns[i]!);
    }
    const lastWidth = Math.max(this.getMinWidth(lastColId), availableWidth - sumOthers);
    this.columnWidths.set(lastColId, lastWidth);
    this.applyWidthsAsCssVarsToContainer();

    if (updateTableWidth) {
      const tableEl = this.getTableElement();
      if (tableEl) {
        const sumW = this.displayedColumns.reduce((s, id) => s + this.getWidthForColumn(id), 0);
        this.renderer.setStyle(tableEl, 'width', `${sumW}px`);
        this.renderer.setStyle(tableEl, 'min-width', `${sumW}px`);
      }
    }

    const container = this.getWrapper();
    if (container) {
      this.resizeService.setColumnWidthsByColId(
        this.getColumnWidths(),
        this.displayedColumns,
        container
      );
    }
    this.cdr.markForCheck();
  }

  /** Fit mode: last column fills remaining container width. */
  private fitLastColumnToRemainingWidth(): void {
    if (this.columnResizeMode !== 'fit') return;
    const container = this.getWrapper();
    if (!container || container.clientWidth <= 0) return;
    this.setLastColumnToFillRemaining(container.clientWidth, false);
  }

  /** Expand mode: if no horizontal scroll, last column fills remaining wrapper width. */
  private expandModeFillLastColumnIfNoScroll(): void {
    if (this.columnResizeMode !== 'expand') return;
    const wrapper = this.elementRef.nativeElement.querySelector('.table-wrapper') as HTMLElement;
    if (!wrapper || wrapper.scrollWidth > wrapper.clientWidth || wrapper.clientWidth <= 0) return;
    this.setLastColumnToFillRemaining(wrapper.clientWidth, true);
  }

  /**
   * Apply initial column widths as CSS variables.
   * Fit: schedule last column to fill remaining. Expand: set table width, then schedule fill if no scroll.
   */
  private applyInitialWidths(): void {
    this.applyWidthsAsCssVarsToContainer();

    const tableEl = this.getTableElement();
    if (tableEl) {
      if (this.columnResizeMode === 'expand') {
        const sumW = this.displayedColumns.reduce((s, id) => s + this.getWidthForColumn(id), 0);
        this.renderer.setStyle(tableEl, 'width', `${sumW}px`);
        this.renderer.setStyle(tableEl, 'min-width', `${sumW}px`);
      } else {
        this.renderer.removeStyle(tableEl, 'width');
        this.renderer.removeStyle(tableEl, 'min-width');
      }
    }

    const lastId = this.displayedColumns.length >= 2 ? this.displayedColumns[this.displayedColumns.length - 1] : null;
    if (lastId && lastId !== 'select') {
      requestAnimationFrame(() => {
        if (this.columnResizeMode === 'fit') this.fitLastColumnToRemainingWidth();
        else if (this.columnResizeMode === 'expand') this.expandModeFillLastColumnIfNoScroll();
      });
    }

    if (this.debug) {
      console.log('[SimpleTableV2] Initial CSS var widths applied on container');
    }
  }

  /** Normalize colId for CSS custom property names */
  private cssSafeColId(colId: string): string {
    return colId.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '_');
  }

  /** Return width style for a column (var with fallback so grid always has valid track sizes) */
  getColWidthStyle(colId: string): string {
    if (colId === 'select') return '48px';
    const safe = this.cssSafeColId(colId);
    const fallback = this.columnWidths.get(colId) ?? this.getDefaultWidthForType(this.getColumn(colId)?.type ?? 'text');
    return `var(--col-${safe}-w, ${fallback}px)`;
  }

  /** Return left offset for sticky columns (used with position: sticky) */
  getColLeftStyle(colId: string): string {
    if (colId === 'select') return '0px';
    return `var(--col-${this.cssSafeColId(colId)}-left)`;
  }

  /**
   * Optimized icon cell display: single getCellValue call, returns icon + value.
   * check: true | 'Yes' (case-insensitive)
   * close: false | 'No' (case-insensitive)
   * text fallback: otherwise
   */
  getIconCellDisplay(row: T, column: TableColumnDef<T>): { icon: 'check' | 'close' | null; value: any } {
    const value = this.getCellValue(row, column);
    const s = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (value === true || s === 'yes') return { icon: 'check', value };
    if (value === false || s === 'no') return { icon: 'close', value };
    return { icon: null, value };
  }

  // ========== COLUMN RESIZE HANDLERS (PrimeNG-style) ==========

  /**
   * Get the column resize mode from config (default: 'fit')
   */
  get columnResizeMode(): ColumnResizeMode {
    return this.config?.columnResizeMode ?? 'fit';
  }

  /**
   * Check if column resizing is enabled globally
   */
  get resizableColumnsEnabled(): boolean {
    return this.config?.resizableColumns !== false && this.config?.features?.resize !== false;
  }

  /**
   * Handle resize begin from directive (PrimeNG-style)
   * @param event The resize event from the directive
   */
  onColumnResizeBegin(event: ResizableColumnEvent): void {
    const tableEl = this.getTableElement();
    const helperEl = this.resizeHelper?.nativeElement;
    const containerEl = this.getWrapper();

    if (!tableEl || !helperEl || !containerEl) {
      console.warn('[SimpleTableV2] Missing elements for resize');
      return;
    }

    // Configure service with current mode
    this.resizeService.configure({
      columnResizeMode: this.columnResizeMode,
      minColumnWidth: this.getMinWidth(this.getColumnIdFromElement(event.element)),
    });

    // Initialize column widths from current DOM state (table or grid header row)
    const headerRow = (tableEl.querySelector('thead tr') ?? tableEl.querySelector('.grid-header-row')) as HTMLElement;
    if (headerRow) {
      this.resizeService.initializeWidths(tableEl, headerRow);
    }

    // Begin resize operation
    this.resizeService.beginResize(event.originalEvent, event.element, containerEl, helperEl);

    // Set resizing flag to disable sort
    this.isResizing = true;
    
    // Add resizing class to document body
    DomHandler.addClass(document.body, 'p-unselectable-text');
    
    this.cdr.markForCheck();

    if (this.debug) {
      console.log('[SimpleTableV2] Resize begin:', this.getColumnIdFromElement(event.element));
    }
  }

  /**
   * Handle resize end from directive (PrimeNG-style)
   * @param event The resize event from the directive
   */
  onColumnResizeEnd(event: ResizableColumnEvent): void {
    const tableEl = this.getTableElement();
    const helperEl = this.resizeHelper?.nativeElement;

    if (!tableEl || !helperEl) return;

    // Finalize resize and get result
    const resizeResult = this.resizeService.endResize(helperEl, tableEl);

    // Remove resizing class from document body
    DomHandler.removeClass(document.body, 'p-unselectable-text');

    if (resizeResult) {
      const byColId = this.resizeService.getColumnWidthsByColId();
      Object.entries(byColId).forEach(([id, w]) => this.columnWidths.set(id, w));
      this.columnWidths.set(resizeResult.columnId, resizeResult.width);
      this.writeTableStateToStorage(this.buildTableState());
      if (this.debug) console.log('[SimpleTableV2] Resize end:', resizeResult);
    }

    // Reset resizing flag with a small delay to prevent sort trigger on mouseup
    // The click event fires after mouseup, so we keep isResizing=true during that tick
    setTimeout(() => {
      this.isResizing = false;
      this.cdr.markForCheck();
    });
  }

  /**
   * Get column ID from a <th> element
   */
  private getColumnIdFromElement(element: HTMLElement): string {
    return element.getAttribute('data-column') || '';
  }

  /**
   * Get the grid table element (unique structure div-based)
   */
  private getTableElement(): HTMLElement | null {
    const gridRef = this.gridTableElementRef?.nativeElement;
    if (gridRef) return gridRef;
    if (this.tableEl) return this.tableEl;
    const el = this.elementRef.nativeElement.querySelector('.grid-table') as HTMLElement | null;
    if (el) this.tableEl = el;
    return el;
  }

  /**
   * Get initial width for a column (used by directive)
   */
  getInitialWidth(columnId: string): number {
    return this.columnWidths.get(columnId) ?? this.getDefaultWidthForType('text');
  }

  /**
   * Get current column widths by colId (for parent persistence, e.g. localStorage).
   */
  getColumnWidths(): Record<string, number> {
    return Object.fromEntries(this.columnWidths);
  }

  /**
   * Get min width for a column (used by directive)
   */
  getMinWidth(columnId: string): number {
    const column = this.getColumn(columnId);
    const columnType = column?.type ?? 'text';
    const defaultWidths = DEFAULT_COLUMN_WIDTHS[columnType as keyof typeof DEFAULT_COLUMN_WIDTHS] ?? DEFAULT_COLUMN_WIDTHS['text'];
    return column?.width?.min ?? defaultWidths.min;
  }

  /**
   * Get max width for a column (used by directive)
   */
  getMaxWidth(columnId: string): number {
    const column = this.getColumn(columnId);
    const columnType = column?.type ?? 'text';
    const defaultWidths = DEFAULT_COLUMN_WIDTHS[columnType as keyof typeof DEFAULT_COLUMN_WIDTHS] ?? DEFAULT_COLUMN_WIDTHS['text'];
    return column?.width?.max ?? defaultWidths.max;
  }

  // ========== LIFECYCLE CLEANUP ==========
  
  ngOnDestroy(): void {
    // Disconnect ResizeObserver to prevent memory leaks
    this.resizeObserver?.disconnect();

    // Service cleanup is handled by Angular's DI
    this.resizeService.reset();
  }
}
