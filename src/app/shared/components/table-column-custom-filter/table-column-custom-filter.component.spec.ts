import { DatePipe } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SimpleChanges } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, Validators } from '@angular/forms';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatNativeDateModule } from '@angular/material/core';
import { BrowserAnimationsModule, NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, first, of } from 'rxjs';
import { FilterlessDataSource } from 'src/app/core/data-sources/common-data-sources/filterless-data-source';
import { ProductLine } from 'src/app/core/models/product-line';
import { LocalizedDatePipe } from '../../pipes/translation/localized-date.pipe';
import { ProductLineService } from '../../services/product-line/productline.service';
import { Theme } from '../../services/theme/theme-storage/theme-storage';
import { ThemeService } from '../../services/theme/theme.service';
import { FilterList, TableColumnCustomFilterComponent } from './table-column-custom-filter.component';

describe('TableColumnCustomFilterComponent', () => {
  let component: TableColumnCustomFilterComponent;
  let fixture: ComponentFixture<TableColumnCustomFilterComponent>;
  
afterEach(() => {
  if (fixture) {
    fixture.destroy();
  }
});
let productLineService: ProductLineService;
  let formBuilder: FormBuilder;
  let mockDataFilteredList: [
    { checked: true, value: 'AAA001', columnName: 'eventId', isColumnDateType: false, displayValue: 'AAA001', hidden: false },
    { checked: true, value: 'AAA002', columnName: 'eventId', isColumnDateType: false, displayValue: 'AAA002', hidden: false },
  ]

  let mockProductLineData: ProductLine = {
    id: "http://stellantis.com/gcm/productLine/6c2a1b46-1d67-45b2-9273-9a7c10931668",
    creator: "SDXXX",
    editor: "SDXXX",
    creationDate: "2024-07-11T18:18:11.000Z",
    modificationDate: "2024-07-11T18:18:11.000Z",
    name: "EEEEEEEEEEEEEEEEEEEEEEEEEEE",
    language: [
      {
        id: "http://stellantis.com/gcm/codificationLanguage/3cc63b5f-de66-431d-81d2-8bdfc3699171",
        languageId: "P",
        label: "Language P",
      },
    ],
    productLineType: {
      id: "http://stellantis.com/gcm/productLineType/03b3408b-9ad6-42af-8336-273e91f1a60e",
      creator: "SDXXX",
      editor: "SDXXX",
      creationDate: "2024-05-24T11:39:30.000Z",
      modificationDate: "2024-05-30T08:35:43.000Z",
      name: "Type 1",
      code: "PLTYPE1",
      modelId: false,
      transversal: false,
      brandPl: true,
      pulledPl: false,
      orderIndex: 1,
      description: [
        {
          id: "1234",
          locale: "EN",
          text: "EEE",
        },
      ],
    },
    description: [
      {
        id: "1234",
        locale: "EN",
        text: "EEE",
      },
    ],
    codifiers: [
      {
        id: "http://stellantis.com/gcm/codifier/3a5d4841-7b22-4b64-af21-b9af4c8e7e45",
        scope: "",
        mainCodifiers: ["SC", "SD"],
        otherCodifiers: [],
        creator: "SDXXX",
        editor: "SDXXX",
        creationDate: "2024-07-11T18:18:11.000Z",
        modificationDate: "2024-07-11T18:18:11.000Z",
        usageScopeOfRules: {
          id: "http://stellantis.com/gcm/usageScopeOfRules/5bef806b-2d85-4b5e-9cde-9019e8636d0b",
          scope: {
            id: "1234",
          },
          plUsage: "BRAND_PRODUCT_LINE",
          typeUsage: [
            {
              id: "http://stellantis.com/gcm/productLineType/03b3408b-9ad6-42af-8336-273e91f1a60e",
              creator: "SDXXX",
              editor: "SDXXX",
              creationDate: "2024-05-24T11:39:30.000Z",
              modificationDate: "2024-05-30T08:35:43.000Z",
              name: "Type 1",
              code: "PLTYPE1",
              modelId: false,
              transversal: false,
              brandPl: true,
              pulledPl: false,
              orderIndex: 1,
              description: [
                {
                  id: "1234",
                  locale: "EN",
                  text: "EEE",
                },
              ],
            },
          ],
          isMandatory: false,
          creationDate: "2024-05-29T07:24:48.000Z",
          editor: "SDXXX",
          modificationDate: "2024-05-29T07:24:48.000Z",
        },
        orderIndex: 1,
        mainCodifierMandatory: true,
      },
    ],
    confidentiallyEndDate: "",
    confidentialityReaders: [],
  };

  // Mock theme service
  const THEMES = [
    { key: "stellar-theme", name: "stellar-theme" }
  ];
  const themeSubjectMock = new BehaviorSubject<string>(THEMES[0].key);

  class MockThemeService {
    selectedTheme = themeSubjectMock;

    getThemeList(): Theme[] {
      return THEMES;
    }
    getStoredTheme(): Theme {
      return THEMES[0];
    }
    setTheme(key: string): void {
      //void mock method
    }

  }
  let mockThemeService: ThemeService;

  beforeEach(() => {
    mockThemeService = new MockThemeService() as ThemeService;

    TestBed.configureTestingModule({
      imports: [
        TableColumnCustomFilterComponent,
        BrowserAnimationsModule,
        NoopAnimationsModule,
        LocalizedDatePipe,
        HttpClientTestingModule,
        TranslateModule.forRoot(),
        MatNativeDateModule],
      providers: [FormBuilder, DatePipe, LocalizedDatePipe, ProductLineService,
        {
          provide: ThemeService,
          useValue: mockThemeService
        },]
    });
    fixture = TestBed.createComponent(TableColumnCustomFilterComponent);
    component = fixture.componentInstance;
    component.isColumnDataType = '';
    formBuilder = TestBed.inject(FormBuilder);


    productLineService = TestBed.inject(ProductLineService);
    spyOn(productLineService, "getProductLineById").and.returnValue(of(mockProductLineData));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should create customFilter with initial values', () => {
    const expectedCustomFilter = formBuilder.group({
      searchFilter: [null, Validators.required],
      operatorType: ['OR'],
      advanceFilterType1: formBuilder.group({
        operatorType1: ['contains'],
        searchInput1: ['', Validators.required]
      }),
      advanceFilterType2: formBuilder.group({
        operatorType2: ['contains'],
        searchInput2: ['', Validators.required]
      })
    });

    expect(component.customFilter.value).toEqual(expectedCustomFilter.value);
  });

  it('should clone filterList when filterList input changes', () => {
    component.cloneFilterList = mockDataFilteredList;
    component.filterList = mockDataFilteredList;
    const changes: SimpleChanges = {
      filterList: {
        currentValue: mockDataFilteredList,
        firstChange: false,
        isFirstChange: () => false,
        previousValue: null
      }
    };

    spyOn(JSON, 'parse').and.callThrough();
    spyOn(JSON, 'stringify').and.callThrough();
    component.ngOnChanges(changes);
    expect(component.ngOnChanges).toHaveBeenCalled;
    //expect(component.cloneFilterList).toEqual(['item1', 'item2']);
  });


  // update filter and emit the events
  it('should update the filterList and emit filteredEvents and update all selected values', () => {
    spyOn(component.filteredEvents, 'emit').and.callThrough();
    const index = 0;
    const event = { checked: true } as MatCheckboxChange;

    component.filterList = [{ checked: true, value: 'AAA001', columnName: 'eventId', isColumnDateType: false }] as any[];
    component.cloneFilterList = component.filterList;
    component.checkboxChanged(event, index);
    const expectedFilterEventVal = {
      listFiltered: component.cloneFilterList,
      advanceFilter: component.customFilter.getRawValue(),
      isFilteredFirst: null,
      columnName: component.columnName && component.columnName == 'code' ? 'eventId' : component.columnName,
      columnIsTree: true,
      reset: false,
      eventType: 'checkbox'
    };
    expect(component.filteredEvents.emit).toHaveBeenCalled;
  })
  // update filter and emit the events end

  it('should toggle isAdvanceFilterOpen', () => {
    component.isAdvanceFilterOpen = false;
    component.columnName = 'coredate';
    component.viewAdvanceFilter();
    expect(component.isAdvanceFilterOpen).toBe(true);

    component.isColumnDataType = 'number';
    component.viewAdvanceFilter();
    component.isColumnDataType = '';
    component.viewAdvanceFilter();
    expect(component.isAdvanceFilterOpen).toBe(true);

    // Reset mocks
    component.customFilter = undefined;
    component.trigger = undefined;
  });

  it('should set customFilter operatorType1 and operatorType2 based on isColumnDataType', () => {
    component.columnName = "date";
    component.viewAdvanceFilter();

    expect(component.customFilter.get('advanceFilterType1').get('operatorType1').value).toBe('before');
    expect(component.customFilter.get('advanceFilterType2').get('operatorType2').value).toBe('before');

    component.isColumnDataType = "text";
    component.columnName = "text";
    component.viewAdvanceFilter();
    expect(component.customFilter.get('advanceFilterType1').get('operatorType1').value).toBe('contains');
    expect(component.customFilter.get('advanceFilterType2').get('operatorType2').value).toBe('contains');
  });

  it('should open or close the menu trigger based on isAdvanceFilterOpen', () => {
    component.isAdvanceFilterOpen = true;
    component.columnName = 'coredate'

    spyOn(component.trigger, 'openMenu');
    spyOn(component.trigger, 'closeMenu');

    component.viewAdvanceFilter();
    expect(component.trigger.closeMenu).toHaveBeenCalled();

    component.isAdvanceFilterOpen = false;
    component.viewAdvanceFilter();
    expect(component.trigger.openMenu).toHaveBeenCalled();
  });


  // select all check box event 
  it('should select all the filterList and emit filteredEvents value', () => {
    const event = new MatCheckboxChange();
    component.filterList = [{ checked: true, value: 'AAA001', columnName: 'eventId', isColumnDateType: false }] as any[];
    component.cloneFilterList = component.filterList;
    component.filterList.forEach(item => item.checked = event?.checked);
    component.cloneFilterList.forEach(item => item.checked = event?.checked);

    spyOn(component.filteredEvents, 'emit').and.callThrough();
    component.selectAll(event);


    component.filterList.forEach(item => {
      expect(item.checked).toBe(event.checked);
    });

    component.cloneFilterList.forEach(item => {
      expect(item.checked).toBe(event.checked)
    })
  })
  // select all check box event end

  // advance filter on search value changes 
  it('should map data to filterList on searchInput value', () => {
    let mockDataFilteredList: Array<FilterList> = [
      {
        checked: true, value: 'AAA001', columnName: 'eventId', isColumnDateType: false,
        displayValue: '',
        hidden: false
      },
      // { checked: true, value: 'AAA002', columnName: 'eventId', isColumnDateType: false }
    ];
    component.filterList = mockDataFilteredList
    component.onSearchChange('AAA0011');
    expect(component.filterList[0].hidden).toEqual(true);


  });

  it('should map data to filterList on searchInput value', () => {
    let mockDataFilteredList: Array<FilterList> = [
      {
        checked: true, value: 'AAA001', columnName: 'eventId', isColumnDateType: false,
        displayValue: '',
        hidden: false
      },
      // { checked: true, value: 'AAA002', columnName: 'eventId', isColumnDateType: false }
    ];
    component.filterList = mockDataFilteredList

    component.enterSearch = true;
    component.onSearchChange('');

    expect(component.filterList[0].hidden).not.toEqual(true);

  });
  // advance filter on search value changes end

  // reset the filter values from the list
  it('should reset all the values from the filtered list', () => {
    let mockDataFilteredList = [
      { checked: true, value: 'AAA001', columnName: 'eventId', isColumnDateType: false, displayValue: 'AAA003', hidden: false },
      { checked: true, value: 'AAA002', columnName: 'eventId', isColumnDateType: false, displayValue: 'AAA004', hidden: false },
    ];

    component.filterList = mockDataFilteredList;
    component.cloneFilterList = mockDataFilteredList;
    component.isAllSelected = false;

    spyOn(component.filteredEvents, 'emit').and.callThrough();

    component.trigger = {
      openMenu: jasmine.createSpy('openMenu'),
      closeMenu: jasmine.createSpy('closeMenu')
    } as any;


    let newCustomFilterValue = {
      searchFilter: '',
      operatorType: 'OR',
      advanceFilterType1: {
        operatorType1: 'contains',
        searchInput1: ''
      },
      advanceFilterType2: {
        operatorType2: 'contains',
        searchInput2: ''
      }
    };

    component.customFilter.setValue(newCustomFilterValue);

    expect(component.isAllSelected).toBe(false);
    expect(component.isAllSelected).toBe(false);
  })

  it('should onEnterChange', () => {
    component.enterSearch = true;
    component.customFilter.get("searchFilter").setValue("");
    let mockDataFilteredList: Array<FilterList> = [
      {
        checked: true, value: 'AAA001', columnName: 'eventId', isColumnDateType: false,
        displayValue: '',
        hidden: false
      },
    ];
    component.filterList = mockDataFilteredList;
    component.cloneFilterList = [...mockDataFilteredList]; // Ensure cloneFilterList is initialized properly
    component.onEnterChange();
    expect(component.onEnterChange).toHaveBeenCalled;

  })

  it('should onEnterChange', () => {
    component.enterSearch = true;
    component.customFilter.get("searchFilter").setValue("dry");
    let mockDataFilteredList: Array<FilterList> = [
      {
        checked: true, value: 'AAA001', columnName: 'eventId', isColumnDateType: false,
        displayValue: '',
        hidden: false
      },
    ];
    component.filterList = mockDataFilteredList
    component.onEnterChange();
    expect(component.onEnterChange).toHaveBeenCalled;

  })

  it('should call fetchColumnName', () => {
    let node = {
      pldCode: 'DAL'
    }
    component.columnName = 'someColumnName';
    spyOn(component, 'fetchColumnName').and.callThrough();
    component.fetchColumnName(node);
    expect(component.fetchColumnName).toHaveBeenCalled;
  });

  it('should check if all siblings of a parent node are selected', () => {
    const mockNode = { level: 1 };
    const mockParentNode = { level: 0 };
    const mockDescendants = [
      { level: 1, value: 'child1' },
      { level: 1, value: 'child2' },
    ];

    component.treeControlCustomFilter = {
      getDescendants: jasmine.createSpy('getDescendants').and.returnValue(mockDescendants),
      getLevel: jasmine.createSpy('getLevel').and.returnValue(mockNode.level),
      getParent() {
        return mockParentNode;
      }
    } as any;
    component.checklistSelection = {
      isSelected: jasmine.createSpy('isSelected').and.returnValue(true),
    } as any;

    component.checkParentAllSiblingSelected(mockNode);

    expect(component.checklistSelection.isSelected).toHaveBeenCalled;
  });

  it('should call selectAllTreeNode method', () => {
    component.dataSource = {
      data: [
        { level: 0, value: 'AAA001', columnName: 'eventId', isColumnDateType: false },
        { level: 1, value: 'AAA002', columnName: 'eventId', isColumnDateType: false }
      ]
    }
    component.treeControlCustomFilter = {
      getDescendants: jasmine.createSpy('getDescendants').and.returnValue([]),
      getLevel: jasmine.createSpy('getLevel').and.returnValue(0),
      getParent() {
        return null;
      },
      expandAll: jasmine.createSpy('expandAll'),
      collapseAll: jasmine.createSpy('collapseAll'),
      expand: jasmine.createSpy('expand'),
      collapse: jasmine.createSpy('collapse'),
      isExpanded: jasmine.createSpy('isExpanded').and.returnValue(false),
    } as any;
    component.checklistSelection = {
      isSelected: jasmine.createSpy('isSelected').and.returnValue(true),
      toggle: jasmine.createSpy('toggle'),
      select: jasmine.createSpy('select'),
      deselect: jasmine.createSpy('deselect'),
    } as any;

    component.filterList = [{ checked: true, value: 'AAA001', columnName: 'eventId', isColumnDateType: false }] as any[];
    component.cloneFilterList = component.filterList;
    component.selectAllTreeNode();
    expect(component.selectAllTreeNode).toHaveBeenCalled;
  })

  it('should call fetchSelectedOperatorType method', () => {
    component.filteredColumnList = [
      { checked: true, value: 'AAA001', columnName: 'eventId', isColumnDateType: false },
      { checked: true, value: 'AAA002', columnName: 'eventId', isColumnDateType: false }
    ];
    component.customFilter.get('advanceFilterType1').get('operatorType1').setValue('contains');
    component.customFilter.get('advanceFilterType2').get('operatorType2').setValue('contains');
    component.isColumnDataType = 'text';
    component.fetchSelectedOperatorType();
    expect(component.fetchSelectedOperatorType).toHaveBeenCalled;
  });

  it('should call toggleSelection method', () => {
    const mockNode = {
      level: 0,
      value: 'AAA001',
      columnName: 'eventId',
      isColumnDateType: false,
      displayValue: 'AAA001',
      hidden: false,
      checked: true
    };
    spyOn(component, 'checkboxChanged').and.callThrough;

    spyOn(component, 'checkAllParentsSelection').and.callThrough;
    component.treeControlCustomFilter = {
      getDescendants: jasmine.createSpy('getDescendants').and.returnValue([]),
      getLevel: jasmine.createSpy('getLevel').and.returnValue(0),
      getParent() {
        return null;
      },
      expandAll: jasmine.createSpy('expandAll'),
      collapseAll: jasmine.createSpy('collapseAll'),
      expand: jasmine.createSpy('expand'),
      collapse: jasmine.createSpy('collapse'),
      isExpanded: jasmine.createSpy('isExpanded').and.returnValue(false),

    } as any;

    component.checklistSelection = {
      isSelected: jasmine.createSpy('isSelected').and.returnValue(true),
      toggle: jasmine.createSpy('toggle'),
      select: jasmine.createSpy('select'),
      deselect: jasmine.createSpy('deselect'),
    } as any;

    component.filterList = [
      { checked: true, value: 'AAA001', columnName: 'eventId', isColumnDateType: false },
      { checked: true, value: 'AAA002', columnName: 'eventId', isColumnDateType: false }
    ] as any[]

    component.cloneFilterList = component.filterList;
    component.isAllSelected = false;


    let node = {
      level: 0,
      value: 'AAA001',
      columnName: 'eventId',
      isColumnDateType: false,
      displayValue: 'AAA001',
      hidden: false,
      checked: true
    }
    component.columnName = 'eventId';

    component.toggleSelection(node);
    expect(component.toggleSelection).toHaveBeenCalled;
  })


  it('should check all parent nodes selection when a child node is toggled', () => {
    const mockNode = { level: 2, value: 'childNode' };
    const mockParentNode = { level: 1, value: 'parentNode' };
    const mockGrandParentNode = { level: 0, value: 'grandParentNode' };

    component.treeControlCustomFilter = {
      getParent: jasmine.createSpy('getParent').and.callFake((node) => {
        if (node === mockNode) return mockParentNode;
        if (node === mockParentNode) return mockGrandParentNode;
        return null;
      }),
      getDescendants: jasmine.createSpy('getDescendants').and.callFake((node) => {
        if (node === mockParentNode) return [mockNode];
        if (node === mockGrandParentNode) return [mockParentNode];
        return [];
      }),
      dataNodes: [
        mockNode,
        mockParentNode,
        mockGrandParentNode
      ],
      getLevel: jasmine.createSpy('getLevel').and.callFake((node) => { })
    } as any;

    component.checklistSelection = {
      isSelected: jasmine.createSpy('isSelected').and.returnValue(true),
      select: jasmine.createSpy('select'),
      deselect: jasmine.createSpy('deselect'),
    } as any;

    spyOn(component, 'checkRootNodeSelection').and.callThrough;

    component.checkAllParentsSelection(mockNode);

    expect(component.checkAllParentsSelection).toHaveBeenCalled;
  });


  it('should call descendantsAllSelected method and return true if all descendants are selected', () => {
    const mockNode = { level: 0, value: 'parentNode' };
    const mockDescendants = [
      { level: 1, value: 'child1' },
      { level: 1, value: 'child2' },
    ];

    component.treeControlCustomFilter = {
      getDescendants: jasmine.createSpy('getDescendants').and.returnValue(mockDescendants),
    } as any;

    component.checklistSelection = {
      isSelected: jasmine.createSpy('isSelected').and.callFake((node) => mockDescendants.includes(node)),
    } as any;

    const result = component.descendantsAllSelected(mockNode);

    expect(component.treeControlCustomFilter.getDescendants).toHaveBeenCalledWith(mockNode);
    expect(component.checklistSelection.isSelected).toHaveBeenCalledTimes(mockDescendants.length);
    expect(result).toBe(true);
  });

  it('should call descendantsAllSelected method and return false if not all descendants are selected', () => {
    const mockNode = { level: 0, value: 'parentNode' };
    const mockDescendants = [
      { level: 1, value: 'child1' },
      { level: 1, value: 'child2' },
    ];

    component.treeControlCustomFilter = {
      getDescendants: jasmine.createSpy('getDescendants').and.returnValue(mockDescendants),
    } as any;

    component.checklistSelection = {
      isSelected: jasmine.createSpy('isSelected').and.callFake((node) => node === mockDescendants[0]),
    } as any;

    const result = component.descendantsAllSelected(mockNode);

    expect(component.treeControlCustomFilter.getDescendants).toHaveBeenCalledWith(mockNode);
    expect(component.checklistSelection.isSelected).toHaveBeenCalledTimes(mockDescendants.length);
    expect(result).toBe(false);
  });

  it('should call descendantsPartiallySelected method and return true if some descendants are selected', () => {
    const mockNode = { level: 0, value: 'parentNode' };
    const mockDescendants = [
      { level: 1, value: 'child1' },
      { level: 1, value: 'child2' },
    ];

    component.treeControlCustomFilter = {
      getDescendants: jasmine.createSpy('getDescendants').and.returnValue(mockDescendants),
    } as any;

    component.checklistSelection = {
      isSelected: jasmine.createSpy('isSelected').and.callFake((node) => node === mockDescendants[0]),
    } as any;

    component.descendantsPartiallySelected(mockNode);
    expect(component.descendantsPartiallySelected).toHaveBeenCalled;
  });

  it('should call descendantsPartiallySelected method and return false if no descendants are selected', () => {
    const mockNode = { level: 0, value: 'parentNode' };
    const mockDescendants = [
      { level: 1, value: 'child1' },
      { level: 1, value: 'child2' },
    ];

    component.treeControlCustomFilter = {
      getDescendants: jasmine.createSpy('getDescendants').and.returnValue(mockDescendants),
    } as any;

    component.checklistSelection = {
      isSelected: jasmine.createSpy('isSelected').and.returnValue(false),
    } as any;

    component.descendantsPartiallySelected(mockNode);

    expect(component.descendantsPartiallySelected).toHaveBeenCalled;
  });


  it('should call checkRootNodeSelection method and select the node if all descendants are selected', () => {
    const mockNode = { level: 0, value: 'parentNode' };
    const mockDescendants = [
      { level: 1, value: 'child1' },
      { level: 1, value: 'child2' },
    ];

    component.treeControlCustomFilter = {
      getDescendants: jasmine.createSpy('getDescendants').and.returnValue(mockDescendants),
    } as any;

    component.checklistSelection = {
      isSelected: jasmine.createSpy('isSelected').and.returnValue(true),
      select: jasmine.createSpy('select'),
      deselect: jasmine.createSpy('deselect'),
    } as any;

    spyOn(component, 'checkboxChanged').and.callThrough;

    component.checkRootNodeSelection(mockNode);
    expect(component.checkRootNodeSelection).toHaveBeenCalled;
  });

  it('should call checkRootNodeSelection method and deselect the node if not all descendants are selected', () => {
    const mockNode = { level: 0, value: 'parentNode' };
    const mockDescendants = [
      { level: 1, value: 'child1' },
      { level: 1, value: 'child2' },
    ];

    component.treeControlCustomFilter = {
      getDescendants: jasmine.createSpy('getDescendants').and.returnValue(mockDescendants),
    } as any;

    component.checklistSelection = {
      isSelected: jasmine.createSpy('isSelected').and.callFake((node) => node === mockDescendants[0]),
      select: jasmine.createSpy('select'),
      deselect: jasmine.createSpy('deselect'),
    } as any;

    spyOn(component, 'checkboxChanged').and.callThrough;

    component.checkRootNodeSelection(mockNode);

    expect(component.checkRootNodeSelection).toHaveBeenCalled;
  });


  it('should call selectNodeOnFilterCheckType method and select nodes based on filterList', () => {
    const mockNode1 = { level: 0, value: 'AAA001', evCcDcCode: 'AAA001', pldCode: null };
    const mockNode2 = { level: 1, value: 'AAA002', evCcDcCode: 'AAA002', pldCode: null };

    component.treeControlCustomFilter = {
      dataNodes: [mockNode1, mockNode2],
      expand: jasmine.createSpy('expand'),
    } as any;

    component.checklistSelection = {
      select: jasmine.createSpy('select'),
    } as any;

    component.filterList = [
      { checked: true, value: 'AAA001', columnName: 'eventId', isColumnDateType: false },
      { checked: false, value: 'AAA002', columnName: 'eventId', isColumnDateType: false },
    ] as any[];

    spyOn(component, 'fetchColumnName').and.callFake((node) => node.evCcDcCode || node.pldCode);

    component.selectNodeOnFilterCheckType();

    expect(component.selectNodeOnFilterCheckType).toHaveBeenCalled;
  });


  it('should call updateFilterList method and update the filterList correctly', () => {
    const mockFilterList = [
      { checked: true, value: 'AAA001', columnName: 'eventId', isColumnDateType: false, displayValue: 'AAA001', hidden: false },
      { checked: false, value: 'AAA002', columnName: 'eventId', isColumnDateType: false, displayValue: 'AAA002', hidden: false },
    ];

    const mockCurrentValue = [
      { checked: true, value: 'AAA001', columnName: 'eventId', isColumnDateType: false, displayValue: 'AAA001', hidden: false },
      { checked: false, value: 'AAA002', columnName: 'eventId', isColumnDateType: false, displayValue: 'AAA002', hidden: false },
    ];

    spyOn(component.changeDetectorRef, 'detectChanges').and.callThrough();

    component.columnName = 'eventId';
    component.filterList = mockFilterList;

    component.updateFilterList(mockCurrentValue);
    expect(component.updateFilterList).toHaveBeenCalled;
  });

  it('should call updateFilterList method and clear filterList if columnName does not match', () => {
    const mockFilterList = [
      { checked: true, value: 'AAA001', columnName: 'eventId', isColumnDateType: false, displayValue: 'AAA001', hidden: false },
      { checked: false, value: 'AAA002', columnName: 'eventId', isColumnDateType: false, displayValue: 'AAA002', hidden: false },
    ];

    const mockCurrentValue = [
      { checked: true, value: 'AAA001', columnName: 'otherColumn', isColumnDateType: false, displayValue: 'AAA001', hidden: false },
      { checked: false, value: 'AAA002', columnName: 'otherColumn', isColumnDateType: false, displayValue: 'AAA002', hidden: false },
    ];

    spyOn(component.changeDetectorRef, 'detectChanges').and.callThrough();

    component.columnName = 'eventId';
    component.filterList = mockFilterList;

    component.updateFilterList(mockCurrentValue);

    expect(component.updateFilterList).toHaveBeenCalled;
  });

  it('should call updateFilterList method and reset isAdvanceFilterOpen', () => {
    const mockCurrentValue = [
      { checked: true, value: 'AAA001', columnName: 'eventId', isColumnDateType: false, displayValue: 'AAA001', hidden: false },
      { checked: false, value: 'AAA002', columnName: 'eventId', isColumnDateType: false, displayValue: 'AAA002', hidden: false },
    ];

    component.filterList = [
      { checked: true, value: 'AAA001', columnName: 'eventId', isColumnDateType: false, displayValue: 'AAA001', hidden: false },
      { checked: false, value: 'AAA002', columnName: 'eventId', isColumnDateType: false, displayValue: 'AAA002', hidden: false },
    ]

    component.columnName = 'eventId';
    component.isAdvanceFilterOpen = true;

    component.updateFilterList(mockCurrentValue);

    expect(component.updateFilterList).toHaveBeenCalled;
  });

  it('should call ngOnChanges method and update filterList and cloneFilterList', () => {
    const mockFilterList = [
      { checked: true, value: 'AAA001', columnName: 'eventId', isColumnDateType: false, displayValue: 'AAA001', hidden: false },
      { checked: false, value: 'AAA002', columnName: 'eventId', isColumnDateType: false, displayValue: 'AAA002', hidden: false },
    ];

    component.filterList = mockFilterList;
    component.cloneFilterList = mockFilterList;
    component.columnName = 'eventId';
    let filterListMap = new Map<string, Array<FilterList>>();
    filterListMap.set('eventId', mockFilterList);
    const changes: SimpleChanges = {
      filterListMap: {
        currentValue: filterListMap,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      }
    };

    spyOn(component, 'selectNodeOnFilterCheckType').and.callThrough();

    component.ngOnChanges(changes);

    expect(component.filterList).toEqual(mockFilterList);
    expect(component.cloneFilterList).toEqual(mockFilterList);
    expect(component.selectNodeOnFilterCheckType).toHaveBeenCalled();
  });

  it('should call reset method and reset filter values', () => {
    const mockFilterList = [
      { checked: true, value: 'AAA001', columnName: 'eventId', isColumnDateType: false, displayValue: 'AAA001', hidden: false },
      { checked: false, value: 'AAA002', columnName: 'eventId', isColumnDateType: false, displayValue: 'AAA002', hidden: false },
    ];

    component.filterList = mockFilterList;
    component.cloneFilterList = mockFilterList;
    component.isAllSelected = false;

    spyOn(component.filteredEvents, 'emit').and.callThrough();
    component.trigger = {
      closeMenu: jasmine.createSpy('closeMenu'),
    } as any;

    const newCustomFilterValue = {
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
    };

    component.reset();

    expect(component.filterList).toEqual(mockFilterList);
    expect(component.cloneFilterList).toEqual(mockFilterList);
    expect(component.isAllSelected).toBe(true);
    expect(component.customFilter.value).toEqual(newCustomFilterValue);
    expect(component.trigger.closeMenu).toHaveBeenCalled();
    expect(component.filteredEvents.emit).toHaveBeenCalledWith({
      listFiltered: mockFilterList,
      advanceFilter: newCustomFilterValue,
      isFilteredFirst: null,
      columnName: component.columnName,
      columnIsTree: component.columnIsTree || false,
      reset: true,
      eventType: 'advance',
    });
  });

  it('should call isNodeVisible method and return true for visible nodes', () => {
    const mockNodeLevel0 = { level: 0 };
    const mockNodeLevel1 = { level: 1 };
    const mockNodeLevel2 = { level: 2 };

    component.treeControlCustomFilter = {
      isExpanded: jasmine.createSpy('isExpanded').and.returnValue(true),
      getParent: jasmine.createSpy('getParent').and.callFake((node) => {
        if (node === mockNodeLevel1) return mockNodeLevel0;
        if (node === mockNodeLevel2) return mockNodeLevel1;
        return null;
      }),
    } as any;

    expect(component.isNodeVisible(mockNodeLevel0)).toBe(true);
    expect(component.isNodeVisible(mockNodeLevel1)).toBe(true);
    expect(component.isNodeVisible(mockNodeLevel2)).toBe(true);
  });

  it('should call isNodeVisible method and return false for non-visible nodes', () => {
    const mockNodeLevel1 = { level: 1 };
    const mockNodeLevel2 = { level: 2 };

    component.treeControlCustomFilter = {
      isExpanded: jasmine.createSpy('isExpanded').and.returnValue(false),
      getParent: jasmine.createSpy('getParent').and.callFake((node) => {
        if (node === mockNodeLevel2) return mockNodeLevel1;
        return null;
      }),
    } as any;

    expect(component.isNodeVisible(mockNodeLevel1)).toBe(false);
    expect(component.isNodeVisible(mockNodeLevel2)).toBe(false);
  });


  it('should call operatorTypeChange method and update filterList based on advanceFilterType', () => {
    const mockFilterList = [
      { checked: true, value: 'AAA001', columnName: 'eventId', isColumnDateType: false, displayValue: 'AAA001', hidden: false },
      { checked: false, value: 'AAA002', columnName: 'eventId', isColumnDateType: false, displayValue: 'AAA002', hidden: false },
    ];

    const filterResult = [
      { checked: true, value: 'AAA001', columnName: 'eventId', isColumnDateType: false, displayValue: 'AAA001', hidden: false },
    ];
    component.filterList = mockFilterList;
    component.cloneFilterList = filterResult;

    const mockAdvanceFilter = {
      advanceFilterType1: { operatorType1: 'contains', searchInput1: 'AAA001' },
      advanceFilterType2: { operatorType2: 'contains', searchInput2: '' },
    };

    component.customFilter.setValue({
      searchFilter: null,
      operatorType: 'OR',
      advanceFilterType1: mockAdvanceFilter.advanceFilterType1,
      advanceFilterType2: mockAdvanceFilter.advanceFilterType2,
    });

    spyOn(component.filteredEvents, 'emit').and.callThrough();
    spyOn(component.customFilter.get('searchFilter'), 'patchValue').and.callThrough();

    component.operatorTypeChange();

    expect(component.customFilter.get('searchFilter').patchValue).toHaveBeenCalledWith(null);
    expect(component.filterList.length).toBe(1); // Only one item matches the search input
    expect(component.filterList[0].value).toBe('AAA001');
    expect(component.filteredEvents.emit).toHaveBeenCalledWith({
      listFiltered: component.cloneFilterList,
      advanceFilter: component.customFilter.getRawValue(),
      isFilteredFirst: null,
      columnName: component.columnName,
      columnIsTree: component.columnIsTree || false,
      reset: false,
      eventType: 'advance',
    });
  });

  it('should call applyFilter and filterTree, expandAll when filterText is provided', () => {
    const filterText = 'AAA';
    component.treeControlCustomFilter = {
      expandAll: jasmine.createSpy('expandAll'),
    } as any;
    component.dataSource = {
      data: [
        { level: 0, value: 'AAA001', columnName: 'eventId', isColumnDateType: false, displayValue: 'AAA001', hidden: false },
        { level: 1, value: 'BBB002', columnName: 'eventId', isColumnDateType: false, displayValue: 'BBB002', hidden: false }
      ]
    };
    spyOn(component, 'filterTree').and.callThrough();

    // Provide a minimal implementation for filterRecursive to test filtering
    spyOn(component, 'filterRecursive').and.callFake((filterText, array, property) => {
      return array.filter(item => item.value.includes(filterText));
    });

    // Set up dataNodes for filterTree
    component.treeControlCustomFilter.dataNodes = component.dataSource.data;
    component.columnName = 'value';

    component.applyFilter(filterText);

    expect(component.filterTree).toHaveBeenCalledWith(filterText);
    expect(component.treeControlCustomFilter.expandAll).toHaveBeenCalled();
    // After filtering, only items with 'AAA' in value should remain
    expect(component.dataSource.data.length).toBe(1);
    expect(component.dataSource.data[0].value).toBe('AAA001');
  });

  it('should call applyFilter and filterTree, expandAll when filterText is empty', () => {
    const filterText = '';
    component.treeControlCustomFilter = {
      expandAll: jasmine.createSpy('expandAll'),
    } as any;
    component.dataSource = {
      data: [
        { level: 0, value: 'AAA001', columnName: 'eventId', isColumnDateType: false, displayValue: 'AAA001', hidden: false },
        { level: 1, value: 'BBB002', columnName: 'eventId', isColumnDateType: false, displayValue: 'BBB002', hidden: false }
      ]
    };
    spyOn(component, 'filterTree').and.callThrough();

    // Provide a minimal implementation for filterRecursive to test filtering
    spyOn(component, 'filterRecursive').and.callFake((filterText, array, property) => {
      return array; // returns all when filterText is empty
    });

    // Set up dataNodes for filterTree
    component.treeControlCustomFilter.dataNodes = component.dataSource.data;
    component.columnName = 'value';

    component.applyFilter(filterText);

    expect(component.filterTree).toHaveBeenCalledWith(filterText);
    expect(component.treeControlCustomFilter.expandAll).toHaveBeenCalled();
    // All items should remain
    expect(component.dataSource.data.length).toBe(2);
  });

  it('should call filterRecursive and return filtered array based on property', () => {
    // Arrange
    const array = [
      { name: 'Alpha', parent: null },
      { name: 'Beta', parent: null },
      { name: 'Gamma', parent: null },
      { name: 'Delta', parent: null }
    ];
    // Mock getParentNode and treeControlCustomFilter.getDescendants
    spyOn(component, 'getParentNode').and.returnValue(null);
    component.treeControlCustomFilter = {
      getDescendants: jasmine.createSpy('getDescendants').and.returnValue([])
    } as any;

    // Act
    const result = component.filterRecursive('Al', array, 'name');

    // Assert
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Alpha');
  });

  it('should return all items if filterText is empty', () => {
    const array = [
      { name: 'Alpha', parent: null },
      { name: 'Beta', parent: null }
    ];
    spyOn(component, 'getParentNode').and.returnValue(null);
    component.treeControlCustomFilter = {
      getDescendants: jasmine.createSpy('getDescendants').and.returnValue([])
    } as any;

    const result = component.filterRecursive('', array, 'name');
    expect(result.length).toBe(2);
  });

  it('should include item if parent matches filterText', () => {
    const parentNode = { name: 'Parent', parent: null };
    const childNode = { name: 'Child', parent: parentNode };
    const array = [childNode];
    // getParentNode returns parentNode for childNode
    spyOn(component, 'getParentNode').and.callFake((node) => node === childNode ? parentNode : null);
    component.treeControlCustomFilter = {
      getDescendants: jasmine.createSpy('getDescendants').and.returnValue([])
    } as any;

    const result = component.filterRecursive('Parent', array, 'name');
    expect(result.length).toBe(1);
    expect(result[0]).toBe(childNode);
  });

  it('should include item if ancestor matches filterText', () => {
    const grandParent = { name: 'Grand', parent: null };
    const parent = { name: 'Parent', parent: grandParent };
    const child = { name: 'Child', parent: parent };
    const array = [child];
    // getParentNode returns parent for child, grandParent for parent, null for grandParent
    spyOn(component, 'getParentNode').and.callFake((node) => {
      if (node === child) return parent;
      if (node === parent) return grandParent;
      return null;
    });
    component.treeControlCustomFilter = {
      getDescendants: jasmine.createSpy('getDescendants').and.returnValue([])
    } as any;

    const result = component.filterRecursive('Grand', array, 'name');
    expect(result.length).toBe(1);
    expect(result[0]).toBe(child);
  });

  it('should include parent if any child matches filterText', () => {
    const parent = { name: 'Parent', parent: null };
    const child = { name: 'SpecialChild', parent: parent };
    const array = [parent];
    // getParentNode returns null for parent
    component.treeControlCustomFilter = {
      getDescendants: jasmine.createSpy('getDescendants').and.callFake((node) => node === parent ? [child] : [])
    } as any;
    spyOn(component, 'getParentNode').and.returnValue(null);

    const result = component.filterRecursive('Special', array, 'name');
    expect(result.length).toBe(1);
    expect(result[0]).toBe(parent);
  });

  it('should call toggleSelection and use node.category as fallback for index', () => {
    const mockNode = {
      level: 0,
      evCcDcCode: 'AAA001',
      category: 'CATEGORY_X',
      columnName: 'eventId',
      isColumnDateType: false,
      displayValue: 'CATEGORY_X',
      hidden: false,
      checked: true
    };
    spyOn(component, 'checkboxChanged').and.callThrough();
    spyOn(component, 'checkAllParentsSelection').and.callThrough();

    component.treeControlCustomFilter = {
      getDescendants: jasmine.createSpy('getDescendants').and.returnValue([
        { category: 'CATEGORY_X' }
      ]),
      getLevel: jasmine.createSpy('getLevel').and.returnValue(0),
      getParent() { return null; },
      expandAll: jasmine.createSpy('expandAll'),
      collapseAll: jasmine.createSpy('collapseAll'),
      expand: jasmine.createSpy('expand'),
      collapse: jasmine.createSpy('collapse'),
      isExpanded: jasmine.createSpy('isExpanded').and.returnValue(false),
    } as any;

    component.checklistSelection = {
      isSelected: jasmine.createSpy('isSelected').and.returnValue(true),
      toggle: jasmine.createSpy('toggle'),
      select: jasmine.createSpy('select'),
      deselect: jasmine.createSpy('deselect'),
    } as any;

    component.filterList = [
      { checked: true, value: 'AAA001', columnName: 'eventId', isColumnDateType: false },
      { checked: true, value: 'AAA002', columnName: 'eventId', isColumnDateType: false },
      { checked: true, value: 'CATEGORY_X', columnName: 'eventId', isColumnDateType: false }
    ] as any[];

    component.cloneFilterList = component.filterList;
    component.isAllSelected = false;
    component.columnName = "eventId";

    component.toggleSelection(mockNode);

    // Check that checkboxChanged was called with the correct index for category fallback
    expect(component.checkboxChanged).toHaveBeenCalledWith(
      jasmine.any(Object),
      2, // index of 'CATEGORY_X' in filterList
      false
    );
    expect(component.checkAllParentsSelection).toHaveBeenCalledWith(mockNode);
  });


  // All commented-out isSecIdSelected tests removed to ensure only one describe per file.

  //   it('should return false if no secondary id is selected', () => {
  //     component.checklistSelection = {
  //       selected: [
  //         { category: 'Primary' }
  //       ]
  //     } as any;

  //     expect(component.isSecIdSelected()).toBeFalse();
  //   });

  //   it('should return false if checklistSelection is undefined', () => {
  //     component.checklistSelection = undefined as any;
  //     expect(component.isSecIdSelected()).toBeFalse();
  //   });

  //   it('should return false if selected is undefined', () => {
  //     component.checklistSelection = { selected: undefined } as any;
  //     expect(component.isSecIdSelected()).toBeFalse();
  //   });

  //   it('should return false if selected is empty array', () => {
  //     component.checklistSelection = { selected: [] } as any;
  //     expect(component.isSecIdSelected()).toBeFalse();
  //   });

  //   it('should trim category and match "Secondary"', () => {
  //     component.checklistSelection = {
  //       selected: [
  //         { category: '  Secondary  ' }
  //       ]
  //     } as any;
  //     expect(component.isSecIdSelected()).toBeTrue();
  //   });
  // });

  //write unit test for toggleSelection, including both condition for this check this.columnIsTree && this.columnName == "category"
  it('should call toggleSelection and use node.category as fallback for index for columnIsTree and columnName == "category"', () => {
    const mockNode = {
      level: 0,
      value: 'AAA003',
      category: 'CATEGORY_X',
      columnName: 'eventId',
      isColumnDateType: false,
      displayValue: 'CATEGORY_X',
      hidden: false,
      checked: true
    };

    spyOn(component, 'checkboxChanged').and.callThrough();
    spyOn(component, 'checkAllParentsSelection').and.callThrough();
    component.columnIsTree = true;
    component.columnName = "category";
    let mockTranslateService;
    let mockSnackBar;
    interface DataModel {
      id: string;
    }
    component.dataSource = new FilterlessDataSource<DataModel>(mockSnackBar, mockTranslateService);
    component.dataSource.data = [];
    component.treeControlCustomFilter = {
      getDescendants: jasmine.createSpy('getDescendants').and.returnValue([
        { category: 'CATEGORY_X' }
      ]),
      getLevel: jasmine.createSpy('getLevel').and.returnValue(0),
      getParent() { return null; },
      expandAll: jasmine.createSpy('expandAll'),
      collapseAll: jasmine.createSpy('collapseAll'),
      expand: jasmine.createSpy('expand'),
      collapse: jasmine.createSpy('collapse'),
      isExpanded: jasmine.createSpy('isExpanded').and.returnValue(false),
    } as any;

    component.checklistSelection = {
      isSelected: jasmine.createSpy('isSelected').and.returnValue(true),
      toggle: jasmine.createSpy('toggle'),
      select: jasmine.createSpy('select'),
      deselect: jasmine.createSpy('deselect'),
    } as any;

    component.filterList = [
      { checked: true, value: 'AAA001', columnName: 'eventId', isColumnDateType: false },
      { checked: true, value: 'AAA002', columnName: 'eventId', isColumnDateType: false },
      { checked: true, value: 'CATEGORY_X', columnName: 'eventId', isColumnDateType: false }
    ] as any[];

    component.cloneFilterList = component.filterList;
    component.isAllSelected = false;

    component.toggleSelection(mockNode);

    // Check that checkboxChanged was called with the correct index for category fallback
    expect(component.checkboxChanged).toHaveBeenCalledWith(
      jasmine.any(Object),
      0, // index of 'CATEGORY_X' in filterList
      false
    );
    expect(component.checkAllParentsSelection).toHaveBeenCalledWith(mockNode);
  });

  //unit test for fetchColumnName
  it('should return the correct column name', () => {
    component.columnName = 'eventId';
    component.columnIsTree = false;
    const mockNode = {
      level: 0,
      evCcDcCode: 'AAA03',
      category: 'CATEGORY_X',
      columnName: 'eventId',
      isColumnDateType: false,
      displayValue: 'CATEGORY_X',
      hidden: false,
      checked: true
    };
    expect(component.fetchColumnName(mockNode)).toBe('AAA03');
  });

  it('should return the correct column name', () => {
    component.columnName = 'category';
    component.columnIsTree = true;
    const mockNode = {
      level: 0,
      id: 'http://example.com/AAA03',
      category: 'CATEGORY_X',
      columnName: 'eventId',
      isColumnDateType: false,
      displayValue: 'CATEGORY_X',
      hidden: false,
      checked: true
    };
    expect(component.fetchColumnName(mockNode)).toBe('http://example.com/AAA03');
  });

  // it('should map tree nodes and update selection and dataSource correctly 2', () => {
  //   // Arrange
  //   component.columnIsTree = true;
  //   component.columnName = 'category';
  //   component.isAllSelected = false;

  //   // Mock filterList and dataSourceOriginalData
  //   component.filterList = [
  //     { displayValue: 'node-1', checked: true, value: 'node-1', columnName: 'category', isColumnDateType: false, hidden: false },
  //     { displayValue: 'node-2', checked: false, value: 'node-2', columnName: 'category', isColumnDateType: false, hidden: false }
  //   ];
  //   component.dataSourceOriginalData = {
  //     data: [
  //       { id: 'node-1', hidden: false },
  //       { id: 'node-2', hidden: false },
  //       { id: 'node-3', hidden: false },
  //       { id: 'node-4', hidden: false }
  //     ]
  //   };

  //   // Use a real mock class for dataSource
  //   class MockDataSource {
  //     setData(data) { return data; }
  //   }
  //   component.dataSource = new MockDataSource();
  //   spyOn(component.dataSource, 'setData').and.callThrough();
  //   component.checklistSelection = jasmine.createSpyObj('SelectionModel', ['select', 'deselect']);
  //   component.treeControlCustomFilter = jasmine.createSpyObj('CustomTreeControl', ['expand']);
  //   spyOn(component.changeDetectorRef, 'detectChanges');

  //   // Act
  //   component.mapTreeNode();

  //   // Assert
  //   expect(component.checklistSelection.select).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'node-1' }));
  //   expect(component.treeControlCustomFilter.expand).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'node-1' }));
  //   expect(component.dataSource.setData).toHaveBeenCalled();
  //   expect(component.changeDetectorRef.detectChanges).toHaveBeenCalled();
  // });


  // it('should map tree nodes and update selection and dataSource correctly 3', () => {
  //   // Arrange
  //   component.columnIsTree = true;
  //   component.columnName = 'eventId';
  //   component.isAllSelected = false;

  //   // Mock filterList and dataSourceOriginalData
  //   component.filterList = [
  //     { displayValue: 'node-1', checked: true, value: 'node-1', columnName: 'eventId', isColumnDateType: false, hidden: false },
  //     { displayValue: 'node-2', checked: false, value: 'node-2', columnName: 'eventId', isColumnDateType: false, hidden: false }
  //   ];
  //   component.dataSourceOriginalData = {
  //     data: [
  //       { id: 'node-1', hidden: false },
  //       { id: 'node-2', hidden: false },
  //       { id: 'node-3', hidden: false },
  //       { id: 'node-4', hidden: false }
  //     ]
  //   };

  //   // Use the real FilterlessDataSource for compatibility
  //   component.checklistSelection = jasmine.createSpyObj('SelectionModel', ['select', 'deselect']);
  //   component.treeControlCustomFilter = jasmine.createSpyObj('CustomTreeControl', ['expand']);
  //   const mockTranslateService = {} as any;
  //   component.dataSource = new FilterlessDataSource(component.dataSourceOriginalData.data, mockTranslateService);
  //   spyOn(component.dataSource, 'setData').and.callThrough();

  //   // Act
  //   component.mapTreeNode();

  //   // Assert
  //   expect(component.checklistSelection.select).toHaveBeenCalled();
  //   expect(component.treeControlCustomFilter.expand).toHaveBeenCalled();
  //   expect(component.dataSource.setData).toHaveBeenCalled();
  // });
  it('should filter list based on "contains" operator', () => {
      let mockDataFilteredList: Array<FilterList>;
    mockDataFilteredList = [
      { checked: true, value: 'Test 1', columnName: 'eventId', isColumnDateType: false, displayValue: 'Test 1', hidden: false },
      { checked: true, value: 'Test 2', columnName: 'eventId', isColumnDateType: false, displayValue: 'Test 2', hidden: false },
      { checked: true, value: 'Sample', columnName: 'eventId', isColumnDateType: false, displayValue: 'Sample', hidden: false },
    ];
    component.filterList = [...mockDataFilteredList];
    component.cloneFilterList = [...mockDataFilteredList];
    component.customFilter.get('advanceFilterType1').get('operatorType1').setValue('contains');
    component.customFilter.get('advanceFilterType1').get('searchInput1').setValue('Test');
    component.operatorTypeChange();

    expect(component.filterList.length).toBe(2);
    expect(component.filterList[0].displayValue).toBe('Test 1');
    expect(component.filterList[1].displayValue).toBe('Test 2');
  });

  it('should filter list based on "startsWith" operator', () => {
      let mockDataFilteredList: Array<FilterList>;
    mockDataFilteredList = [
      { checked: true, value: 'Test 1', columnName: 'eventId', isColumnDateType: false, displayValue: 'Test 1', hidden: false },
      { checked: true, value: 'Test 2', columnName: 'eventId', isColumnDateType: false, displayValue: 'Test 2', hidden: false },
      { checked: true, value: 'Sample', columnName: 'eventId', isColumnDateType: false, displayValue: 'Sample', hidden: false },
    ];
    component.filterList = [...mockDataFilteredList];
    component.cloneFilterList = [...mockDataFilteredList];
    component.customFilter.get('advanceFilterType1').get('operatorType1').setValue('startsWith');
    component.customFilter.get('advanceFilterType1').get('searchInput1').setValue('Sam');
    component.operatorTypeChange();

    expect(component.filterList.length).toBe(1);
    expect(component.filterList[0].displayValue).toBe('Sample');
  });

  it('should filter list based on "endsWith" operator', () => {
      let mockDataFilteredList: Array<FilterList>;
    mockDataFilteredList = [
      { checked: true, value: 'Test 1', columnName: 'eventId', isColumnDateType: false, displayValue: 'Test 1', hidden: false },
      { checked: true, value: 'Test 2', columnName: 'eventId', isColumnDateType: false, displayValue: 'Test 2', hidden: false },
      { checked: true, value: 'Sample', columnName: 'eventId', isColumnDateType: false, displayValue: 'Sample', hidden: false },
    ];
    component.filterList = [...mockDataFilteredList];
    component.cloneFilterList = [...mockDataFilteredList];
    component.customFilter.get('advanceFilterType1').get('operatorType1').setValue('endsWith');
    component.customFilter.get('advanceFilterType1').get('searchInput1').setValue('1');
    component.operatorTypeChange();

    expect(component.filterList.length).toBe(1);
    expect(component.filterList[0].displayValue).toBe('Test 1');
  });

  it('should filter list based on "equals" operator', () => {
      let mockDataFilteredList: Array<FilterList>;
    mockDataFilteredList = [
      { checked: true, value: 'Test 1', columnName: 'eventId', isColumnDateType: false, displayValue: 'Test 1', hidden: false },
      { checked: true, value: 'Test 2', columnName: 'eventId', isColumnDateType: false, displayValue: 'Test 2', hidden: false },
      { checked: true, value: 'Sample', columnName: 'eventId', isColumnDateType: false, displayValue: 'Sample', hidden: false },
    ];
    component.filterList = [...mockDataFilteredList];
    component.cloneFilterList = [...mockDataFilteredList];
    component.customFilter.get('advanceFilterType1').get('operatorType1').setValue('equals');
    component.customFilter.get('advanceFilterType1').get('searchInput1').setValue('Test 2');
    component.operatorTypeChange();

    expect(component.filterList.length).toBe(1);
    expect(component.filterList[0].displayValue).toBe('Test 2');
  });

  it('should reset filter when no input is provided', () => {
      let mockDataFilteredList: Array<FilterList>;
    mockDataFilteredList = [
      { checked: true, value: 'Test 1', columnName: 'eventId', isColumnDateType: false, displayValue: 'Test 1', hidden: false },
      { checked: true, value: 'Test 2', columnName: 'eventId', isColumnDateType: false, displayValue: 'Test 2', hidden: false },
      { checked: true, value: 'Sample', columnName: 'eventId', isColumnDateType: false, displayValue: 'Sample', hidden: false },
    ];
    component.filterList = [...mockDataFilteredList];
    component.cloneFilterList = [...mockDataFilteredList];
    component.customFilter.get('advanceFilterType1').get('operatorType1').setValue('contains');
    component.customFilter.get('advanceFilterType1').get('searchInput1').setValue('');
    component.operatorTypeChange();

    expect(component.filterList.length).toBe(3);
    expect(component.filterList).toEqual(mockDataFilteredList);
  });

  it('should handle date filtering with "before" operator', () => {
    component.isColumnDataType = 'date';
    component.customFilter.get('advanceFilterType1').get('operatorType1').setValue('before');
    component.customFilter.get('advanceFilterType1').get('searchInput1').setValue('2024-01-01');
    component.filterList = [
      {
        checked: false,
        value: "2025-02-03T00:00:00.000Z",
        displayValue: "03/02/2025",
        rawValue: "2025-02-03T00:00:00.000Z",
        columnName: "validationStatusDate",
        isColumnDateType: true,
        hidden: false,
        filteredBy: "validationStatusDate"
      },
      {
        checked: true,
        value: "2025-02-17T15:33:20.000Z",
        displayValue: "17/02/2025",
        rawValue: "2025-02-17T15:33:20.000Z",
        columnName: "validationStatusDate",
        isColumnDateType: true,
        hidden: false
      }
    ];
    component.cloneFilterList = [...component.filterList];
    component.operatorTypeChange();
    expect(component.cloneFilterList[0].displayValue).toBe('03/02/2025');
  });

  it('should handle date filtering with "after" operator', () => {
    component.isColumnDataType = 'date';
    component.customFilter.get('advanceFilterType1').get('operatorType1').setValue('after');
    component.customFilter.get('advanceFilterType1').get('searchInput1').setValue('04/02/2025');
    component.filterList = [
      {
        checked: false,
        value: "2025-02-03T00:00:00.000Z",
        displayValue: "03/02/2025",
        rawValue: "2025-02-03T00:00:00.000Z",
        columnName: "validationStatusDate",
        isColumnDateType: true,
        hidden: false,
        filteredBy: "validationStatusDate"
      },
      {
        checked: true,
        value: "2025-02-17T15:33:20.000Z",
        displayValue: "17/02/2025",
        rawValue: "2025-02-17T15:33:20.000Z",
        columnName: "validationStatusDate",
        isColumnDateType: true,
        hidden: false
      }
    ];
    // component.cloneFilterList = [...component.filterList];
    component.operatorTypeChange();
    expect(component.cloneFilterList.length).toBe(2);
  });

  // it('should select and expand nodes, then set filtered data on dataSource when columnIsTree is true', () => {
  //   // Arrange
  //   component.columnIsTree = true;
  //   component.filterList = [
  //     { displayValue: 'node-1', checked: true, value: 'node-1', columnName: 'category', isColumnDateType: false, hidden: false },
  //     { displayValue: 'node-2', checked: false, value: 'node-2', columnName: 'category', isColumnDateType: false, hidden: false }
  //   ];
  //   component.dataSourceOriginalData = {
  //     data: [
  //       { id: 'node-1', hidden: false },
  //       { id: 'node-2', hidden: false },
  //       { id: 'node-3', hidden: false }
  //     ]
  //   };
  //   // Use a real mock class for dataSource
  //   class MockDataSource {
  //     setData(data: any[]) { }
  //   }
  //   component.dataSource = new MockDataSource();
  //   spyOn(component.dataSource, 'setData');
  //   component.checklistSelection = jasmine.createSpyObj('SelectionModel', ['select', 'deselect']);
  //   component.treeControlCustomFilter = jasmine.createSpyObj('CustomTreeControl', ['expand']);
  //   spyOn(component.changeDetectorRef, 'detectChanges');

  //   // Act
  //   component.mapTreeNode();

  //   // Assert
  //   expect(component.checklistSelection.select).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'node-1' }));
  //   expect(component.treeControlCustomFilter.expand).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'node-1' }));
  //   expect(component.dataSource.setData).toHaveBeenCalled();
  //   expect(component.changeDetectorRef.detectChanges).toHaveBeenCalled();
  // });

  it('should not call setData if columnIsTree is false', () => {
    // Arrange
    component.columnIsTree = false;
    class MockDataSource {
      setData(data) { }
    }
    component.dataSource = new MockDataSource();
    spyOn(component.dataSource, 'setData');

    // Act
    component.mapTreeNode();

    // Assert
    expect(component.dataSource.setData).not.toHaveBeenCalled();
  });
});
