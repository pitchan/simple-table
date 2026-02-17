import { SelectionModel } from "@angular/cdk/collections";
import { ScrollingModule } from "@angular/cdk/scrolling";
import { CommonModule } from "@angular/common";
import { ChangeDetectorRef, Component, EventEmitter, Input, NgZone, Output, SimpleChanges, ViewChild } from "@angular/core";
import { FormBuilder, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCheckboxChange, MatCheckboxModule } from "@angular/material/checkbox";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatGridListModule } from "@angular/material/grid-list";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatMenuModule, MatMenuTrigger } from "@angular/material/menu";
import { MatRadioModule } from "@angular/material/radio";
import { MatSelectModule } from "@angular/material/select";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatTreeModule } from "@angular/material/tree";
import * as _ from "lodash";
import cloneDeep from "lodash/cloneDeep";
import moment from "moment";
import { debounceTime, distinctUntilChanged, Subject, Subscription } from "rxjs";
import { COLUMN_DATA_TYPE, RANKING_ID_BASIS, RANKING_ID_COUNTRY, TABLE_FILTER_OPERATOR_LIST } from "src/app/core/constants/constants";
import { LocalizedDatePipe } from "../../pipes/translation/localized-date.pipe";
import { ProductLineService } from "../../services/product-line/productline.service";
import { ThemeService } from "../../services/theme/theme.service";
import { deepCopy } from "../dynamic-form/utils/utils";
import { CustomTreeControl } from "../table-tree-view/custom-tree-control";
import { DirectiveModule } from "../table-tree-view/directive/directive.module";
import { TreeFlatNode } from "../table-tree-view/models/interface";
import { TableFilterColumn } from "../table-tree-view/table-config";
import { TableVirtualScrollModule } from "../table-tree-view/table-virtual-scroll/table-virtual-scroll.module";
import { FlattenedNode } from "./../../../core/models/product-line/product-line-event";
export interface FilterEvent {
	listFiltered: {
		displayValue: any;
		checked: boolean;
		value: string | { code: string }[];
		columnName: string;
		isColumnDateType: boolean;
		level?: number;
		filteredBy?: string;
		id?: string;
	}[];
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
	isFilteredFirst: boolean;
	columnName: string;
	columnIsTree?: boolean;
	reset: boolean;
	eventType: string;
	editableType?: string;
	isValueChecked?: boolean;
	newCheckedValues?: {
		displayValue: any;
		checked: boolean;
		value: string | { code: string }[];
		columnName: string;
		isColumnDateType: boolean;
		level?: number;
		filteredBy?: string;
		id?: string;
	}[];
	newUncheckedValues?: {
		displayValue: any;
		checked: boolean;
		value: string | { code: string }[];
		columnName: string;
		isColumnDateType: boolean;
		level?: number;
		filteredBy?: string;
		id?: string;
	}[];
	isAllSelected?: boolean,
	selectAllTriggered?: boolean,
}

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

@Component({
	selector: "app-table-column-custom-filter",
	standalone: true,
	//changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [
		MatCheckboxModule,
		CommonModule,
		DirectiveModule,
		MatGridListModule,
		MatToolbarModule,
		MatIconModule,
		MatFormFieldModule,
		ReactiveFormsModule,
		MatInputModule,
		MatMenuModule,
		MatSelectModule,
		MatRadioModule,
		LocalizedDatePipe,
		MatDatepickerModule,
		MatTreeModule,
		ScrollingModule,
		TableVirtualScrollModule,
		MatButtonModule,
	],
	templateUrl: "./table-column-custom-filter.component.html",
	styleUrls: ["./table-column-custom-filter.component.scss"],
})
export class TableColumnCustomFilterComponent {
	isAdvanceFilterOpen = false;
	customFilter: FormGroup;
	operatorList: TableFilterColumn[] = TABLE_FILTER_OPERATOR_LIST;
	cloneFilterList: Array<FilterList>;
	filteredOperatorList: TableFilterColumn[] = TABLE_FILTER_OPERATOR_LIST;
	isAllSelected = true;
	enterSearch = false;
	isColumnDataType: string;
	private readonly triggerFilterListUpdateSubject = new Subject<FilterList[]>();
	@Input("filterListMap") filterListMap: Map<string, Array<FilterList>>;
	filterList: Array<FilterList> = [];
	@Input("columnName") columnName;
	@Input("columnIsTree") columnIsTree;
	@Input("filteredColumnList") filteredColumnList;
	@Input("isModelGridTable") isModelGridTable?: boolean = false;

	@Input("treeDataTransformer") transformer;
	// @Input("treeFlattener") treeFlattener;
	// @Input("treeControl") treeControl;

	// @Input("treeDataTransformerCustomFilter") transformerCustomFilter;
	@Input("treeFlattenerCustomFilter") treeFlattenerCustomFilter;
	@Input("treeControlCustomFilter") treeControlCustomFilter: CustomTreeControl<any, any>;
	@Input("dataSourceCustomFilter") dataSource;
	@Input("filteredExtraDataRow") filteredExtraDataRow?: Array<any>;
	// @Input("dataSourceCustomFilter") dataSourceCustomFilter;
	@Input("dataSourceOriginalData") dataSourceOriginalData;
    @Output() resetCustomFilterEvent: EventEmitter<any> = new EventEmitter();
	@Output() filteredEvents: EventEmitter<FilterEvent> = new EventEmitter(true);
	@Output() onSelectNode: EventEmitter<any> = new EventEmitter();
	@ViewChild(MatMenuTrigger) trigger: MatMenuTrigger;
	private subscriptions: Subscription[] = [];

	dataSourceCustomTreeData: any;

	checklistSelection = new SelectionModel<TreeFlatNode>(true);

	getChildren = (node: FlattenedNode): FlattenedNode[] => node.children;

	hasChild = (_: number, node: TreeFlatNode) => node.expandable;

	//for resetting search filter text if enter key is not called
	onEnterChangeCalled = false;

	readjustTotalContentSize = false;
	//for check box filtering
	newCheckedValues: FilterList[] = [];
	newUncheckedValues: FilterList[] = [];

	constructor(
		public formBuilder: FormBuilder,
		public themeService: ThemeService,
		public readonly changeDetectorRef: ChangeDetectorRef,
		private readonly productLineService: ProductLineService,
		private readonly ngZone: NgZone
	) {
		this.customFilter = this.formBuilder.group({
			searchFilter: [null],
			operatorType: ["OR"],
			advanceFilterType1: this.formBuilder.group({
				operatorType1: ["contains"],
				searchInput1: [""],
			}),
			advanceFilterType2: this.formBuilder.group({
				operatorType2: ["contains"],
				searchInput2: [""],
			}),
		});

		const sub1 = this.customFilter
			.get("searchFilter")
			.valueChanges.pipe(debounceTime(200), distinctUntilChanged())
			.subscribe((value) => {
				this.onEnterChangeCalled = false;
				this.onSearchChange(value);
			});
		this.subscriptions.push(sub1);

		const sub2 = this.triggerFilterListUpdateSubject.pipe(debounceTime(200)).subscribe((res) => {
			if (res) {
				this.updateFilterList(res);
			}
		});
		this.subscriptions.push(sub2);
	}

	ngOnChanges(changes: SimpleChanges) {
		if (changes?.filterListMap?.currentValue) {
			this.filterList = cloneDeep(changes.filterListMap.currentValue.get(this.columnName) || []);
			let numericallySortedFilterList = changes.filterListMap.currentValue.get(this.columnName)?.sort((a, b) => Number(a.value) - Number(b.value)); // Sort numerically
			this.cloneFilterList = cloneDeep(numericallySortedFilterList);

			this.selectNodeOnFilterCheckType();

			// filter the data if the there is current filter present in the filterList value
			this.filterDataByInput();
			// filter the data if the there is current filter present in the filterList value end
		}

		if (this.dataSource) {
			this.dataSource.data = cloneDeep(this.dataSourceOriginalData?.data) || [];
			this.treeControlCustomFilter.dataNodes = cloneDeep(this.dataSource.data);
			this.treeControlCustomFilter.dataNodes = [...this.filteredExtraDataRow, ...this.treeControlCustomFilter.dataNodes];

			this.changeDetectorRef.detectChanges();
		}

		if(!this.onEnterChangeCalled){
			this.customFilter.get("searchFilter")?.setValue(null);
		}


		//reset new checked and unchecked values
		this.newCheckedValues = [];
		this.newUncheckedValues = [];
	}

	ngAfterViewInit() {
		this.selectAllTreeNode();
	}

	ngOnDestroy() {
		this.subscriptions.forEach((sub) => sub?.unsubscribe());
	}

	updateFilterList(currentValue) {
		if (currentValue && currentValue.length > 0 && currentValue[0]["columnName"] == this.columnName) {
			this.cloneFilterList = cloneDeep(currentValue);
			const isSearchInputHasValue = this.customFilter.get("searchFilter")?.value;
			this.onSearchChange(isSearchInputHasValue);
			// reset the toggle of advance filter
			this.isAdvanceFilterOpen = false;
			//recheck all selected check box status
			this.isAllSelected = currentValue.every((item) => item.checked);
			this.changeDetectorRef.detectChanges();
		} else {
			this.filterList = [];
		}
	}

	checkboxChanged(event: MatCheckboxChange, index: number, emitEvent: boolean = true) {
		this.filterList[index].checked = event?.checked;
		this.filterList[index].filteredBy = event.checked ? undefined : this.columnName;
		this.cloneFilterList[index].checked = event.checked;
		this.cloneFilterList[index].filteredBy = event.checked ? undefined : this.columnName;
		if(event.checked){
			this.newCheckedValues.push(this.cloneFilterList[index]);
		}else {
			this.newUncheckedValues.push(this.cloneFilterList[index]);
		}

		const filterEventVal = {
			listFiltered: this.cloneFilterList,
			advanceFilter: this.customFilter.getRawValue(),
			isFilteredFirst: null,
			columnName: this.columnName,
			columnIsTree: this.columnIsTree || false,
			reset: false,
			eventType: "checkbox",
			isValueChecked: event.checked,
			newCheckedValues: [...this.newCheckedValues],
			newUncheckedValues: [...this.newUncheckedValues],
		};
		this.isAllSelected = this.filterList.every((item) => item.checked);
		if (emitEvent) {
			this.filteredEvents.emit(filterEventVal);
		}
        // expand & collapse parent node based on condition, if model grid table
		if (this.isModelGridTable) {
			this.onSelectNode.emit(this.filterList[index]);
		}
		this.changeDetectorRef.detectChanges();
		this.newCheckedValues = [];
		this.newUncheckedValues = [];
	}

	viewAdvanceFilter() {
		this.isAdvanceFilterOpen = !this.isAdvanceFilterOpen;
		this.isColumnDataType = this.columnName?.toLowerCase().includes(COLUMN_DATA_TYPE.DATE) ? COLUMN_DATA_TYPE.DATE : COLUMN_DATA_TYPE.TEXT;
		const selectedOperatorData = this.fetchSelectedOperatorType();
		if (this.isColumnDataType == COLUMN_DATA_TYPE.DATE) {
			this.customFilter
				.get("advanceFilterType1")
				.get("operatorType1")
				.patchValue(selectedOperatorData?.operatorType1 || "before");
			this.customFilter
				.get("advanceFilterType2")
				.get("operatorType2")
				.patchValue(selectedOperatorData?.operatorType2 || "before");
		} else if (this.isColumnDataType == "number") {
			this.customFilter
				.get("advanceFilterType1")
				.get("operatorType1")
				.patchValue(selectedOperatorData?.operatorType1 || "greaterThan");
			this.customFilter
				.get("advanceFilterType2")
				.get("operatorType2")
				.patchValue(selectedOperatorData?.operatorType2 || "greaterThan");
		} else {
			this.customFilter
				.get("advanceFilterType1")
				.get("operatorType1")
				.patchValue(selectedOperatorData?.operatorType1 || "contains");
			this.customFilter
				.get("advanceFilterType2")
				.get("operatorType2")
				.patchValue(selectedOperatorData?.operatorType2 || "contains");
		}

		this.filteredOperatorList = this.operatorList.filter((item) => item.fieldType == this.isColumnDataType || item.fieldType == "all");
		if (this.isAdvanceFilterOpen) {
			this.trigger.openMenu();
			// Trigger the search logic immediately when the advanced filter is opened
			this.operatorTypeChange();
		} else {
			this.trigger.closeMenu();
		}
	}

	selectAll(event: MatCheckboxChange) {
		this.isAllSelected = event.checked;
		this.filterList.forEach((item) => {
			if (!item.hidden) {
				item.checked = this.isAllSelected;
			}
		});
		this.cloneFilterList = cloneDeep(this.filterList);
		this.cloneFilterList.forEach((item) => {
			if (!item.hidden) {
				item.checked = this.isAllSelected;
			}
		});
		if(this.isAllSelected){
			this.newCheckedValues = [...this.cloneFilterList];
		}else{
			this.newUncheckedValues = [...this.cloneFilterList];
		}
		const filterEventVal = {
			listFiltered: this.cloneFilterList,
			advanceFilter: this.customFilter.getRawValue(),
			isFilteredFirst: null,
			columnName: this.columnName,
			columnIsTree: this.columnIsTree || false,
			reset: false,
			isAllSelected: this.isAllSelected,
			selectAllTriggered: true,
			eventType: "checkbox",
			isValueChecked: event.checked,
			newCheckedValues: [...this.newCheckedValues],
			newUncheckedValues: [...this.newUncheckedValues],
		};
		this.filteredEvents.emit(filterEventVal);

		// select and unselect all checkboxes for tree node
		this.selectAllTreeNode();
		// select and unselect all checkboxes for tree node

		if(this.isAllSelected && this.isModelGridTable){ 
			this.resetCustomFilterEvent.emit(true);
		}
		this.newCheckedValues = [];
		this.newUncheckedValues = [];
	}

	onSearchChange(searchInput: string) {
		if (searchInput?.length > 0) {
			this.filterList.forEach((item) => {
				item.hidden = item.displayValue?.toLowerCase() == "(empty)" || !item?.displayValue?.toLowerCase().includes(searchInput.toLowerCase());
				return item;
			});
		} else if (searchInput?.length === 0 && this.enterSearch) {
			this.filterList.forEach((item) => {
				if (!item.checked) {
					item.hidden = false;
				}

				return item;
			});
		} else {
			this.filterList.forEach((item) => {
				item.hidden = false;
				item.checked = true;

				return item;
			});
		}

		if (this.columnIsTree) {
			this.applyFilter(searchInput?.toLowerCase());
		}

		this.isAllSelected = this.filterList.every((item) => item.checked);
		this.cloneFilterList = this.filterList;

		// commenting this because it doesn't want to emit the event on every search change

		// const filterEventVal = {
		// 	listFiltered: this.cloneFilterList,
		// 	// advanceFilter: this.customFilter.getRawValue(),
		// 	advanceFilter: this.customFilter.value,
		// 	isFilteredFirst: null,
		// 	columnName: this.columnName,
		// 	columnIsTree: this.columnIsTree || false,
		// 	reset: false,
		// 	eventType: "search",
		// };
		// this.filteredEvents.emit(filterEventVal);
		// commenting this because it doesn't want to emit the event on every search change
		this.changeDetectorRef.detectChanges();
	}

	onEnterChange() {
		this.onEnterChangeCalled = true;
		if (this.customFilter.get("searchFilter")?.value?.length === 0) {
			this.filterList.forEach((item) => {
				item.checked = true;
				item.hidden = false;
				return item;
			});
			this.isAllSelected = this.filterList.every((item) => item.checked);
		}

		if (this.customFilter.get("searchFilter")?.value && this.customFilter.get("searchFilter")?.value?.length !== 0) {
			this.enterSearch = true;

			// when the search filter value has some value it should check the filterList and set the checked and hidden properties accordingly
			this.filterList.forEach((item) => {
				if (item.displayValue?.toLowerCase() != "(empty)" && item.displayValue?.toLowerCase().includes(this.customFilter.get("searchFilter").value.toLowerCase())) {
					item.checked = true;
					item.hidden = false;
				} else {
					item.checked = false;
					item.hidden = true;
				}
			});
			// when the search filter value has some value it should check the filterList and set the checked and hidden properties accordingly end
			this.cloneFilterList = [...this.filterList];
		} else {
			this.enterSearch = false;
		}

		const filterEventVal = {
			listFiltered: this.cloneFilterList,
			advanceFilter: this.customFilter.getRawValue(),
			isFilteredFirst: null,
			columnName: this.columnName,
			columnIsTree: this.columnIsTree || false,
			reset: false,
			// eventType: "checkbox",
			eventType: "search",
		};
		this.filteredEvents.emit(filterEventVal);
		if (this.columnIsTree) {
			this.treeControlCustomFilter.expandAll();
			this.dataSource.data?.forEach((node) => {
				if (node.children && node.children.length > 0) {
					const descendants = this.treeControlCustomFilter.getDescendants(node);
					if (descendants && descendants.length) {
						this.checklistSelection.select(...descendants, node);
					} else {
						this.checklistSelection.select(node);
					}
				}
			});
		}
		this.changeDetectorRef.detectChanges();
	}

	operatorTypeChange(event?: KeyboardEvent) {
		if (!Array.isArray(this.filterList)) {
			return;
		}
		const handleFilters = (inputNumber: 1 | 2) => {
			const input = filterEventVal?.advanceFilter?.[`advanceFilterType${inputNumber}`]?.[`searchInput${inputNumber}`];
			if (!input) return [];

			const searchQueryType = input.length > 0 ? input?.toLowerCase() : null;

			const operation = this.customFilter.get(`advanceFilterType${inputNumber}`).get(`operatorType${inputNumber}`).value;
			switch (operation) {
				case "contains":
					return this.cloneFilterList.filter((item) => {
						const matches =
							typeof item.value === "string" ? item.value.toLowerCase().includes(searchQueryType) : Array.isArray(item.value) && item.value.some((v) => v.code.toLowerCase().includes(searchQueryType));
						if (matches) {
							item.checked = true;
							item.hidden = false;
						} else {
							item.checked = false;
							item.hidden = true;
						}
						return matches;
					});
				case "startsWith":
					return this.cloneFilterList.filter((item) => {
						const matches =
							typeof item.value === "string" ? item.value.toLowerCase().startsWith(searchQueryType) : Array.isArray(item.value) && item.value.some((v) => v.code.toLowerCase().startsWith(searchQueryType));
						if (matches) {
							item.checked = true;
							item.hidden = false;
						} else {
							item.checked = false;
							item.hidden = true;
						}
						return matches;
					});
				case "endsWith":
					return this.cloneFilterList.filter((item) => {
						const matches =
							typeof item.value === "string" ? item.value.toLowerCase().endsWith(searchQueryType) : Array.isArray(item.value) && item.value.some((v) => v.code.toLowerCase().endsWith(searchQueryType));
						if (matches) {
							item.checked = true;
							item.hidden = false;
						} else {
							item.checked = false;
							item.hidden = true;
						}
						return matches;
					});
				case "equals":
					return this.cloneFilterList.filter((item) => {
						const matches = typeof item.value === "string" ? item.value.toLowerCase() === searchQueryType : Array.isArray(item.value) && item.value.some((v) => v.code.toLowerCase() === searchQueryType);
						if (matches) {
							item.checked = true;
							item.hidden = false;
						} else {
							item.checked = false;
							item.hidden = true;
						}
						return matches;
					});
				default:
					return [];
			}
		};

		// filter the list if it contains values in the advance filter type
		if (this.isColumnDataType == COLUMN_DATA_TYPE.DATE) {
			if (this.customFilter?.value?.advanceFilterType1?.searchInput1 || this.customFilter?.value?.advanceFilterType2?.searchInput2) {
				this.applyDateFilter();
			} else {
				this.filterList.forEach((item) => {
					item.checked = true;
					item.hidden = false;
					return item;
				});
			}

			this.cloneFilterList = [...this.filterList];
		}
		// filter the list if it contains values in the advance filter type  end

		if (event) event.stopPropagation();

		const filterEventVal = {
			listFiltered: this.cloneFilterList,
			advanceFilter: this.customFilter.getRawValue(),
			isFilteredFirst: null,
			columnName: this.columnName,
			columnIsTree: this.columnIsTree || false,
			reset: false,
			eventType: "advance",
		};

		this.customFilter.get("searchFilter").patchValue(null);
		this.customFilter.get("searchFilter").markAsUntouched();
		this.customFilter.get("searchFilter").updateValueAndValidity();

		if (this.isColumnDataType !== COLUMN_DATA_TYPE.DATE) {
			if (this.customFilter?.value?.advanceFilterType1?.searchInput1 || this.customFilter?.value?.advanceFilterType2?.searchInput2) {
				const isFilteredType1: FilterList[] = handleFilters(1).map((item) => ({ ...item })); // Create a shallow copy to preserve original values
				const isFilteredType2: FilterList[] = handleFilters(2).map((item) => ({ ...item }));

				const operatorType = this.customFilter.get("operatorType").value;
				if (operatorType === "OR") {
					this.filterList = [...isFilteredType1, ...isFilteredType2];
				} else if (operatorType === "AND") {
					this.filterList = isFilteredType1.filter((item1) => isFilteredType2.some((item2) => item1.displayValue === item2.displayValue));
				} else {
					this.filterList = [];
				}
				this.filterList = _.uniqBy(this.filterList, "value");
				if (this.filterList?.length == 0) {
					//if filter list is empty then uncheck all selected values
					this.filterList.forEach((item) => {
						item.checked = false;
					});
					filterEventVal.listFiltered = this.filterList;
				} else {
					filterEventVal.listFiltered = this.filterList;
				}
			} else {
				this.filterList.forEach((item) => {
					item.checked = true;
					item.hidden = false;
				});
				filterEventVal.reset = true;
				filterEventVal.listFiltered = this.filterList;
			}
		} else {
			filterEventVal.advanceFilter.advanceFilterType1.searchInput1 =
				filterEventVal?.advanceFilter?.advanceFilterType1?.searchInput1 == null ? "" : filterEventVal?.advanceFilter?.advanceFilterType1?.searchInput1;
			filterEventVal.advanceFilter.advanceFilterType2.searchInput2 =
				filterEventVal?.advanceFilter?.advanceFilterType2?.searchInput2 == null ? "" : filterEventVal?.advanceFilter?.advanceFilterType2?.searchInput2;
		}
		this.filteredEvents.emit(filterEventVal);
	}

	//handle date related filters here
	applyDateFilter() {
		this.filterList.forEach((item) => {
			let advanceFilterInputVal1 = moment(this.customFilter?.value?.advanceFilterType1?.searchInput1);
			let advanceFilterInputVal2 = moment(this.customFilter?.value?.advanceFilterType2?.searchInput2);
			let itemDate = moment(item.displayValue, "DD/MM/YYYY");

			let operatorType1 = this.customFilter?.value?.advanceFilterType1?.operatorType1;
			let operatorType2 = this.customFilter?.value?.advanceFilterType2?.operatorType2;

			let condition1 = false;
			let condition2 = false;

			if (operatorType1 === "equals") {
				condition1 = itemDate.isSame(advanceFilterInputVal1, "day");
			} else if (operatorType1 === "before") {
				condition1 = itemDate.isBefore(advanceFilterInputVal1, "day");
			} else if (operatorType1 === "after") {
				condition1 = itemDate.isAfter(advanceFilterInputVal1, "day");
			}

			if (operatorType2 === "equals") {
				condition2 = itemDate.isSame(advanceFilterInputVal2, "day");
			} else if (operatorType2 === "before") {
				condition2 = itemDate.isBefore(advanceFilterInputVal2, "day");
			} else if (operatorType2 === "after") {
				condition2 = itemDate.isAfter(advanceFilterInputVal2, "day");
			}

			const operatorType = this.customFilter.get("operatorType").value;
			if (operatorType === "OR") {
				if (item.displayValue?.toLowerCase() != "(empty)" && (condition1 || condition2)) {
					item.checked = true;
					item.hidden = false;
				} else {
					item.checked = false;
					item.hidden = true;
				}
			} else if (operatorType === "AND") {
				if (item.displayValue?.toLowerCase() != "(empty)" && condition1 && condition2) {
					item.checked = true;
					item.hidden = false;
				} else {
					item.checked = false;
					item.hidden = true;
				}
			}
		});
		// when the search filter value has some value it should check the filterList and set the checked and hidden properties accordingly end
		this.cloneFilterList = [...this.filterList];
	}
	resetCustomTreeFilter() {
		this.resetCustomFilterEvent.emit(true);
	}
	reset() {
		if(this.cloneFilterList){		
			this.filterList = [...this.cloneFilterList];
		}
		this.isAllSelected = true;
		this.trigger.closeMenu();
		this.customFilter.setValue({
			searchFilter: "",
			operatorType: "OR",
			advanceFilterType1: {
				operatorType1: "contains",
				searchInput1: "",
			},
			advanceFilterType2: {
				operatorType2: "contains",
				searchInput2: "",
			},
		});

		const filterEventVal = {
			listFiltered: this.filterList,
			advanceFilter: this.customFilter.getRawValue(),
			isFilteredFirst: null,
			columnName: this.columnName,
			columnIsTree: this.columnIsTree || false,
			reset: true,
			eventType: "advance",
		};
		this.filteredEvents.emit(filterEventVal);
		setTimeout(() => {
			if (this.columnIsTree) {
				this.treeControlCustomFilter?.dataNodes?.forEach((node) => {
					this.checklistSelection.select(node);
					this.treeControlCustomFilter.expand(node);
					this.changeDetectorRef.detectChanges();
				});
			}
		});
	}
	fetchSelectedOperatorType() {
		if (this.filteredColumnList?.length) {
			const operatorTypeData = this.filteredColumnList.find((item) => item.columnName == this.columnName);
			if (operatorTypeData?.advanceFilter) {
				return {
					operatorType1: operatorTypeData?.advanceFilter?.advanceFilterType1?.operatorType1,
					operatorType2: operatorTypeData?.advanceFilter?.advanceFilterType2?.operatorType2,
				};
			}
			return null;
		}
	}
	public trackItem(index: number, item) {
		return item;
	}

	// nested filter to do
	descendantsAllSelected(node): boolean {
		const descendants = this.treeControlCustomFilter.getDescendants(node);
		const allSelected = descendants.length > 0 && descendants.every((child) => this.checklistSelection.isSelected(child));
		return allSelected;
	}

	descendantsPartiallySelected(node): boolean {
		const descendants = this.treeControlCustomFilter.getDescendants(node);
		const result = descendants.some((child) => this.checklistSelection.isSelected(child));
		return result && !this.descendantsAllSelected(node);
	}
	toggleSelection(node): void {
		this.checklistSelection.toggle(node);
		const descendants = this.treeControlCustomFilter.getDescendants(node);
		if (this.checklistSelection.isSelected(node)) {
			this.checklistSelection.select(...descendants);
		} else {
			descendants.forEach((child) => this.checklistSelection.deselect(child));
		}
		// this.checkAllParentsSelection(node);
		// uncheck all the descendants child with the parent node
		if (descendants.length) {
			descendants.forEach((child) => {
				if (this.columnIsTree) {
					this.checkboxChanged(
						{ checked: this.checklistSelection.isSelected(child) } as MatCheckboxChange,
						this.filterList.findIndex((n) => n.displayValue === child.id),
						false
					);
				} else {
					this.checkboxChanged(
						{ checked: this.checklistSelection.isSelected(child) } as MatCheckboxChange,
						this.filterList.findIndex((n) => n.value === (child?.evCcDcCode ?? child?.pldCode ?? node?.category)),
						false
					);
				}
			});
		}

		this.checkAllParentsSelection(node);

		// un check the selected node
		// if (this.columnIsTree && this.columnName == "category") {
		if (this.columnIsTree) {
			this.checkboxChanged(
				{ checked: this.checklistSelection.isSelected(node) } as MatCheckboxChange,
				this.filterList?.findIndex((n) => n.displayValue == node.id),
				true
			);
		} else {
			this.checkboxChanged(
				{ checked: this.checklistSelection.isSelected(node) } as MatCheckboxChange,
				this.filterList?.findIndex((n) => n.value == this.fetchColumnName(node)),
				true
			);
		}
		// un check the selected node end
	}
	checkAllParentsSelection(node): void {
		let parent = this.getParentNode(node);
		while (parent) {
			this.checkRootNodeSelection(parent);
			parent = this.getParentNode(parent);
		}
	}

	getParentNode(node) {
		const currentLevel = node?.level;
		if (currentLevel < 1) {
			return null;
		}
		const startIndex = this.treeControlCustomFilter.dataNodes.findIndex((n) => n === node) - 1;
		for (let i = startIndex; i >= 0; i--) {
			const currentNode = this.treeControlCustomFilter.dataNodes[i];
			if (currentNode.level < currentLevel) {
				return currentNode;
			}
		}
		return null;
	}

	checkRootNodeSelection(node): void {
		const descendants = this.treeControlCustomFilter.getDescendants(node);
		const descAllSelected = descendants.length > 0 && descendants.every((child) => this.checklistSelection.isSelected(child));
		if (descAllSelected) {
			this.checklistSelection.select(node);
		} else {
			this.checklistSelection.deselect(node);
		}

		// filter on the basis of the node
		this.checkboxChanged(
			{ checked: this.checklistSelection.isSelected(node) || this.descendantsPartiallySelected(node) } as MatCheckboxChange,
			this.columnIsTree ? this.filterList?.findIndex((n) => n.displayValue == node.id) : this.filterList?.findIndex((n) => n.value == this.fetchColumnName(node)),
			false
		);
		// filter on the basis of the node end
	}

	// Check if a node is visible
	isNodeVisible(node: any): boolean {
		if (node.level == 0) {
			return true;
		}
		if (node.level == 1 && this.treeControlCustomFilter.isExpanded(this.treeControlCustomFilter.getParent(node))) {
			return true;
		}
		if (
			node.level == 2 &&
			this.treeControlCustomFilter.isExpanded(this.treeControlCustomFilter.getParent(node)) &&
			this.treeControlCustomFilter.isExpanded(this.treeControlCustomFilter.getParent(this.treeControlCustomFilter.getParent(node)))
		) {
			return true;
		}
		return false;
	}

	selectAllTreeNode() {
		if (this.dataSource?.data?.length) {
			this.treeControlCustomFilter.expandAll();
			this.dataSource?.data?.forEach((node) => {
				let getAllDescendants = this.treeControlCustomFilter?.getDescendants(node);
				if (getAllDescendants?.length) {
					if (this.isAllSelected) {
						this.checklistSelection.select(...getAllDescendants, node);
					} else if (!this.isAllSelected) {
						this.checklistSelection.deselect(...getAllDescendants, node);
					} else {
						this.checklistSelection.select(...getAllDescendants, node);
					}
				}
			});

			// setTimeout(() => {
			// 	this.dataSource.data = this.dataSourceOriginalData?.data || [];
			// 	this.treeControlCustomFilter.dataNodes = this.dataSource.data;
			// 	this.changeDetectorRef.detectChanges();
			// }, 100);
			// Allow the view to update before checking the selection
		}
	}

	selectNodeOnFilterCheckType() {
		this.dataSourceCustomTreeData = this.dataSource?.data;
		// for columnIsTree = true, we need to set the dataSource.data and treeControlCustomFilter.dataNodes
		if (this.columnIsTree && this.dataSourceOriginalData?.originalData?.length) {
			this.dataSource.data = this.dataSourceOriginalData?.data || [];
			this.treeControlCustomFilter.dataNodes = this.dataSource.data;
			this.changeDetectorRef.detectChanges();
		}
		// for columnIsTree = true, we need to set the dataSource.data and treeControlCustomFilter.dataNodes end
		setTimeout(() => {
			this.treeControlCustomFilter?.dataNodes?.forEach((node) => {
				let nodeValue = this.columnIsTree ? this.filterList?.find((n) => n.displayValue == node.id) : this.filterList?.find((n) => n.value == this.fetchColumnName(node));
				if (nodeValue?.checked) {
					this.checklistSelection.select(node);
					this.treeControlCustomFilter.expand(node);
					this.changeDetectorRef.detectChanges();
				}
			});
			this.mapTreeNode();
		}, 200);
	}

	checkParentAllSiblingSelected(node): boolean {
		let parentNode = this.treeControlCustomFilter.getParent(node);
		let getAllDescendants = this.treeControlCustomFilter.getDescendants(parentNode);
		if (parentNode && getAllDescendants?.length) {
			return getAllDescendants.every((child) => this.checklistSelection.isSelected(child));
		}

		return false;
	}

	fetchColumnName(node) {
		if (this.columnIsTree) {
			return node?.id;
		} else {
			return node?.evCcDcCode || node?.pldCode || node?.modelGridDescription;
		}
	}

	// filter recursively on a text string using property object value
	filterRecursive(filterText: string, array: any[], property: string) {
		let filteredData;

		// has string
		if (filterText) {
			// need the string to match the property value
			filterText = filterText.toLowerCase();
			// copy obj so we don't mutate it and filter
			filteredData = array.filter((item) => {
				// Check if item matches
				const itemMatches = item[property]?.toLowerCase().includes(filterText);

				// Check if parent matches
				let parentMatches = false;
				const parentNode = this.getParentNode(item);
				if (parentNode && parentNode[property]?.toLowerCase().includes(filterText)) {
					parentMatches = true;
				}
				// Check if any ancestor matches (for deeper nesting)
				let ancestor = this.getParentNode(item);
				while (ancestor) {
					if (ancestor[property]?.toLowerCase().includes(filterText)) {
						parentMatches = true;
						break;
					}
					ancestor = this.getParentNode(ancestor);
				}
				// Check if any children match
				let childrenMatch = false;
				const descendants = this.treeControlCustomFilter.getDescendants(item);
				if (descendants && descendants.length) {
					childrenMatch = descendants.some((child) => child[property]?.toLowerCase().includes(filterText));
				}

				// If children match, show parent
				if (childrenMatch) return true;

				// If parent matches, show all children (and parent itself)
				if (parentMatches) return true;

				// If item matches, show item
				if (itemMatches) return true;

				return false;
			});
		} else {
			filteredData = array;
		}

		return filteredData;
	}

	// pass mat input string to recursive function and return data
	filterTree(filterText: string) {
		// use filter input text, return filtered TREE_DATA, use the 'name' object value
		//note:- this.treeControlCustomFilter.dataNodes is used to store the flattened tree data
		this.dataSource.data = this.filterRecursive(filterText, this.treeControlCustomFilter.dataNodes, this.columnName);
	}

	// filter string from mat input filter
	applyFilter(filterText: string) {
		this.filterTree(filterText);
		this.treeControlCustomFilter.expandAll();
	}

	mapTreeNode() {
		if (this.columnIsTree) {
			let filteredDataOnFilterBasis = this.dataSourceOriginalData?.data.filter((node) => {
				let filterValue = this.columnIsTree ? this.filterList?.find((item) => item.displayValue == node.id) : this.filterList?.find((item) => item.value == this.fetchColumnName(node));
				if (!node.hidden && filterValue?.checked) {
					this.checklistSelection.select(node);
					this.treeControlCustomFilter.expand(node);
					this.changeDetectorRef.detectChanges();
					return node;
				} else {
					this.checklistSelection.deselect(node);
					this.changeDetectorRef.detectChanges();
					return node;
				}
			});

			filteredDataOnFilterBasis = [...this.filteredExtraDataRow, ...filteredDataOnFilterBasis];
			this.dataSource.setData(filteredDataOnFilterBasis);
			this.changeDetectorRef.detectChanges();
		}
		// else if (this.dataSourceOriginalData?.data?.length && !this.isAllSelected) {
		// 	this.dataSourceOriginalData?.data?.forEach((node) => {
		// 		// if the column name is evCcDcCode, category and the columnIsTree
		// 		if (this.columnIsTree && (this.columnName === "evCcDcCode" || this.columnName === "category")) {
		// 			// let filterValue = this.columnName === "category" ? this.filterList?.find((item) => item.displayValue == node.id) : this.filterList?.find((item) => item.value == this.fetchColumnName(node));
		// 			let filterValue = this.columnIsTree ? this.filterList?.find((item) => item.displayValue == node.id) : this.filterList?.find((item) => item.value == this.fetchColumnName(node));
		// 			if (filterValue?.checked) {
		// 				this.checklistSelection.select(node);
		// 			} else {
		// 				this.checklistSelection.deselect(node);
		// 			}
		// 		}
		// 		// if the column name is evCcDcCode, category and the columnIsTree end
		// 		this.treeControlCustomFilter?.expand(node);
		// 	});
		// 	this.dataSource?.setData(this.dataSourceOriginalData?.data);
		// }
	}

	checkIfIsAllSelected() {
		if (this.filterList?.length) {
			this.isAllSelected = this.filterList.every((item) => item.checked);
		} else {
			this.isAllSelected = false;
		}
		return this.isAllSelected;
	}

	filterDataByInput() {
		const isSearchInputHasValue = this.customFilter.get("searchFilter")?.value;
		if (isSearchInputHasValue) {
			this.onSearchChange(isSearchInputHasValue);
		}
	}

	onNodeToggle(node){
		 setTimeout(() => {
			this.readjustTotalContentSize = true;
		 	this.changeDetectorRef.detectChanges();
			this.readjustTotalContentSize = false;
		 }, 100);
		
	}
}
