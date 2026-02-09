import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { delay, of } from 'rxjs';

import { SimpleTableV2Component } from '../../shared/components/simple-table-v2/simple-table-v2.component';
import { TableConfig, TableColumnDef } from '../../shared/components/simple-table-v2/models/column-def.model';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { AppFooterComponent } from '../../shared/components/app-footer/app-footer.component';

// ────────────────────────────────────────────
// Modèle générique typé pour la table
// ────────────────────────────────────────────
export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  jobTitle: string;
  salary: number;
  hireDate: Date;
  status: 'active' | 'inactive' | 'on_leave';
  performance: number;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    AppHeaderComponent,
    AppFooterComponent,
    SimpleTableV2Component,
  ],
})
export class HomeComponent implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Données chargées — un tableau de 100 Employee */
  employees: Employee[] = [];

  /** True pendant le chargement simulé */
  loading = true;

  /** Message d'erreur éventuel */
  errorMessage: string | null = null;

  /** Nombre d'employés actifs (calculé) */
  get activesCount(): number {
    return this.employees.filter((e) => e.status === 'active').length;
  }

  /** Nombre de départements distincts (calculé) */
  get departmentsCount(): number {
    return new Set(this.employees.map((e) => e.department)).size;
  }

  /**
   * Configuration GÉNÉRIQUE de la table.
   * Le composant SimpleTableV2Component<Employee> reçoit un TableConfig<Employee>
   * avec des accessors et formatters typés.
   */
  tableConfig: TableConfig<Employee> = {
    id: 'home-employees-table',
    columns: this.buildColumns(),
    height: {
      //maxHeight: 800,
      //minHeight: 1000,
    },
    features: {
      sort: true,
      pagination: true,
      selection: false,
      resize: true,
    },
    defaultPageSize: 100,
    pageSizeOptions: [25, 50, 100],
    stickyHeader: true,
    responsive: true,
    columnResizeMode: 'expand',
  };

  // ────────────────────────────────────────────
  // Lifecycle
  // ────────────────────────────────────────────
  ngOnInit(): void {
    const generated = this.generateEmployees(100);

    // Simulation d'un appel serveur (délai 800 ms)
    of(generated)
      .pipe(delay(800), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.employees = data;
          this.loading = false;
          this.errorMessage = null;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err?.message ?? 'Erreur lors du chargement des données';
          this.cdr.markForCheck();
        },
      });
  }

  // ────────────────────────────────────────────
  // Événements de la table
  // ────────────────────────────────────────────
  onRowClick(employee: Employee): void {
    console.log('[Home] Ligne cliquée :', employee);
  }

  onHyperlinkClick(event: { row: Employee; column: string }): void {
    console.log('[Home] Lien cliqué :', event);
  }

  // ────────────────────────────────────────────
  // Construction des colonnes (typé Employee)
  // ────────────────────────────────────────────
  private buildColumns(): TableColumnDef<Employee>[] {
    return [
      {
        id: 'id',
        header: '#',
        type: 'number',
        sortable: true,
        accessor: (row) => row.id,
        width: { min: 60, max: 80, initial: 60 },
      },
      {
        id: 'lastName',
        header: 'Nom',
        type: 'link',
        sortable: true,
        sticky: 'start',
        accessor: (row) => row.lastName,
      },
      {
        id: 'firstName',
        header: 'Prénom',
        type: 'text',
        sortable: true,
        accessor: (row) => row.firstName,
      },
      {
        id: 'email',
        header: 'Email',
        type: 'text',
        sortable: true,
        accessor: (row) => row.email,
        tooltip: true,
      },
      {
        id: 'department',
        header: 'Département',
        type: 'badge',
        sortable: true,
        accessor: (row) => row.department,
      },
      {
        id: 'jobTitle',
        header: 'Poste',
        type: 'text',
        sortable: true,
        accessor: (row) => row.jobTitle,
      },
      {
        id: 'salary',
        header: 'Salaire',
        type: 'number',
        sortable: true,
        accessor: (row) => row.salary,
        formatter: (value: number) =>
          new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0,
          }).format(value),
      },
      {
        id: 'hireDate',
        header: "Date d'embauche",
        type: 'date',
        sortable: true,
        accessor: (row) => row.hireDate,
        sortAccessor: (row) => row.hireDate.getTime(),
        formatter: (value: Date) =>
          new Intl.DateTimeFormat('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }).format(value),
      },
      {
        id: 'status',
        header: 'Statut',
        type: 'badge',
        sortable: true,
        accessor: (row) => row.status,
        formatter: (value: string) => {
          const labels: Record<string, string> = {
            active: 'Actif',
            inactive: 'Inactif',
            on_leave: 'En congé',
          };
          return labels[value] ?? value;
        },
      },
      {
        id: 'performance',
        header: 'Performance',
        type: 'number',
        sortable: true,
        accessor: (row) => row.performance,
        formatter: (value: number) => `${value} %`,
      },
      {
        id: 'actions',
        header: 'Actions',
        type: 'button',
        sortable: false,
        sticky: 'end',
        actions: [
          { kind: 'button', icon: 'visibility', label: 'Voir', handlerId: 'view' },
          { kind: 'button', icon: 'edit', label: 'Éditer', handlerId: 'edit' },
        ],
      },
    ];
  }

  // ────────────────────────────────────────────
  // Générateur de données fictives (100 lignes)
  // ────────────────────────────────────────────
  private generateEmployees(count: number): Employee[] {
    const firstNames = [
      'Alice', 'Bruno', 'Claire', 'David', 'Emma',
      'François', 'Gaëlle', 'Hugo', 'Inès', 'Julien',
      'Karine', 'Louis', 'Marie', 'Nathan', 'Olivia',
      'Pierre', 'Quentin', 'Rachel', 'Sylvain', 'Thomas',
    ];

    const lastNames = [
      'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert',
      'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau',
      'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia',
      'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier',
    ];

    const departments = [
      'Développement', 'Marketing', 'Ressources Humaines',
      'Finance', 'Commercial', 'Support', 'R&D', 'Direction',
    ];

    const jobTitles = [
      'Développeur Frontend', 'Développeur Backend', 'Chef de projet',
      'Designer UX', 'Data Analyst', 'Ingénieur DevOps',
      'Responsable Marketing', 'Comptable', 'Commercial',
      'Support Technique', 'Architecte Logiciel', 'Scrum Master',
    ];

    const statuses: ('active' | 'inactive' | 'on_leave')[] = [
      'active', 'active', 'active', 'active', 'active',
      'active', 'inactive', 'on_leave',
    ];

    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
      lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
      email: `employe.${i + 1}@entreprise.fr`,
      department: departments[Math.floor(Math.random() * departments.length)],
      jobTitle: jobTitles[Math.floor(Math.random() * jobTitles.length)],
      salary: 28000 + Math.floor(Math.random() * 52000),
      hireDate: new Date(
        Date.now() - Math.floor(Math.random() * 10 * 365 * 24 * 60 * 60 * 1000),
      ),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      performance: 40 + Math.floor(Math.random() * 61),
    }));
  }
}
