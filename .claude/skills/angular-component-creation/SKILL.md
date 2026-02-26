---
name: angular-component-onpush-skeleton
description: 'Minimal OnPush Angular component skeleton with safe RxJS subscription management and markForCheck() usage'
---

# Angular OnPush component skeleton

This skill provides a minimal template for creating performant Angular components with proper change detection strategy.

## When to use this skill

Use this skill when you need to:
- Create new Angular components
- Implement OnPush change detection strategy
- Set up components with RxJS subscriptions
- Fix performance issues related to change detection

# Instructions

All new components should use `ChangeDetectionStrategy.OnPush` for better performance. When subscribing to observables, always terminate the stream with `takeUntilDestroyed` and call `cdr.markForCheck()` after updating component state:

```ts
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-my-component',
  templateUrl: './my-component.component.html',
  styleUrls: ['./my-component.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyComponent {
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  data: unknown[] = [];

  constructor(private service: MyService) {
    this.service.getData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => {
        this.data = data;
        this.cdr.markForCheck();
      });
  }
}
```

**Anti-patterns to avoid:**
- Using `detectChanges()` (except for very specific justified cases)
- Subscribing in loops or nested subscriptions

## Service Creation Workflow

### Step 1: Generate Injectable Service
```bash
ng g s shared/services/my-service/my-service
```

### Step 2: Service Template
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MyServiceService {
  
  constructor(private http: HttpClient) {}
  
  getData(): Observable<MyData> {
    return this.http.get<MyData>('/api/data').pipe(
      catchError(error => {
        console.error('Error fetching data', error);
        return throwError(() => error);
      })
    );
  }
}
```

## Authorization Pattern (Reusable)

### Instead of duplicating this code in 12+ components:
```typescript
// ❌ DON'T copy-paste this everywhere
let isUserAffectedToProductLine = false;
const affectedCodifiers = this.responsabilities?.codifiers?.map((c) => c.name) ?? [];
isUserAffectedToProductLine = affectedCodifiers.some((codifier) => codifier === this.userData.username);
this.authorized = isAdmin(user.userData.roles) || (isCodifier(user.userData.roles) && isUserAffectedToProductLine);
```

### Use the centralized permission helpers:
```typescript
// ✅ CORRECT - Use existing helpers
import { isAdmin, isCodifier, isAdminAndWriter } from 'src/app/shared/permissions/permissions';

// Simple role check
if (isAdmin(this.userData.roles)) {
  // admin actions
}

// Combined check
if (isAdminAndWriter(this.userData.roles)) {
  // write actions
}
```

## Notification Pattern (Reusable)

### Instead of duplicating openSnackBar in 30+ components:
```typescript
// ❌ DON'T copy-paste this method
openSnackBar(type: any, message: string, code?: string): void {
  this._snackBar.openFromComponent(ToastComponent, {
    data: { title: type, message: message, code: code ?? "" },
    duration: environment.toast_duration,
    // ...
  });
}
```

### Use MatSnackBar directly with ToastComponent:
```typescript
// ✅ CORRECT - Direct usage (waiting for NotificationService)
import { MatSnackBar } from '@angular/material/snack-bar';
import { ToastComponent } from 'src/app/shared/components/toast/toast.component';
import { environment } from 'src/environments/environment';

constructor(private snackBar: MatSnackBar) {}

showSuccess(message: string, code?: string) {
  this.snackBar.openFromComponent(ToastComponent, {
    data: { title: 'success', message, code: code ?? '' },
    duration: environment.toast_duration,
    horizontalPosition: 'right',
    verticalPosition: 'bottom',
    panelClass: 'gcm-snackbar-success'
  });
}

showError(message: string, code?: string) {
  this.snackBar.openFromComponent(ToastComponent, {
    data: { title: 'error', message, code: code ?? '' },
    duration: environment.toast_duration,
    horizontalPosition: 'right',
    verticalPosition: 'bottom',
    panelClass: 'gcm-snackbar-error'
  });
}
```

## Dialog Pattern (Reusable)

### Instead of repeating dialog opening code 40+ times:
```typescript
// ✅ CORRECT - Consistent dialog pattern
import { DialogService } from 'src/app/shared/services/dialog/dialog.service';
import { DialogConfirmationComponent } from 'src/app/shared/components/dialog-confirmation/dialog-confirmation.component';
import { take } from 'rxjs';

constructor(private dialogService: DialogService) {}

confirmDelete(itemName: string) {
  const ref = this.dialogService.open(DialogConfirmationComponent, {
    data: {
      confirmationTitle: 'Confirmation',
      confirmationInfo: `Êtes-vous sûr de vouloir supprimer ${itemName} ?`,
      confirmationYes: 'Oui',
      confirmationNo: 'Non'
    }
  }, {});
  
  // ⚠️ Use take(1) or takeUntilDestroyed
  ref.afterClosed().pipe(take(1)).subscribe(result => {
    if (result) {
      // Perform deletion
    }
  });
}
```

## Testing Checklist

After creating a component, verify:

1. **Memory leaks check:**
   ```typescript
   // All subscriptions are in the array OR use takeUntilDestroyed
   private subscriptions: Subscription[] = [];
   
   // ngOnDestroy is implemented
   ngOnDestroy(): void {
     this.subscriptions.forEach(sub => sub?.unsubscribe());
   }
   ```

2. **Change detection:**
   ```typescript
   // Component uses OnPush
   changeDetection: ChangeDetectionStrategy.OnPush
   
   // markForCheck() is used instead of detectChanges()
   this.cdr.markForCheck();
   ```

3. **Imports:**
   ```typescript
   // No full lodash import
   // No jQuery usage
   // Specific imports only
   ```

4. **SCSS:**
   ```scss
   // No ::ng-deep without TODO comment
   // No !important outside themes
   // Uses project variables from _constants.scss
   ```

## Pre-Commit Validation

Before committing, run:
```bash
# 1. Lint
npm run lint

# 2. Tests
npm run test

# 3. Check for anti-patterns
# No subscriptions without cleanup
# No new ::ng-deep in SCSS
# No new detectChanges() calls
```

## Common Project Patterns

### Product Line Components Location:
- Rules: `src/app/pages/product-line/product-line-rules/`
- FVC: `src/app/pages/product-line/product-line-fvc-search/`
- Dictionary: `src/app/pages/product-line/product-line-dictionary/`
- Workplan: `src/app/pages/product-line/workplan/`
- Monitoring: `src/app/pages/product-line/monitoring/`

### Shared Components:
- Use existing: `table-tree-view`, `bottom-sheet`, `dialog-confirmation`, `toast`, `dynamic-form`
- ⚠️ DO NOT add business logic to `table-tree-view` (3808 lines already)

### Services Structure:
```
src/app/
├── core/services/           # Singleton app-wide services (auth, config)
└── shared/services/         # Feature services (reusable across features)
```

## Quick Reference

| Need | Solution |
|------|----------|
| Authorization | Use `src/app/shared/permissions/permissions.ts` |
| Notifications | Use `MatSnackBar` + `ToastComponent` |
| Dialogs | Use `DialogService` + `DialogConfirmationComponent` |
| Deep copy | Use `structuredClone()` (native) |
| Date formatting | Use `Intl.DateTimeFormat` or plan for `date-fns` |
| Routing | Import from `src/app/core/routing/` |

## Resources
- See `AUDIT_PERFORMANCE.md` for known performance issues
- See `REUSABLE.md` for code duplication patterns
- See `.github/copilot-instructions.md` for full project guidelines
- See `.github/instructions/css-rules.instructions.md` for SCSS rules
