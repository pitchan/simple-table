import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SimpleTableV2Component } from '../../shared/components/simple-table-v2/simple-table-v2.component';
import { TableColumnDef, TableConfig } from '../../shared/components/simple-table-v2/models/column-def.model';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  lastLogin: Date;
}

@Component({
  selector: 'app-test-table',
  templateUrl: './test-table.component.html',
  styleUrls: ['./test-table.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, SimpleTableV2Component]
})
export class TestTableComponent {
  
  // Données de test inspirées de users-list.example.ts
  users: User[] = [
    {
      id: '1',
      name: 'Vincent (Dev)',
      email: 'vincent@example.com',
      role: 'Admin',
      status: 'active',
      lastLogin: new Date(),
    },
    {
      id: '2',
      name: 'Jean Dupont',
      email: 'jean.dupont@example.com',
      role: 'User',
      status: 'active',
      lastLogin: new Date('2024-01-14'),
    },
    {
      id: '3',
      name: 'Marie Curie',
      email: 'marie.curie@example.com',
      role: 'Manager',
      status: 'inactive',
      lastLogin: new Date('2023-12-25'),
    },
    {
      id: '4',
      name: 'Thomas Anderson',
      email: 'neo@matrix.com',
      role: 'User',
      status: 'active',
      lastLogin: new Date('2024-01-28'),
    },
  ];

  tableConfig: TableConfig<User> = {
    id: 'test-users-table',
    columns: [
      {
        id: 'name',
        header: 'Nom',
        type: 'link', // Test du type link
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
        header: 'Rôle',
        type: 'badge', // Test du type badge
        sortable: true,
        accessor: (row) => row.role,
      },
      {
        id: 'status',
        header: 'Statut',
        type: 'badge',
        sortable: true,
        accessor: (row) => row.status,
        formatter: (value) => value === 'active' ? 'Actif' : 'Inactif',
      },
      {
        id: 'lastLogin',
        header: 'Dernière connexion',
        type: 'date',
        sortable: true,
        accessor: (row) => row.lastLogin,
        sortAccessor: (row) => row.lastLogin.getTime(),
        formatter: (value: Date) => value.toLocaleDateString('fr-FR'),
      },
      {
        id: 'actions',
        header: 'Actions',
        type: 'button',
        sortable: false,
        sticky: 'end',
        actions: [
          {
            kind: 'button',
            icon: 'edit',
            label: 'Éditer',
            handlerId: 'edit'
          },
          {
            kind: 'button',
            icon: 'delete',
            label: 'Supprimer',
            handlerId: 'delete'
          },
        ],
      },
    ],
    features: {
      sort: true,
      pagination: true,
      selection: true // Test de la sélection
    },
    defaultPageSize: 10,
    pageSizeOptions: [5, 10, 25],
    stickyHeader: true,
    responsive: true,
  };

  onRowClick(user: User): void {
    console.log('Ligne cliquée:', user);
  }

  onHyperlinkClick(event: { row: User; column: string }): void {
    console.log('Lien cliqué:', event);
    alert(`Navigation vers l'utilisateur: ${event.row.name}`);
  }
}
