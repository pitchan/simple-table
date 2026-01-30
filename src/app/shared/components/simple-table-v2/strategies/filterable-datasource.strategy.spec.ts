import { TestBed } from '@angular/core/testing';
import { DestroyRef, ChangeDetectorRef } from '@angular/core';
import { FilterableDataSourceStrategy } from './filterable-datasource.strategy';
import { FilterableDataSource } from 'src/app/core/data-sources/common-data-sources/filterable-data-source';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { BehaviorSubject, of } from 'rxjs';

describe('FilterableDataSourceStrategy', () => {
  let strategy: FilterableDataSourceStrategy<any>;
  let mockDestroyRef: DestroyRef;
  let mockCdr: jasmine.SpyObj<ChangeDetectorRef>;
  let mockDataSource: jasmine.SpyObj<FilterableDataSource<any, unknown, MatPaginator>>;

  // BehaviorSubjects for testing
  let modelsSubject: BehaviorSubject<any[]>;
  let loadingSubject: BehaviorSubject<boolean>;
  let lengthSubject: BehaviorSubject<number>;

  beforeEach(() => {
    mockDestroyRef = jasmine.createSpyObj('DestroyRef', ['onDestroy']);
    mockCdr = jasmine.createSpyObj('ChangeDetectorRef', ['markForCheck']);

    // Create mock FilterableDataSource
    mockDataSource = jasmine.createSpyObj('FilterableDataSource', [
      'connect',
      'disconnect',
      'loadPage',
    ]);

    // Create BehaviorSubjects for observables
    modelsSubject = new BehaviorSubject<any[]>([]);
    loadingSubject = new BehaviorSubject<boolean>(false);
    lengthSubject = new BehaviorSubject<number>(0);

    // Mock observables - using the real structure from FilterableDataSource
    mockDataSource.modelsSubject = modelsSubject;
    mockDataSource.loading$ = loadingSubject.asObservable() as any;
    mockDataSource.length$ = lengthSubject.asObservable() as any;
    (mockDataSource as any).connect = jasmine.createSpy('connect').and.returnValue(modelsSubject.asObservable());

    strategy = new FilterableDataSourceStrategy(mockDestroyRef, mockCdr);
  });

  it('should create', () => {
    expect(strategy).toBeTruthy();
  });

  it('should initialize with FilterableDataSource', () => {
    strategy.initialize(mockDataSource);
    expect(strategy['dataSource']).toBe(mockDataSource);
  });

  it('should have initial signal values', () => {
    expect(strategy.data()).toEqual([]);
    expect(strategy.totalCount()).toBe(0);
    expect(strategy.loading()).toBe(false);
  });

  it('should update data signal when modelsSubject emits', () => {
    strategy.initialize(mockDataSource);

    const testData = [{ id: 1 }, { id: 2 }];
    
    // Connect strategy
    strategy.connect().subscribe();

    // Emit data via modelsSubject
    modelsSubject.next(testData);

    // Verify data signal is updated
    expect(strategy.data()).toEqual(testData);
    expect(mockCdr.markForCheck).toHaveBeenCalled();
  });

  it('should update signals when observables emit', () => {
    strategy.initialize(mockDataSource);
    strategy.connect().subscribe();

    // Emit loading
    loadingSubject.next(true);
    expect(strategy.loading()).toBe(true);

    // Emit count
    lengthSubject.next(42);
    expect(strategy.totalCount()).toBe(42);

    // Emit data via modelsSubject
    const testData = [{ id: 1 }];
    modelsSubject.next(testData);
    expect(strategy.data()).toEqual(testData);
  });

  it('should attach sort before paginator', () => {
    const mockSort = {} as MatSort;
    const mockPaginator = {} as MatPaginator;

    strategy.initialize(mockDataSource);

    strategy.attachSort(mockSort);
    expect(mockDataSource.sort).toBe(mockSort);

    strategy.attachPaginator(mockPaginator);
    expect(mockDataSource.paginator).toBe(mockPaginator);
  });

  it('should call loadPage on refresh', () => {
    strategy.initialize(mockDataSource);
    strategy.refresh();
    expect(mockDataSource.loadPage).toHaveBeenCalled();
  });

  it('should disconnect data source', () => {
    strategy.initialize(mockDataSource);
    strategy.disconnect();
    expect(mockDataSource.disconnect).toHaveBeenCalled();
  });

  it('should handle multiple data emissions', () => {
    strategy.initialize(mockDataSource);
    strategy.connect().subscribe();

    // First emission
    modelsSubject.next([{ id: 1 }]);
    expect(strategy.data().length).toBe(1);

    // Second emission (replace data)
    modelsSubject.next([{ id: 2 }, { id: 3 }]);
    expect(strategy.data().length).toBe(2);
    expect(strategy.data()[0].id).toBe(2);
  });

  it('should handle empty data emission', () => {
    strategy.initialize(mockDataSource);
    strategy.connect().subscribe();

    // Emit non-empty data first
    modelsSubject.next([{ id: 1 }]);
    expect(strategy.data().length).toBe(1);

    // Then emit empty array
    modelsSubject.next([]);
    expect(strategy.data().length).toBe(0);
  });
});
