import { BehaviorSubject, Observable, Subject, Subscription, merge, of as observableOf, combineLatest } from 'rxjs';
import { takeUntil, skip, auditTime, tap, startWith } from 'rxjs/operators';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';

/**
 * Type for pagination parameters
 */
export type Page = {
  pageNumber: number;
  pageSize: number;
};

/**
 * FilterableDataSource - Abstract base class for server-side paginated data sources
 * 
 * This class provides the infrastructure for:
 * - Server-side pagination with MatPaginator
 * - Server-side sorting with MatSort
 * - Filter management via filterSubject
 * - Loading state management
 * - Automatic reload on filter/sort/page changes
 * 
 * Subclasses must implement the abstract `load()` method to fetch data from the server.
 * 
 * @template T - The type of data items
 * @template F - The type of filter object
 * @template P - The type of paginator (defaults to MatPaginator)
 */
export abstract class FilterableDataSource<T, F = unknown, P extends MatPaginator = MatPaginator> {
  // ========== INTERNAL STATE ==========
  private _customPaginator: P | undefined;
  private _customFilter: F | undefined;
  
  protected filteredEventStream: Subscription | null = null;
  private destroyed$ = new Subject<void>();

  // ========== PUBLIC SUBJECTS ==========
  /** Subject containing the current data models */
  public modelsSubject = new BehaviorSubject<T[]>([]);

  // ========== PROTECTED SUBJECTS ==========
  /** Subject for loading state */
  protected loadingSubject = new BehaviorSubject<boolean>(false);
  
  /** Subject for total count */
  protected countSubject = new BehaviorSubject<number>(0);

  // ========== PUBLIC OBSERVABLES ==========
  /** Observable for loading state */
  public loading$ = this.loadingSubject.asObservable();
  
  /** Observable for total count (used by paginator) */
  public length$ = this.countSubject.asObservable();

  // ========== FILTER ==========
  /** Subject for filter changes */
  public filterSubject = new BehaviorSubject<F | null>(null);
  
  /** Observable for filter changes */
  public filter$ = this.filterSubject.asObservable();

  // ========== CONFIGURATION ==========
  /** Whether paginator is required to load data */
  protected isPaginatorMandatory: boolean = true;

  /** MatSort instance */
  sort?: MatSort;

  constructor(
    protected _snackBar?: any,
    protected translateService?: any
  ) {
    this.updateChangeSubscription();
    this.initFilterSubscription();
  }

  // ========== PAGINATOR ==========
  /** Get the current paginator */
  get paginator(): P | undefined {
    return this._customPaginator;
  }

  /** Set the paginator and update subscriptions */
  set paginator(paginator: P | undefined) {
    this._customPaginator = paginator;
    this.updateChangeSubscription();
  }

  // ========== ABSTRACT METHOD ==========
  /**
   * Load data from the server
   * Subclasses must implement this method to fetch data
   * 
   * @param filter - The current filter
   * @param sort - The current sort state
   * @param page - The current page (pageNumber, pageSize)
   */
  protected abstract load(
    filter: F,
    sort: Sort | undefined,
    page: Page | undefined
  ): void;

  // ========== LIFECYCLE ==========
  /**
   * Setup filter subscription to track filter changes
   */
  private initFilterSubscription(): void {
    this.filter$.pipe(
      skip(1),
      takeUntil(this.destroyed$)
    ).subscribe((newFilter) => {
      this._customFilter = newFilter as F;
    });
  }

  /**
   * Setup change subscriptions for sort/page/filter
   * Automatically triggers loadPage() when any change occurs
   */
  public updateChangeSubscription(): void {
    // Sort change observable
    const sortChange: Observable<Sort | null | void> = this.sort
      ? merge(
          this.sort.sortChange,
          this.sort.initialized
        )
      : observableOf(null);

    // Page change observable
    const pageChange: Observable<PageEvent | null | void> = this.paginator
      ? merge(
          this.paginator.page,
          this.paginator.initialized
        )
      : observableOf(null);

    // Reset paginator after sorting
    sortChange.pipe(
      takeUntil(this.destroyed$)
    ).subscribe(() => {
      if (this.paginator) {
        this.paginator.pageIndex = 0;
      }
    });

    // Combine filter and page changes
    const changes = combineLatest([
      this.filter$,
      pageChange.pipe(startWith(undefined))
    ]);

    // Unsubscribe from previous event stream
    if (this.filteredEventStream) {
      this.filteredEventStream.unsubscribe();
    }

    // Subscribe to changes with debounce to avoid extra service calls
    this.filteredEventStream = changes
      .pipe(
        auditTime(100),
        tap(() => {
          this.loadPage();
        })
      )
      .subscribe();
  }

  /**
   * Trigger data load with current filter, sort, and pagination
   */
  public loadPage(): void {
    if (this._customFilter && ((this.isPaginatorMandatory && this._customPaginator) || !this.isPaginatorMandatory)) {
      this.load(
        this._customFilter,
        this.sort ? { active: this.sort.active, direction: this.sort.direction } : undefined,
        this._customPaginator
          ? {
              pageNumber: this._customPaginator.pageIndex,
              pageSize: this._customPaginator.pageSize,
            }
          : undefined
      );
    }
  }

  // ========== DATA ACCESS ==========
  /**
   * Connect to the data source
   * Returns an observable of the current data
   */
  connect(): Observable<T[]> {
    return this.modelsSubject.asObservable();
  }

  /**
   * Set data (convenience method used by subclasses in load())
   */
  setData(data: T[]): void {
    this.modelsSubject.next(data);
  }

  // ========== CLEANUP ==========
  /**
   * Disconnect and cleanup subscriptions
   * Call this method when the data source is no longer needed
   */
  disconnect(): void {
    // Signal destruction for takeUntil subscriptions
    this.destroyed$.next();
    this.destroyed$.complete();
    
    // Clean up subjects
    this.modelsSubject.next([]);
    this.countSubject.next(0);
    this.modelsSubject.complete();
    this.loadingSubject.complete();
    this.countSubject.complete();
    this.filterSubject.complete();
  }

  // ========== PAGINATOR HELPERS ==========
  /**
   * Set whether paginator is mandatory
   */
  protected setIsPaginatorMandatory(value: boolean): void {
    this.isPaginatorMandatory = value;
  }

  /**
   * Update paginator with total count
   */
  public _updatePaginator(filteredDataLength: number): void {
    this.countSubject.next(filteredDataLength);
  }
}
