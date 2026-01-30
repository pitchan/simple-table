# SimpleTableV2 Changelog

## [2.1.0] - 2026-01-29

### ✨ Added
- **Automatic column width management by type** - Column widths are now automatically determined based on `type` (text, date, badge, link, etc.)
- Complete `DEFAULT_COLUMN_WIDTHS` configuration with sensible defaults for all column types
- Documentation section "Column Width Management" in README.md

### 🔧 Changed
- `config-adapter.ts` now uses `DEFAULT_COLUMN_WIDTHS` instead of hardcoded values (100, 1000)
- `onResizeStart()` uses type-based defaults instead of fallback `?? 100`
- `onResizeMove()` uses type-based min/max instead of fallbacks `?? 50` and `?? 1000`
- Examples updated to demonstrate automatic width management (no explicit `width` needed)

### 🗑️ Removed
- Manual `width: { min, max, initial }` specifications from:
  - `search-productline.component.ts` (6 columns cleaned)
  - `examples/product-line-search.example.ts`
  - `examples/users-list.example.ts`

### 📝 Migration Guide
**Before (manual widths):**
```typescript
{
  id: 'name',
  header: 'Name',
  type: 'link',
  width: { min: 150, max: 400, initial: 250 },  // ❌ Redundant
}
```

**After (automatic):**
```typescript
{
  id: 'name',
  header: 'Name',
  type: 'link',  // ✅ Automatic: 100-300px @ 150px
}
```

**Override only when needed:**
```typescript
{
  id: 'description',
  header: 'Description',
  type: 'text',
  width: { min: 200, max: 800, initial: 400 },  // ✅ Custom width
}
```

### 🎯 Benefits
- ✅ **Consistency** - All tables use the same width conventions
- ✅ **Less code** - No need to specify widths for every column  
- ✅ **Easy maintenance** - Change defaults in one place
- ✅ **Backward compatible** - Existing explicit widths still work

### 📊 Default Width Table

| Type     | Min (px) | Max (px) | Initial (px) |
|----------|----------|----------|--------------|
| text     | 120      | 420      | 200          |
| date     | 120      | 180      | 140          |
| number   | 90       | 160      | 110          |
| badge    | 100      | 200      | 120          |
| link     | 100      | 300      | 150          |
| button   | 60       | 120      | 80           |
| selector | 48       | 48       | 48           |
| editable | 120      | 420      | 200          |
| custom   | 100      | 400      | 150          |

---

## [2.0.0] - 2026-01-28

### ✨ Added
- Strategy Pattern architecture for flexible data source handling
- Support for `FilterableDataSource` (server-side pagination)
- Support for array data (client-side pagination)
- Column resizing with visual handles
- Table configuration editor integration
- State persistence to localStorage
- Comprehensive documentation and examples

### 🔧 Changed
- Complete refactor from `SimpleTableComponent` to `SimpleTableV2Component`
- New `TableConfig<T>` interface replacing legacy configs
- Column definitions now use `id` instead of `name`
- Translation keys via `i18n` property instead of `header`

### 🗑️ Deprecated
- `SimpleTableComponent` (legacy) - migrate to `SimpleTableV2Component`
