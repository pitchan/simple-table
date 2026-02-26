# Subscription Management - Exemples Détaillés

## Gestion du cycle de vie des subscriptions

### Pattern Principal : takeUntilDestroyed

```ts
import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export class MyComponent {
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    // ✅ Pour les streams infinis (events, subjects, intervals)
    this.longLivingObservable$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => this.handle(value));
  }
}
```

## One-Shot Observables

### take(1) vs first()

```ts
import { take, first } from 'rxjs';

// ✅ Utilisez take(1) quand la valeur est OPTIONNELLE
dialogRef.afterClosed()
  .pipe(take(1))
  .subscribe(result => {
    if (result) this.handleConfirmation();
  });

// ✅ Utilisez first() quand vous ATTENDEZ une valeur (erreur si pas d'émission)
this.store.select(selectUser)
  .pipe(first())
  .subscribe(user => this.user = user);
```

### Exemple Complet : Dialog avec Confirmation

```ts
@Component({...})
export class ConfirmationComponent {
  private destroyRef = inject(DestroyRef);
  private dialog = inject(MatDialog);

  openDeleteDialog(itemId: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: { message: 'Êtes-vous sûr de vouloir supprimer cet élément ?' }
    });

    dialogRef.afterClosed()
      .pipe(take(1)) // Dialog se ferme une seule fois
      .subscribe(confirmed => {
        if (confirmed) {
          this.deleteItem(itemId);
        }
      });
  }

  private deleteItem(id: string): void {
    this.service.delete(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.notificationService.showSuccess('Élément supprimé');
      });
  }
}
```

## Subscription Manuelle avec Cleanup

```ts
@Component({...})
export class ManualSubscriptionComponent implements OnDestroy {
  private subscription = new Subscription();

  ngOnInit(): void {
    // ✅ Ajoutez toutes les subscriptions à l'objet Subscription
    this.subscription.add(
      this.dataService.getData().subscribe(data => this.data = data)
    );

    this.subscription.add(
      this.eventService.events$.subscribe(event => this.handleEvent(event))
    );
  }

  ngOnDestroy(): void {
    // ✅ Unsubscribe de toutes les subscriptions en une fois
    this.subscription.unsubscribe();
  }
}
```

## Pattern avec Subject pour Cleanup

```ts
@Component({...})
export class SubjectCleanupComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.dataService.getData()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.data = data);

    this.eventService.events$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => this.handleEvent(event));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

## Éviter les Memory Leaks

### ❌ Anti-Pattern : Subscription sans Cleanup

```ts
// ❌ INTERDIT - Fuite mémoire garantie
@Component({...})
export class LeakyComponent {
  ngOnInit() {
    // Cette subscription ne sera JAMAIS nettoyée
    this.service.getData().subscribe(data => this.data = data);
    
    // Plusieurs subscriptions = plusieurs fuites
    this.eventService.events$.subscribe(event => this.handleEvent(event));
    this.userService.currentUser$.subscribe(user => this.user = user);
  }
}
```

### ✅ Solution : Toujours utiliser takeUntilDestroyed

```ts
// ✅ CORRECT - Cleanup automatique
@Component({...})
export class CleanComponent {
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    this.service.getData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => this.data = data);
    
    this.eventService.events$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => this.handleEvent(event));
      
    this.userService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(user => this.user = user);
  }
}
```

## Cas Particulier : Subscription dans le Constructor

```ts
@Component({...})
export class ConstructorSubscriptionComponent {
  private destroyRef = inject(DestroyRef);
  
  constructor() {
    // ✅ takeUntilDestroyed fonctionne aussi dans le constructor
    this.service.getData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => this.data = data);
  }
}
```

## Subjects : Toujours Complete

### ❌ Anti-Pattern : Subject jamais complété

```ts
// ❌ INTERDIT - Le Subject n'est jamais complété
@Injectable({ providedIn: 'root' })
export class LeakyService {
  private mySubject = new Subject<string>();
  readonly data$ = this.mySubject.asObservable();
  
  // Pas de ngOnDestroy pour compléter le subject !
}
```

### ✅ Solution : Toujours compléter les Subjects

```ts
// ✅ CORRECT - Subject complété dans ngOnDestroy
@Injectable({ providedIn: 'root' })
export class CleanService implements OnDestroy {
  private mySubject = new Subject<string>();
  readonly data$ = this.mySubject.asObservable();
  
  ngOnDestroy(): void {
    this.mySubject.complete(); // ⚠️ OBLIGATOIRE
  }
}
```

## Combinaison de Plusieurs Sources

```ts
@Component({...})
export class CombinedSourcesComponent {
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    // ✅ combineLatest avec takeUntilDestroyed
    combineLatest([
      this.userService.currentUser$,
      this.settingsService.settings$,
      this.permissionsService.permissions$
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([user, settings, permissions]) => {
        this.initializeWithData(user, settings, permissions);
      });
  }
}
```
