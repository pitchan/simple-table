import { signal, computed, DestroyRef, ChangeDetectorRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { Observable, tap } from 'rxjs';
import { ITableStrategy, StrategyConfig } from '../models/table-strategy.interface';

/**
 * Strategy for simple array data (T[])
 * Uses MatTableDataSource for client-side sorting/pagination/filtering
 */
export class ArrayTableStrategy<T> implements ITableStrategy<T> {
  private dataSource = new MatTableDataSource<T>([]);
  private paginatorInstance?: MatPaginator;
  private sortInstance?: MatSort;

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
    private cdr: ChangeDetectorRef,
    private config?: StrategyConfig
  ) {}

  /**
   * Initialize with array data
   */
  initialize(data: T[]): void {
    if (!Array.isArray(data)) {
      console.error('[ArrayTableStrategy] Expected array, got:', typeof data);
      return;
    }

    this.dataSource.data = data;
    this._totalCount.set(data.length);

    // Apply custom sorting accessor if provided
    if (this.config?.sortingDataAccessor) {
      this.dataSource.sortingDataAccessor = this.config.sortingDataAccessor;
    } else {
      this.dataSource.sortingDataAccessor = this.defaultSortingAccessor.bind(this);
    }

    // Apply custom filter predicate if provided
    if (this.config?.filterPredicate) {
      this.dataSource.filterPredicate = this.config.filterPredicate;
    }

    if (this.config?.debug) {
      console.log('[ArrayTableStrategy] Initialized with', data.length, 'rows');
    }
  }

  /**
   * Connect to MatTableDataSource
   * Must be called after attachPaginator() and attachSort()
   */
  connect(): Observable<T[]> {
    // Subscribe to MatTableDataSource changes
    return this.dataSource.connect().pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(data => {
        this._data.set(data);
        this.cdr.markForCheck();

        if (this.config?.debug) {
          console.log('[ArrayTableStrategy] Data updated:', data.length, 'rows');
        }
      })
    );
  }

  /**
   * Disconnect from data source
   */
  disconnect(): void {
    this.dataSource.disconnect();
  }

  /**
   * Handle pagination events
   * MatTableDataSource handles this automatically via paginator
   */
  onPageChange(event: PageEvent): void {
    // Just trigger change detection
    this.cdr.markForCheck();
  }

  /**
   * Handle sort events
   * MatTableDataSource handles this automatically via sort
   */
  onSortChange(sort: Sort): void {
    // Just trigger change detection
    this.cdr.markForCheck();
  }

  /**
   * Attach paginator to MatTableDataSource
   * 
   * NOTE: Reassigning data forces MatTableDataSource._updateChangeSubscription()
   * to re-emit via _renderData. This fixes a timing issue where paginator.initialized
   * has already emitted before we attach, causing combineLatest to block.
   */
  attachPaginator(paginator: MatPaginator): void {
    this.paginatorInstance = paginator;
    this.dataSource.paginator = paginator;
    
    // Force pipeline update by reassigning data
    this.dataSource.data = [...this.dataSource.data];
  }

  /**
   * Attach sort to MatTableDataSource
   * 
   * NOTE: Reassigning data forces MatTableDataSource._updateChangeSubscription()
   * to re-emit via _renderData. This fixes a timing issue where sort.initialized
   * has already emitted before we attach, causing combineLatest to block.
   */
  attachSort(sort: MatSort): void {
    this.sortInstance = sort;
    this.dataSource.sort = sort;
    
    // Force pipeline update by reassigning data
    this.dataSource.data = [...this.dataSource.data];
  }

  /**
   * Default sorting accessor with smart type handling
   * Handles: dates, arrays, objects with 'code' property, strings, numbers
   */
  private defaultSortingAccessor(item: T, columnName: string): string | number {
    const value = (item as Record<string, unknown>)[columnName];

    // Handle null/undefined
    if (value == null) {
      return '';
    }

    // Handle Date objects
    if (value instanceof Date) {
      return value.getTime();
    }

    // Handle date strings (columns with 'date' in name)
    if (typeof value === 'string' && columnName.toLowerCase().includes('date')) {
      const parsed = Date.parse(value);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    // Handle objects with 'code' property (common pattern in this codebase)
    if (typeof value === 'object' && value !== null && 'code' in value) {
      const codeValue = (value as any).code;
      return typeof codeValue === 'string' 
        ? codeValue.trim().toLowerCase() 
        : String(codeValue).toLowerCase();
    }

    // Handle arrays (extract first element or first element's code)
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return '';
      }
      const firstElement = value[0];
      if (typeof firstElement === 'object' && firstElement !== null && 'code' in firstElement) {
        return String(firstElement.code).toLowerCase();
      }
      return String(firstElement).toLowerCase();
    }

    // Handle strings (case-insensitive)
    if (typeof value === 'string') {
      return value.trim().toLowerCase();
    }

    // Handle numbers and booleans
    if (typeof value === 'number' || typeof value === 'boolean') {
      return value as number;
    }

    // Fallback: stringify
    return String(value).toLowerCase();
  }

  /**
   * Refresh data (for array strategy, this means re-initializing)
   */
  refresh(): void {
    const currentData = this.dataSource.data;
    this.initialize(currentData);
  }
}
