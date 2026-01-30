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
    const dataToRenderSubject = new BehaviorSubject<any[]>([]);
    const loadingSubject = new BehaviorSubject<boolean>(false);
    const lengthSubject = new BehaviorSubject<number>(0);
    const dataOfRangeSubject = new BehaviorSubject<any[]>([]);

    // Mock observables
    mockDataSource.dataToRender$ = dataToRenderSubject.asObservable() as any;
    mockDataSource.loading$ = loadingSubject.asObservable() as any;
    mockDataSource.length$ = lengthSubject.asObservable() as any;
    mockDataSource.dataOfRange$ = dataOfRangeSubject;
    (mockDataSource as any).connect = jasmine.createSpy('connect').and.returnValue(of([]));

    // Store subjects for testing
    (mockDataSource as any)._dataToRenderSubject = dataToRenderSubject;
    (mockDataSource as any)._loadingSubject = loadingSubject;
    (mockDataSource as any)._lengthSubject = lengthSubject;

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

  it('should bridge dataToRender$ to dataOfRange$', (done) => {
    strategy.initialize(mockDataSource);

    const testData = [{ id: 1 }, { id: 2 }];
    
    // Connect strategy
    strategy.connect().subscribe();

    // Emit data via subject
    (mockDataSource as any)._dataToRenderSubject.next(testData);

    // Verify bridge
    mockDataSource.dataOfRange$.subscribe((data) => {
      expect(data).toEqual(testData);
      done();
    });
  });

  it('should update signals when observables emit', () => {
    strategy.initialize(mockDataSource);
    strategy.connect().subscribe();

    // Emit loading via subject
    (mockDataSource as any)._loadingSubject.next(true);
    expect(strategy.loading()).toBe(true);

    // Emit count via subject
    (mockDataSource as any)._lengthSubject.next(42);
    expect(strategy.totalCount()).toBe(42);

    // Emit data via subject
    const testData = [{ id: 1 }];
    (mockDataSource as any)._dataToRenderSubject.next(testData);
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
});
