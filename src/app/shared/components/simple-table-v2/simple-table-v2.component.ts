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
  Signal,
  SimpleChanges,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
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
import { TableColumnDef, TableConfig, DEFAULT_COLUMN_WIDTHS, ColumnResizeMode } from './models/column-def.model';
import { TableConfigEditorComponent } from '../table-config-editor/table-config-editor.component';
import { ResizableColumnDirective, ResizableColumnEvent } from './directives/resizable-column.directive';
import { TableResizeService, ColumnResizeEvent } from './services/table-resize.service';
import { DomHandler } from './helpers/dom-handler';

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
    TableConfigEditorComponent,
    ScrollingModule
  ],
  providers: [TableResizeService],
})
export class SimpleTableV2Component<T> implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elementRef = inject(ElementRef);
  private readonly ngZone = inject(NgZone);
  private readonly renderer = inject(Renderer2);
  private readonly resizeService = inject(TableResizeService);

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

  /** Selection model for row selection */
  @Input() selection?: SelectionModel<T>;

  /** Enable debug logging */
  @Input() debug = false;

  /** Show column configuration editor (DISABLED IN THIS VERSION) */
  @Input() showConfigEditor = false;

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

  /** Column width change event (for localStorage persistence) */
  @Output() columnWidthChange = new EventEmitter<ColumnResizeEvent>();

  // ========== VIEW CHILDREN ==========
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('resizeHelper') resizeHelper!: ElementRef<HTMLDivElement>;
  @ViewChild('gridTableElement', { read: ElementRef }) gridTableElementRef!: ElementRef<HTMLElement>;

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

  // ========== LIFECYCLE ==========
  ngOnInit(): void {
    if (this.debug) {
      console.group('[SimpleTableV2] Initialization');
      console.log('Config:', this.config);
      console.log('Data Type:', this.data?.constructor?.name);
    }

    this.validateInputs();
    this.initializeColumns();
    this.initializeConfigEditor();
    this.initializeStrategy();

    if (this.debug) {
      console.groupEnd();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Handle config changes - reinitialize columns
    if (changes['config'] && !changes['config'].firstChange) {
      if (this.debug) {
        console.log('[SimpleTableV2] Config changed, reinitializing columns', changes['config'].currentValue);
      }
      this.initializeColumns();
      this.initializeConfigEditor();
      this.cdr.markForCheck();
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

    this.cdr.markForCheck();

    if (this.debug) {
      console.groupEnd();
    }
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

  handleConfigChange(event: any): void {
    // Event contains the updated columns structure
    // We need to trigger a re-render of columns
    
    // The editor mutates the array passed to it (this.editorOptions.columns.columns)
    // which references this.config.columns.
    // So we just need to re-initialize visible columns.
    
    this.initializeColumns();
    this.cdr.markForCheck();
  }

  handleAutoResize(event: boolean): void {
    if (this.debug) console.log('Auto resize toggled', event);
    // Not implemented yet
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
    if (this.selection && this.config.features?.selection !== false) {
      this.displayedColumns.push('select');
    }
    this.displayedColumns.push(...this.visibleColumns.map(col => col.id));
    
    // Add config button column at the end if enabled
    if (this.showConfigEditor) {
      this.displayedColumns.push('configButton');
    }

    // Initialize column widths
    this.visibleColumns.forEach(col => {
      const width = col.width?.initial ?? this.getDefaultWidthForType(col.type ?? 'text');
      this.columnWidths.set(col.id, width);
    });

    if (this.debug) {
      console.log('[SimpleTableV2] Columns initialized:', this.displayedColumns);
    }
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
        takeUntilDestroyed(this.destroyRef)
      ).subscribe();
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

  // ========== SELECTION ==========
  isAllSelected(): boolean {
    if (!this.selection) return false;
    const numSelected = this.selection.selected.length;
    const numRows = this.tableData().length;
    return numSelected === numRows && numRows > 0;
  }

  masterToggle(): void {
    if (!this.selection || !this.isMultipleSelection) return;

    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.tableData().forEach(row => this.selection!.select(row));
    }
    this.selectionChange.emit(this.selection);
  }

  toggleSelection(row: T): void {
    if (!this.selection) return;
    this.selection.toggle(row);
    this.selectionChange.emit(this.selection);
  }

  // ========== HELPERS ==========
  
  /** Détecte si le mode de sélection est 'multiple' via l'API native du SelectionModel */
  get isMultipleSelection(): boolean {
    return this.selection?.isMultipleSelection() ?? false;
  }

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

  /** Item size in px for CDK virtual scroll (fixed height per row, V1). */
  get virtualScrollItemSize(): number {
    return 48;
  }

  /** Sort header click (grille unifiée : on met à jour la strategy et on synce MatSort pour attachSort). */
  onVirtualSortHeaderClick(columnId: string): void {
    if (this.config?.features?.sort === false) return;
    const sort = this.strategy.getSort?.() ?? { active: null, direction: 'asc' as 'asc' | 'desc' };
    const nextDir = sort.active === columnId && sort.direction === 'asc' ? 'desc' : 'asc';
    this.strategy.setSort?.(columnId, nextDir);
    this.sortChange.emit({ active: columnId, direction: nextDir });
    // Syncer MatSort pour les strategies qui utilisent attachSort (ex. FilterableDataSource)
    if (this.sort) {
      this.sort.sort({ id: columnId, start: nextDir, disableClear: true });
    }
    this.cdr.markForCheck();
  }

  // ========== COLUMN WIDTH MANAGEMENT ==========

  /**
   * Get the wrapper element (cached for performance)
   */
  private getWrapper(): HTMLElement | null {
    return this.wrapperEl ??= this.elementRef.nativeElement.querySelector('.simple-table-v2-container');
  }

  /**
   * Apply initial column widths as CSS variables on the container root.
   * Header and body cells consume width via var(--col-{colId}-w).
   */
  private applyInitialWidths(): void {
    const container = this.getWrapper();
    if (!container) return;

    let cumulativeLeft = 0;
    this.displayedColumns.forEach((colId) => {
      let w: number;
      if (colId === 'select' || colId === 'configButton') {
        w = 48;
      } else {
        const col = this.getColumn(colId);
        w = this.columnWidths.get(colId) ?? this.getDefaultWidthForType(col?.type ?? 'text');
      }
      const safe = this.cssSafeColId(colId);
      this.renderer.setStyle(container, `--col-${safe}-w`, `${w}px`);
      this.renderer.setStyle(container, `--col-${safe}-left`, `${cumulativeLeft}px`);
      cumulativeLeft += w;
    });

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
    if (colId === 'select' || colId === 'configButton') return '48px';
    const safe = this.cssSafeColId(colId);
    const fallback = this.columnWidths.get(colId) ?? this.getDefaultWidthForType(this.getColumn(colId)?.type ?? 'text');
    return `var(--col-${safe}-w, ${fallback}px)`;
  }

  /** Return left offset for sticky columns (used with position: sticky) */
  getColLeftStyle(colId: string): string {
    if (colId === 'select' || colId === 'configButton') return '0px';
    return `var(--col-${this.cssSafeColId(colId)}-left)`;
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

    // Emit event for external persistence if we have a valid result
    if (resizeResult) {
      const byColId = this.resizeService.getColumnWidthsByColId();
      Object.entries(byColId).forEach(([id, w]) => this.columnWidths.set(id, w));

      this.columnWidthChange.emit(resizeResult);

      if (this.debug) {
        console.log('[SimpleTableV2] Resize end:', resizeResult);
      }
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
