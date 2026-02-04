/**
 * DomHandler - Utility functions for DOM manipulation
 * Inspired by PrimeNG's DomHandler for consistent DOM operations
 * 
 * @description Provides static methods for common DOM operations used in table resize functionality
 */
export class DomHandler {
  
  /**
   * Get the offset of an element relative to the document
   * @param el - The HTML element
   * @returns Object with left and top offset values
   */
  static getOffset(el: HTMLElement): { left: number; top: number } {
    const rect = el.getBoundingClientRect();
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    
    return {
      left: rect.left + scrollLeft,
      top: rect.top + scrollTop
    };
  }

  /**
   * Get the outer width of an element including margins
   * @param el - The HTML element
   * @param includeMargin - Whether to include margins (default: false)
   * @returns The outer width in pixels
   */
  static getOuterWidth(el: HTMLElement, includeMargin = false): number {
    if (!el) return 0;
    
    let width = el.offsetWidth;
    
    if (includeMargin) {
      const style = getComputedStyle(el);
      width += parseFloat(style.marginLeft) + parseFloat(style.marginRight);
    }
    
    return width;
  }

  /**
   * Get the outer height of an element including margins
   * @param el - The HTML element
   * @param includeMargin - Whether to include margins (default: false)
   * @returns The outer height in pixels
   */
  static getOuterHeight(el: HTMLElement, includeMargin = false): number {
    if (!el) return 0;
    
    let height = el.offsetHeight;
    
    if (includeMargin) {
      const style = getComputedStyle(el);
      height += parseFloat(style.marginTop) + parseFloat(style.marginBottom);
    }
    
    return height;
  }

  /**
   * Get the index of an element among its siblings
   * @param el - The HTML element
   * @returns The zero-based index of the element
   */
  static index(el: HTMLElement): number {
    if (!el || !el.parentNode) return -1;
    
    const children = Array.from(el.parentNode.children);
    return children.indexOf(el);
  }

  /**
   * Get the index of an element among siblings with a specific attribute
   * @param el - The HTML element
   * @param attributeName - The attribute name to filter siblings
   * @returns The zero-based index among matching siblings
   */
  static indexWithinGroup(el: HTMLElement, attributeName: string): number {
    if (!el || !el.parentNode) return -1;
    
    const children = Array.from(el.parentNode.children).filter(
      child => child.hasAttribute(attributeName)
    );
    return children.indexOf(el);
  }

  /**
   * Add a CSS class to an element
   * @param el - The HTML element
   * @param className - The class name to add
   */
  static addClass(el: HTMLElement, className: string): void {
    if (!el || !className) return;
    
    if (el.classList) {
      el.classList.add(className);
    } else {
      el.className += ' ' + className;
    }
  }

  /**
   * Remove a CSS class from an element
   * @param el - The HTML element
   * @param className - The class name to remove
   */
  static removeClass(el: HTMLElement, className: string): void {
    if (!el || !className) return;
    
    if (el.classList) {
      el.classList.remove(className);
    } else {
      el.className = el.className.replace(
        new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'),
        ' '
      );
    }
  }

  /**
   * Check if an element has a specific CSS class
   * @param el - The HTML element
   * @param className - The class name to check
   * @returns True if the element has the class
   */
  static hasClass(el: HTMLElement, className: string): boolean {
    if (!el || !className) return false;
    
    if (el.classList) {
      return el.classList.contains(className);
    }
    return new RegExp('(^| )' + className + '( |$)', 'gi').test(el.className);
  }

  /**
   * Find a single element matching a selector within a parent
   * @param el - The parent element
   * @param selector - The CSS selector
   * @returns The matching element or null
   */
  static findSingle(el: HTMLElement, selector: string): HTMLElement | null {
    if (!el) return null;
    return el.querySelector(selector);
  }

  /**
   * Find all elements matching a selector within a parent
   * @param el - The parent element
   * @param selector - The CSS selector
   * @returns Array of matching elements
   */
  static find(el: HTMLElement, selector: string): HTMLElement[] {
    if (!el) return [];
    return Array.from(el.querySelectorAll(selector));
  }

  /**
   * Get the computed style of an element
   * @param el - The HTML element
   * @param property - Optional CSS property name
   * @returns The computed style or specific property value
   */
  static getComputedStyle(el: HTMLElement, property?: string): CSSStyleDeclaration | string {
    const style = window.getComputedStyle(el);
    return property ? style.getPropertyValue(property) : style;
  }

  /**
   * Check if the current device is a touch device
   * @returns True if touch is supported
   */
  static isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /**
   * Get the width of the browser viewport
   * @returns The viewport width in pixels
   */
  static getViewportWidth(): number {
    return Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  }

  /**
   * Get the height of the browser viewport
   * @returns The viewport height in pixels
   */
  static getViewportHeight(): number {
    return Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
  }

  /**
   * Set an attribute on an element
   * @param el - The HTML element
   * @param name - The attribute name
   * @param value - The attribute value
   */
  static setAttribute(el: HTMLElement, name: string, value: string): void {
    if (el) {
      el.setAttribute(name, value);
    }
  }

  /**
   * Get an attribute value from an element
   * @param el - The HTML element
   * @param name - The attribute name
   * @returns The attribute value or null
   */
  static getAttribute(el: HTMLElement, name: string): string | null {
    if (!el) return null;
    return el.getAttribute(name);
  }

  /**
   * Remove an attribute from an element
   * @param el - The HTML element
   * @param name - The attribute name
   */
  static removeAttribute(el: HTMLElement, name: string): void {
    if (el) {
      el.removeAttribute(name);
    }
  }

  /**
   * Clear text selection in the document
   */
  static clearSelection(): void {
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  }

  /**
   * Get the scroll position of an element or window
   * @param el - Optional element (defaults to window)
   * @returns Object with scrollTop and scrollLeft values
   */
  static getScrollPosition(el?: HTMLElement): { scrollTop: number; scrollLeft: number } {
    if (el) {
      return {
        scrollTop: el.scrollTop,
        scrollLeft: el.scrollLeft
      };
    }
    
    return {
      scrollTop: window.scrollY || document.documentElement.scrollTop,
      scrollLeft: window.scrollX || document.documentElement.scrollLeft
    };
  }

  /**
   * Check if the document direction is RTL (Right-to-Left)
   * @param el - Optional element to check (defaults to document)
   * @returns True if RTL direction
   */
  static isRTL(el?: HTMLElement): boolean {
    const target = el || document.documentElement;
    return getComputedStyle(target).direction === 'rtl';
  }

  /**
   * Get all siblings of an element
   * @param el - The HTML element
   * @returns Array of sibling elements
   */
  static siblings(el: HTMLElement): HTMLElement[] {
    if (!el || !el.parentNode) return [];
    
    return Array.from(el.parentNode.children).filter(
      child => child !== el
    ) as HTMLElement[];
  }

  /**
   * Get the next sibling element
   * @param el - The HTML element
   * @returns The next sibling element or null
   */
  static getNextElementSibling(el: HTMLElement): HTMLElement | null {
    return el.nextElementSibling as HTMLElement | null;
  }

  /**
   * Get the previous sibling element
   * @param el - The HTML element
   * @returns The previous sibling element or null
   */
  static getPreviousElementSibling(el: HTMLElement): HTMLElement | null {
    return el.previousElementSibling as HTMLElement | null;
  }

  /**
   * Append a child element to a parent
   * @param parent - The parent element
   * @param child - The child element to append
   */
  static appendChild(parent: HTMLElement, child: HTMLElement): void {
    if (parent && child) {
      parent.appendChild(child);
    }
  }

  /**
   * Remove an element from its parent
   * @param el - The element to remove
   */
  static removeElement(el: HTMLElement): void {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }

  /**
   * Calculate the width of the browser scrollbar
   * @returns The scrollbar width in pixels
   */
  static calculateScrollbarWidth(): number {
    if (typeof window === 'undefined') return 0;
    
    const scrollDiv = document.createElement('div');
    scrollDiv.style.cssText = 'width:100px;height:100px;overflow:scroll;position:absolute;top:-9999px;';
    document.body.appendChild(scrollDiv);
    const scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
    document.body.removeChild(scrollDiv);
    
    return scrollbarWidth;
  }

  /**
   * Focus an element with an optional delay
   * @param el - The element to focus
   * @param delay - Optional delay in milliseconds
   */
  static focus(el: HTMLElement, delay = 0): void {
    if (!el) return;
    
    if (delay > 0) {
      setTimeout(() => el.focus(), delay);
    } else {
      el.focus();
    }
  }

  /**
   * Check if an element is visible in the DOM
   * @param el - The HTML element
   * @returns True if the element is visible
   */
  static isVisible(el: HTMLElement): boolean {
    if (!el) return false;
    
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }
}
