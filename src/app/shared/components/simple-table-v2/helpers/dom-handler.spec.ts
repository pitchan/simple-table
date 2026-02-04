import { DomHandler } from './dom-handler';

describe('DomHandler', () => {
  let testElement: HTMLDivElement;
  let parentElement: HTMLDivElement;

  beforeEach(() => {
    parentElement = document.createElement('div');
    parentElement.style.position = 'absolute';
    parentElement.style.left = '100px';
    parentElement.style.top = '50px';
    parentElement.style.width = '500px';
    parentElement.style.height = '300px';
    
    testElement = document.createElement('div');
    testElement.style.width = '200px';
    testElement.style.height = '100px';
    testElement.style.margin = '10px';
    testElement.style.padding = '5px';
    
    parentElement.appendChild(testElement);
    document.body.appendChild(parentElement);
  });

  afterEach(() => {
    document.body.removeChild(parentElement);
  });

  describe('getOffset()', () => {
    it('should return element offset', () => {
      const offset = DomHandler.getOffset(testElement);
      expect(offset).toHaveProperty('left');
      expect(offset).toHaveProperty('top');
    });
  });

  describe('getOuterWidth()', () => {
    it('should return outer width without margin', () => {
      const width = DomHandler.getOuterWidth(testElement);
      expect(width).toBeGreaterThan(0);
    });

    it('should return outer width with margin', () => {
      const widthWithMargin = DomHandler.getOuterWidth(testElement, true);
      const widthWithoutMargin = DomHandler.getOuterWidth(testElement, false);
      expect(widthWithMargin).toBeGreaterThanOrEqual(widthWithoutMargin);
    });
  });

  describe('getOuterHeight()', () => {
    it('should return outer height without margin', () => {
      const height = DomHandler.getOuterHeight(testElement);
      expect(height).toBeGreaterThan(0);
    });

    it('should return outer height with margin', () => {
      const heightWithMargin = DomHandler.getOuterHeight(testElement, true);
      const heightWithoutMargin = DomHandler.getOuterHeight(testElement, false);
      expect(heightWithMargin).toBeGreaterThanOrEqual(heightWithoutMargin);
    });
  });

  describe('index()', () => {
    it('should return element index among siblings', () => {
      const sibling1 = document.createElement('div');
      const sibling2 = document.createElement('div');
      const targetElement = document.createElement('div');
      
      parentElement.innerHTML = '';
      parentElement.appendChild(sibling1);
      parentElement.appendChild(sibling2);
      parentElement.appendChild(targetElement);

      expect(DomHandler.index(targetElement)).toBe(2);
    });

    it('should return -1 for element without parent', () => {
      const orphanElement = document.createElement('div');
      expect(DomHandler.index(orphanElement)).toBe(-1);
    });
  });

  describe('indexWithinGroup()', () => {
    it('should return index within attribute group', () => {
      parentElement.innerHTML = '';
      
      const el1 = document.createElement('div');
      el1.setAttribute('data-group', 'test');
      
      const el2 = document.createElement('div');
      el2.setAttribute('data-group', 'other');
      
      const el3 = document.createElement('div');
      el3.setAttribute('data-group', 'test');
      
      parentElement.appendChild(el1);
      parentElement.appendChild(el2);
      parentElement.appendChild(el3);

      expect(DomHandler.indexWithinGroup(el3, 'data-group')).toBe(1);
    });
  });

  describe('addClass() / removeClass() / hasClass()', () => {
    it('should add class to element', () => {
      DomHandler.addClass(testElement, 'test-class');
      expect(testElement.classList.contains('test-class')).toBe(true);
    });

    it('should remove class from element', () => {
      testElement.classList.add('test-class');
      DomHandler.removeClass(testElement, 'test-class');
      expect(testElement.classList.contains('test-class')).toBe(false);
    });

    it('should check if element has class', () => {
      testElement.classList.add('existing-class');
      expect(DomHandler.hasClass(testElement, 'existing-class')).toBe(true);
      expect(DomHandler.hasClass(testElement, 'non-existing-class')).toBe(false);
    });

    it('should add multiple classes separated by space', () => {
      DomHandler.addClass(testElement, 'class1 class2');
      expect(testElement.classList.contains('class1')).toBe(true);
      expect(testElement.classList.contains('class2')).toBe(true);
    });
  });

  describe('findSingle()', () => {
    it('should find single element by selector', () => {
      const child = document.createElement('span');
      child.className = 'find-me';
      testElement.appendChild(child);

      const found = DomHandler.findSingle(testElement, '.find-me');
      expect(found).toBe(child);
    });

    it('should return null if not found', () => {
      const found = DomHandler.findSingle(testElement, '.not-existing');
      expect(found).toBeNull();
    });
  });

  describe('find()', () => {
    it('should find all elements by selector', () => {
      const child1 = document.createElement('span');
      child1.className = 'find-us';
      const child2 = document.createElement('span');
      child2.className = 'find-us';
      testElement.appendChild(child1);
      testElement.appendChild(child2);

      const found = DomHandler.find(testElement, '.find-us');
      expect(found.length).toBe(2);
    });
  });

  describe('getComputedStyle()', () => {
    it('should return computed style object', () => {
      const style = DomHandler.getComputedStyle(testElement);
      expect(style).toBeTruthy();
    });

    it('should return specific style property value', () => {
      testElement.style.display = 'block';
      const display = DomHandler.getComputedStyle(testElement, 'display');
      expect(display).toBe('block');
    });
  });

  describe('isTouchDevice()', () => {
    it('should return boolean', () => {
      expect(typeof DomHandler.isTouchDevice()).toBe('boolean');
    });
  });

  describe('getViewportWidth() / getViewportHeight()', () => {
    it('should return viewport width', () => {
      expect(DomHandler.getViewportWidth()).toBeGreaterThan(0);
    });

    it('should return viewport height', () => {
      expect(DomHandler.getViewportHeight()).toBeGreaterThan(0);
    });
  });

  describe('setAttribute() / getAttribute() / removeAttribute()', () => {
    it('should set attribute', () => {
      DomHandler.setAttribute(testElement, 'data-test', 'value');
      expect(testElement.getAttribute('data-test')).toBe('value');
    });

    it('should get attribute', () => {
      testElement.setAttribute('data-test', 'value');
      expect(DomHandler.getAttribute(testElement, 'data-test')).toBe('value');
    });

    it('should remove attribute', () => {
      testElement.setAttribute('data-test', 'value');
      DomHandler.removeAttribute(testElement, 'data-test');
      expect(testElement.hasAttribute('data-test')).toBe(false);
    });
  });

  describe('clearSelection()', () => {
    it('should not throw error', () => {
      expect(() => DomHandler.clearSelection()).not.toThrow();
    });
  });

  describe('getScrollPosition()', () => {
    it('should return scroll position', () => {
      const pos = DomHandler.getScrollPosition();
      expect(pos).toHaveProperty('scrollTop');
      expect(pos).toHaveProperty('scrollLeft');
    });
  });

  describe('isRTL()', () => {
    it('should return false for LTR document', () => {
      expect(DomHandler.isRTL()).toBe(false);
    });

    it('should return true for RTL element', () => {
      testElement.style.direction = 'rtl';
      expect(DomHandler.isRTL(testElement)).toBe(true);
    });
  });

  describe('siblings()', () => {
    it('should return sibling elements', () => {
      parentElement.innerHTML = '';
      const el1 = document.createElement('div');
      const el2 = document.createElement('div');
      const el3 = document.createElement('div');
      parentElement.appendChild(el1);
      parentElement.appendChild(el2);
      parentElement.appendChild(el3);

      const siblings = DomHandler.siblings(el2);
      expect(siblings.length).toBe(2);
      expect(siblings).toContain(el1);
      expect(siblings).toContain(el3);
    });
  });

  describe('getNextElementSibling() / getPreviousElementSibling()', () => {
    let el1: HTMLDivElement;
    let el2: HTMLDivElement;
    let el3: HTMLDivElement;

    beforeEach(() => {
      parentElement.innerHTML = '';
      el1 = document.createElement('div');
      el2 = document.createElement('div');
      el3 = document.createElement('div');
      parentElement.appendChild(el1);
      parentElement.appendChild(el2);
      parentElement.appendChild(el3);
    });

    it('should return next sibling', () => {
      expect(DomHandler.getNextElementSibling(el1)).toBe(el2);
      expect(DomHandler.getNextElementSibling(el2)).toBe(el3);
    });

    it('should return null for last element', () => {
      expect(DomHandler.getNextElementSibling(el3)).toBeNull();
    });

    it('should return previous sibling', () => {
      expect(DomHandler.getPreviousElementSibling(el3)).toBe(el2);
      expect(DomHandler.getPreviousElementSibling(el2)).toBe(el1);
    });

    it('should return null for first element', () => {
      expect(DomHandler.getPreviousElementSibling(el1)).toBeNull();
    });
  });

  describe('appendChild() / removeElement()', () => {
    it('should append child to parent', () => {
      const newChild = document.createElement('span');
      DomHandler.appendChild(testElement, newChild);
      expect(testElement.contains(newChild)).toBe(true);
    });

    it('should remove element from DOM', () => {
      const toRemove = document.createElement('span');
      testElement.appendChild(toRemove);
      
      DomHandler.removeElement(toRemove);
      expect(testElement.contains(toRemove)).toBe(false);
    });
  });

  describe('calculateScrollbarWidth()', () => {
    it('should return a number', () => {
      const width = DomHandler.calculateScrollbarWidth();
      expect(typeof width).toBe('number');
    });
  });

  describe('focus()', () => {
    it('should focus element without delay', () => {
      const focusSpy = jest.spyOn(testElement, 'focus');
      DomHandler.focus(testElement);
      expect(focusSpy).toHaveBeenCalled();
    });

    it('should focus element with delay', (done) => {
      const focusSpy = jest.spyOn(testElement, 'focus');
      DomHandler.focus(testElement, 50);
      
      setTimeout(() => {
        expect(focusSpy).toHaveBeenCalled();
        done();
      }, 100);
    });
  });

  describe('isVisible()', () => {
    it('should return true for visible element', () => {
      testElement.style.display = 'block';
      expect(DomHandler.isVisible(testElement)).toBe(true);
    });

    it('should return false for hidden element', () => {
      testElement.style.display = 'none';
      expect(DomHandler.isVisible(testElement)).toBe(false);
    });
  });
});
