import { TestBed } from '@angular/core/testing';
import { DestroyRef, ChangeDetectorRef } from '@angular/core';
import { TableStrategyFactory } from './strategy.factory';
import { ArrayTableStrategy } from './array-table.strategy';
import { FilterableDataSourceStrategy } from './filterable-datasource.strategy';
import { FilterableDataSource } from 'src/app/core/data-sources/common-data-sources/filterable-data-source';
import { MatPaginator } from '@angular/material/paginator';
import { DataSource } from '@angular/cdk/collections';
import { BehaviorSubject } from 'rxjs';

describe('TableStrategyFactory', () => {
  let mockDestroyRef: DestroyRef;
  let mockCdr: jasmine.SpyObj<ChangeDetectorRef>;

  beforeEach(() => {
    mockDestroyRef = jasmine.createSpyObj('DestroyRef', ['onDestroy']);
    mockCdr = jasmine.createSpyObj('ChangeDetectorRef', ['markForCheck']);
  });

  it('should create ArrayTableStrategy for array data', () => {
    const data = [{ id: 1 }, { id: 2 }];

    const strategy = TableStrategyFactory.create(data, mockDestroyRef, mockCdr);

    expect(strategy).toBeInstanceOf(ArrayTableStrategy);
  });

  it('should create ArrayTableStrategy for empty array', () => {
    const data: any[] = [];

    const strategy = TableStrategyFactory.create(data, mockDestroyRef, mockCdr);

    expect(strategy).toBeInstanceOf(ArrayTableStrategy);
  });

  it('should create FilterableDataSourceStrategy for FilterableDataSource', () => {
    // Create mock FilterableDataSource with required properties
    // Using modelsSubject (BehaviorSubject) as in the real implementation
    const mockFilterableDataSource = {
      paginator: null,
      sort: null,
      length$: new BehaviorSubject(0).asObservable(),
      modelsSubject: new BehaviorSubject([]),
      loading$: new BehaviorSubject(false).asObservable(),
      loadPage: () => {},
      connect: () => new BehaviorSubject([]).asObservable(),
      disconnect: () => {},
    } as unknown as FilterableDataSource<any, unknown, MatPaginator>;

    const strategy = TableStrategyFactory.create(
      mockFilterableDataSource,
      mockDestroyRef,
      mockCdr
    );

    expect(strategy).toBeInstanceOf(FilterableDataSourceStrategy);
  });

  it('should create ArrayTableStrategy for generic DataSource', () => {
    // Create mock generic DataSource
    const mockDataSource = {
      connect: () => {},
      disconnect: () => {},
    } as unknown as DataSource<any>;

    const strategy = TableStrategyFactory.create(mockDataSource, mockDestroyRef, mockCdr);

    // Falls back to ArrayTableStrategy (generic DataSource not yet implemented)
    expect(strategy).toBeInstanceOf(ArrayTableStrategy);
  });

  it('should pass debug config to strategy', () => {
    const data = [{ id: 1 }];
    const config = { debug: true };

    const strategy = TableStrategyFactory.create(data, mockDestroyRef, mockCdr, config);

    expect(strategy).toBeInstanceOf(ArrayTableStrategy);
    expect((strategy as any).config?.debug).toBe(true);
  });

  it('should handle null or undefined data gracefully', () => {
    const strategyNull = TableStrategyFactory.create(null as any, mockDestroyRef, mockCdr);
    const strategyUndefined = TableStrategyFactory.create(
      undefined as any,
      mockDestroyRef,
      mockCdr
    );

    expect(strategyNull).toBeInstanceOf(ArrayTableStrategy);
    expect(strategyUndefined).toBeInstanceOf(ArrayTableStrategy);
  });

  describe('Type Guards', () => {
    it('should correctly identify FilterableDataSource', () => {
      // Use modelsSubject instead of dataToRender$
      const mockFilterable = {
        paginator: {},
        length$: {},
        modelsSubject: new BehaviorSubject([]),
        loading$: {},
        loadPage: () => {},
      };

      const result = (TableStrategyFactory as any).isFilterableDataSource(mockFilterable);
      expect(result).toBe(true);
    });

    it('should reject non-FilterableDataSource', () => {
      const notFilterable1 = { connect: () => {} };
      const notFilterable2 = { paginator: {} }; // Missing other properties
      const notFilterable3 = null;
      const notFilterable4 = { paginator: {}, length$: {}, loading$: {} }; // Missing modelsSubject and loadPage

      expect((TableStrategyFactory as any).isFilterableDataSource(notFilterable1)).toBe(false);
      expect((TableStrategyFactory as any).isFilterableDataSource(notFilterable2)).toBe(false);
      expect((TableStrategyFactory as any).isFilterableDataSource(notFilterable3)).toBe(false);
      expect((TableStrategyFactory as any).isFilterableDataSource(notFilterable4)).toBe(false);
    });

    it('should correctly identify DataSource', () => {
      const mockDataSource = {
        connect: () => {},
        disconnect: () => {},
      };

      const result = (TableStrategyFactory as any).isDataSource(mockDataSource);
      expect(result).toBe(true);
    });

    it('should reject non-DataSource', () => {
      const notDataSource1 = { connect: () => {} }; // Missing disconnect
      const notDataSource2 = [1, 2, 3];
      const notDataSource3 = null;

      expect((TableStrategyFactory as any).isDataSource(notDataSource1)).toBe(false);
      expect((TableStrategyFactory as any).isDataSource(notDataSource2)).toBe(false);
      expect((TableStrategyFactory as any).isDataSource(notDataSource3)).toBe(false);
    });
  });
});
