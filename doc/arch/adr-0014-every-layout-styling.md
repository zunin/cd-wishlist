# ADR-0014: Every Layout for Styling Architecture

## Status

Accepted

## Context

The application's styling has grown organically with custom BEM-style classes for every layout scenario (e.g., `.settings-group`, `.sync-room__fields`, `.share-link__row`, `.import-actions-bar`, `.data-source-list__actions`). This approach leads to:

- Duplicated layout logic across components
- Tight coupling between component structure and CSS
- Difficulty maintaining consistent spacing and responsive behavior
- No systematic approach to responsive design - each layout needed custom media queries

Modern CSS provides powerful layout primitives (Flexbox, Grid, aspect-ratio, clamp()) that can be composed to handle most layout needs without custom media queries.

## Decision

We will adopt the **Every Layout** methodology by Heydon Pickering and Andy Bell as the styling architecture for the application.

Every Layout provides composable layout primitives that respond to content and available space intrinsically (without media queries):

### Layout Primitives

| Pattern | CSS Class | Purpose |
|---------|-----------|---------|
| Stack | `.stack` | Vertical spacing between elements |
| Cluster | `.cluster` | Horizontal wrapping items with gaps |
| Switcher | `.switcher` | Conditional horizontal/vertical based on space |
| Sidebar | `.with-sidebar` | Content with a flexible sidebar |
| Grid | `.grid` | Responsive auto-fit grid |
| Repel | `.repel` | Items pushed to opposite edges |
| Center | `.center` | Centered content with max-width |
| Split | `.split` | Two equal columns |
| Frame | `.frame` | Aspect ratio container |
| Cover | `.cover` | Hero-like layout with centered content |

### Design Principles

1. **Composition over configuration** - Compose primitives instead of creating unique classes per scenario
2. **Intrinsic design** - Layouts respond to content and space, not fixed breakpoints
3. **CSS custom properties** - Use `--space`, `--switcher-target`, `--split-min` for per-instance configuration
4. **Spacing scale** - Use `--s-3` through `--s4` clamp values for consistent, responsive spacing

### Usage Pattern

```tsx
<div className="stack" style={{ "--space": "var(--s1)" }}>
  <div className="repel">
    <h2>Settings</h2>
    <button>Reset</button>
  </div>
  <div className="switcher" style={{ "--switcher-target": "20rem" }}>
    <div>Left content</div>
    <div>Right sidebar</div>
  </div>
</div>
```

### Migration Approach

1. Add new primitives (`.switcher`, `.repel`, `.center`, `.split`) to the existing CSS
2. Add CSS custom properties for spacing scale using `clamp()` for responsive sizing
3. Gradually refactor components to use primitives instead of custom layout classes
4. Keep existing BEM semantic classes for non-layout styling (colors, typography, etc.)

### What Stays the Same

- BEM naming for component-specific styles (colors, borders, hover states)
- Existing `.stack`, `.cluster`, `.grid`, `.with-sidebar`, `.frame`, `.cover`, `.box` patterns
- Dark theme color scheme

## Consequences

**Positive:**
- Fewer custom CSS rules needed - primitives handle most layouts
- Consistent spacing across the application via the spacing scale
- Responsive layouts without media queries (intrinsic design)
- Easier to maintain and reason about layout structure
- New components can be built quickly by composing primitives
- Better accessibility - semantic HTML with layout handled by CSS

**Negative:**
- Learning curve for team members unfamiliar with Every Layout
- Some complex layouts may still need custom CSS
- Inline style objects for CSS custom properties trigger TypeScript warnings (cosmetic only)
- Migration requires careful refactoring to not break existing layouts

**Neutral:**
- Existing BEM classes are kept for non-layout styling, resulting in mixed approach
- CSS file size increases initially (new patterns added alongside existing ones)
- Some components may use both primitives and custom classes during transition
