import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, MatToolbarModule, MatIconModule, MatButtonModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="app-header" role="banner">
      <mat-toolbar class="app-header__toolbar" color="primary">
        <div class="app-header__brand">
          <mat-icon class="app-header__logo" aria-hidden="true">table_chart</mat-icon>
          <span class="app-header__title">Generic Table</span>
        </div>

        <nav class="app-header__nav" role="navigation" aria-label="Navigation principale">
          <a
            class="app-header__nav-link app-header__nav-link--active"
            href="javascript:void(0)"
            aria-current="page">
            Accueil
          </a>
        </nav>

        <div class="app-header__spacer"></div>

        <div class="app-header__actions">
          <button
            mat-icon-button
            class="app-header__action-btn"
            aria-label="Notifications"
            matTooltip="Notifications">
            <mat-icon>notifications_none</mat-icon>
          </button>
          <button
            mat-icon-button
            class="app-header__action-btn"
            aria-label="Paramètres"
            matTooltip="Paramètres">
            <mat-icon>settings</mat-icon>
          </button>
        </div>
      </mat-toolbar>
    </header>
  `,
  styleUrls: ['./app-header.component.scss'],
})
export class AppHeaderComponent {}
