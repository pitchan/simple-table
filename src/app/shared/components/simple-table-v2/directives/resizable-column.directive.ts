import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  Directive,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  NgZone,
  OnDestroy,
  Output,
  Renderer2,
  inject,
  booleanAttribute,
} from '@angular/core';
import { DomHandler } from '../helpers/dom-handler';

/**
 * Event emitted when resize operations occur
 */
export interface ResizableColumnEvent {
  originalEvent: PointerEvent;
  element: HTMLElement;
}

/**
 * ResizableColumnDirective - PrimeNG-style column resize directive
 * 
 * Applied to table header cells (TH elements) to enable column resizing.
 * Works in coordination with the parent table component which handles
 * the actual resize logic through TableResizeService.
 * 
 * Features:
 * - Dynamically creates resize handle element
 * - Pointer Events API for cross-device support (mouse, touch, stylus)
 * - Communicates with parent table via output events
 * - Runs drag operations outside Angular zone for performance
 * 
 * @example
 * ```html
 * <th 
 *   mat-header-cell 
 *   pResizableColumn
 *   [pResizableColumnDisabled]="column.resizable === false"
 *   (resizeBegin)="onColumnResizeBegin($event)"
 *   (resize)="onColumnResize($event)"
 *   (resizeEnd)="onColumnResizeEnd($event)">
 *   Column Header
 * </th>
 * ```
 */
@Directive({
  selector: '[pResizableColumn]',
  standalone: true,
  host: {
    'class': 'p-resizable-column'
  }
})
export class ResizableColumnDirective implements AfterViewInit, OnDestroy {
  // ========== INJECTIONS ==========
  private readonly document = inject(DOCUMENT);
  private readonly renderer = inject(Renderer2);
  private readonly ngZone = inject(NgZone);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  // ========== INPUTS ==========
  /** Disable resize for this column */
  @Input({ transform: booleanAttribute }) pResizableColumnDisabled = false;

  // ========== OUTPUTS ==========
  /** Emitted when resize operation begins (pointerdown on resizer) */
  @Output() resizeBegin = new EventEmitter<ResizableColumnEvent>();

  /** Emitted during resize (pointermove) */
  @Output() resize = new EventEmitter<ResizableColumnEvent>();

  /** Emitted when resize operation ends (pointerup) */
  @Output() resizeEnd = new EventEmitter<ResizableColumnEvent>();

  // ========== HOST BINDING ==========
  @HostBinding('class.p-resizable-column-resizing')
  get isResizing(): boolean {
    return this._resizing;
  }

  // ========== INTERNAL STATE ==========
  private resizer: HTMLSpanElement | null = null;
  private _resizing = false;
  private activePointerId: number | null = null;

  /** Cleanup functions for document listeners */
  private moveListener: (() => void) | null = null;
  private upListener: (() => void) | null = null;
  private cancelListener: (() => void) | null = null;

  // ========== LIFECYCLE ==========
  ngAfterViewInit(): void {
    if (this.isEnabled()) {
      this.createResizer();
    }
  }

  ngOnDestroy(): void {
    this.removeDocumentListeners();
    this.destroyResizer();
    
    // Clean up if destroyed during resize
    if (this._resizing) {
      DomHandler.removeClass(this.document.body, 'column-resizing');
    }
  }

  // ========== RESIZER CREATION ==========
  /**
   * Create the resize handle element
   * Includes accessibility attributes for keyboard navigation (WCAG AA)
   */
  private createResizer(): void {
    this.resizer = this.renderer.createElement('span');
    this.renderer.addClass(this.resizer, 'p-datatable-column-resizer');
    this.renderer.setAttribute(this.resizer, 'data-pc-section', 'columnresizer');
    this.renderer.setAttribute(this.resizer, 'data-pc-column-resizer', 'true');
    
    // Accessibility attributes (WCAG AA)
    this.renderer.setAttribute(this.resizer, 'tabindex', '0');
    this.renderer.setAttribute(this.resizer, 'role', 'separator');
    this.renderer.setAttribute(this.resizer, 'aria-orientation', 'vertical');
    this.renderer.setAttribute(this.resizer, 'aria-label', 'Resize column');
    
    // Append to host element
    this.renderer.appendChild(this.elementRef.nativeElement, this.resizer);

    // Bind pointer events outside Angular zone for performance
    this.ngZone.runOutsideAngular(() => {
      this.renderer.listen(this.resizer, 'pointerdown', this.onResizerPointerDown.bind(this));
      
      // Touch events for mobile compatibility
      this.renderer.listen(this.resizer, 'touchstart', this.onResizerTouchStart.bind(this));
      
      // Keyboard events for accessibility
      this.renderer.listen(this.resizer, 'keydown', this.onResizerKeyDown.bind(this));
    });
  }

  /**
   * Remove the resize handle element
   */
  private destroyResizer(): void {
    if (this.resizer && this.resizer.parentNode) {
      this.renderer.removeChild(this.elementRef.nativeElement, this.resizer);
      this.resizer = null;
    }
  }

  // ========== EVENT HANDLERS ==========
  /**
   * Handle pointer down on resizer
   */
  private onResizerPointerDown(event: PointerEvent): void {
    if (this.pResizableColumnDisabled || event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    // Capture pointer on the resizer element
    if (this.resizer) {
      this.resizer.setPointerCapture(event.pointerId);
    }
    this.activePointerId = event.pointerId;
    this._resizing = true;

    // Emit resize begin event (in Angular zone for change detection)
    this.ngZone.run(() => {
      this.resizeBegin.emit({
        originalEvent: event,
        element: this.elementRef.nativeElement
      });
    });

    // Add document listeners outside Angular zone
    this.bindDocumentListeners();
  }

  /**
   * Handle touch start on resizer (mobile fallback)
   */
  private onResizerTouchStart(event: TouchEvent): void {
    if (this.pResizableColumnDisabled) return;

    event.preventDefault();
    event.stopPropagation();

    this._resizing = true;

    // Create a synthetic pointer event for the touch
    const touch = event.touches[0];
    const syntheticEvent = new PointerEvent('pointerdown', {
      clientX: touch.clientX,
      clientY: touch.clientY,
      pointerId: 0,
      button: 0,
      bubbles: true
    });

    this.ngZone.run(() => {
      this.resizeBegin.emit({
        originalEvent: syntheticEvent,
        element: this.elementRef.nativeElement
      });
    });

    this.bindDocumentTouchListeners();
  }

  /**
   * Handle pointer move during resize
   */
  private onDocumentPointerMove = (event: PointerEvent): void => {
    if (!this._resizing || event.pointerId !== this.activePointerId) return;

    // Emit resize event (in Angular zone)
    this.ngZone.run(() => {
      this.resize.emit({
        originalEvent: event,
        element: this.elementRef.nativeElement
      });
    });
  };

  /**
   * Handle pointer up (end resize)
   */
  private onDocumentPointerUp = (event: PointerEvent): void => {
    if (!this._resizing || event.pointerId !== this.activePointerId) return;

    this.endResize(event);
  };

  /**
   * Handle pointer cancel (e.g., alt-tab, gesture interruption)
   */
  private onDocumentPointerCancel = (event: PointerEvent): void => {
    if (!this._resizing || event.pointerId !== this.activePointerId) return;

    this.endResize(event);
  };

  /**
   * Handle touch move during resize (mobile)
   */
  private onDocumentTouchMove = (event: TouchEvent): void => {
    if (!this._resizing) return;

    event.preventDefault();
    const touch = event.touches[0];
    const syntheticEvent = new PointerEvent('pointermove', {
      clientX: touch.clientX,
      clientY: touch.clientY,
      pointerId: 0,
      bubbles: true
    });

    this.ngZone.run(() => {
      this.resize.emit({
        originalEvent: syntheticEvent,
        element: this.elementRef.nativeElement
      });
    });
  };

  /**
   * Handle touch end (mobile)
   */
  private onDocumentTouchEnd = (event: TouchEvent): void => {
    if (!this._resizing) return;

    const syntheticEvent = new PointerEvent('pointerup', {
      pointerId: 0,
      bubbles: true
    });

    this.endResize(syntheticEvent);
  };

  /**
   * Handle keyboard events on resizer for accessibility (WCAG AA)
   * Supports ArrowLeft/ArrowRight for resizing
   */
  private onResizerKeyDown(event: KeyboardEvent): void {
    if (this.pResizableColumnDisabled) return;

    const RESIZE_STEP = 10; // pixels per keypress
    let delta = 0;

    switch (event.key) {
      case 'ArrowRight':
        delta = RESIZE_STEP;
        break;
      case 'ArrowLeft':
        delta = -RESIZE_STEP;
        break;
      case 'Enter':
      case ' ':
        // Toggle resize mode or provide feedback
        event.preventDefault();
        return;
      default:
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    // Create synthetic pointer events for keyboard resize
    const rect = this.elementRef.nativeElement.getBoundingClientRect();
    const startX = rect.right;

    // Emit begin
    const beginEvent = new PointerEvent('pointerdown', {
      clientX: startX,
      clientY: rect.top + rect.height / 2,
      pointerId: -1, // Keyboard indicator
      button: 0,
      bubbles: true
    });

    this.ngZone.run(() => {
      this.resizeBegin.emit({
        originalEvent: beginEvent,
        element: this.elementRef.nativeElement
      });
    });

    // Emit resize with delta
    const resizeEvent = new PointerEvent('pointermove', {
      clientX: startX + delta,
      clientY: rect.top + rect.height / 2,
      pointerId: -1,
      bubbles: true
    });

    this.ngZone.run(() => {
      this.resize.emit({
        originalEvent: resizeEvent,
        element: this.elementRef.nativeElement
      });
    });

    // Emit end
    const endEvent = new PointerEvent('pointerup', {
      clientX: startX + delta,
      clientY: rect.top + rect.height / 2,
      pointerId: -1,
      bubbles: true
    });

    this.ngZone.run(() => {
      this.resizeEnd.emit({
        originalEvent: endEvent,
        element: this.elementRef.nativeElement
      });
    });
  }

  /**
   * End the resize operation
   */
  private endResize(event: PointerEvent): void {
    // Release pointer capture
    if (this.resizer && this.activePointerId !== null) {
      try {
        this.resizer.releasePointerCapture(this.activePointerId);
      } catch {
        // Ignore if already released
      }
    }

    this._resizing = false;
    this.activePointerId = null;

    // Emit resize end event (in Angular zone)
    this.ngZone.run(() => {
      this.resizeEnd.emit({
        originalEvent: event,
        element: this.elementRef.nativeElement
      });
    });

    this.removeDocumentListeners();
  }

  // ========== LISTENER MANAGEMENT ==========
  /**
   * Bind document listeners for pointer events
   */
  private bindDocumentListeners(): void {
    this.ngZone.runOutsideAngular(() => {
      this.moveListener = this.renderer.listen('document', 'pointermove', this.onDocumentPointerMove);
      this.upListener = this.renderer.listen('document', 'pointerup', this.onDocumentPointerUp);
      this.cancelListener = this.renderer.listen('document', 'pointercancel', this.onDocumentPointerCancel);
    });
  }

  /**
   * Bind document listeners for touch events (mobile fallback)
   */
  private bindDocumentTouchListeners(): void {
    this.ngZone.runOutsideAngular(() => {
      this.moveListener = this.renderer.listen('document', 'touchmove', this.onDocumentTouchMove);
      this.upListener = this.renderer.listen('document', 'touchend', this.onDocumentTouchEnd);
      this.cancelListener = this.renderer.listen('document', 'touchcancel', this.onDocumentTouchEnd);
    });
  }

  /**
   * Remove all document listeners
   */
  private removeDocumentListeners(): void {
    this.moveListener?.();
    this.upListener?.();
    this.cancelListener?.();
    this.moveListener = null;
    this.upListener = null;
    this.cancelListener = null;
  }

  // ========== HELPERS ==========
  /**
   * Check if resize is enabled for this column
   */
  isEnabled(): boolean {
    return !this.pResizableColumnDisabled;
  }

  /**
   * Get the host element (TH)
   */
  getElement(): HTMLElement {
    return this.elementRef.nativeElement;
  }
}
