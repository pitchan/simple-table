import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { cloneDeep, uniqBy } from 'lodash-es';
import { COLUMN_DATA_TYPE, TABLE_FILTER_OPERATOR_LIST } from '../../models/filter-constants';
import { FilterEvent, FilterList, FilterOperator } from '../../models/filter.model';
import { LocalizedDatePipe } from '../../pipes/localized-date.pipe';

/**
 * TableColumnFilterV2Component - Generic column filter (No TreeView, No Business Logic)
 * 
 * Pure presentation component for filtering table columns with:
 * - Checkbox list with search
 * - Advanced filters (text/number/date operators)
 * - Select All / Reset
 * 
 * OnPush strategy with signals for optimal performance.
 * 
 * @example
 * ```html
 * <app-table-column-filter-v2
 *   [filterItems]="columnFilterListMap().get(column.id) || []"
 *   [columnName]="column.id"
 *   [columnType]="column.type || 'text'"
 *   (filterChange)="handleFilterEvent($event, column.id)"
 *   (resetFilter)="handleResetFilter(column.id)">
 * </app-table-column-filter-v2>
 * ```
 */
@Component({
  selector: 'app-table-column-filter-v2',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCheckboxModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    MatRadioModule,
    MatIconModule,
    MatDatepickerModule,
    LocalizedDatePipe,
  ],
  templateUrl: './table-column-filter-v2.component.html',
  styleUrls: ['./table-column-filter-v2.component.scss'],
})
export class TableColumnFilterV2Component implements OnChanges {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);

  // Inputs
  @Input() filterListMap: Map<string, FilterList[]> = new Map();
  @Input() columnName!: string;
  @Input() filteredColumnList: FilterEvent[] = [];

  // Outputs
  @Output() filteredEvents = new EventEmitter<FilterEvent>(true);
  @Output() resetCustomFilterEvent = new EventEmitter<void>();

  @ViewChild(MatMenuTrigger) trigger!: MatMenuTrigger;

  // Signals for reactive state
  filterList = signal<FilterList[]>([]);
  cloneFilterList = signal<FilterList[]>([]);
  isAllSelected = signal(true);
  isAdvanceFilterOpen = signal(false);
  
  // Computed
  visibleFilterItems = computed(() => 
    this.filterList().filter(item => !item.hidden)
  );

  /**
   * Check if some (but not all) items are checked (for indeterminate state)
   */
  hasSomeChecked = computed(() => {
    const list = this.filterList();
    return !this.isAllSelected() && list.some(item => item.checked);
  });

  // Form
  searchFilterControl = new FormControl<string | null>(null);
  customFilter: FormGroup;
  operatorList: FilterOperator[] = TABLE_FILTER_OPERATOR_LIST as FilterOperator[];
  filteredOperatorList: FilterOperator[] = TABLE_FILTER_OPERATOR_LIST as FilterOperator[];
  isColumnDataType: string = '';

  // Tracking new checked/unchecked for performance
  private newCheckedValues: FilterList[] = [];
  private newUncheckedValues: FilterList[] = [];

  constructor() {
    this.customFilter = this.formBuilder.group({
      searchFilter: this.searchFilterControl,
      operatorType: ['OR'],
      advanceFilterType1: this.formBuilder.group({
        operatorType1: ['contains'],
        searchInput1: [''],
      }),
      advanceFilterType2: this.formBuilder.group({
        operatorType2: ['contains'],
        searchInput2: [''],
      }),
    });

    // Search filter with debounce
    this.searchFilterControl.valueChanges
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((value) => {
        this.onSearchChange(value ?? '');
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filterListMap']?.currentValue) {
      const newFilterList: FilterList[] = cloneDeep(
        changes['filterListMap'].currentValue.get(this.columnName) || []
      );

      // Sort numerically if applicable
      const sortedList = newFilterList.sort((a: FilterList, b: FilterList) =>
        Number(a.value) - Number(b.value)
      );

      this.filterList.set(newFilterList);
      this.cloneFilterList.set(sortedList);

      // Restore search filter if present
      this.filterDataByInput();

      // Reset tracking arrays
      this.newCheckedValues = [];
      this.newUncheckedValues = [];
    }
  }

  /**
   * Handle checkbox change
   */
  checkboxChanged(event: MatCheckboxChange, index: number): void {
    const updated = [...this.filterList()];
    updated[index].checked = event.checked;
    updated[index].filteredBy = event.checked ? undefined : this.columnName;
    this.filterList.set(updated);

    const cloneUpdated = [...this.cloneFilterList()];
    cloneUpdated[index].checked = event.checked;
    cloneUpdated[index].filteredBy = event.checked ? undefined : this.columnName;
    this.cloneFilterList.set(cloneUpdated);

    // Track changes
    if (event.checked) {
      this.newCheckedValues.push(cloneUpdated[index]);
    } else {
      this.newUncheckedValues.push(cloneUpdated[index]);
    }

    this.isAllSelected.set(updated.every((item) => item.checked));

    this.emitFilterEvent('checkbox', event.checked);

    // Cleanup
    this.newCheckedValues = [];
    this.newUncheckedValues = [];
  }

  /**
   * Select/Deselect all checkboxes
   */
  selectAll(event: MatCheckboxChange): void {
    const isChecked = event.checked;
    this.isAllSelected.set(isChecked);

    const updated = this.filterList().map((item) => {
      if (!item.hidden) {
        item.checked = isChecked;
        item.filteredBy = isChecked ? undefined : this.columnName;
      }
      return item;
    });

    this.filterList.set(updated);
    this.cloneFilterList.set(cloneDeep(updated));

    // Track all visible items
    if (isChecked) {
      this.newCheckedValues = [...updated];
    } else {
      this.newUncheckedValues = [...updated];
    }

    this.emitFilterEvent('checkbox', isChecked, true);

    // Cleanup
    this.newCheckedValues = [];
    this.newUncheckedValues = [];
  }

  /**
   * Search filter logic
   */
  onSearchChange(searchInput: string): void {
    if (!searchInput || searchInput.length === 0) {
      const updated = this.filterList().map((item) => {
        item.hidden = false;
        return item;
      });
      this.filterList.set(updated);
      this.isAllSelected.set(updated.every((item) => item.checked));
      this.cdr.markForCheck();
      return;
    }

    const searchLower = searchInput.toLowerCase();
    const updated = this.filterList().map((item) => {
      const isEmpty = item.displayValue?.toLowerCase() === '(empty)';
      const matches = item.displayValue?.toLowerCase().includes(searchLower);
      item.hidden = isEmpty || !matches;
      return item;
    });

    this.filterList.set(updated);
    this.isAllSelected.set(updated.every((item) => item.checked));
    this.cloneFilterList.set([...updated]);
    this.cdr.markForCheck();
  }

  /**
   * Handle Enter key on search
   */
  onEnterChange(): void {
    const searchValue = this.searchFilterControl.value;

    if (!searchValue || searchValue.length === 0) {
      const updated = this.filterList().map((item) => {
        item.checked = true;
        item.hidden = false;
        return item;
      });
      this.filterList.set(updated);
      this.isAllSelected.set(true);
    } else {
      const searchLower = searchValue.toLowerCase();
      const updated = this.filterList().map((item) => {
        const isEmpty = item.displayValue?.toLowerCase() === '(empty)';
        const matches = item.displayValue?.toLowerCase().includes(searchLower);

        if (!isEmpty && matches) {
          item.checked = true;
          item.hidden = false;
        } else {
          item.checked = false;
          item.hidden = true;
        }
        return item;
      });
      this.filterList.set(updated);
      this.cloneFilterList.set([...updated]);
    }

    this.emitFilterEvent('search');
    this.cdr.markForCheck();
  }

  /**
   * Toggle advanced filter panel
   */
  viewAdvanceFilter(): void {
    this.isAdvanceFilterOpen.update(v => !v);
    this.isColumnDataType = this.determineColumnType();

    const selectedOperatorData = this.fetchSelectedOperatorType();
    this.setDefaultOperators(selectedOperatorData);

    this.filteredOperatorList = this.operatorList.filter(
      (item) =>
        item.fieldType === this.isColumnDataType || item.fieldType === 'all'
    );

    if (this.isAdvanceFilterOpen()) {
      this.trigger?.openMenu();
      this.operatorTypeChange();
    } else {
      this.trigger?.closeMenu();
    }
  }

  /**
   * Handle advanced filter operator change
   */
  operatorTypeChange(event?: KeyboardEvent): void {
    event?.stopPropagation();

    // Date filtering
    if (this.isColumnDataType === COLUMN_DATA_TYPE.DATE) {
      const hasInput1 = this.customFilter.value?.advanceFilterType1?.searchInput1;
      const hasInput2 = this.customFilter.value?.advanceFilterType2?.searchInput2;

      if (hasInput1 || hasInput2) {
        this.applyDateFilter();
      } else {
        this.resetFilterVisibility();
      }

      this.cloneFilterList.set([...this.filterList()]);
      this.emitFilterEvent('advance');
      return;
    }

    // Text/Number filtering
    this.searchFilterControl.patchValue(null);

    const hasInput1 = this.customFilter.value?.advanceFilterType1?.searchInput1;
    const hasInput2 = this.customFilter.value?.advanceFilterType2?.searchInput2;

    if (!hasInput1 && !hasInput2) {
      this.resetFilterVisibility();
      this.emitFilterEvent('advance', undefined, false, true);
      return;
    }

    const filtered1 = this.applyTextFilter(1);
    const filtered2 = this.applyTextFilter(2);

    const operatorType = this.customFilter.get('operatorType')!.value;
    let result: FilterList[];

    if (operatorType === 'OR') {
      result = [...filtered1, ...filtered2];
    } else if (operatorType === 'AND') {
      result = filtered1.filter((item1) =>
        filtered2.some((item2) => item1.displayValue === item2.displayValue)
      );
    } else {
      result = [];
    }

    const uniqueResult = uniqBy(result, 'value');
    this.filterList.set(uniqueResult.length ? uniqueResult : []);

    this.emitFilterEvent('advance');
  }

  /**
   * Apply text filter for advanced search
   */
  private applyTextFilter(inputNumber: 1 | 2): FilterList[] {
    const input = this.customFilter.value?.[`advanceFilterType${inputNumber}`]?.[`searchInput${inputNumber}`];
    if (!input) return [];

    const searchLower = input.toLowerCase();
    const operation = this.customFilter.get(`advanceFilterType${inputNumber}`)!.get(`operatorType${inputNumber}`)!.value;

    return this.cloneFilterList().filter((item) => {
      let matches = false;

      if (typeof item.value === 'string') {
        const valueLower = item.value.toLowerCase();
        matches = this.applyStringOperation(valueLower, searchLower, operation);
      } else if (Array.isArray(item.value)) {
        matches = item.value.some((v) =>
          this.applyStringOperation(v.code.toLowerCase(), searchLower, operation)
        );
      }

      item.checked = matches;
      item.hidden = !matches;
      return matches;
    });
  }

  /**
   * Apply string comparison operation
   */
  private applyStringOperation(value: string, search: string, operation: string): boolean {
    switch (operation) {
      case 'contains':
        return value.includes(search);
      case 'startsWith':
        return value.startsWith(search);
      case 'endsWith':
        return value.endsWith(search);
      case 'equals':
        return value === search;
      default:
        return false;
    }
  }

  /**
   * Apply date filter
   */
  private applyDateFilter(): void {
    const input1 = this.customFilter.value?.advanceFilterType1?.searchInput1;
    const input2 = this.customFilter.value?.advanceFilterType2?.searchInput2;
    const operator1 = this.customFilter.value?.advanceFilterType1?.operatorType1;
    const operator2 = this.customFilter.value?.advanceFilterType2?.operatorType2;
    const operatorType = this.customFilter.get('operatorType')!.value;

    const date1 = input1 ? new Date(input1) : null;
    const date2 = input2 ? new Date(input2) : null;

    const updated = this.filterList().map((item) => {
      if (item.displayValue?.toLowerCase() === '(empty)') {
        item.checked = false;
        item.hidden = true;
        return item;
      }

      const itemDate = this.parseDisplayDate(item.displayValue);
      if (!itemDate) {
        item.checked = false;
        item.hidden = true;
        return item;
      }

      let condition1 = false;
      let condition2 = false;

      if (date1) {
        condition1 = this.compareDates(itemDate, date1, operator1);
      }

      if (date2) {
        condition2 = this.compareDates(itemDate, date2, operator2);
      }

      const matches =
        operatorType === 'OR' ? condition1 || condition2 : condition1 && condition2;

      item.checked = matches;
      item.hidden = !matches;
      return item;
    });

    this.filterList.set(updated);
    this.cloneFilterList.set([...updated]);
  }

  /**
   * Parse date from DD/MM/YYYY format
   */
  private parseDisplayDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    
    return new Date(year, month, day);
  }

  /**
   * Compare dates based on operator
   */
  private compareDates(itemDate: Date, filterDate: Date, operator: string): boolean {
    // Normalize to midnight for comparison
    const item = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
    const filter = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate());

    switch (operator) {
      case 'equals':
        return item.getTime() === filter.getTime();
      case 'before':
        return item.getTime() < filter.getTime();
      case 'after':
        return item.getTime() > filter.getTime();
      default:
        return false;
    }
  }

  /**
   * Reset all filters
   */
  reset(): void {
    this.filterList.set([...this.cloneFilterList()]);
    this.isAllSelected.set(true);
    this.trigger?.closeMenu();

    this.customFilter.setValue({
      searchFilter: '',
      operatorType: 'OR',
      advanceFilterType1: {
        operatorType1: 'contains',
        searchInput1: '',
      },
      advanceFilterType2: {
        operatorType2: 'contains',
        searchInput2: '',
      },
    });

    this.emitFilterEvent('advance', undefined, false, true);
  }

  /**
   * Emit filter event
   */
  private emitFilterEvent(
    eventType: string,
    isValueChecked?: boolean,
    selectAllTriggered: boolean = false,
    reset: boolean = false
  ): void {
    const filterEventVal: FilterEvent = {
      listFiltered: this.cloneFilterList(),
      advanceFilter: this.customFilter.getRawValue(),
      isFilteredFirst: null,
      columnName: this.columnName,
      reset,
      eventType,
      isValueChecked,
      newCheckedValues: [...this.newCheckedValues],
      newUncheckedValues: [...this.newUncheckedValues],
      isAllSelected: this.isAllSelected(),
      selectAllTriggered,
    };

    this.filteredEvents.emit(filterEventVal);
  }

  /**
   * Determine column type
   */
  private determineColumnType(): string {
    if (this.columnName?.toLowerCase().includes(COLUMN_DATA_TYPE.DATE)) {
      return COLUMN_DATA_TYPE.DATE;
    }
    return COLUMN_DATA_TYPE.TEXT;
  }

  /**
   * Set default operators based on column type
   */
  private setDefaultOperators(selectedOperatorData: any): void {
    if (this.isColumnDataType === COLUMN_DATA_TYPE.DATE) {
      this.customFilter
        .get('advanceFilterType1')!
        .get('operatorType1')!
        .patchValue(selectedOperatorData?.operatorType1 || 'before');
      this.customFilter
        .get('advanceFilterType2')!
        .get('operatorType2')!
        .patchValue(selectedOperatorData?.operatorType2 || 'before');
    } else {
      this.customFilter
        .get('advanceFilterType1')!
        .get('operatorType1')!
        .patchValue(selectedOperatorData?.operatorType1 || 'contains');
      this.customFilter
        .get('advanceFilterType2')!
        .get('operatorType2')!
        .patchValue(selectedOperatorData?.operatorType2 || 'contains');
    }
  }

  /**
   * Fetch selected operator type from previous state
   */
  private fetchSelectedOperatorType(): any {
    if (!this.filteredColumnList?.length) return null;

    const operatorTypeData = this.filteredColumnList.find(
      (item) => item.columnName === this.columnName
    );

    if (operatorTypeData?.advanceFilter) {
      return {
        operatorType1:
          operatorTypeData.advanceFilter.advanceFilterType1?.operatorType1,
        operatorType2:
          operatorTypeData.advanceFilter.advanceFilterType2?.operatorType2,
      };
    }

    return null;
  }

  /**
   * Reset filter visibility (show all, check all)
   */
  private resetFilterVisibility(): void {
    const updated = this.filterList().map((item) => {
      item.checked = true;
      item.hidden = false;
      return item;
    });
    this.filterList.set(updated);
  }

  /**
   * Restore search filter if present
   */
  private filterDataByInput(): void {
    const searchValue = this.searchFilterControl.value;
    if (searchValue) {
      this.onSearchChange(searchValue);
    }
  }

  /**
   * TrackBy function for performance
   */
  trackItem(_index: number, item: FilterList): any {
    return item.displayValue;
  }
}
