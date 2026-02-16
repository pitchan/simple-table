import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ResizableColumnDirective, ResizableColumnEvent } from './resizable-column.directive';
import { TableResizeService } from '../services/table-resize.service';

/**
 * Test host component for ResizableColumnDirective
 */
@Component({
  standalone: true,
  imports: [ResizableColumnDirective],
  providers: [TableResizeService],
  template: `
    <table>
      <thead>
        <tr>
          <th 
            pResizableColumn 
            [pResizableColumnDisabled]="disabled"
            (resizeBegin)="onResizeBegin($event)"
            (resizeEnd)="onResizeEnd($event)"
            data-column="testColumn">
            Test Header
          </th>
          <th>Other Header</th>
        </tr>
      </thead>
    </table>
  `
})
class TestHostComponent {
  disabled = false;
  resizeBeginEvent: ResizableColumnEvent | null = null;
  resizeEndEvent: ResizableColumnEvent | null = null;

  onResizeBegin(event: ResizableColumnEvent): void {
    this.resizeBeginEvent = event;
  }

  onResizeEnd(event: ResizableColumnEvent): void {
    this.resizeEndEvent = event;
  }
}

describe('ResizableColumnDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let hostComponent: TestHostComponent;
  let thElement: DebugElement;
  let directive: ResizableColumnDirective;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();

    thElement = fixture.debugElement.query(By.directive(ResizableColumnDirective));
    directive = thElement.injector.get(ResizableColumnDirective);
  });

  describe('Initialization', () => {
    it('should create the directive', () => {
      expect(directive).toBeTruthy();
    });

    it('should add p-resizable-column class to host element', () => {
      expect(thElement.nativeElement.classList.contains('p-resizable-column')).toBe(true);
    });

    it('should create resizer element when enabled', () => {
      const resizer = thElement.nativeElement.querySelector('.p-datatable-column-resizer');
      expect(resizer).toBeTruthy();
    });

    it('should NOT create resizer element when disabled', fakeAsync(() => {
      hostComponent.disabled = true;
      fixture.detectChanges();
      
      // Create a new fixture with disabled state from the start
      const disabledFixture = TestBed.createComponent(TestHostComponent);
      disabledFixture.componentInstance.disabled = true;
      disabledFixture.detectChanges();
      tick();

      const disabledTh = disabledFixture.debugElement.query(By.directive(ResizableColumnDirective));
      // Note: The resizer is created in ngAfterViewInit based on isEnabled()
      // If disabled from start, no resizer should be created
      const resizer = disabledTh.nativeElement.querySelector('.p-datatable-column-resizer');
      expect(resizer).toBeFalsy();
      
      disabledFixture.destroy();
    }));

    it('should create resizer when pResizableColumnDisabled changes from true to false (e.g. column no longer last in fit mode)', fakeAsync(() => {
      const disabledFixture = TestBed.createComponent(TestHostComponent);
      disabledFixture.componentInstance.disabled = true;
      disabledFixture.detectChanges();
      tick();

      const disabledTh = disabledFixture.debugElement.query(By.directive(ResizableColumnDirective));
      expect(disabledTh.nativeElement.querySelector('.p-datatable-column-resizer')).toBeFalsy();

      disabledFixture.componentInstance.disabled = false;
      disabledFixture.detectChanges();
      tick();

      expect(disabledTh.nativeElement.querySelector('.p-datatable-column-resizer')).toBeTruthy();
      disabledFixture.destroy();
    }));

    it('should remove resizer when pResizableColumnDisabled changes from false to true', () => {
      expect(thElement.nativeElement.querySelector('.p-datatable-column-resizer')).toBeTruthy();

      hostComponent.disabled = true;
      fixture.detectChanges();

      expect(thElement.nativeElement.querySelector('.p-datatable-column-resizer')).toBeFalsy();
    });
  });

  describe('Resize Events', () => {
    let resizer: HTMLElement;

    beforeEach(() => {
      resizer = thElement.nativeElement.querySelector('.p-datatable-column-resizer');
    });

    it('should emit resizeBegin on pointerdown', fakeAsync(() => {
      const pointerEvent = new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 50,
        pointerId: 1,
        button: 0,
        bubbles: true
      });

      resizer.dispatchEvent(pointerEvent);
      tick();
      fixture.detectChanges();

      expect(hostComponent.resizeBeginEvent).toBeTruthy();
      expect(hostComponent.resizeBeginEvent?.element).toBe(thElement.nativeElement);
    }));

    it('should call resizeService.onDragMove on pointermove during resize', fakeAsync(() => {
      // Spy on the service
      const resizeService = thElement.injector.get(TableResizeService);
      const spy = spyOn(resizeService, 'onDragMove');

      // Start resize
      const downEvent = new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 50,
        pointerId: 1,
        button: 0,
        bubbles: true
      });
      resizer.dispatchEvent(downEvent);
      tick();

      // Move pointer
      const moveEvent = new PointerEvent('pointermove', {
        clientX: 150,
        clientY: 50,
        pointerId: 1,
        bubbles: true
      });
      document.dispatchEvent(moveEvent);
      tick();
      fixture.detectChanges();

      expect(spy).toHaveBeenCalledWith(moveEvent);
    }));

    it('should emit resizeEnd on pointerup', fakeAsync(() => {
      // Start resize
      const downEvent = new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 50,
        pointerId: 1,
        button: 0,
        bubbles: true
      });
      resizer.dispatchEvent(downEvent);
      tick();

      // End resize
      const upEvent = new PointerEvent('pointerup', {
        clientX: 150,
        clientY: 50,
        pointerId: 1,
        bubbles: true
      });
      document.dispatchEvent(upEvent);
      tick();
      fixture.detectChanges();

      expect(hostComponent.resizeEndEvent).toBeTruthy();
    }));

    it('should NOT emit events when disabled', fakeAsync(() => {
      hostComponent.disabled = true;
      fixture.detectChanges();

      const pointerEvent = new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 50,
        pointerId: 1,
        button: 0,
        bubbles: true
      });

      resizer.dispatchEvent(pointerEvent);
      tick();
      fixture.detectChanges();

      expect(hostComponent.resizeBeginEvent).toBeFalsy();
    }));

    it('should add p-resizable-column-resizing class during resize', fakeAsync(() => {
      const downEvent = new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 50,
        pointerId: 1,
        button: 0,
        bubbles: true
      });
      resizer.dispatchEvent(downEvent);
      tick();
      fixture.detectChanges();

      expect(thElement.nativeElement.classList.contains('p-resizable-column-resizing')).toBe(true);

      // End resize
      const upEvent = new PointerEvent('pointerup', {
        clientX: 150,
        clientY: 50,
        pointerId: 1,
        bubbles: true
      });
      document.dispatchEvent(upEvent);
      tick();
      fixture.detectChanges();

      expect(thElement.nativeElement.classList.contains('p-resizable-column-resizing')).toBe(false);
    }));
  });

  describe('isEnabled()', () => {
    it('should return true when not disabled', () => {
      expect(directive.isEnabled()).toBe(true);
    });

    it('should return false when disabled', () => {
      hostComponent.disabled = true;
      fixture.detectChanges();
      expect(directive.isEnabled()).toBe(false);
    });
  });

  describe('getElement()', () => {
    it('should return the host element', () => {
      expect(directive.getElement()).toBe(thElement.nativeElement);
    });
  });

  describe('Cleanup', () => {
    it('should remove document listeners on destroy', fakeAsync(() => {
      // Start resize
      const resizer = thElement.nativeElement.querySelector('.p-datatable-column-resizer');
      const downEvent = new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 50,
        pointerId: 1,
        button: 0,
        bubbles: true
      });
      resizer.dispatchEvent(downEvent);
      tick();

      // Destroy directive
      fixture.destroy();

      // Verify no errors when moving pointer after destroy
      const moveEvent = new PointerEvent('pointermove', {
        clientX: 150,
        clientY: 50,
        pointerId: 1,
        bubbles: true
      });
      expect(() => document.dispatchEvent(moveEvent)).not.toThrow();
    }));
  });
});
