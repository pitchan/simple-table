import { signal, computed, DestroyRef, ChangeDetectorRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { Observable, distinctUntilChanged, tap } from 'rxjs';
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

    // Return connect() stream for change detection
    // FilterableDataSource.connect() returns modelsSubject.asObservable()
    // distinctUntilChanged() filters redundant emissions
    return this.dataSource.connect().pipe(
      takeUntilDestroyed(this.destroyRef),
      distinctUntilChanged(),
      tap(() => this.cdr.markForCheck())
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
}
