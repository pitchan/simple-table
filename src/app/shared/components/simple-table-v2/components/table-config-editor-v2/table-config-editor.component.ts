import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { TranslateModule } from '@ngx-translate/core';

import { ColumnResizeMode } from '../../models/column-def.model';

@Component({
  selector: 'app-table-config-editor-v2',
  templateUrl: './table-config-editor.component.html',
  styleUrls: ['./table-config-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatSlideToggleModule,
    MatExpansionModule,
    DragDropModule,
    TranslateModule
  ]
})
export class TableConfigEditorComponentV2 {
  @Input() options: any;
  @Input() tableColumnDefaultConfig: any;
  @Input() hasLockOption = false;
  @Input() hasResponsiveOption = false;
  @Input() hasResizeOption = false;
  @Input() columnResizeMode: ColumnResizeMode = 'fit';
  @Output() onTableColumnChangeEvent = new EventEmitter<any>();
  @Output() autoResizeChangeEvent = new EventEmitter<boolean>();
  @Output() columnResizeModeChangeEvent = new EventEmitter<ColumnResizeMode>();

  // Constants for template
  readonly DISPLAY_MODE_SINGLE = 'single';
  readonly DISPLAY_MODE_MAPPING = 'mapping';
  readonly DISPLAY_MODE_HIERARCHY = 'hierarchy';

  /** Libellé affiché pour une colonne (générique : header ou name, sans traduction). */
  getColumnLabel(column: { header?: string; name?: string }): string {
    return column?.header ?? column?.name ?? '';
  }

  sortPredicate = (index: number, item: any) => {
    return true; // Allow all drops for now
  };

  prevent(event: Event): void {
    event.stopPropagation();
  }

  saveTableConfig(): void {
    this.emitChange();
  }

  fitWidth(): void {
    this.autoResizeChangeEvent.emit(true);
  }

  drop(event: CdkDragDrop<any[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    
    // We need to handle moving items within the filtered view (by group)
    // But since the drop list data is the full array, we might need to be careful
    // However, the standard moveItemInArray works on the array passed to [cdkDropListData]
    moveItemInArray(this.options.columns.columns, event.previousIndex, event.currentIndex);
    this.emitChange();
  }

  toggleSticky(event: Event, column: any): void {
    event.stopPropagation();
    const columns: any[] = this.options.columns.columns;
    const index = columns.indexOf(column);
    const newSticky = !column.sticky;

    if (newSticky) {
      // Rendre sticky toutes les colonnes visibles de 0 à index
      for (let i = 0; i <= index; i++) {
        if (!columns[i].hidden) {
          columns[i].sticky = true;
        }
      }
    } else {
      // Retirer sticky de la colonne et de toutes les suivantes
      for (let i = index; i < columns.length; i++) {
        columns[i].sticky = false;
      }
    }
    this.emitChange();
  }

  toggleVisibility(event: Event, column: any): void {
    event.stopPropagation();
    column.hidden = !column.hidden;
    this.emitChange();
  }

  onColumnResizeModeChange(value: ColumnResizeMode | undefined): void {
    if (value === 'fit' || value === 'expand') {
      this.columnResizeModeChangeEvent.emit(value);
    }
  }

  private emitChange(): void {
    this.onTableColumnChangeEvent.emit(this.options);
  }
}
