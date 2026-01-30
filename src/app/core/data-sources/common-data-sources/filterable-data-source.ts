import { Observable, Subject } from 'rxjs';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';

export class FilterableDataSource<T, U = unknown, P = MatPaginator> {
  dataToRender$ = new Subject<T[]>();
  dataOfRange$ = new Subject<T[]>();
  loading$ = new Subject<boolean>();
  length$ = new Subject<number>();
  
  paginator?: P;
  sort?: MatSort;

  filterSubject = new Subject<any>();

  constructor(
    private searchService?: any,
    private snackBar?: any,
    private translate?: any
  ) {}

  connect(): Observable<T[]> {
    return this.dataOfRange$.asObservable();
  }

  disconnect(): void {}

  loadPage(): void {}
  
  updateChangeSubscription(): void {}
}
