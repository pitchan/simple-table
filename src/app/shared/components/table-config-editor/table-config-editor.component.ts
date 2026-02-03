import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-table-config-editor',
  templateUrl: './table-config-editor.component.html',
  styleUrls: ['./table-config-editor.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatExpansionModule,
    DragDropModule,
    TranslateModule
  ]
})
export class TableConfigEditorComponent {
  @Input() options: any;
  @Input() tableColumnDefaultConfig: any;
  @Input() hasLockOption = false;
  @Input() hasResponsiveOption = false;
  @Output() onTableColumnChangeEvent = new EventEmitter<any>();
  @Output() autoResizeChangeEvent = new EventEmitter<boolean>();

  // Constants for template
  readonly DISPLAY_MODE_SINGLE = 'single';
  readonly DISPLAY_MODE_MAPPING = 'mapping';
  readonly DISPLAY_MODE_HIERARCHY = 'hierarchy';

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
    column.sticky = !column.sticky;
    this.emitChange();
  }

  toggleVisibility(event: Event, column: any): void {
    event.stopPropagation();
    column.hidden = !column.hidden;
    this.emitChange();
  }

  private emitChange(): void {
    this.onTableColumnChangeEvent.emit(this.options);
  }
}
