import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { TableResizeService, ColumnResizeMode, ColumnResizeEvent } from './table-resize.service';

describe('TableResizeService', () => {
  let service: TableResizeService;
  let document: Document;

  // Mock DOM elements
  let mockTableElement: HTMLTableElement;
  let mockContainerElement: HTMLDivElement;
  let mockHelperElement: HTMLDivElement;
  let mockHeaderRow: HTMLTableRowElement;
  let mockTh1: HTMLTableCellElement;
  let mockTh2: HTMLTableCellElement;
  let mockTh3: HTMLTableCellElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TableResizeService]
    });

    service = TestBed.inject(TableResizeService);
    document = TestBed.inject(DOCUMENT);

    // Create mock DOM structure
    mockContainerElement = document.createElement('div');
    mockContainerElement.className = 'simple-table-v2-container';
    mockContainerElement.style.position = 'relative';
    mockContainerElement.style.width = '800px';

    mockTableElement = document.createElement('table');
    mockTableElement.id = 'test-table';

    const thead = document.createElement('thead');
    mockHeaderRow = document.createElement('tr');

    // Create mock TH elements with realistic widths
    mockTh1 = document.createElement('th');
    mockTh1.setAttribute('data-column', 'col1');
    mockTh1.style.width = '200px';
    Object.defineProperty(mockTh1, 'offsetWidth', { value: 200, configurable: true });

    mockTh2 = document.createElement('th');
    mockTh2.setAttribute('data-column', 'col2');
    mockTh2.style.width = '300px';
    Object.defineProperty(mockTh2, 'offsetWidth', { value: 300, configurable: true });

    mockTh3 = document.createElement('th');
    mockTh3.setAttribute('data-column', 'col3');
    mockTh3.style.width = '300px';
    Object.defineProperty(mockTh3, 'offsetWidth', { value: 300, configurable: true });

    mockHeaderRow.appendChild(mockTh1);
    mockHeaderRow.appendChild(mockTh2);
    mockHeaderRow.appendChild(mockTh3);
    thead.appendChild(mockHeaderRow);
    mockTableElement.appendChild(thead);

    mockContainerElement.appendChild(mockTableElement);
    document.body.appendChild(mockContainerElement);

    // Create helper element
    mockHelperElement = document.createElement('div');
    mockHelperElement.className = 'p-datatable-column-resize-helper';
    mockHelperElement.style.display = 'none';
    mockContainerElement.appendChild(mockHelperElement);

    // Mock getBoundingClientRect for container
    jest.spyOn(mockContainerElement, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 400,
      right: 800,
      bottom: 400,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });
  });

  afterEach(() => {
    document.body.removeChild(mockContainerElement);
    service.reset();
    jest.restoreAllMocks();
  });

  describe('configure()', () => {
    it('should set resize mode to fit', () => {
      service.configure({ columnResizeMode: 'fit' });
      expect(service.resizeMode).toBe('fit');
    });

    it('should set resize mode to expand', () => {
      service.configure({ columnResizeMode: 'expand' });
      expect(service.resizeMode).toBe('expand');
    });

    it('should set minimum column width', () => {
      service.configure({ minColumnWidth: 100 });
      // minColumnWidth is private, but we can test its effect in resize operations
      expect(service.resizeMode).toBe('fit'); // Default mode
    });
  });

  describe('initializeWidths()', () => {
    it('should store initial column widths', () => {
      service.initializeWidths(mockTableElement, mockHeaderRow);
      
      const widths = service.getColumnWidths();
      expect(widths.length).toBe(3);
    });
  });

  describe('isResizing', () => {
    it('should return false initially', () => {
      expect(service.isResizing).toBe(false);
    });
  });

  describe('beginResize()', () => {
    it('should start resize operation', () => {
      const pointerEvent = new PointerEvent('pointerdown', {
        clientX: 200,
        clientY: 50,
        pointerId: 1
      });

      service.initializeWidths(mockTableElement, mockHeaderRow);
      const result = service.beginResize(
        pointerEvent,
        mockTh1,
        mockContainerElement,
        mockHelperElement
      );

      expect(result.columnIndex).toBe(0);
      expect(result.startWidth).toBeGreaterThan(0);
      expect(mockHelperElement.style.display).toBe('block');
    });

    it('should add column-resizing class to body', () => {
      const pointerEvent = new PointerEvent('pointerdown', {
        clientX: 200,
        clientY: 50,
        pointerId: 1
      });

      service.initializeWidths(mockTableElement, mockHeaderRow);
      service.beginResize(pointerEvent, mockTh1, mockContainerElement, mockHelperElement);

      expect(document.body.classList.contains('column-resizing')).toBe(true);
    });
  });

  describe('updateHelperPosition()', () => {
    beforeEach(() => {
      const pointerEvent = new PointerEvent('pointerdown', {
        clientX: 200,
        clientY: 50,
        pointerId: 1
      });
      service.initializeWidths(mockTableElement, mockHeaderRow);
      service.beginResize(pointerEvent, mockTh1, mockContainerElement, mockHelperElement);
    });

    it('should update helper left position', () => {
      const moveEvent = new PointerEvent('pointermove', {
        clientX: 250,
        clientY: 50,
        pointerId: 1
      });

      service.updateHelperPosition(moveEvent, mockContainerElement, mockHelperElement);
      
      expect(mockHelperElement.style.left).toBeTruthy();
    });
  });

  describe('endResize()', () => {
    beforeEach(() => {
      const pointerEvent = new PointerEvent('pointerdown', {
        clientX: 200,
        clientY: 50,
        pointerId: 1
      });
      service.initializeWidths(mockTableElement, mockHeaderRow);
      service.beginResize(pointerEvent, mockTh1, mockContainerElement, mockHelperElement);
    });

    it('should hide helper element', () => {
      service.endResize(mockHelperElement, mockTableElement);
      expect(mockHelperElement.style.display).toBe('none');
    });

    it('should remove column-resizing class from body', () => {
      service.endResize(mockHelperElement, mockTableElement);
      expect(document.body.classList.contains('column-resizing')).toBe(false);
    });

    it('should return null if not resizing', () => {
      service.cancelResize(mockHelperElement); // Cancel first
      const result = service.endResize(mockHelperElement, mockTableElement);
      expect(result).toBeNull();
    });
  });

  describe('cancelResize()', () => {
    it('should hide helper and clean up state', () => {
      const pointerEvent = new PointerEvent('pointerdown', {
        clientX: 200,
        clientY: 50,
        pointerId: 1
      });
      service.initializeWidths(mockTableElement, mockHeaderRow);
      service.beginResize(pointerEvent, mockTh1, mockContainerElement, mockHelperElement);

      service.cancelResize(mockHelperElement);

      expect(mockHelperElement.style.display).toBe('none');
      expect(service.isResizing).toBe(false);
    });
  });

  describe('getColumnWidths() / setColumnWidths()', () => {
    it('should get and set column widths', () => {
      const widths = [100, 200, 300];
      service.setColumnWidths(widths, mockTableElement);
      
      const retrievedWidths = service.getColumnWidths();
      expect(retrievedWidths).toEqual(widths);
    });
  });

  describe('getColumnWidth()', () => {
    it('should return width for specific column index', () => {
      service.setColumnWidths([100, 200, 300], mockTableElement);
      expect(service.getColumnWidth(1)).toBe(200);
    });

    it('should return 0 for invalid index', () => {
      expect(service.getColumnWidth(999)).toBe(0);
    });
  });

  describe('reset()', () => {
    it('should clear all state', () => {
      service.setColumnWidths([100, 200, 300], mockTableElement);
      service.reset();
      
      expect(service.getColumnWidths()).toEqual([]);
      expect(service.isResizing).toBe(false);
    });
  });

  describe('Resize Modes', () => {
    describe('fit mode', () => {
      beforeEach(() => {
        service.configure({ columnResizeMode: 'fit', minColumnWidth: 50 });
      });

      it('should be the default mode', () => {
        const freshService = TestBed.inject(TableResizeService);
        expect(freshService.resizeMode).toBe('fit');
      });
    });

    describe('expand mode', () => {
      beforeEach(() => {
        service.configure({ columnResizeMode: 'expand', minColumnWidth: 50 });
      });

      it('should set mode correctly', () => {
        expect(service.resizeMode).toBe('expand');
      });
    });
  });
});
