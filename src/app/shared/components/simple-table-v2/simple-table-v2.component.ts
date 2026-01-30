import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  EventEmitter,
  HostBinding,
  Input,
  OnInit,
  Output,
  Renderer2,
  ViewChild,
  inject,
} from '@angular/core';
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
import { TableColumnDef, TableConfig, DEFAULT_COLUMN_WIDTHS } from './models/column-def.model';

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
  ],
})
export class SimpleTableV2Component<T> implements OnInit, AfterViewInit {
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

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

  // ========== VIEW CHILDREN ==========
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // ========== STRATEGY (internal) ==========
  private strategy!: ITableStrategy<T>;

  // ========== PUBLIC GETTERS (expose strategy signals) ==========
  get tableData(): T[] {
    const data = this.strategy?.data() ?? [];
    if (this.debug) {
      console.log('[SimpleTableV2] tableData accessed:', data.length);
    }
    return data;
  }

  get totalCount(): number {
    return this.strategy?.totalCount() ?? 0;
  }

  get isLoading(): boolean {
    return this.strategy?.loading() ?? false;
  }

  // ========== DISPLAY STATE ==========
  displayedColumns: string[] = [];
  visibleColumns: TableColumnDef<T>[] = [];
  columnWidths = new Map<string, number>();

  // ========== COLUMN RESIZE ==========
  private resizing = false;
  private resizingColumn: string | null = null;
  private startX = 0;
  private startWidth = 0;
  private renderer = inject(Renderer2);

  // Dynamic CSS custom properties for column widths
  @HostBinding('style') get hostStyles(): Record<string, string> {
    const styles: Record<string, string> = {};
    this.columnWidths.forEach((width, columnId) => {
      styles[`--column-${columnId}-width`] = `${width}px`;
    });
    return styles;
  }

  // ========== LIFECYCLE ==========
  ngOnInit(): void {
    this.validateInputs();
    this.initializeColumns();
    this.initializeStrategy();
  }

  ngAfterViewInit(): void {
    // IMPORTANT: Order matters for MatTableDataSource!
    // 1. Attach sort and paginator FIRST
    // 2. Initialize data SECOND (so combineLatest has all observables)
    // 3. Connect LAST (to subscribe to the data stream)
    this.attachPaginatorAndSort();
    this.strategy.initialize(this.data);
    this.connectStrategy();
    this.cdr.markForCheck();
  }

  // ========== INITIALIZATION ==========
  private validateInputs(): void {
    if (!this.data) {
      console.error('[SimpleTableV2] No data provided');
    }
    if (!this.config) {
      console.error('[SimpleTableV2] No config provided');
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
    
    // Add config button column at the end if enabled (DISABLED FOR NOW)
    /*if (this.showConfigEditor) {
      this.displayedColumns.push('configButton');
    }*/

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
    this.strategy.connect().subscribe();

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

  /**
   * Get column styles using CSS custom properties
   * Clean pattern: Angular injects the value, CSS does the rest
   */
  getColumnStyles(columnId: string): { [key: string]: string } {
    const column = this.getColumn(columnId);
    const columnType = column?.type ?? 'text';
    const defaultWidths = DEFAULT_COLUMN_WIDTHS[columnType as keyof typeof DEFAULT_COLUMN_WIDTHS] 
      ?? DEFAULT_COLUMN_WIDTHS['text'];
    
    const minWidth = column?.width?.min ?? defaultWidths.min;
    const maxWidth = column?.width?.max ?? defaultWidths.max;
    
    return {
      width: `var(--column-${columnId}-width, auto)`,
      'min-width': `${minWidth}px`,
      'max-width': `${maxWidth}px`
    };
  }

  // ========== COLUMN RESIZE METHODS ==========
  
  /**
   * Start column resize
   * @param event Mouse event
   * @param columnId Column identifier
   */
  onResizeStart(event: MouseEvent, columnId: string): void {
    event.preventDefault();
    event.stopPropagation();

    this.resizing = true;
    this.resizingColumn = columnId;
    this.startX = event.pageX;
    
    // Use default width based on column type instead of hardcoded 100
    const column = this.getColumn(columnId);
    const defaultWidth = this.getDefaultWidthForType(column?.type ?? 'text');
    this.startWidth = this.columnWidths.get(columnId) ?? defaultWidth;

    // Attach document listeners
    this.renderer.listen('document', 'mousemove', this.onResizeMove);
    this.renderer.listen('document', 'mouseup', this.onResizeEnd);

    if (this.debug) {
      console.log('[SimpleTableV2] Resize started:', columnId, this.startWidth);
    }
  }

  /**
   * Handle resize movement
   */
  private onResizeMove = (event: MouseEvent): void => {
    if (!this.resizing || !this.resizingColumn) return;

    const diff = event.pageX - this.startX;
    const column = this.getColumn(this.resizingColumn);
    
    // Use DEFAULT_COLUMN_WIDTHS based on column type instead of hardcoded values
    const columnType = column?.type ?? 'text';
    const defaultWidths = DEFAULT_COLUMN_WIDTHS[columnType as keyof typeof DEFAULT_COLUMN_WIDTHS] ?? DEFAULT_COLUMN_WIDTHS['text'];
    
    const minWidth = column?.width?.min ?? defaultWidths.min;
    const maxWidth = column?.width?.max ?? defaultWidths.max;
    
    const newWidth = Math.max(minWidth, Math.min(maxWidth, this.startWidth + diff));
    
    this.columnWidths.set(this.resizingColumn, newWidth);
    this.cdr.markForCheck();
  };

  /**
   * End resize
   */
  private onResizeEnd = (): void => {
    if (this.resizing) {
      this.resizing = false;
      
      if (this.debug && this.resizingColumn) {
        console.log('[SimpleTableV2] Resize ended:', this.resizingColumn, this.columnWidths.get(this.resizingColumn));
      }
      
      this.resizingColumn = null;
    }
  };
}
