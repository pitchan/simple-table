import { Injectable } from '@angular/core';
import {
  TableColumnDef,
  TableState,
  ColumnResizeMode,
} from '../models/column-def.model';

/**
 * Service handling table state persistence (localStorage).
 * Extracted from SimpleTableV2Component to respect Single Responsibility Principle.
 *
 * Pure logic — no DOM, no signals, no ChangeDetectorRef dependency.
 */
@Injectable()
export class TableStateService<T> {
  // ========== READ / WRITE ==========

  /**
   * Build the localStorage key from the table config id.
   */
  getStorageKey(configId: string | undefined): string {
    return `tableState_${configId ?? ''}`;
  }

  /**
   * Read previously persisted table state (returns `null` when absent / invalid).
   */
  read(configId: string | undefined): TableState | null {
    const key = this.getStorageKey(configId);
    if (!key) return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as TableState;
      return parsed?.columnOrder ? parsed : null;
    } catch {
      return null;
    }
  }

  /**
   * Persist a `TableState` snapshot to localStorage.
   */
  write(configId: string | undefined, state: TableState): void {
    const key = this.getStorageKey(configId);
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Ignore quota / private-mode errors
    }
  }

  // ========== BUILD ==========

  /**
   * Build a `TableState` snapshot from the current runtime values.
   *
   * @param columns        Current column definitions
   * @param columnWidths   Current column widths map (id → px)
   * @param resizeMode     Active resize mode
   */
  buildState(
    columns: TableColumnDef<T>[],
    columnWidths: Map<string, number>,
    resizeMode: ColumnResizeMode
  ): TableState {
    const widths: Record<string, number> = {};
    columnWidths.forEach((w, id) => {
      if (id !== 'select') widths[id] = w;
    });

    return {
      columnOrder: columns.map(c => c.id),
      columnWidths: widths,
      sort: { active: '', direction: '' },
      filters: {},
      hiddenColumns: Object.fromEntries(columns.map(c => [c.id, !!c.hidden])),
      stickyColumns: Object.fromEntries(
        columns.map(c => [c.id, c.sticky]).filter(([, v]) => v !== undefined)
      ),
      columnResizeMode: resizeMode,
    };
  }

  // ========== APPLY ==========

  /**
   * Apply a persisted `TableState` to the column config **in-place** and
   * populate the `columnWidths` map.
   *
   * Returns `true` when the state was actually applied.
   */
  applyToConfig(
    state: TableState,
    columns: TableColumnDef<T>[],
    columnWidths: Map<string, number>,
    config: { columnResizeMode?: ColumnResizeMode }
  ): boolean {
    if (!columns.length) return false;

    // 1. Column order
    const order = state.columnOrder;
    if (order?.length) {
      const byId = new Map(columns.map(c => [c.id, c]));
      const ordered: TableColumnDef<T>[] = [];
      for (const id of order) {
        const col = byId.get(id);
        if (col) ordered.push(col);
      }
      for (const col of columns) {
        if (!order.includes(col.id)) ordered.push(col);
      }
      columns.length = 0;
      columns.push(...ordered);
    }

    // 2. Hidden / sticky
    columns.forEach(col => {
      if (state.hiddenColumns && col.id in state.hiddenColumns) {
        col.hidden = state.hiddenColumns[col.id];
      }
      if (state.stickyColumns && col.id in state.stickyColumns) {
        col.sticky = state.stickyColumns[col.id];
      }
    });

    // 3. Column widths
    if (state.columnWidths && typeof state.columnWidths === 'object') {
      Object.entries(state.columnWidths).forEach(([id, w]) => {
        if (id !== 'select') columnWidths.set(id, w);
      });
    }

    // 4. Resize mode
    if (state.columnResizeMode === 'fit' || state.columnResizeMode === 'expand') {
      config.columnResizeMode = state.columnResizeMode;
    }

    return true;
  }
}
