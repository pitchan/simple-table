# Project: Angular 16 Generic Table

## Tech Stack
- **Framework:** Angular 16 (standalone components)
- **Language:** TypeScript (strict mode)
- **UI Library:** Angular Material 16
- **Reactive:** RxJS
- **Auth:** Keycloak
- **Styling:** SCSS with BEM naming

## Project Structure
```
src/app/
├── core/          # Singleton services, interceptors, guards, models
├── shared/        # Reusable components, pipes, directives, utilities
└── pages/         # Feature modules and page components
src/environments/  # Environment config
src/styles/        # Global styles, themes, SCSS variables (_constants.scss)
src/assets/        # Static resources (i18n, images, icons, mock data)
```

## Commands
- Build: `npm run build`
- Serve: `ng serve` / `npm start`
- Test: `ng test` / `npm test`
- Lint: `ng lint` / `npm run lint`
- Build prod: `ng build --configuration production`

---

## Agents

### angular_tech_lead
- **File:** [.claude/agents/angular.agent.md](.claude/agents/angular.agent.md)
- **Role:** Expert Angular 16 Tech Lead, RxJS et CSS/SCSS
- **Quand l'utiliser:** Architecture, code review, implementation de features, decisions techniques, performance
- **Outils:** read, write, search, agent, web

### css_expert
- **File:** [.claude/agents/css.agent.md](.claude/agents/css.agent.md)
- **Role:** Expert CSS/SCSS, BEM & Accessibilite RGAA/WCAG AA
- **Quand l'utiliser:** Styling, audit accessibilite, revue CSS, creation de composants visuels
- **Outils:** read, write, search, agent, web
- **Reference:** [.claude/docs/css.reference.md](.claude/docs/css.reference.md)

---

## Instructions (auto-applied)

| Fichier | Applique a | Resume |
|---------|-----------|--------|
| [typescript-angular.instructions.md](.claude/instructions/typescript-angular.instructions.md) | `**/*.ts` | OnPush, takeUntilDestroyed, pas de nested subscribe, markForCheck |
| [css-rules.instructions.md](.claude/instructions/css-rules.instructions.md) | `**/*.scss` | BEM, pas de ng-deep/!important, :host, tokens projet |
| [html.instructions.md](.claude/instructions/html.instructions.md) | `**/*.html` | Pas de inline styles, async pipe, templates simples |

---

## Skills

### angular-component-onpush-skeleton
- **Path:** [.claude/skills/angular-component-creation/SKILL.md](.claude/skills/angular-component-creation/SKILL.md)
- **Usage:** Creation de composants Angular (OnPush, inject pattern, subscription management)
- **Inclut:** Patterns reutilisables (permissions, notifications, dialogs, testing checklist)

### angular-material
- **Path:** [.claude/skills/angular-material/SKILL.md](.claude/skills/angular-material/SKILL.md)
- **Usage:** Composants Material UI, theming, CDK, accessibilite
- **Trigger:** "create a material feature", "make a new component", "adapt material component"

### css-accessibility-review
- **Path:** [.claude/skills/css-accessibility-review/SKILL.md](.claude/skills/css-accessibility-review/SKILL.md)
- **Usage:** Audit CSS/SCSS pour conformite BEM, accessibilite RGAA/WCAG AA
- **Auto-trigger:** Toute creation ou modification de fichier SCSS

### rxjs-best-practices
- **Path:** [.claude/skills/rxjs-best-practices/SKILL.md](.claude/skills/rxjs-best-practices/SKILL.md)
- **Usage:** Subscription management, error handling, operators, anti-patterns
- **References detaillees:** [references/](.claude/skills/rxjs-best-practices/references/)

### make-skill-template
- **Path:** [.claude/skills/make-skill-template/SKILL.md](.claude/skills/make-skill-template/SKILL.md)
- **Usage:** Meta-skill pour creer de nouvelles skills

---

## Regles non-negociables
1. `ChangeDetectionStrategy.OnPush` sur tout nouveau composant
2. Pas de subscription non geree (toujours `takeUntilDestroyed` ou `take(1)`)
3. Pas de nested `subscribe()` — utiliser les operateurs RxJS
4. Pas de `::ng-deep`, `!important` (hors themes), `#id` en CSS
5. BEM strict pour le nommage CSS
6. Accessibilite WCAG AA (focus visible, contrastes, navigation clavier)
7. Pas d'import lodash complet ni jQuery
8. Pas de `detectChanges()` — preferer `markForCheck()`
