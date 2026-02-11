import { Signal } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { Observable } from 'rxjs';
import { ColumnFilterState } from './column-def.model';

/**
 * Strategy interface for SimpleTableV2 data management
 * Abstracts different data source types with Angular Signals
 */
export interface ITableStrategy<T> {
  /** Current page data to display */
  readonly data: Signal<T[]>;

  /** Total records count (for paginator) */
  readonly totalCount: Signal<number>;

  /** Loading state (signal) */
  readonly loading: Signal<boolean>;

  /**
   * Initialize strategy with data source
   * Called in ngOnInit before ViewInit
   */
  initialize(dataSource: any): void;

  /**
   * Connect to data stream (optional).
   * Only needed for strategies that push data via Observable (e.g. FilterableDataSource).
   * Signal-only strategies (e.g. Array) don't need it: the template reads strategy.data() directly.
   */
  connect?(): Observable<T[]>;

  /**
   * Cleanup subscriptions
   * Called in ngOnDestroy
   */
  disconnect(): void;

  /**
   * Handle pagination events
   */
  onPageChange(event: PageEvent): void;

  /**
   * Handle sort events
   */
  onSortChange(sort: Sort): void;

  /**
   * Optional: Attach paginator (for strategies that need it)
   */
  attachPaginator?(paginator: MatPaginator): void;

  /**
   * Optional: Attach sort (for strategies that need it)
   */
  attachSort?(sort: MatSort): void;

  /**
   * Optional: Manual refresh
   */
  refresh?(): void;

  /**
   * Optional: Set page (for Array strategy client-side pagination)
   */
  setPage?(index: number, size: number): void;

  /**
   * Optional: Set filters per column (for Array strategy)
   */
  setFilters?(filters: Record<string, ColumnFilterState>): void;

  /**
   * Optional: Set sort state (for Array strategy)
   */
  setSort?(active: string | null, direction: 'asc' | 'desc'): void;

  /**
   * Optional: Get current sort state (for virtual scroll header UI)
   */
  getSort?(): { active: string | null; direction: 'asc' | 'desc' };
}

/**
 * Configuration for strategy-specific behavior
 */
export interface StrategyConfig {
  /** Custom sort accessor function for complex data types */
  sortingDataAccessor?: (data: any, sortHeaderId: string) => string | number;

  /** Custom filter predicate (legacy: single global filter string) */
  filterPredicate?: (data: any, filter: string) => boolean;

  /**
   * Adapter: map legacy global filter string to per-column filter state.
   * Enables screen-by-screen migration without breaking existing filterPredicate usage.
   */
  globalFilterAdapter?: (global: string) => Record<string, ColumnFilterState>;

  /**
   * Apply per-column filters (AND between columns). If not provided, Array strategy uses default text match.
   */
  filterApply?: (rows: any[], filtersState: Record<string, ColumnFilterState>) => any[];

  /** Enable debug logging */
  debug?: boolean;
}
