import { FilterOperator } from './filter.model';

export const COLUMN_DATA_TYPE = {
  TEXT: 'text',
  NUMBER: 'number',
  DATE: 'date',
} as const;

export const TABLE_FILTER_OPERATOR_LIST: FilterOperator[] = [
  { label: 'Contains', value: 'contains', fieldType: 'text' },
  { label: 'Starts with', value: 'startsWith', fieldType: 'text' },
  { label: 'Ends with', value: 'endsWith', fieldType: 'text' },
  { label: 'Equals', value: 'equals', fieldType: 'all' },
  { label: 'Before', value: 'before', fieldType: 'date' },
  { label: 'After', value: 'after', fieldType: 'date' },
];
