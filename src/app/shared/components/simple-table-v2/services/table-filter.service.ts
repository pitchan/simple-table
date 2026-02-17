import { Injectable } from '@angular/core';
import { FilterList, FilterEvent } from '../models/filter.model';
import { TableColumnDef } from '../models/column-def.model';

/**
 * Service handling filter logic for SimpleTableV2
 * Extracted from component to respect Single Responsibility Principle
 */
@Injectable()
export class TableFilterService<T> {
  /**
   * Build filter list for a specific column from data
   * Uses original unfiltered data to ensure all values remain visible
   * 
   * @param columnId - Column identifier
   * @param column - Column definition with accessor/formatter
   * @param originalData - Original unfiltered data (NOT current filtered data)
   * @param getCellValueFn - Function to extract cell value
   * @param formatDisplayValueFn - Function to format display value
   * @param existingFilterEvent - Optional existing filter state to preserve checked/unchecked values
   * @returns Array of unique FilterList items
   */
  buildFilterList(
    columnId: string,
    column: TableColumnDef<T>,
    originalData: T[],
    getCellValueFn: (row: T, column: TableColumnDef<T>) => any,
    formatDisplayValueFn: (value: any, column: TableColumnDef<T>) => string,
    existingFilterEvent?: FilterEvent
  ): Array<FilterList> {
    const uniqueValues = new Map<string, FilterList>();

    originalData.forEach(row => {
      const value = getCellValueFn(row, column);
      const displayValue = formatDisplayValueFn(value, column);
      const key = String(displayValue);

      if (!uniqueValues.has(key)) {
        // Preserve checked state from existing filter or default to true
        let checked = true;
        if (existingFilterEvent?.listFiltered) {
          const existingItem = existingFilterEvent.listFiltered.find(
            item => String(item.displayValue) === key
          );
          if (existingItem) {
            checked = existingItem.checked;
          }
        }

        uniqueValues.set(key, {
          checked: checked,
          value: value,
          displayValue: displayValue,
          columnName: columnId,
          hidden: false,
          isColumnDateType: column.type === 'date',
          rawValue: value
        });
      }
    });

    return Array.from(uniqueValues.values());
  }

  /**
   * Apply all active filters with AND logic between columns
   * 
   * @param originalData - Original unfiltered data
   * @param filteredColumnList - Active filters
   * @param getColumnFn - Function to get column definition
   * @param getCellValueFn - Function to extract cell value
   * @param formatDisplayValueFn - Function to format display value
   * @returns Filtered data array
   */
  applyAllFilters(
    originalData: T[],
    filteredColumnList: FilterEvent[],
    getColumnFn: (columnId: string) => TableColumnDef<T> | undefined,
    getCellValueFn: (row: T, column: TableColumnDef<T>) => any,
    formatDisplayValueFn: (value: any, column: TableColumnDef<T>) => string
  ): T[] {
    let filtered = [...originalData];

    filteredColumnList.forEach(filterEvent => {
      if (filterEvent.eventType === 'checkbox' || filterEvent.eventType === 'search') {
        filtered = this.filterByCheckbox(filtered, filterEvent, getColumnFn, getCellValueFn, formatDisplayValueFn);
      } else if (filterEvent.eventType === 'advance') {
        filtered = this.filterByAdvanced(filtered, filterEvent, getColumnFn, getCellValueFn);
      }
    });

    return filtered;
  }

  /**
   * Apply all active filters EXCEPT one column (for cascading filter lists)
   * Used to build filter list for column X showing values from rows that pass OTHER columns' filters
   * 
   * CRITICAL: Column X's own filter is excluded so unchecked values remain visible for re-checking
   * Implements table-tree-view logic: !(item.hidden && item.filteredBy != columnName)
   * 
   * @param originalData - Original unfiltered data
   * @param filteredColumnList - Active filters
   * @param excludeColumnId - Column to exclude from filtering
   * @param getColumnFn - Function to get column definition
   * @param getCellValueFn - Function to extract cell value
   * @param formatDisplayValueFn - Function to format display value
   * @returns Filtered data array
   */
  applyFiltersExcept(
    originalData: T[],
    filteredColumnList: FilterEvent[],
    excludeColumnId: string,
    getColumnFn: (columnId: string) => TableColumnDef<T> | undefined,
    getCellValueFn: (row: T, column: TableColumnDef<T>) => any,
    formatDisplayValueFn: (value: any, column: TableColumnDef<T>) => string
  ): T[] {
    let filtered = [...originalData];

    // Apply filters from all columns EXCEPT the excluded one
    filteredColumnList.forEach(filterEvent => {
      if (filterEvent.columnName === excludeColumnId) {
        return; // Skip this column's filter
      }

      if (filterEvent.eventType === 'checkbox' || filterEvent.eventType === 'search') {
        filtered = this.filterByCheckbox(filtered, filterEvent, getColumnFn, getCellValueFn, formatDisplayValueFn);
      } else if (filterEvent.eventType === 'advance') {
        filtered = this.filterByAdvanced(filtered, filterEvent, getColumnFn, getCellValueFn);
      }
    });

    return filtered;
  }

  /**
   * Apply checkbox filter to data array
   */
  private filterByCheckbox(
    data: T[],
    filterEvent: FilterEvent,
    getColumnFn: (columnId: string) => TableColumnDef<T> | undefined,
    getCellValueFn: (row: T, column: TableColumnDef<T>) => any,
    formatDisplayValueFn: (value: any, column: TableColumnDef<T>) => string
  ): T[] {
    const uncheckedValues = filterEvent.listFiltered
      .filter(item => !item.checked)
      .map(item => String(item.displayValue));

    if (uncheckedValues.length === 0) return data;

    const column = getColumnFn(filterEvent.columnName);
    if (!column) return data;

    return data.filter(row => {
      const value = getCellValueFn(row, column);
      const displayValue = formatDisplayValueFn(value, column);
      return !uncheckedValues.includes(String(displayValue));
    });
  }

  /**
   * Apply advanced filter with operators
   */
  private filterByAdvanced(
    data: T[],
    filterEvent: FilterEvent,
    getColumnFn: (columnId: string) => TableColumnDef<T> | undefined,
    getCellValueFn: (row: T, column: TableColumnDef<T>) => any
  ): T[] {
    const column = getColumnFn(filterEvent.columnName);
    if (!column) return data;

    const advFilter = filterEvent.advanceFilter;
    if (!advFilter) return data;

    return data.filter(row => {
      const value = getCellValueFn(row, column);
      const strValue = String(value).toLowerCase();

      // Check condition 1
      let condition1 = true;
      if (advFilter.advanceFilterType1?.searchInput1) {
        const input1 = advFilter.advanceFilterType1.searchInput1.toLowerCase();
        const op1 = advFilter.advanceFilterType1.operatorType1;
        condition1 = this.applyOperator(strValue, input1, op1);
      }

      // Check condition 2
      let condition2 = true;
      if (advFilter.advanceFilterType2?.searchInput2) {
        const input2 = advFilter.advanceFilterType2.searchInput2.toLowerCase();
        const op2 = advFilter.advanceFilterType2.operatorType2;
        condition2 = this.applyOperator(strValue, input2, op2);
      }

      // Combine with AND/OR
      const operatorType = advFilter.operatorType || 'AND';
      return operatorType === 'OR' ? (condition1 || condition2) : (condition1 && condition2);
    });
  }

  /**
   * Apply a single operator comparison
   */
  private applyOperator(value: string, searchTerm: string, operator: string): boolean {
    switch (operator) {
      case 'contains':
        return value.includes(searchTerm);
      case 'startsWith':
        return value.startsWith(searchTerm);
      case 'endsWith':
        return value.endsWith(searchTerm);
      case 'equals':
        return value === searchTerm;
      case 'notEquals':
        return value !== searchTerm;
      default:
        return true;
    }
  }

  /**
   * Synchronize a filter list with checkbox changes from a FilterEvent.
   * Returns the updated list with checked/unchecked state applied.
   *
   * @param currentList - Current filter list for the column
   * @param event - FilterEvent containing newCheckedValues/newUncheckedValues
   * @param columnId - Column identifier (used for filteredBy)
   * @returns Updated filter list with checkbox states applied
   */
  syncFilterListFromEvent(
    currentList: FilterList[],
    event: FilterEvent,
    columnId: string
  ): FilterList[] {
    return currentList.map(item => {
      const itemKey = String(item.displayValue);

      const wasChecked = event.newCheckedValues?.some(
        v => String(v.displayValue) === itemKey
      );
      const wasUnchecked = event.newUncheckedValues?.some(
        v => String(v.displayValue) === itemKey
      );

      if (wasChecked || wasUnchecked) {
        return {
          ...item,
          checked: !!wasChecked,
          filteredBy: wasChecked ? undefined : columnId,
        };
      }
      return item;
    });
  }

  /**
   * Format value for display in filter list
   */
  formatDisplayValue(value: any, column: TableColumnDef<T>): string {
    if (value == null || value === '') return '(Empty)';
    
    if (column.formatter) {
      return column.formatter(value, {} as T);
    }

    if (value instanceof Date) {
      return value.toLocaleDateString();
    }

    if (typeof value === 'object' && 'code' in value) {
      return value.code;
    }

    return String(value);
  }
}
