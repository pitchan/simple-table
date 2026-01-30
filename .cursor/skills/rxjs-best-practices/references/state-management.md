# State Management avec RxJS

## Service avec BehaviorSubject

### Pattern Complet

```ts
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProductLineStateService implements OnDestroy {
  // ✅ BehaviorSubject privé avec valeur initiale
  private readonly _productLine$ = new BehaviorSubject<ProductLine | null>(null);
  private readonly _loading$ = new BehaviorSubject<boolean>(false);
  private readonly _error$ = new BehaviorSubject<string | null>(null);

  // ✅ Observables publics en lecture seule
  readonly productLine$: Observable<ProductLine | null> = this._productLine$.asObservable();
  readonly loading$: Observable<boolean> = this._loading$.asObservable();
  readonly error$: Observable<string | null> = this._error$.asObservable();

  // ✅ Getter synchrone si nécessaire
  get currentProductLine(): ProductLine | null {
    return this._productLine$.getValue();
  }

  // Methods
  setProductLine(productLine: ProductLine): void {
    this._productLine$.next(productLine);
    this._error$.next(null);
  }

  setLoading(loading: boolean): void {
    this._loading$.next(loading);
  }

  setError(error: string): void {
    this._error$.next(error);
  }

  clearError(): void {
    this._error$.next(null);
  }

  reset(): void {
    this._productLine$.next(null);
    this._loading$.next(false);
    this._error$.next(null);
  }

  ngOnDestroy(): void {
    // ✅ OBLIGATOIRE - Compléter tous les subjects
    this._productLine$.complete();
    this._loading$.complete();
    this._error$.complete();
  }
}
```

## Service avec Actions Async

```ts
@Injectable({ providedIn: 'root' })
export class DataStateService implements OnDestroy {
  private destroyRef = inject(DestroyRef);
  private httpService = inject(DataHttpService);
  
  private readonly _data$ = new BehaviorSubject<Data[]>([]);
  private readonly _selectedId$ = new BehaviorSubject<string | null>(null);
  private readonly _loading$ = new BehaviorSubject<boolean>(false);

  readonly data$ = this._data$.asObservable();
  readonly selectedId$ = this._selectedId$.asObservable();
  readonly loading$ = this._loading$.asObservable();

  // Computed observable : selected item
  readonly selectedItem$ = combineLatest([
    this.data$,
    this.selectedId$
  ]).pipe(
    map(([data, id]) => data.find(item => item.id === id) ?? null)
  );

  loadData(): void {
    this._loading$.next(true);
    
    this.httpService.getData()
      .pipe(
        finalize(() => this._loading$.next(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: data => this._data$.next(data),
        error: err => console.error('Load error:', err)
      });
  }

  selectItem(id: string): void {
    this._selectedId$.next(id);
  }

  addItem(item: Data): void {
    const current = this._data$.getValue();
    this._data$.next([...current, item]);
  }

  updateItem(id: string, updates: Partial<Data>): void {
    const current = this._data$.getValue();
    this._data$.next(
      current.map(item => item.id === id ? { ...item, ...updates } : item)
    );
  }

  removeItem(id: string): void {
    const current = this._data$.getValue();
    this._data$.next(current.filter(item => item.id !== id));
  }

  ngOnDestroy(): void {
    this._data$.complete();
    this._selectedId$.complete();
    this._loading$.complete();
  }
}
```

## Utilisation dans les Components

### Avec async pipe (Recommandé)

```ts
@Component({
  selector: 'app-product-list',
  template: `
    <div *ngIf="loading$ | async; else content">
      <mat-spinner></mat-spinner>
    </div>
    
    <ng-template #content>
      <div *ngIf="error$ | async as error" class="error">
        {{ error }}
      </div>
      
      <div *ngIf="productLine$ | async as productLine">
        <h2>{{ productLine.name }}</h2>
        <p>{{ productLine.description }}</p>
      </div>
    </ng-template>
  `
})
export class ProductListComponent {
  // ✅ Expose directement pour async pipe (pas de subscription manuelle)
  productLine$ = this.stateService.productLine$;
  loading$ = this.stateService.loading$;
  error$ = this.stateService.error$;

  constructor(private stateService: ProductLineStateService) {}

  refresh(): void {
    this.stateService.loadData();
  }
}
```

### Avec subscription (si nécessaire)

```ts
@Component({...})
export class ProductDetailComponent {
  private destroyRef = inject(DestroyRef);
  private stateService = inject(ProductLineStateService);
  
  productLine: ProductLine | null = null;

  ngOnInit(): void {
    // ✅ Avec takeUntilDestroyed pour le cleanup
    this.stateService.productLine$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(productLine => {
        this.productLine = productLine;
        this.cdr.markForCheck();
      });
  }
}
```

## ReplaySubject : Rejouer les N dernières valeurs

```ts
@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  // ReplaySubject garde les 5 dernières notifications
  private readonly _notifications$ = new ReplaySubject<Notification>(5);
  readonly notifications$ = this._notifications$.asObservable();

  notify(message: string, type: 'info' | 'success' | 'error'): void {
    this._notifications$.next({ message, type, timestamp: Date.now() });
  }

  ngOnDestroy(): void {
    this._notifications$.complete();
  }
}
```

## AsyncSubject : Valeur finale uniquement

```ts
@Injectable({ providedIn: 'root' })
export class ConfigLoaderService implements OnDestroy {
  // AsyncSubject émet uniquement la dernière valeur quand complete() est appelé
  private readonly _config$ = new AsyncSubject<Config>();
  readonly config$ = this._config$.asObservable();

  loadConfig(): void {
    this.http.get<Config>('/api/config').subscribe({
      next: config => {
        this._config$.next(config);
        this._config$.complete(); // Émet maintenant la valeur
      },
      error: err => this._config$.error(err)
    });
  }

  ngOnDestroy(): void {
    if (!this._config$.closed) {
      this._config$.complete();
    }
  }
}
```

## Pattern Facade : Combiner plusieurs sources

```ts
@Injectable({ providedIn: 'root' })
export class DashboardFacadeService {
  private userService = inject(UserService);
  private statisticsService = inject(StatisticsService);
  private notificationService = inject(NotificationService);

  // ✅ Combine plusieurs sources en un seul état
  readonly dashboardState$ = combineLatest({
    user: this.userService.currentUser$,
    stats: this.statisticsService.stats$,
    notifications: this.notificationService.recent$
  }).pipe(
    map(({ user, stats, notifications }) => ({
      userName: user.name,
      totalItems: stats.total,
      unreadCount: notifications.filter(n => !n.read).length,
      recentNotifications: notifications.slice(0, 5)
    })),
    shareReplay({ bufferSize: 1, refCount: true })
  );
}

// Usage dans component
@Component({
  template: `
    <div *ngIf="dashboard$ | async as dashboard">
      <h1>Bonjour {{ dashboard.userName }}</h1>
      <p>Total : {{ dashboard.totalItems }}</p>
      <p>Non lus : {{ dashboard.unreadCount }}</p>
    </div>
  `
})
export class DashboardComponent {
  dashboard$ = this.facade.dashboardState$;

  constructor(private facade: DashboardFacadeService) {}
}
```

## Computed Values avec distinctUntilChanged

```ts
@Injectable({ providedIn: 'root' })
export class CartService implements OnDestroy {
  private readonly _items$ = new BehaviorSubject<CartItem[]>([]);
  readonly items$ = this._items$.asObservable();

  // ✅ Valeurs calculées avec distinctUntilChanged
  readonly totalPrice$ = this.items$.pipe(
    map(items => items.reduce((sum, item) => sum + item.price * item.quantity, 0)),
    distinctUntilChanged() // N'émet que si le total change
  );

  readonly itemCount$ = this.items$.pipe(
    map(items => items.reduce((sum, item) => sum + item.quantity, 0)),
    distinctUntilChanged()
  );

  readonly isEmpty$ = this.items$.pipe(
    map(items => items.length === 0),
    distinctUntilChanged()
  );

  addItem(item: CartItem): void {
    const current = this._items$.getValue();
    const existing = current.find(i => i.id === item.id);
    
    if (existing) {
      this.updateQuantity(item.id, existing.quantity + item.quantity);
    } else {
      this._items$.next([...current, item]);
    }
  }

  updateQuantity(id: string, quantity: number): void {
    const current = this._items$.getValue();
    this._items$.next(
      current.map(item => 
        item.id === id ? { ...item, quantity } : item
      )
    );
  }

  clear(): void {
    this._items$.next([]);
  }

  ngOnDestroy(): void {
    this._items$.complete();
  }
}
```

## Store avec Actions (Redux-like sans NgRx)

```ts
interface AppState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class SimpleStoreService implements OnDestroy {
  private readonly _state$ = new BehaviorSubject<AppState>({
    user: null,
    loading: false,
    error: null
  });

  // Selectors
  readonly state$ = this._state$.asObservable();
  readonly user$ = this.state$.pipe(map(state => state.user), distinctUntilChanged());
  readonly loading$ = this.state$.pipe(map(state => state.loading), distinctUntilChanged());
  readonly error$ = this.state$.pipe(map(state => state.error), distinctUntilChanged());

  // Helpers privés
  private setState(updates: Partial<AppState>): void {
    const current = this._state$.getValue();
    this._state$.next({ ...current, ...updates });
  }

  // Actions
  setUser(user: User): void {
    this.setState({ user, error: null });
  }

  setLoading(loading: boolean): void {
    this.setState({ loading });
  }

  setError(error: string): void {
    this.setState({ error, loading: false });
  }

  clearError(): void {
    this.setState({ error: null });
  }

  reset(): void {
    this._state$.next({ user: null, loading: false, error: null });
  }

  ngOnDestroy(): void {
    this._state$.complete();
  }
}
```

## Best Practices

1. **BehaviorSubject privé**, Observable public
2. **Toujours compléter les Subjects** dans ngOnDestroy
3. **asObservable()** pour empêcher l'accès à .next() de l'extérieur
4. **Immutabilité** : créer de nouveaux objets/tableaux lors des updates
5. **distinctUntilChanged()** pour éviter les émissions redondantes
6. **shareReplay()** pour les computed values coûteux
7. **Préférer async pipe** aux subscriptions manuelles
8. **combineLatest** pour composer plusieurs sources
