---
applyTo: "**/*.ts"
---

# TypeScript/Angular Rules (GCM GUI)

- Default new components to `ChangeDetectionStrategy.OnPush`.
- RxJS: never leave subscriptions unmanaged; use `takeUntilDestroyed()` (or an existing utility).
- RxJS: never nest `subscribe()`; use operators (`switchMap`, `mergeMap`, etc.).
- Do not subscribe inside loops; use `forkJoin`/`mergeMap`.
- Prefer `markForCheck()`; avoid adding new `detectChanges()`.
- Do not use new `moment`/`jquery` usage and avoid `import * as _ from 'lodash'`.
- Prefer existing shared helpers (permissions/dialog/toast) over duplicating code.
