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
    height: {
      maxHeight: 2000,
      minHeight: 600,
    },
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
    defaultPageSize: 2000,
    pageSizeOptions: [100, 1000, 2000, 5000],
    stickyHeader: true,
    responsive: true,
  };

  ngOnInit(): void {
    // Génération de 5000 utilisateurs pour test de performance
    const generatedUsers: User[] = Array.from({ length: 5000 }, (_, i) => {
      const departments = ['Développement', 'Commercial', 'R&D', 'Support', 'RH', 'Marketing'];
      const roles = ['Admin', 'User', 'Manager', 'Guest'];
      const statuses: ('active' | 'inactive')[] = ['active', 'inactive'];
      
      return {
        id: (i + 1).toString(),
        name: `Utilisateur ${i + 1}`,
        email: `utilisateur.${i + 1}@example.com`,
        role: roles[Math.floor(Math.random() * roles.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        lastLogin: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)), // 30 derniers jours
        phone: `+33 6 ${Math.floor(Math.random() * 90 + 10).toString()} ${Math.floor(Math.random() * 90 + 10).toString()} ${Math.floor(Math.random() * 90 + 10).toString()} ${Math.floor(Math.random() * 90 + 10).toString()}`,
        score: Math.floor(Math.random() * 101),
        department: departments[Math.floor(Math.random() * departments.length)],
        age: 20 + Math.floor(Math.random() * 46), // 20-65 ans
      };
    });

    // Simulation d’un appel serveur : délai 1,5 s puis émission des données
    of(generatedUsers)
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
          console.log(`[TestTable] ${data.length} utilisateurs chargés.`);
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
