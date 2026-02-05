import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
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
    MatTableModule,
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
    TableConfigEditorComponent
  ],
  providers: [TableResizeService],
})
export class SimpleTableV2Component<T> implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elementRef = inject(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly resizeService = inject(TableResizeService);

  /** Flag to track if AfterViewInit has been called */
  private viewInitialized = false;

  /** Cache du wrapper pour éviter querySelector() répétés */
  private wrapperEl?: HTMLElement;

  /** Cache de l'élément table */
  private tableEl?: HTMLElement;

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
  @ViewChild('tableElement', { read: ElementRef }) tableElementRef!: ElementRef<HTMLTableElement>;

  // ========== STRATEGY (internal) ==========
  private strategy!: ITableStrategy<T>;

  // ========== PUBLIC STATE (synced from strategy) ==========
  /** Current page data - updated only when strategy emits */
  tableData: T[] = [];
  /** Total count for paginator - updated only when strategy emits */
  totalCount = 0;
  /** Loading state - updated only when strategy emits */
  isLoading = false;

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
    // Handle data changes AFTER AfterViewInit
    // Before AfterViewInit, data is initialized in ngAfterViewInit()
    if (changes['data'] && this.viewInitialized && this.strategy) {
      const newData = changes['data'].currentValue;
      
      if (this.debug) {
        console.log('[SimpleTableV2] Data changed after init, reinitializing strategy', newData);
      }
      
      // Reinitialize strategy with new data
      this.strategy.initialize(newData);
      // Sync state immediately for instant UI update
      this.syncFromStrategy();
    }
  }

  ngAfterViewInit(): void {
    // IMPORTANT: Order matters for MatTableDataSource!
    // 1. Attach sort and paginator FIRST
    // 2. Initialize data SECOND (so combineLatest has all observables)
    // 3. Connect LAST (to subscribe to the data stream)
    
    if (this.debug) {
      console.group('[SimpleTableV2] View Init');
      console.log('Sort present:', !!this.sort);
      console.log('Paginator present:', !!this.paginator);
    }

    this.attachPaginatorAndSort();
    this.strategy.initialize(this.data);
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
    this.strategy.connect().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.syncFromStrategy();
    });

    if (this.debug) {
      console.log('[SimpleTableV2] Strategy connected');
    }
  }

  /**
   * Synchronize component state from strategy signals.
   * Called only when strategy emits new data (not on every change detection cycle).
   */
  private syncFromStrategy(): void {
    this.tableData = this.strategy.data();
    this.totalCount = this.strategy.totalCount();
    this.isLoading = this.strategy.loading();

    if (this.debug) {
      console.log('[SimpleTableV2] Data synced:', this.tableData.length);
    }

    this.cdr.markForCheck();
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
    const numRows = this.tableData.length;
    return numSelected === numRows && numRows > 0;
  }

  masterToggle(): void {
    if (!this.selection) return;

    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.tableData.forEach(row => this.selection!.select(row));
    }
    this.selectionChange.emit(this.selection);
  }

  toggleSelection(row: T): void {
    if (!this.selection) return;
    this.selection.toggle(row);
    this.selectionChange.emit(this.selection);
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

  // ========== COLUMN WIDTH MANAGEMENT ==========

  /**
   * Get the wrapper element (cached for performance)
   */
  private getWrapper(): HTMLElement | null {
    return this.wrapperEl ??= this.elementRef.nativeElement.querySelector('.simple-table-v2-container');
  }

  /**
   * Apply initial column widths directly on TH elements.
   * Called once in ngAfterViewInit when the DOM is ready.
   * With table-layout: fixed, TH widths propagate to all TD cells automatically.
   */
  private applyInitialWidths(): void {
    const tableEl = this.getTableElement();
    if (!tableEl) return;

    const headerRow = tableEl.querySelector('tr.mat-header-row') as HTMLElement;
    if (!headerRow) return;

    const headers = Array.from(headerRow.querySelectorAll('th')) as HTMLElement[];

    // Build widths array matching displayedColumns order
    const widths: { width: number; min: number; max: number }[] = [];
    this.displayedColumns.forEach((colId) => {
      if (colId === 'select') {
        widths.push({ width: 48, min: 48, max: 48 });
      } else if (colId === 'configButton') {
        widths.push({ width: 48, min: 48, max: 48 });
      } else {
        const col = this.getColumn(colId);
        const w = this.columnWidths.get(colId) ?? this.getDefaultWidthForType(col?.type ?? 'text');
        widths.push({ width: w, min: this.getMinWidth(colId), max: this.getMaxWidth(colId) });
      }
    });

    // Apply styles on each TH
    headers.forEach((th, index) => {
      if (widths[index] !== undefined) {
        this.renderer.setStyle(th, 'width', `${widths[index].width}px`);
        this.renderer.setStyle(th, 'min-width', `${widths[index].min}px`);
        this.renderer.setStyle(th, 'max-width', `${widths[index].max}px`);
      }
    });

    if (this.debug) {
      console.log('[SimpleTableV2] Initial widths applied to', headers.length, 'TH elements');
    }
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

    // Initialize column widths from current DOM state
    const headerRow = tableEl.querySelector('tr.mat-header-row') as HTMLElement;
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
      // Update internal column widths map
      const widths = this.resizeService.getColumnWidths();
      this.visibleColumns.forEach((col, index) => {
        if (widths[index] !== undefined) {
          this.columnWidths.set(col.id, widths[index]);
        }
      });

      // Emit change event
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
   * Get the table element (cached)
   */
  private getTableElement(): HTMLElement | null {
    if (this.tableElementRef?.nativeElement) {
      return this.tableElementRef.nativeElement;
    }
    // Fallback to querySelector if ViewChild not available yet
    return this.tableEl ??= this.elementRef.nativeElement.querySelector('table.simple-table-v2');
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
    // Service cleanup is handled by Angular's DI
    this.resizeService.reset();
  }
}
