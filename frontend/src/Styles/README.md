# Frontend styling

The frontend uses three levels of styling:

1. `tokens.css` defines reusable design values such as colours, spacing, borders,
   shadows, and fonts.
2. `globals.css` contains the small set of styles that genuinely apply to the
   whole application, including the reset and base HTML element styles.
3. CSS Module files (`*.module.css`) contain component and page styles. Their
   class names are scoped automatically, so a class in one component cannot
   accidentally override a class in another component.

`Shared.module.css` contains the few visual patterns used by several components,
such as panels, headings, segmented controls, and state cards. Import those
classes explicitly rather than recreating them or adding a global class.

## Adding styles

- Put component-specific rules next to the component in
  `ComponentName.module.css`.
- Import the module as `styles` and use `className={styles.className}`.
- Use a value from `tokens.css` when a colour, radius, or shadow is shared.
- Add to `globals.css` only when the selector should intentionally affect every
  matching element in the application.
- Keep responsive rules in the module that owns the affected layout.

This keeps styling ownership visible and prevents selector order from deciding
which component wins.
