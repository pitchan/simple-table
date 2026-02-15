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
 * Internal state during resize operation (colId-based)
 */
interface ResizeState {
  active: boolean;
  columnElement: HTMLElement | null;
  columnId: string;
  nextColumnId: string | null;
  startX: number;
  startWidth: number;
  nextColumnStartWidth: number;
  initialWidths: Record<string, number>;
  orderedColumnIds: string[];
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
    columnId: '',
    nextColumnId: null,
    startX: 0,
    startWidth: 0,
    nextColumnStartWidth: 0,
    initialWidths: {},
    orderedColumnIds: [],
    lastHelperX: 0
  };

  /** Stored column widths by colId (persisted between resizes) */
  private columnWidthsByColId: Record<string, number> = {};

  /** Table element reference */
  private tableElement: HTMLElement | null = null;

  /** Original table width (for expand mode) */
  private originalTableWidth: number = 0;

  /** Cached container element for onDragMove() (set in beginResize) */
  private cachedContainer: HTMLElement | null = null;

  /** Cached helper element for onDragMove() (set in beginResize) */
  private cachedHelper: HTMLElement | null = null;

  /** Last pointer move event for rAF throttle */
  private lastMoveEvent: PointerEvent | null = null;

  /** requestAnimationFrame ID for throttle */
  private rafId: number | null = null;

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

  /** Ordered column ids (from header row) for fit-mode next-column and for CSS var application */
  private orderedColumnIds: string[] = [];

  /**
   * Initialize column widths from the current DOM state (colId-based).
   * Supports both table (th) and grid (div with data-column) header rows.
   */
  initializeWidths(tableEl: HTMLElement, headerRow: HTMLElement): void {
    this.tableElement = tableEl;
    let headers = DomHandler.find(headerRow, 'th');
    if (headers.length === 0) {
      headers = Array.from(headerRow.children) as HTMLElement[];
    }
    this.orderedColumnIds = headers.map(el => this.getColumnId(el));
    this.columnWidthsByColId = {};
    headers.forEach((el, i) => {
      const id = this.orderedColumnIds[i];
      if (id) this.columnWidthsByColId[id] = DomHandler.getOuterWidth(el);
    });
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
  ): { columnId: string; startWidth: number } {
    const containerOffset = DomHandler.getOffset(containerElement);
    const columnId = this.getColumnId(columnElement);
    const columnWidth = DomHandler.getOuterWidth(columnElement);

    const nextColumn = DomHandler.getNextElementSibling(columnElement);
    const nextColumnWidth = nextColumn ? DomHandler.getOuterWidth(nextColumn) : 0;

    if (this.tableElement) {
      const headerRow = DomHandler.findSingle(this.tableElement, 'thead tr') ?? this.tableElement.querySelector('.grid-header-row');
      if (headerRow) {
        let headers = DomHandler.find(headerRow as HTMLElement, 'th');
        if (headers.length === 0) headers = Array.from((headerRow as HTMLElement).children) as HTMLElement[];
        this.orderedColumnIds = headers.map(el => this.getColumnId(el));
        this.columnWidthsByColId = {};
        headers.forEach((el, i) => {
          const id = this.orderedColumnIds[i];
          if (id) this.columnWidthsByColId[id] = DomHandler.getOuterWidth(el);
        });
      }
    }

    const idx = this.orderedColumnIds.indexOf(columnId);
    const nextColumnId = idx >= 0 && idx < this.orderedColumnIds.length - 1 ? this.orderedColumnIds[idx + 1]! : null;

    this.state = {
      active: true,
      columnElement,
      columnId,
      nextColumnId,
      startX: event.clientX,
      startWidth: columnWidth,
      nextColumnStartWidth: nextColumnWidth,
      initialWidths: { ...this.columnWidthsByColId },
      orderedColumnIds: [...this.orderedColumnIds],
      lastHelperX: event.clientX - containerOffset.left
    };

    this.updateHelperPosition(event, containerElement, helperElement);
    this.renderer.setStyle(helperElement, 'display', 'block');
    DomHandler.addClass(this.document.body, 'column-resizing');
    this.cachedContainer = containerElement;
    this.cachedHelper = helperElement;

    return { columnId, startWidth: columnWidth };
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
   * Handle drag move - called DIRECTLY by directive, OUTSIDE Angular zone.
   * Uses requestAnimationFrame to cap helper position updates at 60fps.
   * This replaces the old pattern: directive -> @Output -> component -> service.
   * @param event - The pointer event from the drag
   */
  onDragMove(event: PointerEvent): void {
    if (!this.state.active) return;

    // Store the latest event (most recent wins)
    this.lastMoveEvent = event;

    // Throttle with rAF: if a frame is already scheduled, skip
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;
        if (this.lastMoveEvent && this.cachedContainer && this.cachedHelper) {
          this.updateHelperPosition(this.lastMoveEvent, this.cachedContainer, this.cachedHelper);
        }
      });
    }
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
   * Apply resize in 'fit' mode (affects adjacent column by colId)
   */
  private applyFitResize(
    newColumnWidth: number,
    delta: number,
    tableElement: HTMLElement
  ): ColumnResizeEvent | null {
    if (!this.state.nextColumnId) {
      return this.applyExpandResize(newColumnWidth, delta, tableElement);
    }

    const minWidth = this.config.minColumnWidth;
    let rawNextColumnWidth = this.state.nextColumnStartWidth - delta;
    let finalColumnWidth = newColumnWidth;
    let finalNextColumnWidth = rawNextColumnWidth;
    let finalDelta = delta;

    if (finalColumnWidth < minWidth) {
      finalColumnWidth = minWidth;
      finalDelta = finalColumnWidth - this.state.startWidth;
      finalNextColumnWidth = this.state.nextColumnStartWidth - finalDelta;
    }
    if (finalNextColumnWidth < minWidth) {
      finalNextColumnWidth = minWidth;
      finalDelta = this.state.nextColumnStartWidth - minWidth;
      finalColumnWidth = this.state.startWidth + finalDelta;
      if (finalColumnWidth < minWidth) {
        finalColumnWidth = minWidth;
        finalDelta = finalColumnWidth - this.state.startWidth;
      }
    }

    this.columnWidthsByColId[this.state.columnId] = finalColumnWidth;
    this.columnWidthsByColId[this.state.nextColumnId] = finalNextColumnWidth;

    const container = tableElement.closest(this.config.containerSelector) as HTMLElement;
    if (container) this.applyWidthsToContainer(container);

    return {
      columnId: this.state.columnId,
      columnIndex: this.orderedColumnIds.indexOf(this.state.columnId),
      width: finalColumnWidth,
      nextColumnWidth: finalNextColumnWidth,
      delta: finalDelta
    };
  }

  /**
   * Apply resize in 'expand' mode (table width changes)
   */
  private applyExpandResize(
    newColumnWidth: number,
    delta: number,
    tableElement: HTMLElement
  ): ColumnResizeEvent | null {
    const minWidth = this.config.minColumnWidth;
    const finalColumnWidth = Math.max(newColumnWidth, minWidth);
    const finalDelta = finalColumnWidth - this.state.startWidth;

    this.columnWidthsByColId[this.state.columnId] = finalColumnWidth;

    const newTableWidth = this.originalTableWidth + finalDelta;
    this.renderer.setStyle(tableElement, 'width', `${newTableWidth}px`);
    this.renderer.setStyle(tableElement, 'min-width', `${newTableWidth}px`);

    const container = tableElement.closest(this.config.containerSelector) as HTMLElement;
    if (container) this.applyWidthsToContainer(container);

    return {
      columnId: this.state.columnId,
      columnIndex: this.orderedColumnIds.indexOf(this.state.columnId),
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
   * Apply column widths as CSS variables on the container root.
   * Sets --col-{colId}-w and --col-{colId}-left (cumulative, for sticky columns).
   * Header and body cells consume width: var(--col-{colId}-w).
   */
  private applyWidthsToContainer(containerEl: HTMLElement): void {
    const ids = this.orderedColumnIds.length ? this.orderedColumnIds : Object.keys(this.columnWidthsByColId);
    let cumulativeLeft = 0;
    ids.forEach((colId) => {
      const w = this.columnWidthsByColId[colId];
      if (w != null) {
        const safeId = this.cssSafeColId(colId);
        containerEl.style.setProperty(`--col-${safeId}-w`, `${w}px`);
        containerEl.style.setProperty(`--col-${safeId}-left`, `${cumulativeLeft}px`);
        cumulativeLeft += w;
      }
    });
  }

  /** Normalize colId for use in CSS custom property names (no spaces/special chars) */
  private cssSafeColId(colId: string): string {
    return colId.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '_');
  }

  /**
   * Clean up after resize operation
   */
  private cleanup(helperElement: HTMLElement): void {
    // Hide helper
    this.renderer.setStyle(helperElement, 'display', 'none');
    
    // Remove cursor class
    DomHandler.removeClass(this.document.body, 'column-resizing');
    
    // Cancel any pending rAF
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    // Reset drag caches
    this.cachedContainer = null;
    this.cachedHelper = null;
    this.lastMoveEvent = null;

    this.state = {
      active: false,
      columnElement: null,
      columnId: '',
      nextColumnId: null,
      startX: 0,
      startWidth: 0,
      nextColumnStartWidth: 0,
      initialWidths: {},
      orderedColumnIds: [],
      lastHelperX: 0
    };
  }

  /**
   * Get all current column widths by colId
   */
  getColumnWidthsByColId(): Record<string, number> {
    return { ...this.columnWidthsByColId };
  }

  /**
   * Get widths in display order (for backward compat when order is known)
   */
  getColumnWidths(): number[] {
    return this.orderedColumnIds.map(id => this.columnWidthsByColId[id] ?? 0);
  }

  /**
   * Set column widths by colId and apply CSS vars to container
   */
  setColumnWidthsByColId(widths: Record<string, number>, orderedColIds: string[], containerEl: HTMLElement): void {
    this.columnWidthsByColId = { ...widths };
    this.orderedColumnIds = [...orderedColIds];
    this.applyWidthsToContainer(containerEl);
  }

  /**
   * Set column widths (e.g., from localStorage) - array in display order; colIds must match orderedColumnIds
   */
  setColumnWidths(widths: number[], tableElement: HTMLElement): void {
    const container = tableElement.closest(this.config.containerSelector) as HTMLElement;
    if (!container || !this.orderedColumnIds.length) return;
    this.orderedColumnIds.forEach((id, i) => {
      if (widths[i] != null) this.columnWidthsByColId[id] = widths[i];
    });
    this.applyWidthsToContainer(container);
  }

  getColumnWidth(index: number): number {
    const id = this.orderedColumnIds[index];
    return id ? (this.columnWidthsByColId[id] ?? 0) : 0;
  }

  getColumnWidthByColId(colId: string): number {
    return this.columnWidthsByColId[colId] ?? 0;
  }

  reset(): void {
    this.columnWidthsByColId = {};
    this.orderedColumnIds = [];
    this.state = {
      active: false,
      columnElement: null,
      columnId: '',
      nextColumnId: null,
      startX: 0,
      startWidth: 0,
      nextColumnStartWidth: 0,
      initialWidths: {},
      orderedColumnIds: [],
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
