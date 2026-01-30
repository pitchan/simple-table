import { signal, computed, DestroyRef, ChangeDetectorRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { Observable, tap } from 'rxjs';
import { FilterableDataSource } from 'src/app/core/data-sources/common-data-sources/filterable-data-source';
import { ITableStrategy } from '../models/table-strategy.interface';

/**
 * Strategy for FilterableDataSource (server-side pagination)
 * Bridges FilterableDataSource observables to signals
 * 
 * CRITICAL: This strategy preserves existing FilterableDataSource behavior
 * used by 20+ components across the application.
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
   * Replicates tvsItemSize directive behavior from TableTreeView
   * 
   * IMPORTANT: Must be called AFTER attachPaginator() and attachSort()
   */
  connect(): Observable<T[]> {
    if (!this.dataSource) {
      console.error('[FilterableDataSourceStrategy] DataSource not initialized');
      return new Observable(subscriber => subscriber.complete());
    }

    // CRITICAL: Bridge dataToRender$ → dataOfRange$
    // This replicates the tvsItemSize directive behavior that triggers connect() emission
    this.dataSource.dataToRender$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.dataSource.dataOfRange$.next(data as T[]);
        this._data.set(data as T[]);
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
    // This triggers when dataOfRange$ emits (after our bridge above)
    return this.dataSource.connect().pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.cdr.markForCheck())
    );
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
