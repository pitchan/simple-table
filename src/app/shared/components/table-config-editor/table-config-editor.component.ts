import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-table-config-editor',
  template: '',
  standalone: true,
  imports: [CommonModule]
})
export class TableConfigEditorComponent {
  @Input() options: any;
  @Input() tableColumnDefaultConfig: any;
  @Input() hasLockOption = false;
  @Input() hasResponsiveOption = false;
  @Output() onTableColumnChangeEvent = new EventEmitter<any>();
  @Output() autoResizeChangeEvent = new EventEmitter<boolean>();
}
