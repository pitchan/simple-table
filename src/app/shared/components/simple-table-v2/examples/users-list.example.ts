/**
 * Example: Using SimpleTableV2Component with simple array data
 * 
 * This example shows how to use SimpleTableV2Component with a simple array
 * using the ArrayTableStrategy (client-side sorting/pagination).
 */

import { Component } from '@angular/core';
import { SimpleTableV2Component } from '../simple-table-v2.component';
import { TableConfig, TableColumnDef } from '../models/column-def.model';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  lastLogin: Date;
}

@Component({
  selector: 'app-users-list-example',
  template: `
    <div class="users-container">
      <h2>Users List (Array Data Example)</h2>
      
      <app-simple-table-v2
        [data]="users"
        [config]="tableConfig"
        [debug]="true"
        (rowClick)="onRowClick($event)"
        (hyperlinkClick)="onUserClick($event)">
      </app-simple-table-v2>
    </div>
  `,
  standalone: true,
  imports: [SimpleTableV2Component],
})
export class UsersListExampleComponent {
  // Simple array data (uses ArrayTableStrategy)
  users: User[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'Admin',
      status: 'active',
      lastLogin: new Date('2024-01-15'),
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      role: 'User',
      status: 'active',
      lastLogin: new Date('2024-01-14'),
    },
    {
      id: '3',
      name: 'Bob Johnson',
      email: 'bob.johnson@example.com',
      role: 'User',
      status: 'inactive',
      lastLogin: new Date('2024-01-10'),
    },
  ];

  tableConfig: TableConfig<User> = {
    id: 'users-list',
    columns: this.buildColumns(),
    features: {
      sort: true,
      pagination: true,
    },
    defaultPageSize: 10,
    pageSizeOptions: [5, 10, 25, 50],
    stickyHeader: true,
    responsive: true,
  };

  onRowClick(user: User): void {
    console.log('Row clicked:', user);
  }

  onUserClick(event: { row: User; column: string }): void {
    console.log('User link clicked:', event);
    // Navigate to user detail page
  }

  private buildColumns(): TableColumnDef<User>[] {
    return [
      {
        id: 'name',
        header: 'Name',
        type: 'link',
        sortable: true,
        sticky: 'start',
        accessor: (row) => row.name,
      },
      {
        id: 'email',
        header: 'Email',
        type: 'text',
        sortable: true,
        accessor: (row) => row.email,
      },
      {
        id: 'role',
        header: 'Role',
        type: 'badge',
        sortable: true,
        accessor: (row) => row.role,
      },
      {
        id: 'status',
        header: 'Status',
        type: 'badge',
        sortable: true,
        accessor: (row) => row.status,
        formatter: (value) => value === 'active' ? '✓ Active' : '✗ Inactive',
      },
      {
        id: 'lastLogin',
        header: 'Last Login',
        type: 'date',
        sortable: true,
        accessor: (row) => row.lastLogin,
        sortAccessor: (row) => row.lastLogin.getTime(),
        formatter: (value: Date) => value.toLocaleDateString(),
      },
      {
        id: 'actions',
        header: 'Actions',
        type: 'button',
        sortable: false,
        actions: [
          {
            kind: 'button',
            icon: 'edit',
            label: 'Edit',
            handlerId: 'edit',
          },
          {
            kind: 'button',
            icon: 'delete',
            label: 'Delete',
            handlerId: 'delete',
          },
        ],
      },
    ];
  }
}
