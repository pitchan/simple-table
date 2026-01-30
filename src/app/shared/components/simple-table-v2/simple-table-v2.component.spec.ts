import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { SelectionModel } from '@angular/cdk/collections';
import { SimpleTableV2Component } from './simple-table-v2.component';
import { TableConfig, TableColumnDef } from './models/column-def.model';

describe('SimpleTableV2Component', () => {
  let component: SimpleTableV2Component<any>;
  let fixture: ComponentFixture<SimpleTableV2Component<any>>;

  const mockData = [
    { id: '1', name: 'Item 1', date: '2024-01-01', value: 100 },
    { id: '2', name: 'Item 2', date: '2024-01-02', value: 200 },
    { id: '3', name: 'Item 3', date: '2024-01-03', value: 300 },
  ];

  const mockColumns: TableColumnDef[] = [
    { id: 'name', header: 'Name', type: 'text', sortable: true },
    { id: 'date', header: 'Date', type: 'date', sortable: true },
    { id: 'value', header: 'Value', type: 'number', sortable: true },
  ];

  const mockConfig: TableConfig = {
    id: 'test-table',
    columns: mockColumns,
    features: {
      sort: true,
      pagination: true,
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SimpleTableV2Component,
        NoopAnimationsModule,
        TranslateModule.forRoot(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SimpleTableV2Component);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with array data', () => {
    component.data = mockData;
    component.config = mockConfig;
    
    fixture.detectChanges();

    expect(component.tableData).toEqual(mockData);
    expect(component.totalCount).toBe(mockData.length);
  });

  it('should initialize columns', () => {
    component.data = mockData;
    component.config = mockConfig;
    
    component.ngOnInit();

    expect(component.displayedColumns).toEqual(['name', 'date', 'value']);
    expect(component.visibleColumns.length).toBe(3);
  });

  it('should handle selection', () => {
    const selection = new SelectionModel<any>(true, []);
    component.data = mockData;
    component.config = mockConfig;
    component.selection = selection;
    
    component.ngOnInit();

    expect(component.displayedColumns).toContain('select');
  });

  it('should emit row click', () => {
    const spy = spyOn(component.rowClick, 'emit');
    const row = mockData[0];
    
    component.onRowClick(row);

    expect(spy).toHaveBeenCalledWith(row);
  });

  it('should emit hyperlink click', () => {
    const spy = spyOn(component.hyperlinkClick, 'emit');
    const event = new Event('click');
    const row = mockData[0];
    
    component.onHyperlinkClick(event, row, 'name');

    expect(spy).toHaveBeenCalledWith({ row, column: 'name' });
  });
});
