/**
 * Example: Using SimpleTableV2Component with FilterableDataSource
 * 
 * This example shows how to migrate from the original SimpleTableComponent
 * to SimpleTableV2Component using the existing ProductLineDataSource.
 */

import { Component, OnInit } from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import { SimpleTableV2Component } from '../simple-table-v2.component';
import { TableConfig, TableColumnDef } from '../models/column-def.model';
import { ProductLineDataSource, ProductLineSearchObject } from 'src/app/pages/product-line/search/search-paginable-product-line-data-source';
import { SearchService, ProductLineSearch } from 'src/app/shared/services/search/search-service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-product-line-search-example',
  template: `
    <div class="search-container">
      <!-- Search Form -->
      <div class="search-form">
        <button mat-raised-button color="primary" (click)="search()">
          {{ 'COMMON.SEARCH' | translate }}
        </button>
      </div>

      <!-- Table -->
      <app-simple-table-v2
        [data]="dataSource"
        [config]="tableConfig"
        [selection]="selection"
        [debug]="true"
        (hyperlinkClick)="onHyperlinkClick($event)">
      </app-simple-table-v2>
    </div>
  `,
  standalone: true,
  imports: [SimpleTableV2Component],
})
export class ProductLineSearchExampleComponent implements OnInit {
  // Data source (FilterableDataSource)
  dataSource!: ProductLineDataSource;

  // Selection model
  selection = new SelectionModel<ProductLineSearchObject>(true, []);

  // Table configuration
  tableConfig: TableConfig<ProductLineSearchObject> = {
    id: 'product-line-search',
    columns: this.buildColumns(),
    features: {
      sort: true,
      pagination: true,
      selection: true,
    },
    defaultPageSize: 1000,
    pageSizeOptions: [100, 200, 500, 1000, 2000, 5000],
    stickyHeader: true,
  };

  constructor(
    private searchService: SearchService,
    private snackBar: MatSnackBar,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    // Initialize FilterableDataSource
    this.dataSource = new ProductLineDataSource(
      this.searchService,
      this.snackBar,
      this.translate
    );
    
    // Set initial filter to trigger first load
    this.dataSource.filterSubject.next({
      name: '',
      description: '',
      language: '',
      confidential: false,
    } as ProductLineSearch);
  }

  search(): void {
    // Update filter to trigger new search
    this.dataSource.filterSubject.next({
      name: 'test',
      description: '',
      language: '',
      confidential: false,
    } as ProductLineSearch);
  }

  onHyperlinkClick(event: { row: ProductLineSearchObject; column: string }): void {
    console.log('Hyperlink clicked:', event);
    // Navigate to product line detail page
    // this.router.navigate(['/product-line', event.row.id]);
  }

  private buildColumns(): TableColumnDef<ProductLineSearchObject>[] {
    return [
      {
        id: 'name',
        header: 'PAGES.PRODUCT_LINE.SEARCH.LABELS.LABEL_NAME',
        type: 'link',
        sortable: true,
        sticky: 'start',
        accessor: (row) => row.name,
      },
      {
        id: 'description',
        header: 'PAGES.PRODUCT_LINE.SEARCH.LABELS.LABEL_DESCRIPTION',
        type: 'text',
        sortable: true,
        accessor: (row) => row.description,
        tooltip: true,
      },
      {
        id: 'language',
        header: 'PAGES.PRODUCT_LINE.SEARCH.LABELS.LABEL_LANGUAGE',
        type: 'text',
        sortable: true,
        accessor: (row) => row.language,
      },
      {
        id: 'type',
        header: 'PAGES.PRODUCT_LINE.SEARCH.LABELS.LABEL_TYPE',
        type: 'text',
        sortable: true,
        accessor: (row) => row.type,
      },
      {
        id: 'scope',
        header: 'PAGES.PRODUCT_LINE.SEARCH.LABELS.LABEL_SCOPE',
        type: 'text',
        sortable: false, // Scope has complex multi-line format
        accessor: (row) => row.scope,
        tooltip: true,
      },
      {
        id: 'confidentialitytEndDate',
        header: 'PAGES.PRODUCT_LINE.SEARCH.LABELS.LABEL_CONFIDENTIALITY_END_DATE',
        type: 'date',
        sortable: true,
        accessor: (row) => row.confidentialitytEndDate,
        formatter: (value) => value ? new Date(value).toLocaleDateString() : '',
      },
    ];
  }
}
