import { Signal } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { Observable } from 'rxjs';

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
   * Connect to data stream
   * Called in ngAfterViewInit after paginator/sort are available
   * @returns Observable that emits when data changes
   */
  connect(): Observable<T[]>;

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
}

/**
 * Configuration for strategy-specific behavior
 */
export interface StrategyConfig {
  /** Custom sort accessor function for complex data types */
  sortingDataAccessor?: (data: any, sortHeaderId: string) => string | number;

  /** Custom filter predicate */
  filterPredicate?: (data: any, filter: string) => boolean;

  /** Enable debug logging */
  debug?: boolean;
}
