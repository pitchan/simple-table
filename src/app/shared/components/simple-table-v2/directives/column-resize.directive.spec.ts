import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ColumnResizeDirective, ColumnResizeEvent } from './column-resize.directive';

/**
 * Helper to create PointerEvent (not all browsers support new PointerEvent())
 */
function createPointerEvent(type: string, options: Partial<PointerEventInit> = {}): PointerEvent {
  const defaults: PointerEventInit = {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    button: 0,
    clientX: 0,
    clientY: 0,
    ...options,
  };
  return new PointerEvent(type, defaults);
}

@Component({
  template: `
    <div class="simple-table-v2-container" style="width: 500px;">
      <table>
        <thead>
          <tr>
            <th style="width: 200px;">
              <span
                columnResize
                [columnId]="'testColumn'"
                [minWidth]="100"
                [maxWidth]="500"
                [initialWidth]="200"
                [disabled]="disabled"
                (resizeStart)="onResizeStart($event)"
                (resizeEnd)="onResizeEnd($event)">
              </span>
            </th>
          </tr>
        </thead>
      </table>
    </div>
  `,
  standalone: true,
  imports: [ColumnResizeDirective],
})
class TestHostComponent {
  disabled = false;
  resizeStartEvent: ColumnResizeEvent | null = null;
  resizeEndEvent: ColumnResizeEvent | null = null;

  onResizeStart(event: ColumnResizeEvent): void {
    this.resizeStartEvent = event;
  }

  onResizeEnd(event: ColumnResizeEvent): void {
    this.resizeEndEvent = event;
  }
}

describe('ColumnResizeDirective V2', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let component: TestHostComponent;
  let directiveElement: DebugElement;
  let directive: ColumnResizeDirective;
  let hostContainer: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    directiveElement = fixture.debugElement.query(By.directive(ColumnResizeDirective));
    directive = directiveElement.injector.get(ColumnResizeDirective);
    hostContainer = fixture.debugElement.query(By.css('.simple-table-v2-container')).nativeElement;
  });

  afterEach(() => {
    // Clean up body class if test failed mid-resize
    document.body.classList.remove('column-resizing');
  });

  it('should create the directive', () => {
    expect(directive).toBeTruthy();
  });

  it('should have correct initial values', () => {
    expect(directive.columnId).toBe('testColumn');
    expect(directive.minWidth).toBe(100);
    expect(directive.maxWidth).toBe(500);
    expect(directive.initialWidth).toBe(200);
    expect(directive.disabled).toBe(false);
  });

  describe('Pointer Events', () => {
    it('should emit resizeStart on pointerdown', () => {
      const event = createPointerEvent('pointerdown', { clientX: 100 });
      directiveElement.nativeElement.dispatchEvent(event);
      fixture.detectChanges();

      expect(component.resizeStartEvent).toBeTruthy();
      expect(component.resizeStartEvent?.columnId).toBe('testColumn');
    });

    it('should not start resize on right-click', () => {
      const event = createPointerEvent('pointerdown', { button: 2, clientX: 100 });
      directiveElement.nativeElement.dispatchEvent(event);
      fixture.detectChanges();

      expect(component.resizeStartEvent).toBeNull();
    });

    it('should emit resizeEnd on pointerup', fakeAsync(() => {
      // Start resize
      const startEvent = createPointerEvent('pointerdown', { clientX: 100, pointerId: 1 });
      directiveElement.nativeElement.dispatchEvent(startEvent);
      fixture.detectChanges();

      // Move pointer
      const moveEvent = createPointerEvent('pointermove', { clientX: 150, pointerId: 1 });
      document.dispatchEvent(moveEvent);
      tick();
      fixture.detectChanges();

      // End resize
      const endEvent = createPointerEvent('pointerup', { pointerId: 1 });
      document.dispatchEvent(endEvent);
      tick();
      fixture.detectChanges();

      expect(component.resizeEndEvent).toBeTruthy();
      expect(component.resizeEndEvent?.columnId).toBe('testColumn');
    }));

    it('should handle pointercancel (alt-tab, gesture)', fakeAsync(() => {
      // Start resize
      const startEvent = createPointerEvent('pointerdown', { clientX: 100, pointerId: 1 });
      directiveElement.nativeElement.dispatchEvent(startEvent);
      fixture.detectChanges();

      expect(component.resizeStartEvent).toBeTruthy();

      // Simulate pointercancel (e.g., alt-tab)
      const cancelEvent = createPointerEvent('pointercancel', { pointerId: 1 });
      document.dispatchEvent(cancelEvent);
      tick();
      fixture.detectChanges();

      // Should emit resizeEnd even on cancel
      expect(component.resizeEndEvent).toBeTruthy();
      expect(document.body.classList.contains('column-resizing')).toBeFalse();
    }));

    it('should ignore events with different pointerId', fakeAsync(() => {
      // Start resize with pointerId 1
      const startEvent = createPointerEvent('pointerdown', { clientX: 100, pointerId: 1 });
      directiveElement.nativeElement.dispatchEvent(startEvent);
      fixture.detectChanges();

      // Try to end with different pointerId
      const endEvent = createPointerEvent('pointerup', { pointerId: 999 });
      document.dispatchEvent(endEvent);
      tick();
      fixture.detectChanges();

      // Should NOT have ended
      expect(component.resizeEndEvent).toBeNull();
      expect(document.body.classList.contains('column-resizing')).toBeTrue();

      // Clean up
      const realEndEvent = createPointerEvent('pointerup', { pointerId: 1 });
      document.dispatchEvent(realEndEvent);
      tick();
    }));
  });

  describe('Disabled state', () => {
    it('should not start resize when disabled', () => {
      component.disabled = true;
      fixture.detectChanges();

      const event = createPointerEvent('pointerdown', { clientX: 100 });
      directiveElement.nativeElement.dispatchEvent(event);
      fixture.detectChanges();

      expect(component.resizeStartEvent).toBeNull();
      expect(document.body.classList.contains('column-resizing')).toBeFalse();
    });
  });

  describe('Width constraints', () => {
    it('should respect minWidth constraint', fakeAsync(() => {
      // Start resize
      const startEvent = createPointerEvent('pointerdown', { clientX: 100, pointerId: 1 });
      directiveElement.nativeElement.dispatchEvent(startEvent);
      fixture.detectChanges();

      // Move pointer way left (beyond min)
      const moveEvent = createPointerEvent('pointermove', { clientX: -200, pointerId: 1 });
      document.dispatchEvent(moveEvent);
      tick();

      // End resize
      const endEvent = createPointerEvent('pointerup', { pointerId: 1 });
      document.dispatchEvent(endEvent);
      tick();
      fixture.detectChanges();

      // Width should be clamped to minWidth
      expect(component.resizeEndEvent?.width).toBe(100);
    }));

    it('should respect maxWidth constraint', fakeAsync(() => {
      // Start resize
      const startEvent = createPointerEvent('pointerdown', { clientX: 100, pointerId: 1 });
      directiveElement.nativeElement.dispatchEvent(startEvent);
      fixture.detectChanges();

      // Move pointer way right (beyond max)
      const moveEvent = createPointerEvent('pointermove', { clientX: 1000, pointerId: 1 });
      document.dispatchEvent(moveEvent);
      tick();

      // End resize
      const endEvent = createPointerEvent('pointerup', { pointerId: 1 });
      document.dispatchEvent(endEvent);
      tick();
      fixture.detectChanges();

      // Width should be clamped to maxWidth
      expect(component.resizeEndEvent?.width).toBe(500);
    }));
  });

  describe('CSS and body class', () => {
    it('should add column-resizing class to body during resize', fakeAsync(() => {
      const startEvent = createPointerEvent('pointerdown', { clientX: 100, pointerId: 1 });
      directiveElement.nativeElement.dispatchEvent(startEvent);
      fixture.detectChanges();

      expect(document.body.classList.contains('column-resizing')).toBeTrue();

      const endEvent = createPointerEvent('pointerup', { pointerId: 1 });
      document.dispatchEvent(endEvent);
      tick();
      fixture.detectChanges();

      expect(document.body.classList.contains('column-resizing')).toBeFalse();
    }));

    it('should apply CSS var on host container during resize', fakeAsync(() => {
      // Start resize
      const startEvent = createPointerEvent('pointerdown', { clientX: 100, pointerId: 1 });
      directiveElement.nativeElement.dispatchEvent(startEvent);
      fixture.detectChanges();

      // Move pointer
      const moveEvent = createPointerEvent('pointermove', { clientX: 150, pointerId: 1 });
      document.dispatchEvent(moveEvent);
      tick();
      fixture.detectChanges();

      // Check CSS var is set on host container (not documentElement)
      const cssVar = hostContainer.style.getPropertyValue('--column-testColumn-width');
      expect(cssVar).toBeTruthy();

      // Clean up
      const endEvent = createPointerEvent('pointerup', { pointerId: 1 });
      document.dispatchEvent(endEvent);
      tick();
    }));
  });

  describe('Cleanup', () => {
    it('should clean up on destroy during resize', fakeAsync(() => {
      const startEvent = createPointerEvent('pointerdown', { clientX: 100, pointerId: 1 });
      directiveElement.nativeElement.dispatchEvent(startEvent);
      fixture.detectChanges();

      expect(document.body.classList.contains('column-resizing')).toBeTrue();

      // Destroy while resizing
      fixture.destroy();

      expect(document.body.classList.contains('column-resizing')).toBeFalse();
    }));
  });
});
