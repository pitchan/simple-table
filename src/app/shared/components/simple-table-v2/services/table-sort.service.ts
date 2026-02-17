import { Injectable } from '@angular/core';
import { TableColumnDef } from '../models/column-def.model';

/**
 * Service handling sort logic for SimpleTableV2.
 * Extracted from component to respect Single Responsibility Principle.
 */
@Injectable()
export class TableSortService<T> {
  /**
   * Create a sorting data accessor compatible with MatTableDataSource.
   * Returns a function bound to the provided column list.
   *
   * @param columns - Current column definitions (pass a getter so the
   *                  accessor always reads the latest config)
   * @returns A `(item, columnId) => string | number` function
   */
  createSortingAccessor(
    getColumns: () => TableColumnDef<T>[]
  ): (item: T, columnId: string) => string | number {
    return (item: T, columnId: string) =>
      this.sortingAccessor(item, columnId, getColumns());
  }

  /**
   * Resolve the sortable value for a given row / column.
   *
   * Priority:
   *  1. `column.sortAccessor` (custom sort value)
   *  2. `column.accessor`     (display value, normalised)
   *  3. Direct property access on the row object
   */
  sortingAccessor(
    item: T,
    columnId: string,
    columns: TableColumnDef<T>[]
  ): string | number {
    const column = columns.find(c => c.id === columnId);

    if (column?.sortAccessor) {
      const value = column.sortAccessor(item);
      return value instanceof Date ? value.getTime() : value;
    }

    if (column?.accessor) {
      return this.normalizeValueForSort(column.accessor(item), columnId);
    }

    return this.normalizeValueForSort(
      (item as Record<string, unknown>)[columnId],
      columnId
    );
  }

  /**
   * Normalise any cell value into a `string | number` suitable
   * for MatTableDataSource default comparator.
   *
   * Handles: `null`, `Date`, date-like strings, `{code}` objects,
   * arrays of objects/primitives, plain strings and numbers.
   */
  normalizeValueForSort(value: unknown, columnId: string): string | number {
    if (value == null) return '';

    if (value instanceof Date) return value.getTime();

    if (typeof value === 'string' && columnId.toLowerCase().includes('date')) {
      const parsed = Date.parse(value);
      if (!isNaN(parsed)) return parsed;
    }

    if (typeof value === 'object' && !Array.isArray(value) && 'code' in (value as Record<string, unknown>)) {
      return String((value as Record<string, unknown>)['code']).toLowerCase();
    }

    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];
      if (typeof first === 'object' && first !== null && 'code' in first) {
        return String(first.code).toLowerCase();
      }
      return String(first).toLowerCase();
    }

    if (typeof value === 'string') return value.trim().toLowerCase();

    return value as string | number;
  }
}
