import { DestroyRef, ChangeDetectorRef } from '@angular/core';
import { ArrayTableStrategy } from './array-table.strategy';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { Subject } from 'rxjs';

describe('ArrayTableStrategy', () => {
  let strategy: ArrayTableStrategy<any>;
  let mockDestroyRef: DestroyRef;
  let mockCdr: jasmine.SpyObj<ChangeDetectorRef>;

  beforeEach(() => {
    mockDestroyRef = { onDestroy: new Subject<void>() } as unknown as DestroyRef;
    mockCdr = jasmine.createSpyObj('ChangeDetectorRef', ['markForCheck']);

    strategy = new ArrayTableStrategy(mockDestroyRef, mockCdr);
  });

  it('should create', () => {
    expect(strategy).toBeTruthy();
  });

  it('should initialize with array data and synchronize signals immediately', () => {
    const testData = [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
    ];

    strategy.initialize(testData);

    // Pipeline: filteredSortedSig has 2 items, displayRows = slice(0, 50) = 2 items
    expect(strategy.totalCount()).toBe(2);
    expect(strategy.data().length).toBe(2);
    expect(strategy.data()).toEqual(testData);
  });

  it('should call markForCheck when initializing data', () => {
    const testData = [{ id: 1 }];
    
    strategy.initialize(testData);
    
    expect(mockCdr.markForCheck).toHaveBeenCalled();
  });

  it('should handle empty array', () => {
    strategy.initialize([]);
    expect(strategy.totalCount()).toBe(0);
    expect(strategy.data()).toEqual([]);
  });

  it('should sort dates correctly', () => {
    const accessor = strategy['defaultSortingAccessor'].bind(strategy);

    const item1 = { date: new Date('2024-01-01') };
    const item2 = { date: new Date('2024-01-02') };

    const result1 = accessor(item1, 'date');
    const result2 = accessor(item2, 'date');

    expect(typeof result1).toBe('number');
    expect(typeof result2).toBe('number');
    expect(result1 < result2).toBe(true);
  });

  it('should sort strings case-insensitively', () => {
    const accessor = strategy['defaultSortingAccessor'].bind(strategy);

    const item1 = { name: 'Alpha' };
    const item2 = { name: 'beta' };

    const result1 = accessor(item1, 'name');
    const result2 = accessor(item2, 'name');

    expect(result1).toBe('alpha');
    expect(result2).toBe('beta');
  });

  it('should handle objects with code property', () => {
    const accessor = strategy['defaultSortingAccessor'].bind(strategy);

    const item = { type: { code: 'ABC', name: 'Type ABC' } };

    const result = accessor(item, 'type');

    expect(result).toBe('abc');
  });

  it('should handle arrays', () => {
    const accessor = strategy['defaultSortingAccessor'].bind(strategy);

    const item1 = { tags: ['Beta', 'Alpha'] };
    const item2 = { tags: [{ code: 'GAMMA' }] };
    const item3 = { tags: [] };

    expect(accessor(item1, 'tags')).toBe('beta');
    expect(accessor(item2, 'tags')).toBe('gamma');
    expect(accessor(item3, 'tags')).toBe('');
  });

  it('should handle null and undefined', () => {
    const accessor = strategy['defaultSortingAccessor'].bind(strategy);

    const item1 = { value: null };
    const item2 = { value: undefined };
    const item3 = {};

    expect(accessor(item1, 'value')).toBe('');
    expect(accessor(item2, 'value')).toBe('');
    expect(accessor(item3, 'value')).toBe('');
  });

  it('should parse date strings', () => {
    const accessor = strategy['defaultSortingAccessor'].bind(strategy);

    const item = { createdDate: '2024-01-15T10:30:00Z' };

    const result = accessor(item, 'createdDate');

    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThan(0);
  });

  it('should attach paginator and sort (signals-driven, no MatTableDataSource)', () => {
    const testData = [{ id: 1 }, { id: 2 }, { id: 3 }];
    strategy.initialize(testData);

    const sortChange$ = new Subject<{ active: string; direction: 'asc' | 'desc' }>();
    const mockSort = { sortChange: sortChange$.asObservable(), sort: null } as unknown as MatSort;

    const page$ = new Subject<{ pageIndex: number; pageSize: number }>();
    const mockPaginator = {
      page: page$.asObservable(),
      pageIndex: 0,
      pageSize: 50,
    } as unknown as MatPaginator;

    strategy.attachSort(mockSort);
    strategy.attachPaginator(mockPaginator);

    expect(strategy.data().length).toBe(3);
    expect(strategy.totalCount()).toBe(3);

    strategy.setPage(0, 2);
    expect(strategy.data().length).toBe(2);
    expect(strategy.totalCount()).toBe(3);
  });

  it('should refresh data', () => {
    const testData = [{ id: 1 }, { id: 2 }];
    strategy.initialize(testData);

    strategy.refresh();

    expect(strategy.totalCount()).toBe(2);
  });

  it('should handle re-initialization with new data (async data updates)', () => {
    // First initialization with empty array
    strategy.initialize([]);
    expect(strategy.data()).toEqual([]);
    expect(strategy.totalCount()).toBe(0);
    
    // Reset spy to track new calls
    mockCdr.markForCheck.calls.reset();
    
    // Re-initialize with new data (simulating async data arrival)
    const asyncData = [
      { id: 1, name: 'Async Item 1' },
      { id: 2, name: 'Async Item 2' },
      { id: 3, name: 'Async Item 3' },
    ];
    
    strategy.initialize(asyncData);
    
    // Verify signals are updated immediately
    expect(strategy.data()).toEqual(asyncData);
    expect(strategy.totalCount()).toBe(3);
    expect(mockCdr.markForCheck).toHaveBeenCalled();
  });
});
