# Performance et Optimisation RxJS

## HTTP Response Caching avec shareReplay

### Pattern de Base

```ts
@Injectable({ providedIn: 'root' })
export class ConfigService {
  private http = inject(HttpClient);
  
  // ✅ Cache la réponse HTTP, partagée entre tous les subscribers
  private config$ = this.http.get<Config>('/api/config').pipe(
    shareReplay({ bufferSize: 1, refCount: true })
  );

  getConfig(): Observable<Config> {
    return this.config$; // Réutilise la même requête
  }
}
```

**Explication :**
- `bufferSize: 1` : Garde en cache la dernière valeur
- `refCount: true` : Libère le cache quand plus aucun subscriber

### Exemple avec Invalidation

```ts
@Injectable({ providedIn: 'root' })
export class CachedDataService {
  private http = inject(HttpClient);
  private cacheInvalidator$ = new Subject<void>();
  
  // Cache qui se recrée à chaque invalidation
  private data$ = this.cacheInvalidator$.pipe(
    startWith(undefined),
    switchMap(() => this.http.get<Data[]>('/api/data').pipe(
      shareReplay({ bufferSize: 1, refCount: true })
    ))
  );

  getData(): Observable<Data[]> {
    return this.data$;
  }

  invalidateCache(): void {
    this.cacheInvalidator$.next(); // Force un nouveau fetch
  }
}
```

## distinctUntilChanged : Éviter les Émissions Redondantes

### Cas d'Usage Simple

```ts
@Component({...})
export class OptimizedComponent {
  private destroyRef = inject(DestroyRef);
  
  ngOnInit(): void {
    this.userService.currentUser$
      .pipe(
        map(user => user.id),
        distinctUntilChanged(), // N'émet que si l'ID change
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(userId => {
        this.loadUserData(userId); // Appelé seulement si userId change
      });
  }
}
```

### Avec Comparateur Personnalisé

```ts
interface User {
  id: string;
  name: string;
  lastModified: Date;
}

@Component({...})
export class CustomComparatorComponent {
  private destroyRef = inject(DestroyRef);
  
  ngOnInit(): void {
    this.userService.currentUser$
      .pipe(
        // Compare seulement l'ID, ignore les autres changements
        distinctUntilChanged((prev, curr) => prev.id === curr.id),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(user => {
        this.renderUser(user);
      });
  }
}
```

## Optimiser les Listes avec trackBy

### Sans trackBy (Lent)

```ts
@Component({
  template: `
    <!-- ❌ Recrée tous les éléments DOM à chaque changement -->
    <div *ngFor="let item of items$ | async">
      {{ item.name }}
    </div>
  `
})
export class SlowListComponent {
  items$ = this.service.items$;
}
```

### Avec trackBy (Rapide)

```ts
@Component({
  template: `
    <!-- ✅ Met à jour seulement les éléments modifiés -->
    <div *ngFor="let item of items$ | async; trackBy: trackById">
      {{ item.name }}
    </div>
  `
})
export class FastListComponent {
  items$ = this.service.items$;
  
  trackById = (index: number, item: Item) => item.id;
}
```

## auditTime vs debounceTime

### debounceTime : Attendre la fin de l'activité

```ts
@Component({...})
export class SearchComponent {
  private destroyRef = inject(DestroyRef);
  searchControl = new FormControl('');

  ngOnInit(): void {
    // ✅ Attend 300ms après le dernier keystroke
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300), // Parfait pour la recherche
        distinctUntilChanged(),
        switchMap(term => this.searchService.search(term)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(results => this.results = results);
  }
}
```

### auditTime : Échantillonner périodiquement

```ts
@Component({...})
export class ScrollComponent {
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    // ✅ Émet au maximum toutes les 100ms pendant le scroll
    fromEvent(window, 'scroll')
      .pipe(
        auditTime(100), // Plus performant que throttleTime
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.updateScrollPosition();
      });
  }
}
```

## OnPush Change Detection

### Combinaison avec Observables

```ts
@Component({
  selector: 'app-optimized',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- ✅ async pipe déclenche change detection automatiquement -->
    <div *ngIf="data$ | async as data">
      {{ data.name }}
    </div>
  `
})
export class OptimizedComponent {
  data$ = this.service.data$;
}
```

### Avec markForCheck pour subscriptions manuelles

```ts
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div>{{ data?.name }}</div>`
})
export class ManualCheckComponent {
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  
  data: Data | null = null;

  ngOnInit(): void {
    this.service.data$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => {
        this.data = data;
        this.cdr.markForCheck(); // ✅ Déclenche change detection
      });
  }
}
```

## Limiter la Concurrence avec mergeMap

### Sans Limite (Problématique)

```ts
// ❌ Peut lancer 1000 requêtes simultanées
from(items).pipe(
  mergeMap(item => this.http.get(`/api/items/${item.id}`)),
  toArray()
).subscribe(results => console.log(results));
```

### Avec Limite de Concurrence

```ts
// ✅ Maximum 5 requêtes simultanées
from(items).pipe(
  mergeMap(
    item => this.http.get(`/api/items/${item.id}`),
    5 // Concurrence max
  ),
  toArray(),
  takeUntilDestroyed(this.destroyRef)
).subscribe(results => this.results = results);
```

## Unsubscribe Stratégique avec take

### Cas : Premier Résultat Suffisant

```ts
@Component({...})
export class FirstResultComponent {
  loadInitialData(): void {
    // ✅ Se désabonne automatiquement après 1 valeur
    this.service.getData()
      .pipe(take(1))
      .subscribe(data => this.data = data);
  }
}
```

### Cas : N Premières Valeurs

```ts
@Component({...})
export class LimitedResultsComponent {
  private destroyRef = inject(DestroyRef);

  loadRecentNotifications(): void {
    // ✅ Prend seulement les 10 premières notifications
    this.notificationService.stream$
      .pipe(
        take(10),
        toArray(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(notifications => {
        this.notifications = notifications;
      });
  }
}
```

## Batching avec bufferTime

### Grouper les Émissions

```ts
@Injectable({ providedIn: 'root' })
export class BatchedLoggerService {
  private destroyRef = inject(DestroyRef);
  private logSubject = new Subject<LogEntry>();

  constructor() {
    // ✅ Envoie les logs par batch toutes les 5 secondes
    this.logSubject
      .pipe(
        bufferTime(5000),
        filter(logs => logs.length > 0),
        switchMap(logs => this.http.post('/api/logs', logs)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  log(entry: LogEntry): void {
    this.logSubject.next(entry);
  }
}
```

## Lazy Loading avec defer

### Créer l'Observable à la Demande

```ts
@Injectable({ providedIn: 'root' })
export class LazyDataService {
  // ✅ La factory n'est exécutée qu'à la subscription
  getData(): Observable<Data> {
    return defer(() => {
      console.log('Creating observable NOW');
      return this.http.get<Data>('/api/data');
    });
  }
}
```

## Éviter les Fuites avec share

### Problème : Multiples Subscriptions

```ts
// ❌ Crée 2 requêtes HTTP distinctes
const data$ = this.http.get('/api/data');

data$.subscribe(d => console.log('Subscriber 1:', d));
data$.subscribe(d => console.log('Subscriber 2:', d));
```

### Solution : share() ou shareReplay()

```ts
// ✅ Une seule requête HTTP partagée
const data$ = this.http.get('/api/data').pipe(
  shareReplay({ bufferSize: 1, refCount: true })
);

data$.subscribe(d => console.log('Subscriber 1:', d));
data$.subscribe(d => console.log('Subscriber 2:', d));
```

## Memory Profiling

### Vérifier les Memory Leaks

```ts
// En développement, monitorer les subscriptions
@Component({...})
export class MonitoredComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();
  
  ngOnInit(): void {
    console.log('Component created');
    
    this.subscriptions.add(
      this.service.data$.subscribe(data => {
        console.log('Data received');
      })
    );
  }

  ngOnDestroy(): void {
    console.log('Component destroyed');
    this.subscriptions.unsubscribe();
    
    // Vérifier que closed = true
    console.log('Subscriptions closed:', this.subscriptions.closed);
  }
}
```

## Comparaison des Stratégies de Performance

| Technique | Cas d'Usage | Gain de Performance |
|-----------|-------------|---------------------|
| `shareReplay()` | Cache HTTP | Évite requêtes dupliquées |
| `distinctUntilChanged()` | Filtrer redondances | Réduit les calculs/re-renders |
| `debounceTime()` | Input utilisateur | Réduit les appels API |
| `auditTime()` | Events fréquents (scroll) | Limite la fréquence |
| `take(1)` | One-shot observable | Désabonnement immédiat |
| `mergeMap(_, n)` | Requêtes parallèles | Limite la charge serveur |
| `trackBy` | ngFor | Optimise le DOM |
| OnPush | Change detection | Réduit les cycles CD |

## Best Practices

1. **Cache avec `shareReplay()`** pour les données rarement modifiées
2. **`distinctUntilChanged()`** systématiquement sur les streams fréquents
3. **`debounceTime()` pour les inputs** (recherche, filtres)
4. **`auditTime()` pour les events** (scroll, resize, mousemove)
5. **`trackBy` obligatoire** dans les ngFor avec observables
6. **OnPush + async pipe** pour les components purs
7. **Limiter la concurrence** dans `mergeMap` pour les batches
8. **`take(1)` ou `first()`** pour les one-shot observables
