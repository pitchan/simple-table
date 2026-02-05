import { Injectable, Renderer2, RendererFactory2, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { DomHandler } from '../helpers/dom-handler';

/**
 * Column resize mode options
 * - 'fit': Total table width remains constant, resizing affects adjacent column (default)
 * - 'expand': Table width changes, horizontal scroll appears when needed
 */
export type ColumnResizeMode = 'fit' | 'expand';

/**
 * Event emitted during column resize operations
 */
export interface ColumnResizeEvent {
  columnId: string;
  columnIndex: number;
  width: number;
  nextColumnWidth?: number;
  delta: number;
}

/**
 * Configuration for the resize service
 */
export interface TableResizeConfig {
  /** Resize mode: 'fit' keeps table width constant, 'expand' allows table to grow */
  columnResizeMode: ColumnResizeMode;
  /** Minimum column width in pixels (default: 50) */
  minColumnWidth: number;
  /** CSS selector for the table container */
  containerSelector: string;
}

/**
 * Internal state during resize operation
 */
interface ResizeState {
  active: boolean;
  columnElement: HTMLElement | null;
  columnIndex: number;
  startX: number;
  startWidth: number;
  nextColumnStartWidth: number;
  initialWidths: number[];
  lastHelperX: number;
}

/**
 * TableResizeService - Centralized service for column resize logic
 * 
 * Inspired by PrimeNG's Table resize implementation, this service handles:
 * - Two resize modes: 'fit' (adjacent column adjustment) and 'expand' (table expansion)
 * - Direct DOM manipulation for column widths (more robust than dynamic CSS)
 * - Resize helper indicator positioning
 * - RTL support
 * 
 * @example
 * ```typescript
 * // In component
 * private resizeService = new TableResizeService();
 * 
 * ngOnInit() {
 *   this.resizeService.configure({
 *     columnResizeMode: 'fit',
 *     minColumnWidth: 50,
 *     containerSelector: '.table-container'
 *   });
 * }
 * 
 * onColumnResizeBegin(event: PointerEvent, th: HTMLElement) {
 *   this.resizeService.beginResize(event, th, this.containerEl, this.helperEl);
 * }
 * ```
 */
@Injectable()
export class TableResizeService {
  private readonly document = inject(DOCUMENT);
  private readonly rendererFactory = inject(RendererFactory2);
  private renderer: Renderer2;

  /** Current configuration */
  private config: TableResizeConfig = {
    columnResizeMode: 'fit',
    minColumnWidth: 50,
    containerSelector: '.simple-table-v2-container'
  };

  /** Internal resize state */
  private state: ResizeState = {
    active: false,
    columnElement: null,
    columnIndex: -1,
    startX: 0,
    startWidth: 0,
    nextColumnStartWidth: 0,
    initialWidths: [],
    lastHelperX: 0
  };

  /** Stored column widths (persisted between resizes) */
  private columnWidths: number[] = [];

  /** Table element reference */
  private tableElement: HTMLElement | null = null;

  /** Original table width (for expand mode) */
  private originalTableWidth: number = 0;

  constructor() {
    this.renderer = this.rendererFactory.createRenderer(null, null);
  }

  /**
   * Configure the resize service
   * @param config - Partial configuration to merge with defaults
   */
  configure(config: Partial<TableResizeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get the current resize mode
   */
  get resizeMode(): ColumnResizeMode {
    return this.config.columnResizeMode;
  }

  /**
   * Check if a resize operation is currently active
   */
  get isResizing(): boolean {
    return this.state.active;
  }

  /**
   * Initialize column widths from the current DOM state
   * @param tableEl - The table element
   * @param headerRow - The header row containing TH elements
   */
  initializeWidths(tableEl: HTMLElement, headerRow: HTMLElement): void {
    this.tableElement = tableEl;
    const headers = DomHandler.find(headerRow, 'th');
    this.columnWidths = headers.map(th => DomHandler.getOuterWidth(th));
    this.originalTableWidth = DomHandler.getOuterWidth(tableEl);
  }

  /**
   * Begin a column resize operation
   * @param event - The pointer event that initiated the resize
   * @param columnElement - The TH element being resized
   * @param containerElement - The table container element
   * @param helperElement - The resize helper indicator element
   * @returns The initial column index and widths
   */
  beginResize(
    event: PointerEvent,
    columnElement: HTMLElement,
    containerElement: HTMLElement,
    helperElement: HTMLElement
  ): { columnIndex: number; startWidth: number } {
    const containerOffset = DomHandler.getOffset(containerElement);
    const columnIndex = DomHandler.index(columnElement);
    const columnWidth = DomHandler.getOuterWidth(columnElement);
    
    // Get next column width for 'fit' mode
    const nextColumn = DomHandler.getNextElementSibling(columnElement);
    const nextColumnWidth = nextColumn ? DomHandler.getOuterWidth(nextColumn) : 0;

    // Store all current widths
    if (this.tableElement) {
      const headerRow = DomHandler.findSingle(this.tableElement, 'thead tr');
      if (headerRow) {
        const headers = DomHandler.find(headerRow, 'th');
        this.columnWidths = headers.map(th => DomHandler.getOuterWidth(th));
      }
    }

    // Update state
    this.state = {
      active: true,
      columnElement,
      columnIndex,
      startX: event.clientX,
      startWidth: columnWidth,
      nextColumnStartWidth: nextColumnWidth,
      initialWidths: [...this.columnWidths],
      lastHelperX: event.clientX - containerOffset.left
    };

    // Position and show helper
    this.updateHelperPosition(event, containerElement, helperElement);
    this.renderer.setStyle(helperElement, 'display', 'block');

    // Add resize cursor to body
    DomHandler.addClass(this.document.body, 'column-resizing');

    return {
      columnIndex,
      startWidth: columnWidth
    };
  }

  /**
   * Update the resize helper indicator position during drag
   * Includes clamping logic to prevent invalid resize states
   */
  updateHelperPosition(
    event: PointerEvent,
    containerElement: HTMLElement,
    helperElement: HTMLElement
  ): void {
    if (!this.state.active) return;

    const containerOffset = DomHandler.getOffset(containerElement);
    const minWidth = this.config.minColumnWidth;
    
    // Calculate raw delta based on mouse movement
    let delta = event.clientX - this.state.startX;
    
    // Check for RTL
    const isRTL = DomHandler.isRTL(containerElement);
    if (isRTL) {
      delta = -delta;
    }

    // Clamp delta based on resize mode and constraints
    let clampedDelta = delta;

    // Constraint 1: Current column min width
    // newWidth = startWidth + delta >= minWidth
    // delta >= minWidth - startWidth
    const minDelta = minWidth - this.state.startWidth;
    clampedDelta = Math.max(clampedDelta, minDelta);

    // Constraint 2: Next column min width (only for 'fit' mode)
    if (this.config.columnResizeMode === 'fit') {
      // nextWidth = nextStartWidth - delta >= minWidth
      // delta <= nextStartWidth - minWidth
      const maxDelta = this.state.nextColumnStartWidth - minWidth;
      clampedDelta = Math.min(clampedDelta, maxDelta);
    }

    // Convert clamped delta back to visual position
    // If RTL, invert delta back for visual calculation
    const visualDelta = isRTL ? -clampedDelta : clampedDelta;
    
    // Calculate new position relative to container
    // We use startX relative to container + visualDelta
    // visualX = (startX - containerLeft) + visualDelta + scrollLeft
    const startRelativeX = this.state.startX - containerOffset.left;
    const newLeft = startRelativeX + visualDelta + containerElement.scrollLeft;
    
    this.renderer.setStyle(helperElement, 'left', `${newLeft}px`);
    this.renderer.setStyle(helperElement, 'height', `${containerElement.offsetHeight}px`);
  }

  /**
   * Handle the resize operation (called on pointer move)
   * @param event - The pointer event
   * @param containerElement - The table container element
   * @param helperElement - The resize helper indicator element
   */
  onResize(
    event: PointerEvent,
    containerElement: HTMLElement,
    helperElement: HTMLElement
  ): void {
    if (!this.state.active) return;
    this.updateHelperPosition(event, containerElement, helperElement);
  }

  /**
   * End the resize operation and apply the new widths
   * Uses clamping to ensure columns never go below minimum width
   * @param helperElement - The resize helper indicator element
   * @param tableElement - The table element
   * @returns The resize event with calculated widths, or null if cancelled
   */
  endResize(
    helperElement: HTMLElement,
    tableElement: HTMLElement
  ): ColumnResizeEvent | null {
    if (!this.state.active || !this.state.columnElement) {
      this.cleanup(helperElement);
      return null;
    }

    const containerElement = tableElement.closest(this.config.containerSelector) as HTMLElement;
    if (!containerElement) {
      this.cleanup(helperElement);
      return null;
    }

    const helperLeft = helperElement.offsetLeft;
    const delta = helperLeft - this.state.lastHelperX;
    
    // Check for RTL support
    const isRTL = DomHandler.isRTL(containerElement);
    const adjustedDelta = isRTL ? -delta : delta;

    const minWidth = this.config.minColumnWidth;
    
    // Clamp new column width to minimum
    const rawNewColumnWidth = this.state.startWidth + adjustedDelta;
    const newColumnWidth = Math.max(rawNewColumnWidth, minWidth);
    
    // Recalculate delta based on clamped width
    const clampedDelta = newColumnWidth - this.state.startWidth;

    let result: ColumnResizeEvent | null = null;

    if (this.config.columnResizeMode === 'fit') {
      result = this.applyFitResize(newColumnWidth, clampedDelta, tableElement);
    } else {
      result = this.applyExpandResize(newColumnWidth, clampedDelta, tableElement);
    }

    this.cleanup(helperElement);
    return result;
  }

  /**
   * Apply resize in 'fit' mode (affects adjacent column)
   * Uses clamping to ensure both columns respect minimum width
   */
  private applyFitResize(
    newColumnWidth: number,
    delta: number,
    tableElement: HTMLElement
  ): ColumnResizeEvent | null {
    const nextColumn = this.state.columnElement 
      ? DomHandler.getNextElementSibling(this.state.columnElement)
      : null;
    
    if (!nextColumn) {
      // Last column - can't resize in fit mode without next column
      // Fall back to expand behavior for last column
      return this.applyExpandResize(newColumnWidth, delta, tableElement);
    }

    const minWidth = this.config.minColumnWidth;
    
    // Calculate raw next column width
    let rawNextColumnWidth = this.state.nextColumnStartWidth - delta;
    
    // Apply clamping: ensure both columns respect minimum width
    let finalColumnWidth = newColumnWidth;
    let finalNextColumnWidth = rawNextColumnWidth;
    let finalDelta = delta;
    
    // If current column would be too small, clamp it
    if (finalColumnWidth < minWidth) {
      finalColumnWidth = minWidth;
      finalDelta = finalColumnWidth - this.state.startWidth;
      finalNextColumnWidth = this.state.nextColumnStartWidth - finalDelta;
    }
    
    // If next column would be too small, clamp it (and adjust current column accordingly)
    if (finalNextColumnWidth < minWidth) {
      finalNextColumnWidth = minWidth;
      // Recalculate: the max we can expand current column is limited by next column's minimum
      finalDelta = this.state.nextColumnStartWidth - minWidth;
      finalColumnWidth = this.state.startWidth + finalDelta;
      
      // Final safety check: ensure current column is also at least minWidth
      if (finalColumnWidth < minWidth) {
        finalColumnWidth = minWidth;
        finalDelta = finalColumnWidth - this.state.startWidth;
      }
    }

    // Update stored widths
    this.columnWidths[this.state.columnIndex] = finalColumnWidth;
    this.columnWidths[this.state.columnIndex + 1] = finalNextColumnWidth;

    // Apply widths directly on DOM elements
    this.applyWidthsToDOM(tableElement);

    return {
      columnId: this.getColumnId(this.state.columnElement!),
      columnIndex: this.state.columnIndex,
      width: finalColumnWidth,
      nextColumnWidth: finalNextColumnWidth,
      delta: finalDelta
    };
  }

  /**
   * Apply resize in 'expand' mode (table width changes)
   * Uses clamping to ensure column respects minimum width
   */
  private applyExpandResize(
    newColumnWidth: number,
    delta: number,
    tableElement: HTMLElement
  ): ColumnResizeEvent | null {
    const minWidth = this.config.minColumnWidth;

    // Clamp to minimum width (should already be clamped by endResize, but safety first)
    const finalColumnWidth = Math.max(newColumnWidth, minWidth);
    const finalDelta = finalColumnWidth - this.state.startWidth;

    // Update stored width for this column only
    this.columnWidths[this.state.columnIndex] = finalColumnWidth;

    // Calculate new table width
    const newTableWidth = this.originalTableWidth + finalDelta;
    this.renderer.setStyle(tableElement, 'width', `${newTableWidth}px`);
    this.renderer.setStyle(tableElement, 'min-width', `${newTableWidth}px`);

    // Apply widths directly on DOM elements
    this.applyWidthsToDOM(tableElement);

    return {
      columnId: this.getColumnId(this.state.columnElement!),
      columnIndex: this.state.columnIndex,
      width: finalColumnWidth,
      delta: finalDelta
    };
  }

  /**
   * Cancel the resize operation without applying changes
   */
  cancelResize(helperElement: HTMLElement): void {
    this.cleanup(helperElement);
  }

  /**
   * Get the column ID from a TH element
   */
  private getColumnId(th: HTMLElement): string {
    return th.getAttribute('data-column') || 
           th.getAttribute('data-column-id') || 
           `col-${DomHandler.index(th)}`;
  }

  /**
   * Apply column widths directly to DOM elements
   * More robust than dynamic CSS - doesn't require unique table ID
   * @param tableElement - The table element
   */
  private applyWidthsToDOM(tableElement: HTMLElement): void {
    // Apply to header cells (th)
    const headerRow = DomHandler.findSingle(tableElement, 'thead tr');
    if (headerRow) {
      const headers = DomHandler.find(headerRow, 'th');
      headers.forEach((th, index) => {
        if (this.columnWidths[index] !== undefined) {
          const width = `${this.columnWidths[index]}px`;
          this.renderer.setStyle(th, 'width', width);
          this.renderer.setStyle(th, 'min-width', width);
          this.renderer.setStyle(th, 'max-width', width);
        }
      });
    }

    // Apply to body cells (td) - each row
    /*const bodyRows = DomHandler.find(tableElement, 'tbody tr');
    bodyRows.forEach(row => {
      const cells = DomHandler.find(row, 'td');
      cells.forEach((td, index) => {
        if (this.columnWidths[index] !== undefined) {
          const width = `${this.columnWidths[index]}px`;
          this.renderer.setStyle(td, 'width', width);
          this.renderer.setStyle(td, 'min-width', width);
          this.renderer.setStyle(td, 'max-width', width);
        }
      });
    });*/

    // Apply to footer cells if present (tfoot)
    const footerRows = DomHandler.find(tableElement, 'tfoot tr');
    footerRows.forEach(row => {
      const cells = DomHandler.find(row, 'td');
      cells.forEach((td, index) => {
        if (this.columnWidths[index] !== undefined) {
          const width = `${this.columnWidths[index]}px`;
          this.renderer.setStyle(td, 'width', width);
          this.renderer.setStyle(td, 'min-width', width);
          this.renderer.setStyle(td, 'max-width', width);
        }
      });
    });
  }

  /**
   * Clean up after resize operation
   */
  private cleanup(helperElement: HTMLElement): void {
    // Hide helper
    this.renderer.setStyle(helperElement, 'display', 'none');
    
    // Remove cursor class
    DomHandler.removeClass(this.document.body, 'column-resizing');
    
    // Reset state
    this.state = {
      active: false,
      columnElement: null,
      columnIndex: -1,
      startX: 0,
      startWidth: 0,
      nextColumnStartWidth: 0,
      initialWidths: [],
      lastHelperX: 0
    };
  }

  /**
   * Get all current column widths
   */
  getColumnWidths(): number[] {
    return [...this.columnWidths];
  }

  /**
   * Set column widths (e.g., from localStorage)
   * @param widths - Array of column widths
   * @param tableElement - The table element to apply widths to
   */
  setColumnWidths(widths: number[], tableElement: HTMLElement): void {
    this.columnWidths = [...widths];
    this.applyWidthsToDOM(tableElement);
  }

  /**
   * Get the width of a specific column
   * @param index - Column index
   */
  getColumnWidth(index: number): number {
    return this.columnWidths[index] ?? 0;
  }

  /**
   * Reset all column widths and state
   */
  reset(): void {
    this.columnWidths = [];
    this.state = {
      active: false,
      columnElement: null,
      columnIndex: -1,
      startX: 0,
      startWidth: 0,
      nextColumnStartWidth: 0,
      initialWidths: [],
      lastHelperX: 0
    };
  }

  /**
   * Cleanup when service is destroyed
   */
  ngOnDestroy(): void {
    if (this.state.active) {
      DomHandler.removeClass(this.document.body, 'column-resizing');
    }
  }
}
