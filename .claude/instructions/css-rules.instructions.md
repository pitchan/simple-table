---
applyTo: "**/*.scss"
---

# SCSS Rules (GCM GUI)

> 📌 Minimal rules. For details: `.github/docs/css.reference.md`

## Non-negotiable rules
- ❌ No `::ng-deep` (legacy only with `// TODO: Remove`)
- ❌ No `!important` outside `src/styles/themes/`
- ❌ No hardcoded colors → use `src/styles/_constants.scss`
- ❌ No `#id` selectors
- ❌ No "magic" z-index → use project tokens
- ✅ `:host` as the component root
- ✅ Selector depth ≤ 3 levels
- ✅ Naming BEM (`.block__element--modifier`)

## Complete reference
👉 `.github/docs/css.reference.md`

## CSS / Accessibility Audit
👉 Use the `css-accessibility-review` skill
