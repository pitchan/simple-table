/**
 * Filter models for SimpleTableV2 column filtering
 * Extracted from table-column-custom-filter to avoid circular dependencies
 */

/**
 * Represents a filterable item in the column filter list
 */
export interface FilterList {
  checked: boolean;
  value: string | { code: string }[];
  columnName: string;
  isColumnDateType: boolean;
  rawValue?: any;
  displayValue: string;
  hidden: boolean;
  filteredBy?: string;
}

/**
 * Filter event emitted when user applies filters
 */
export interface FilterEvent {
  listFiltered: FilterList[];
  advanceFilter: {
    searchFilter: string;
    operatorType: string;
    advanceFilterType1: {
      operatorType1: string;
      searchInput1: string;
    };
    advanceFilterType2: {
      operatorType2: string;
      searchInput2: string;
    };
  };
  isFilteredFirst: boolean | null;
  columnName: string;
  columnIsTree?: boolean;
  reset: boolean;
  eventType: string;
  editableType?: string;
  isValueChecked?: boolean;
  newCheckedValues?: FilterList[];
  newUncheckedValues?: FilterList[];
  isAllSelected?: boolean;
  selectAllTriggered?: boolean;
}

/**
 * Operator configuration for advanced filters
 */
export interface FilterOperator {
  label: string;
  value: string;
  fieldType: 'text' | 'number' | 'date' | 'all';
}
