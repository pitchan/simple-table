import { signal, computed, DestroyRef, ChangeDetectorRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { Observable, distinctUntilChanged, tap } from 'rxjs';
import orderBy from 'lodash/orderBy';
import { FilterableDataSource } from 'src/app/core/data-sources/common-data-sources/filterable-data-source';
import { ITableStrategy } from '../models/table-strategy.interface';

/**
 * Strategy for FilterableDataSource (server-side pagination)
 * Bridges FilterableDataSource observables to signals
 * 
 * CRITICAL: This strategy preserves existing FilterableDataSource behavior
 * used by 20+ components across the application.
 * 
 * Data flow:
 * 1. Component calls filterSubject.next(filter)
 * 2. FilterableDataSource.updateChangeSubscription() detects change
 * 3. FilterableDataSource.loadPage() calls load()
 * 4. Subclass load() calls HTTP service and pushes data to modelsSubject
 * 5. This strategy subscribes to modelsSubject and updates signals
 * 6. SimpleTableV2 renders data from signals
 */
export class FilterableDataSourceStrategy<T> implements ITableStrategy<T> {
  private dataSource!: FilterableDataSource<T, unknown, MatPaginator>;
  private sortInstance?: MatSort;
  private paginatorInstance?: MatPaginator;

  // Internal signals
  private _data = signal<T[]>([]);
  private _totalCount = signal(0);
  private _loading = signal(false);

  // Public readonly signals
  readonly data = computed(() => this._data());
  readonly totalCount = computed(() => this._totalCount());
  readonly loading = computed(() => this._loading());

  constructor(
    private destroyRef: DestroyRef,
    private cdr: ChangeDetectorRef
  ) {}

  /**
   * Initialize with FilterableDataSource instance
   */
  initialize(dataSource: FilterableDataSource<T, unknown, MatPaginator>): void {
    if (!dataSource) {
      console.error('[FilterableDataSourceStrategy] No dataSource provided');
      return;
    }
    this.dataSource = dataSource;
  }

  /**
   * Connect and bridge FilterableDataSource observables to signals
   * 
   * IMPORTANT: Must be called AFTER attachPaginator() and attachSort()
   */
  connect(): Observable<T[]> {
    if (!this.dataSource) {
      console.error('[FilterableDataSourceStrategy] DataSource not initialized');
      return new Observable(subscriber => subscriber.complete());
    }

    // Check if filter has been initialized (common pitfall)
    const currentFilter = this.dataSource.filterSubject.getValue();
    if (currentFilter === null) {
      console.warn('[FilterableDataSourceStrategy] ⚠️ WARNING: FilterableDataSource filter is NULL. Data will NOT load until filterSubject.next() is called.');
    }

    // Subscribe to modelsSubject for data updates
    // This is the main data stream from FilterableDataSource
    // distinctUntilChanged() filters redundant emissions
    this.dataSource.modelsSubject
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        distinctUntilChanged()
      )
      .subscribe((data) => {
        this._data.set(data);
        this.cdr.markForCheck();
      });

    // Subscribe to loading state
    this.dataSource.loading$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((loading) => {
        this._loading.set(loading);
        this.cdr.markForCheck();
      });

    // Subscribe to total count for paginator
    this.dataSource.length$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((count) => {
        this._totalCount.set(count);
        this.cdr.markForCheck();
      });

    // Return modelsSubject as the main data stream
    // Loading state is now handled independently via async pipe in the component
    return this.dataSource.modelsSubject.asObservable().pipe(
      takeUntilDestroyed(this.destroyRef),
      distinctUntilChanged(),
      tap(() => {
        this.cdr.markForCheck();
      })
    ) as Observable<T[]>;
  }

  /**
   * Disconnect from data source
   */
  disconnect(): void {
    if (this.dataSource) {
      this.dataSource.disconnect();
    }
  }

  /**
   * Handle pagination events
   * FilterableDataSource handles this automatically via paginator.page observable
   */
  onPageChange(event: PageEvent): void {
    // No action needed - FilterableDataSource.updateChangeSubscription()
    // already subscribes to paginator.page and calls loadPage()
    this.cdr.markForCheck();
  }

  /**
   * Handle sort events
   * FilterableDataSource handles this automatically via sort.sortChange observable
   */
  onSortChange(sort: Sort): void {
    // No action needed - FilterableDataSource.updateChangeSubscription()
    // already subscribes to sort.sortChange and resets paginator
    this.cdr.markForCheck();
  }

  /**
   * Attach paginator to FilterableDataSource
   * IMPORTANT: Must be called AFTER attachSort() (same order as TableTreeView)
   */
  attachPaginator(paginator: MatPaginator): void {
    if (!this.dataSource) {
      console.error('[FilterableDataSourceStrategy] Cannot attach paginator - dataSource not initialized');
      return;
    }

    this.paginatorInstance = paginator;
    this.dataSource.paginator = paginator;
  }

  /**
   * Attach sort to FilterableDataSource
   * IMPORTANT: Must be called BEFORE attachPaginator() (same order as TableTreeView)
   */
  attachSort(sort: MatSort): void {
    if (!this.dataSource) {
      console.error('[FilterableDataSourceStrategy] Cannot attach sort - dataSource not initialized');
      return;
    }

    this.sortInstance = sort;
    this.dataSource.sort = sort;
  }

  /**
   * Manual refresh - triggers loadPage() on FilterableDataSource
   */
  refresh(): void {
    if (this.dataSource && this.dataSource.loadPage) {
      this.dataSource.loadPage();
    }
  }

  /**
   * Get current sort state
   * This method is called by SimpleTableV2 to determine the current sort
   */
  getSort(): { active: string | null; direction: 'asc' | 'desc' } {
    if (!this.sortInstance) {
      return { active: null, direction: 'asc' };
    }
    return {
      active: this.sortInstance.active || null,
      direction: this.sortInstance.direction || 'asc'
    };
  }

  /**
   * Apply sort client-side (like TableTreeViewComponent.columnSorting)
   * Does NOT trigger server reload - sorts data already in memory
   * This preserves the behavior of the old TableTreeViewComponent
   * 
   * @param active - Column ID to sort by
   * @param direction - Sort direction ('asc' or 'desc')
   */
  setSort(active: string | null, direction: 'asc' | 'desc'): void {
    if (!this.sortInstance || !this.dataSource) {
      console.warn('[FilterableDataSourceStrategy] Cannot sort - sortInstance or dataSource not available');
      return;
    }

    // Update MatSort state for UI (arrows in headers)
    this.sortInstance.active = active || '';
    this.sortInstance.direction = direction;
    
    // Notify MatSort of state change to update UI
    this.sortInstance._stateChanges.next();

    // CLIENT-SIDE SORT: Sort data in memory without server reload
    // This replicates TableTreeViewComponent.columnSorting() behavior
    const currentData = this._data();
    
    if (!currentData || currentData.length === 0) {
      console.debug('[FilterableDataSourceStrategy] No data to sort');
      return;
    }

    // Sort using lodash orderBy (same as TableTreeViewComponent)
    const sortedData = orderBy(
      currentData,
      [(item: any) => this.getSortValue(item, active)],
      [direction]
    );

    // Update signal with sorted data
    this._data.set(sortedData);
    this.cdr.markForCheck();

    console.debug(`[FilterableDataSourceStrategy] Client-side sort applied: ${active} ${direction}`);
  }

  /**
   * Extract sort value from item (replicates TableTreeViewComponent.sortItemByStringAndArray)
   * Handles strings, arrays, objects, dates, etc.
   * 
   * @param item - Data row
   * @param columnName - Column to extract value from
   * @returns Normalized value for sorting
   */
  private getSortValue(item: any, columnName: string | null): any {
    if (!columnName || !item) {
      return '';
    }

    const value = item[columnName];

    // Handle undefined/null
    if (value === undefined || value === null) {
      return '';
    }

    // Handle strings: lowercase and trim for case-insensitive sort
    if (typeof value === 'string') {
      return value.trim().toLowerCase();
    }

    // Handle arrays or objects (e.g., multi-select chips)
    if (typeof value === 'object' || Array.isArray(value)) {
      if (Array.isArray(value)) {
        return value.map((item) => {
          if (typeof item === 'object' && item !== null) {
            // Extract 'code' property if available (common pattern)
            return item.code?.toString() || item.toString();
          }
          return item?.toString() || '';
        });
      }
      // Single object: try to extract code or convert to string
      return value.code?.toString() || value.toString();
    }

    // Handle dates (already sorted correctly by orderBy)
    if (value instanceof Date) {
      return value;
    }

    // Fallback: return as-is (numbers, booleans, etc.)
    return value;
  }
}
