import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="app-footer" role="contentinfo">
      <div class="app-footer__inner">
        <p class="app-footer__copyright">
          &copy; {{ currentYear }} Generic Table &mdash; Angular 16 Demo
        </p>
        <nav class="app-footer__nav" aria-label="Liens du pied de page">
          <a class="app-footer__link" href="javascript:void(0)">Documentation</a>
          <span class="app-footer__separator" aria-hidden="true">|</span>
          <a class="app-footer__link" href="javascript:void(0)">GitHub</a>
          <span class="app-footer__separator" aria-hidden="true">|</span>
          <a class="app-footer__link" href="javascript:void(0)">Accessibilité</a>
        </nav>
      </div>
    </footer>
  `,
  styleUrls: ['./app-footer.component.scss'],
})
export class AppFooterComponent {
  readonly currentYear = new Date().getFullYear();
}
