import { DOCUMENT } from '@angular/common';
import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  NgZone,
  OnDestroy,
  Output,
  Renderer2,
  inject,
} from '@angular/core';

/**
 * Event emitted when column width changes
 */
export interface ColumnResizeEvent {
  columnId: string;
  width: number;
}

/**
 * ColumnResizeDirective V2 - Production Ready
 * 
 * Handles column resize for table headers with optimized performance.
 * 
 * Features:
 * - Pointer Events (desktop + touch + stylus support)
 * - setPointerCapture for drag outside window
 * - Zero Angular change detection during drag
 * - CSS var applied directly on host element (isolated per table)
 * - Measures real DOM width at start (not input value)
 * - pointercancel handling for alt-tab/gesture
 * 
 * @example
 * ```html
 * <span 
 *   columnResize 
 *   [columnId]="column.id"
 *   [minWidth]="100"
 *   [maxWidth]="500"
 *   [initialWidth]="200"
 *   [disabled]="false"
 *   (resizeStart)="onResizeStart($event)"
 *   (resizeEnd)="onResizeEnd($event)">
 * </span>
 * ```
 */
@Directive({
  selector: '[columnResize]',
  standalone: true,
})
export class ColumnResizeDirective implements OnDestroy {
  // ========== INJECTIONS ==========
  private readonly document = inject(DOCUMENT);
  private readonly renderer = inject(Renderer2);
  private readonly ngZone = inject(NgZone);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  // ========== INPUTS ==========
  /** Column identifier */
  @Input({ required: true }) columnId!: string;

  /** Minimum width in pixels */
  @Input() minWidth = 100;

  /** Maximum width in pixels */
  @Input() maxWidth = 500;

  /** Initial width in pixels (fallback if DOM measurement fails) */
  @Input() initialWidth = 200;

  /** Disable resize (e.g., for read-only columns) */
  @Input() disabled = false;

  /** Host selector for CSS var scope (fallback cascade if not found) */
  @Input() hostSelector = '.simple-table-v2-container';

  /** Enable debug logging */
  @Input() debug = false;

  // ========== OUTPUTS ==========
  /** Emitted when resize starts */
  @Output() resizeStart = new EventEmitter<ColumnResizeEvent>();

  /** Emitted when resize ends (for localStorage persistence) */
  @Output() resizeEnd = new EventEmitter<ColumnResizeEvent>();

  // ========== INTERNAL STATE ==========
  private resizing = false;
  private startX = 0;
  private startWidth = 0;
  private currentWidth = 0;
  private activePointerId: number | null = null;
  private hostElement: HTMLElement | null = null;

  /** Cleanup functions for document listeners */
  private moveListener: (() => void) | null = null;
  private upListener: (() => void) | null = null;
  private cancelListener: (() => void) | null = null;

  // ========== HOST LISTENER (Pointer Events) ==========
  @HostListener('pointerdown', ['$event'])
  onPointerDown(event: PointerEvent): void {
    // Skip if disabled or not left-click
    if (this.disabled || event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    // Capture on elementRef.nativeElement (stable) - NOT event.target (fragile)
    this.elementRef.nativeElement.setPointerCapture(event.pointerId);
    this.activePointerId = event.pointerId;

    this.startResize(event);
  }

  // ========== RESIZE LOGIC ==========
  private startResize(event: PointerEvent): void {
    // Measure real TH width from DOM (not from input)
    const th = this.elementRef.nativeElement.closest('th, .mat-mdc-header-cell') as HTMLElement;
    this.startWidth = th?.getBoundingClientRect().width ?? this.initialWidth;
    this.currentWidth = this.startWidth;
    this.startX = event.clientX;
    this.resizing = true;

    // Find host element with fallback cascade
    this.hostElement = this.findHostElement();

    if (this.debug) {
      console.log(`[ColumnResize] Start: ${this.columnId}, measured width: ${this.startWidth}, host:`, this.hostElement);
    }

    // Add resize cursor to body
    this.renderer.addClass(this.document.body, 'column-resizing');

    // Emit start (single emit, in zone)
    this.ngZone.run(() => {
      this.resizeStart.emit({
        columnId: this.columnId,
        width: this.startWidth,
      });
    });

    // Attach document listeners OUTSIDE Angular zone (zero CD during drag)
    this.ngZone.runOutsideAngular(() => {
      this.moveListener = this.renderer.listen('document', 'pointermove', this.onPointerMove);
      this.upListener = this.renderer.listen('document', 'pointerup', this.onPointerUp);
      this.cancelListener = this.renderer.listen('document', 'pointercancel', this.onPointerCancel);
    });
  }

  /**
   * Find host element with fallback cascade
   * Priority: hostSelector -> table -> parentElement -> document.body
   */
  private findHostElement(): HTMLElement {
    const el = this.elementRef.nativeElement;
    return (
      el.closest(this.hostSelector) ||
      el.closest('table') ||
      el.parentElement ||
      this.document.body
    ) as HTMLElement;
  }

  /**
   * Handle pointer move - runs OUTSIDE Angular zone (zero CD)
   * Applies CSS var directly on host element
   */
  private onPointerMove = (event: PointerEvent): void => {
    if (!this.resizing || event.pointerId !== this.activePointerId) return;

    const diff = event.clientX - this.startX;
    const newWidth = Math.max(
      this.minWidth,
      Math.min(this.maxWidth, this.startWidth + diff)
    );

    // Only update if width changed
    if (newWidth !== this.currentWidth) {
      this.currentWidth = newWidth;

      // Apply CSS var directly on HOST LOCAL (not documentElement)
      // This keeps each table isolated
      if (this.hostElement) {
        this.hostElement.style.setProperty(`--column-${this.columnId}-width`, `${newWidth}px`);
      }
    }
  };

  /**
   * Handle pointer up - end resize
   */
  private onPointerUp = (event: PointerEvent): void => {
    if (!this.resizing || event.pointerId !== this.activePointerId) return;
    this.endResize(true);
  };

  /**
   * Handle pointer cancel (alt-tab, gesture, focus loss)
   */
  private onPointerCancel = (event: PointerEvent): void => {
    if (!this.resizing || event.pointerId !== this.activePointerId) return;
    
    if (this.debug) {
      console.log(`[ColumnResize] Cancelled: ${this.columnId}`);
    }
    
    this.endResize(true); // Keep the width reached
  };

  /**
   * Common method to end resize
   * @param emit Whether to emit resizeEnd event
   */
  private endResize(emit: boolean): void {
    // Release capture on elementRef (stable)
    if (this.activePointerId !== null) {
      try {
        this.elementRef.nativeElement.releasePointerCapture(this.activePointerId);
      } catch {
        // Ignore if already released
      }
    }

    if (this.debug) {
      console.log(`[ColumnResize] End: ${this.columnId}, final width: ${this.currentWidth}`);
    }

    this.resizing = false;
    this.activePointerId = null;

    // Remove resize cursor
    this.renderer.removeClass(this.document.body, 'column-resizing');

    // Clean up listeners
    this.removeDocumentListeners();

    if (emit) {
      // Single emit in Angular zone (for localStorage persistence)
      this.ngZone.run(() => {
        this.resizeEnd.emit({
          columnId: this.columnId,
          width: this.currentWidth,
        });
      });
    }
  }

  // ========== CLEANUP ==========
  private removeDocumentListeners(): void {
    this.moveListener?.();
    this.upListener?.();
    this.cancelListener?.();
    this.moveListener = null;
    this.upListener = null;
    this.cancelListener = null;
  }

  ngOnDestroy(): void {
    // Ensure cleanup on destroy
    this.removeDocumentListeners();

    // Release capture if destroyed during resize
    if (this.resizing && this.activePointerId !== null) {
      try {
        this.elementRef.nativeElement.releasePointerCapture(this.activePointerId);
      } catch {
        // Ignore
      }
    }

    // Remove cursor class if destroyed during resize
    if (this.resizing) {
      this.renderer.removeClass(this.document.body, 'column-resizing');
    }
  }
}
