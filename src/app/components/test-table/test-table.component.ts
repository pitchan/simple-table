import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { SimpleTableV2Component } from '../../shared/components/simple-table-v2/simple-table-v2.component';
import { TableConfig } from '../../shared/components/simple-table-v2/models/column-def.model';
import { delay, of } from 'rxjs';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  lastLogin: Date;
  phone: string;
  score: number;
  department: string;
  age: number;
}

/** Données simulées renvoyées par le "serveur" (même structure qu’un GET /api/users). */
const MOCK_SERVER_USERS: User[] = [
  {
    id: '1',
    name: 'Vincent (Dev)',
    email: 'vincent@example.com',
    role: 'Admin',
    status: 'active',
    lastLogin: new Date(),
    phone: '+33 6 12 34 56 78',
    score: 92,
    department: 'Développement',
    age: 32,
  },
  {
    id: '2',
    name: 'Jean Dupont',
    email: 'jean.dupont@example.com',
    role: 'User',
    status: 'active',
    lastLogin: new Date('2024-01-14'),
    phone: '+33 6 98 76 54 32',
    score: 78,
    department: 'Commercial',
    age: 45,
  },
  {
    id: '3',
    name: 'Marie Curie',
    email: 'marie.curie@example.com',
    role: 'Manager',
    status: 'inactive',
    lastLogin: new Date('2023-12-25'),
    phone: '+33 6 11 22 33 44',
    score: 95,
    department: 'R&D',
    age: 28,
  },
  {
    id: '4',
    name: 'Thomas Anderson',
    email: 'neo@matrix.com',
    role: 'User',
    status: 'active',
    lastLogin: new Date('2024-01-28'),
    phone: '+1 555 123 4567',
    score: 88,
    department: 'Support',
    age: 29,
  },
];

@Component({
  selector: 'app-test-table',
  templateUrl: './test-table.component.html',
  styleUrls: ['./test-table.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, SimpleTableV2Component]
})
export class TestTableComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  /** Données chargées (vide au départ, puis remplies après la simulation serveur). */
  users: User[] = [];
  /** True pendant la simulation du chargement serveur. */
  loading = true;
  /** Message d’erreur éventuel (ex. échec du "serveur"). */
  errorMessage: string | null = null;

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
        id: 'phone',
        header: 'Téléphone',
        type: 'text',
        sortable: true,
        accessor: (row) => row.phone,
        tooltip: true,
      },
      {
        id: 'score',
        header: 'Score',
        type: 'number',
        sortable: true,
        accessor: (row) => row.score,
        formatter: (value: number) => `${value}/100`,
      },
      {
        id: 'department',
        header: 'Service',
        type: 'text',
        sortable: true,
        accessor: (row) => row.department,
      },
      {
        id: 'age',
        header: 'Âge',
        type: 'number',
        sortable: true,
        accessor: (row) => row.age,
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

  ngOnInit(): void {
    // Simulation d’un appel serveur : délai 1,5 s puis émission des données
    of(MOCK_SERVER_USERS)
      .pipe(
        delay(1500),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (data) => {
          this.users = data;
          this.loading = false;
          this.errorMessage = null;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err?.message ?? 'Erreur lors du chargement';
          this.cdr.markForCheck();
        }
      });
  }

  onRowClick(user: User): void {
    console.log('Ligne cliquée:', user);
  }

  onHyperlinkClick(event: { row: User; column: string }): void {
    console.log('Lien cliqué:', event);
    alert(`Navigation vers l'utilisateur: ${event.row.name}`);
  }
}
