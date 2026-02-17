import { Directive, HostListener } from '@angular/core';

/**
 * Directive to prevent mat-menu from closing when clicking inside it.
 * Used for filter popups to keep them open when interacting with checkboxes.
 * 
 * @example
 * ```html
 * <div appPreventMenuClose>
 *   <mat-checkbox>Item 1</mat-checkbox>
 * </div>
 * ```
 */
@Directive({
  selector: '[appPreventMenuClose]',
  standalone: true
})
export class PreventMenuCloseDirective {
  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    event.stopPropagation();
  }
}
