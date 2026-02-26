# Gestion des Erreurs avec RxJS

## catchError : Gestion dans le Pipeline

### Pattern de Base

```ts
import { EMPTY, catchError, throwError, of } from 'rxjs';

@Component({...})
export class ErrorHandlingComponent {
  private destroyRef = inject(DestroyRef);
  private notificationService = inject(NotificationService);

  saveData(payload: Data): void {
    this.service.save(payload)
      .pipe(
        catchError(err => {
          this.notificationService.showError('Sauvegarde KO', err?.code);
          return EMPTY; // Arrête le stream silencieusement
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.notificationService.showSuccess('Sauvegarde OK');
      });
  }
}
```

## Stratégies de Gestion d'Erreur

### 1. EMPTY : Arrêter le stream silencieusement

```ts
this.service.getData()
  .pipe(
    catchError(err => {
      console.error('Erreur lors du chargement:', err);
      this.showErrorMessage(err);
      return EMPTY; // Complete le stream sans valeur
    }),
    takeUntilDestroyed(this.destroyRef)
  )
  .subscribe(data => this.data = data); // Ne sera pas appelé en cas d'erreur
```

### 2. of() : Fournir une valeur par défaut

```ts
this.userService.getUserPreferences()
  .pipe(
    catchError(err => {
      console.error('Impossible de charger les préférences:', err);
      return of(this.getDefaultPreferences()); // Retourne des préférences par défaut
    }),
    takeUntilDestroyed(this.destroyRef)
  )
  .subscribe(preferences => this.applyPreferences(preferences));
```

### 3. throwError : Propager l'erreur au subscriber

```ts
this.service.criticalOperation()
  .pipe(
    catchError(err => {
      console.error('Erreur critique:', err);
      this.logError(err);
      return throwError(() => new Error(`Opération critique échouée: ${err.message}`));
    }),
    takeUntilDestroyed(this.destroyRef)
  )
  .subscribe({
    next: result => this.handleSuccess(result),
    error: err => this.handleCriticalError(err) // Sera appelé
  });
```

## Retry avec Backoff

### retry : Réessayer automatiquement

```ts
import { retry, timer } from 'rxjs';

@Component({...})
export class RetryComponent {
  private destroyRef = inject(DestroyRef);

  loadData(): void {
    this.service.getData()
      .pipe(
        retry({
          count: 3,
          delay: 1000 // Attend 1s entre chaque tentative
        }),
        catchError(err => {
          this.showError('Échec après 3 tentatives');
          return of([]); // Valeur par défaut
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(data => this.data = data);
  }
}
```

### retryWhen : Retry avec logique personnalisée

```ts
import { retryWhen, delayWhen, tap, take } from 'rxjs';

@Component({...})
export class RetryWithBackoffComponent {
  private destroyRef = inject(DestroyRef);

  loadDataWithBackoff(): void {
    this.service.getData()
      .pipe(
        retryWhen(errors => 
          errors.pipe(
            tap(err => console.log('Erreur, nouvelle tentative...', err)),
            delayWhen((err, index) => timer(Math.pow(2, index) * 1000)), // Backoff exponentiel
            take(3) // Max 3 tentatives
          )
        ),
        catchError(err => {
          this.showError('Toutes les tentatives ont échoué');
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(data => this.data = data);
  }
}
```

## Gestion d'Erreur par Type

```ts
import { HttpErrorResponse } from '@angular/common/http';

@Component({...})
export class TypedErrorHandlingComponent {
  private destroyRef = inject(DestroyRef);

  loadData(): void {
    this.service.getData()
      .pipe(
        catchError((err: HttpErrorResponse) => {
          switch (err.status) {
            case 401:
              this.router.navigate(['/login']);
              return EMPTY;
            case 403:
              this.showError('Accès refusé');
              return of([]);
            case 404:
              this.showError('Ressource introuvable');
              return of([]);
            case 500:
              this.showError('Erreur serveur');
              return throwError(() => err);
            default:
              this.showError('Une erreur est survenue');
              return EMPTY;
          }
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(data => this.data = data);
  }
}
```

## Erreur dans les Pipelines Complexes

### catchError à différents niveaux

```ts
@Component({...})
export class MultilevelErrorHandlingComponent {
  private destroyRef = inject(DestroyRef);

  loadComplexData(id: string): void {
    this.service.getMainData(id)
      .pipe(
        // Erreur au niveau principal
        catchError(err => {
          this.showError('Impossible de charger les données principales');
          return throwError(() => err);
        }),
        switchMap(mainData => 
          this.service.getDetails(mainData.id).pipe(
            // Erreur au niveau des détails - fournir valeur par défaut
            catchError(err => {
              console.warn('Détails non disponibles:', err);
              return of({ details: 'Non disponible' });
            }),
            map(details => ({ mainData, details }))
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ mainData, details }) => {
          this.mainData = mainData;
          this.details = details;
        },
        error: err => {
          this.handleFatalError(err);
        }
      });
  }
}
```

## finalize : Exécuter du code après succès OU erreur

```ts
@Component({...})
export class FinalizeComponent {
  private destroyRef = inject(DestroyRef);
  loading = false;

  loadData(): void {
    this.loading = true;
    
    this.service.getData()
      .pipe(
        catchError(err => {
          this.showError(err.message);
          return of([]);
        }),
        finalize(() => {
          this.loading = false; // Exécuté dans tous les cas
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(data => this.data = data);
  }
}
```

## Pattern Complet : Loading + Error + Success

```ts
@Component({...})
export class CompletePatternComponent {
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  
  data: Data[] = [];
  loading = false;
  error: string | null = null;

  loadData(): void {
    this.loading = true;
    this.error = null;
    
    this.dataService.getData()
      .pipe(
        catchError(err => {
          this.error = err.message || 'Une erreur est survenue';
          return of([]);
        }),
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: data => {
          this.data = data;
          this.cdr.markForCheck();
        }
      });
  }
}
```

## tapResponse : Helper pour gérer next/error

```ts
import { tapResponse } from '@ngrx/operators';

@Component({...})
export class TapResponseComponent {
  private destroyRef = inject(DestroyRef);

  saveData(payload: Data): void {
    this.service.save(payload)
      .pipe(
        tapResponse(
          result => {
            this.showSuccess('Sauvegarde réussie');
            this.onSaveSuccess(result);
          },
          err => {
            this.showError('Erreur lors de la sauvegarde');
            console.error(err);
          }
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(); // Pas besoin de handlers ici
  }
}
```

## Erreurs dans les Boucles (forkJoin)

```ts
@Component({...})
export class ParallelErrorHandlingComponent {
  private destroyRef = inject(DestroyRef);

  loadMultipleItems(ids: string[]): void {
    // Si UNE requête échoue, forkJoin échoue complètement
    // Solution : catchError individuel
    const requests = ids.map(id => 
      this.service.getById(id).pipe(
        catchError(err => {
          console.warn(`Impossible de charger l'item ${id}:`, err);
          return of(null); // Retourne null pour les items en erreur
        })
      )
    );

    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(results => {
        this.items = results.filter(item => item !== null); // Filtre les erreurs
      });
  }
}
```

## Best Practices

1. **Toujours utiliser catchError** dans les pipelines HTTP
2. **catchError avant takeUntilDestroyed** dans le pipe
3. **finalize pour le cleanup** (loading = false, etc.)
4. **tapResponse** pour la simplicité avec @ngrx/operators
5. **catchError individuel** dans forkJoin pour éviter l'échec total
6. **of() pour valeurs par défaut**, EMPTY pour arrêter, throwError pour propager
