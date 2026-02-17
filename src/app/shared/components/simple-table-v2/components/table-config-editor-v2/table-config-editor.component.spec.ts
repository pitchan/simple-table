import { DragDropModule } from "@angular/cdk/drag-drop";
import { ComponentFixture, TestBed, waitForAsync } from "@angular/core/testing";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { TranslateModule } from "@ngx-translate/core";
import { TreeTableColumn, TreeTableColumnDefaultConfig, TreeTableConfig } from "../../../table-tree-view/table-config";
import { TableConfigEditorComponent } from "./table-config-editor.component";

describe("TableConfigEditorComponent", () => {
    let component: TableConfigEditorComponent;
    let fixture: ComponentFixture<TableConfigEditorComponent>;

    
afterEach(() => {
  if (fixture) {
    fixture.destroy();
  }
});
beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({
                imports: [TableConfigEditorComponent, DragDropModule, MatSnackBarModule, TranslateModule.forRoot()],
            }).compileComponents();
        })
    );

    beforeEach(() => {
        fixture = TestBed.createComponent(TableConfigEditorComponent);
        component = fixture.componentInstance;
        component.options = new TreeTableConfig({
            name: "",
            columns: [
                { name: "id", sticky: true } as TreeTableColumn,
                { name: "Column 1", sticky: false } as TreeTableColumn,
                { name: "Column 2", sticky: false } as TreeTableColumn,
                { name: "Column 3", sticky: false, dynamic: true } as TreeTableColumn
            ]
        });
        component.tableColumnDefaultConfig = {
            options: new TreeTableConfig({
                name: "",
                columns: [
                    { name: "id", sticky: true } as TreeTableColumn,
                    { name: "Column 1", sticky: false } as TreeTableColumn,
                    { name: "Column 2", sticky: false } as TreeTableColumn,
                    { name: "Column 3", sticky: false, dynamic: true } as TreeTableColumn
                ]
            }),
            displayMode: '',
            showFamilyValue: false,
            structure: [],
            isGeneric: false
        } as TreeTableColumnDefaultConfig;
        fixture.detectChanges();
    });

    it("should compile", () => {
        expect(component).toBeTruthy();
    });

    // Flattened: toggleSticky
    let event: Event;
    let column: TreeTableColumn;

    beforeEach(() => {
        event = new MouseEvent("click");
        column = { name: "Test Column", sticky: false } as TreeTableColumn;
        component.options.columns.columns = [
            { name: "id", sticky: true } as TreeTableColumn,
            { name: "Column 1", sticky: false } as TreeTableColumn,
            { name: "Column 2", sticky: false } as TreeTableColumn,
            column
        ];
    });

    it("should make a column sticky", () => {
        spyOn(event, "stopPropagation");
        component.toggleSticky(event, column);
        expect(event.stopPropagation).toHaveBeenCalled();
        expect(component.options.columns.columns[2].sticky).toBeTrue();
        expect(component.options.columns.columns[3].sticky).toBeTrue();
    });

    it("should unstick a sticky column", () => {
        column.sticky = true;
        spyOn(event, "stopPropagation");
        component.toggleSticky(event, column);
        expect(event.stopPropagation).toHaveBeenCalled();
        expect(component.options.columns.columns[2].sticky).toBeFalse();
        expect(component.options.columns.columns[3].sticky).toBeFalse();
    });
});
