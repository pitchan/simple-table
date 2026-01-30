import { DestroyRef, ChangeDetectorRef } from '@angular/core';
import { DataSource } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import { ITableStrategy, StrategyConfig } from '../models/table-strategy.interface';
import { FilterableDataSource } from 'src/app/core/data-sources/common-data-sources/filterable-data-source';
import { ArrayTableStrategy } from './array-table.strategy';
import { FilterableDataSourceStrategy } from './filterable-datasource.strategy';

/**
 * Factory to auto-detect data type and create appropriate strategy
 * Priority order: FilterableDataSource → Generic DataSource → Array
 */
export class TableStrategyFactory {
  /**
   * Create appropriate strategy based on data source type
   * 
   * @param data - Data source (array, DataSource, or FilterableDataSource)
   * @param destroyRef - DestroyRef for automatic subscription cleanup
   * @param cdr - ChangeDetectorRef for OnPush strategy
   * @param config - Optional strategy configuration
   * @returns Appropriate ITableStrategy implementation
   */
  static create<T>(
    data: T[] | DataSource<T> | FilterableDataSource<T, unknown, MatPaginator>,
    destroyRef: DestroyRef,
    cdr: ChangeDetectorRef,
    config?: StrategyConfig
  ): ITableStrategy<T> {
    // Check for FilterableDataSource first (most specific)
    if (this.isFilterableDataSource(data)) {
      if (config?.debug) {
        console.log('[TableStrategyFactory] Creating FilterableDataSourceStrategy');
      }
      return new FilterableDataSourceStrategy<T>(destroyRef, cdr);
    }

    // Check for generic DataSource
    if (this.isDataSource(data)) {
      if (config?.debug) {
        console.log('[TableStrategyFactory] DataSource detected but not FilterableDataSource');
        console.warn('[TableStrategyFactory] Generic DataSource not yet supported, falling back to ArrayTableStrategy');
      }
      // TODO: Implement generic DataSourceTableStrategy if needed
      // For now, log warning and fall back to array strategy
      return new ArrayTableStrategy<T>(destroyRef, cdr, config);
    }

    // Default to array strategy
    if (config?.debug) {
      console.log('[TableStrategyFactory] Creating ArrayTableStrategy for', Array.isArray(data) ? data.length : 0, 'rows');
    }
    return new ArrayTableStrategy<T>(destroyRef, cdr, config);
  }

  /**
   * Type guard for FilterableDataSource
   * Checks for distinctive properties: paginator, length$, modelsSubject, loading$
   * 
   * NOTE: We check for modelsSubject (BehaviorSubject) which is the main data stream
   * in FilterableDataSource. This is the correct property to check, not dataToRender$.
   */
  private static isFilterableDataSource<T>(
    data: unknown
  ): data is FilterableDataSource<T, unknown, MatPaginator> {
    if (data == null || typeof data !== 'object') {
      return false;
    }

    const obj = data as any;

    // FilterableDataSource has these distinctive properties
    // modelsSubject is the public BehaviorSubject that contains the data
    return (
      'paginator' in obj &&
      'length$' in obj &&
      'modelsSubject' in obj &&
      'loading$' in obj &&
      'loadPage' in obj &&
      typeof obj.loadPage === 'function'
    );
  }

  /**
   * Type guard for generic DataSource
   * Checks for connect() method
   */
  private static isDataSource<T>(data: unknown): data is DataSource<T> {
    if (data == null || typeof data !== 'object') {
      return false;
    }

    const obj = data as any;

    return (
      'connect' in obj &&
      typeof obj.connect === 'function' &&
      'disconnect' in obj &&
      typeof obj.disconnect === 'function'
    );
  }
}
