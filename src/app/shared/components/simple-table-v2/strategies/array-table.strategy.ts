import { signal, computed, DestroyRef, ChangeDetectorRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { ITableStrategy, StrategyConfig } from '../models/table-strategy.interface';
import { ColumnFilterState } from '../models/column-def.model';

/** Sort state for the pipeline */
export interface SortState {
  active: string | null;
  direction: 'asc' | 'desc';
}

/** Page state for client-side slice */
export interface PageState {
  index: number;
  size: number;
}

/**
 * Strategy for simple array data (T[])
 * Uses a signals-based pipeline: rows → filter → sort → slice → displayRows.
 * No MatTableDataSource; paginator and sort are "unplugged" and driven via signals.
 */
export class ArrayTableStrategy<T> implements ITableStrategy<T> {
  private paginatorInstance?: MatPaginator;
  private sortInstance?: MatSort;

  // Raw state
  private readonly rowsSig = signal<T[]>([]);
  private readonly filtersSig = signal<Record<string, ColumnFilterState>>({});
  private readonly sortSig = signal<SortState>({ active: null, direction: 'asc' });
  private readonly pageSig = signal<PageState>({ index: 0, size: 50 });

  // Pipeline: filtered + sorted (full list)
  private readonly filteredSortedSig = computed(() => {
    const rows = this.rowsSig();
    const filters = this.filtersSig();
    const sort = this.sortSig();
    const filtered = this.applyFilters(rows, filters);
    return this.applySort(filtered, sort);
  });

  // Display: sliced page for mat-table
  private readonly displayRows = computed(() => {
    const all = this.filteredSortedSig();
    const page = this.pageSig();
    const start = page.index * page.size;
    return all.slice(start, start + page.size);
  });

  // Public API (ITableStrategy)
  readonly data = computed(() => this.displayRows());
  readonly totalCount = computed(() => this.filteredSortedSig().length);
  readonly loading = computed(() => false);

  constructor(
    private destroyRef: DestroyRef,
    private cdr: ChangeDetectorRef,
    private config?: StrategyConfig
  ) {}

  initialize(data: T[]): void {
    if (!Array.isArray(data)) {
      console.error('[ArrayTableStrategy] Expected array, got:', typeof data);
      return;
    }
    this.rowsSig.set(data);
    this.cdr.markForCheck();
    if (this.config?.debug) {
      console.log('[ArrayTableStrategy] Initialized with', data.length, 'rows');
    }
  }

  disconnect(): void {
    // No subscriptions to clean here; signals are automatic
  }

  onPageChange(event: PageEvent): void {
    this.setPage(event.pageIndex, event.pageSize);
    this.cdr.markForCheck();
  }

  onSortChange(sort: Sort): void {
    // Sync from UI; attachSort also pushes via sort.sortChange
    this.setSort(sort.active || null, (sort.direction as 'asc' | 'desc') || 'asc');
    this.cdr.markForCheck();
  }

  attachPaginator(paginator: MatPaginator): void {
    this.paginatorInstance = paginator;
    const initialIndex = paginator.pageIndex ?? 0;
    const initialSize = paginator.pageSize ?? 50;
    this.pageSig.set({ index: initialIndex, size: initialSize });
    paginator.page.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event: PageEvent) => {
      this.setPage(event.pageIndex, event.pageSize);
      this.cdr.markForCheck();
    });
  }

  attachSort(sort: MatSort): void {
    this.sortInstance = sort;
    sort.sortChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((s: Sort) => {
      this.sortSig.set({
        active: s.active || null,
        direction: (s.direction as 'asc' | 'desc') || 'asc',
      });
      this.cdr.markForCheck();
    });
    // Optional: apply initial sort from MatSort state (active/direction are on the directive instance)
    const active = (sort as { active?: string }).active;
    const direction = (sort as { direction?: 'asc' | 'desc' }).direction;
    if (active != null && direction) {
      this.sortSig.set({
        active,
        direction: direction === 'asc' || direction === 'desc' ? direction : 'asc',
      });
    }
  }

  setPage(index: number, size: number): void {
    this.pageSig.set({ index, size });
  }

  setFilters(filters: Record<string, ColumnFilterState>): void {
    this.filtersSig.set(filters ?? {});
  }

  setSort(active: string | null, direction: 'asc' | 'desc'): void {
    this.sortSig.set({ active, direction });
  }

  getSort(): { active: string | null; direction: 'asc' | 'desc' } {
    return this.sortSig();
  }

  refresh(): void {
    this.rowsSig.update((rows) => [...rows]);
    this.cdr.markForCheck();
  }

  /**
   * Set filtered data directly (used by custom column filters)
   * Bypasses the internal filter pipeline
   */
  setFilteredData(filteredData: T[]): void {
    this.rowsSig.set(filteredData);
    // Reset to first page when data changes
    this.setPage(0, this.pageSig().size);
    this.cdr.markForCheck();
  }

  private applyFilters(rows: T[], filtersState: Record<string, ColumnFilterState>): T[] {
    if (this.config?.filterApply) {
      return this.config.filterApply(rows, filtersState);
    }
    const activeFilters = Object.entries(filtersState).filter(
      ([_, state]) => state?.value != null && String(state.value).trim() !== ''
    );
    if (activeFilters.length === 0) return rows;
    return rows.filter((row) => {
      return activeFilters.every(([colId, state]) => {
        const value = this.getCellValueForFilter(row, colId);
        const term = String(state.value).trim().toLowerCase();
        return value != null && String(value).toLowerCase().includes(term);
      });
    });
  }

  private getCellValueForFilter(row: T, columnId: string): unknown {
    const accessor = this.config?.sortingDataAccessor;
    if (accessor) {
      const v = accessor(row, columnId);
      return v == null ? '' : v;
    }
    const val = (row as Record<string, unknown>)[columnId];
    return val == null ? '' : val;
  }

  private applySort(rows: T[], sort: SortState): T[] {
    const { active, direction } = sort;
    if (!active || rows.length === 0) return rows;
    const accessor = this.config?.sortingDataAccessor ?? this.defaultSortingAccessor.bind(this);
    return [...rows].sort((a, b) => {
      const aVal = accessor(a, active);
      const bVal = accessor(b, active);
      const aNorm = this.normalizeForCompare(aVal);
      const bNorm = this.normalizeForCompare(bVal);
      if (aNorm < bNorm) return direction === 'asc' ? -1 : 1;
      if (aNorm > bNorm) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  private normalizeForCompare(value: string | number): string | number {
    if (value == null) return '';
    if (typeof value === 'string') return value.trim().toLowerCase();
    return value;
  }

  private defaultSortingAccessor(item: T, columnName: string): string | number {
    const value = (item as Record<string, unknown>)[columnName];
    if (value == null) return '';
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'string' && columnName.toLowerCase().includes('date')) {
      const parsed = Date.parse(value);
      if (!isNaN(parsed)) return parsed;
    }
    if (typeof value === 'object' && value !== null && 'code' in value) {
      const codeValue = (value as { code: unknown }).code;
      return typeof codeValue === 'string'
        ? codeValue.trim().toLowerCase()
        : String(codeValue).toLowerCase();
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return '';
      const first = value[0];
      if (typeof first === 'object' && first !== null && 'code' in first) {
        return String((first as { code: unknown }).code).toLowerCase();
      }
      return String(first).toLowerCase();
    }
    if (typeof value === 'string') return value.trim().toLowerCase();
    if (typeof value === 'number' || typeof value === 'boolean') return value as number;
    return String(value).toLowerCase();
  }
}
