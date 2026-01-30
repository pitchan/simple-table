---
name: rxjs-best-practices
description: 'Complete RxJS patterns and best practices for Angular: subscription management, error handling, operators usage, anti-patterns to avoid. Use when working with observables, HTTP requests, subscriptions, async operations, memory leaks, or RxJS-related Angular patterns.'
---

# RxJS Best Practices - Complete Guide

A comprehensive skill covering all essential RxJS patterns for Angular development, focusing on memory management, proper error handling, and clean observable pipelines.

## When to Use This Skill

Use this skill when you need to:

- Handle RxJS subscriptions and prevent memory leaks
- Chain dependent asynchronous operations  
- Process multiple parallel HTTP requests
- Implement proper error handling in observable pipelines
- Cache HTTP responses efficiently
- Fix nested subscription patterns ("callback hell")
- Work with one-shot observables (dialogs, route snapshots)
- Manage component lifecycle with observables
- Debug performance issues related to observables

## Prerequisites

- Angular project with RxJS
- Basic understanding of Observables
- Access to `@angular/core/rxjs-interop` for `takeUntilDestroyed`

## Core Principles

### 1. Always Terminate Long-Lived Subscriptions

```ts
import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export class MyComponent {
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    // ✅ For infinite streams (events, subjects, intervals)
    this.longLivingObservable$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => this.handle(value));
  }
}
```

### 2. Handle Errors in the Pipeline

```ts
import { EMPTY, catchError } from 'rxjs';

this.service.save(payload).pipe(
  catchError(err => {
    this.showError('Sauvegarde KO', err?.code);
    return EMPTY; // Stop stream silently
  }),
  takeUntilDestroyed(this.destroyRef)
).subscribe(() => this.showSuccess('Sauvegarde OK'));
```

### 3. Cache HTTP Responses

```ts
@Injectable({ providedIn: 'root' })
export class ConfigService {
  private config$ = this.http.get<Config>('/api/config').pipe(
    shareReplay({ bufferSize: 1, refCount: true })
  );

  getConfig(): Observable<Config> {
    return this.config$; // Multiple subscribers share same HTTP call
  }
}
```

### 4. Flatten Nested Subscriptions

```ts
// ✅ CORRECT - Clean pipeline
this.route.params.pipe(
  switchMap(params => this.service.getById(params.id)),
  switchMap(data => this.relatedService.getData(data.code)),
  takeUntilDestroyed(this.destroyRef)
).subscribe(result => this.result = result);
```

### 5. Complete Subjects

```ts
@Injectable({ providedIn: 'root' })
export class MyService implements OnDestroy {
  private subject = new Subject<string>();
  
  ngOnDestroy(): void {
    this.subject.complete(); // ⚠️ REQUIRED
  }
}
```

## Operator Selection Quick Reference

| Operator | When to Use | Example Use Case |
|----------|-------------|------------------|
| `switchMap` | Cancel previous, use latest | Search, navigation |
| `mergeMap` | Execute all in parallel | Batch data loading |
| `exhaustMap` | Ignore new during execution | Form submission |
| `concatMap` | Sequential execution | Ordered operations |
| `forkJoin` | Wait for all to complete | Parallel HTTP requests |
| `combineLatest` | Latest from multiple streams | Reactive state composition |
| `take(1)` | First emission only | Dialogs, one-time data |
| `distinctUntilChanged` | Skip duplicates | Performance optimization |
| `shareReplay` | Cache and share | HTTP response caching |

## Quick Checklist

Before committing RxJS code, verify:

- [ ] All subscriptions have `takeUntilDestroyed()`, `take(1)`, or proper cleanup
- [ ] No nested subscriptions - use operators instead  
- [ ] No subscriptions inside loops - use `forkJoin`/`mergeMap`
- [ ] All observables have error handling with `catchError`
- [ ] Subjects are completed in `ngOnDestroy`
- [ ] HTTP caching implemented with `shareReplay` when appropriate
- [ ] Async pipe preferred over manual subscriptions in templates

## Detailed Reference Documentation

For comprehensive examples and advanced patterns, refer to:

- **[Subscription Management](./references/subscription-management.md)** - takeUntilDestroyed, cleanup patterns, memory leak prevention
- **[Operators Guide](./references/operators-guide.md)** - switchMap, mergeMap, exhaustMap, forkJoin, combineLatest with detailed examples
- **[Error Handling](./references/error-handling.md)** - catchError strategies, retry patterns, error recovery
- **[State Management](./references/state-management.md)** - BehaviorSubject patterns, facade services, reactive state
- **[Anti-Patterns](./references/anti-patterns.md)** - Common mistakes and how to avoid them
- **[Testing](./references/testing.md)** - Mock observables, fakeAsync, HttpClientTestingModule
- **[Performance](./references/performance.md)** - Caching, optimization, change detection strategies

## External Resources

- [Angular RxJS Interop Documentation](https://angular.dev/ecosystem/rxjs-interop)
- [RxJS Official Documentation](https://rxjs.dev/)
- [Learn RxJS Operators](https://www.learnrxjs.io/)
- [RxJS Marbles - Operator Visualization](https://rxmarbles.com/)