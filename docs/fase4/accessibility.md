# Accessibility

Accessibility is not a separate requirement of Phase 4, but every screen of a bank needs it. An automatic audit opened every route and modal of the three apps at 375 px and 1280 px, on the production build in Docker. It measured the real contrast of every visible text against its real background, including opacity and the landing gradient, and looked for horizontal scrolling, cut text, small targets, titles and icons read by screen readers. A browser run then covered the keyboard. Lighthouse accessibility went from 88 and 92 to 100 on every page and device.

## Contrast

The target is WCAG AA: 4.5:1 for normal text, 3:1 for large text and icons. Every fix went through the tokens of `packages/design-system/src/styles/theme.css`, the one theme of the three apps.

| Token | Before | After | Why |
|---|---|---|---|
| `text-secondary` | `#8B8B8B` | `#565656` | Failed on every surface |
| `success` | `#47A138` | `#267018` | Text on light surfaces, and white on green |
| `success-light` | new | `#47A138` | The old green, kept for the black surface of `ProfileMenu` |
| `public-accent` | `#3AB44A` | `#267018` | Same as `success` |
| `accent` | `#FF5031` | `#FF6A4D` | Icons on the dark header |
| `accent-strong` | new | `#B8341A` | Text and filled buttons on light surfaces |
| `error` | `#BF1313` | `#A50F0F` | Error messages on the gray card |

| Where | Before | After |
|---|---|---|
| Labels of the forms, on gray and on modals | 1.31 and 1.17 | 5.79 and 8.85 |
| Secondary text on the page, cards and white | 2.84 to 3.41 | 6.12 to 7.34 |
| Help text on gray | 2.10 | 4.52 |
| Placeholders | 2.62 | 7.34 |
| Green text on cards and the active menu item | 3.00 and 2.73 | 5.64 and 5.13 |
| Green and orange buttons | 3.27 and 3.26 | 6.15 and 5.93 |
| Links of the public modals | 2.53 | 5.79 |
| Errors on gray | 3.90 | 4.84 |
| Header icons (3:1) | 2.88 | 3.32 |

The pie chart legend used the Recharts colors as text. It is now a row of buttons, with the color in a small square and the text in `text-primary`, so the `COLORS` array did not change. Placeholders use `text-secondary`. Disabled controls, such as "‹ Anterior" on the first page, are exempt from AA.

### Password strength colors

The bar of the strength indicator has four levels. As a graphic it needs 3:1 against the gray track and the gray card of Minha conta (`#CBCBCB`).

| Level | Token | Color | On gray `#CBCBCB` | On a modal `#F8F8F8` |
|---|---|---|---|---|
| Fraca | `error` | `#A50F0F` | 4.84 | 7.39 |
| Razoável | `strength-fair` | `#8A5A00` | 3.65 | 5.58 |
| Boa | `strength-good` | `#4F6F00` | 3.59 | 5.48 |
| Forte | `success` | `#267018` | 3.79 | 5.79 |

The level is always written next to the bar, in `text-primary`, so color is never the only cue. The bar is `aria-hidden`, and a screen reader hears "Força da senha: …" when the level changes.

## Keyboard and screen readers

Every route has a Portuguese title through a `%s | Bytebank` template, and a description. The Material Icons are text, so a screen reader would read "account_balance": every icon is `aria-hidden`, and icon-only buttons keep their `aria-label`.

Each chart is a `figure` named by its title. The drawing is hidden from screen readers, and a visually hidden table holds the same data. The pie chart filter uses buttons with `aria-pressed`, tied to the same filter as a click on a slice, and a hidden live region announces "Gráfico de meses filtrado por Depósito" and "Filtro removido". The slices left the tab order, which fixed the only Lighthouse error, `aria-hidden-focus`.

A base rule shows the focus on every element, with two colors so that it works on light and dark surfaces. Modals keep Tab inside and give the focus back on close. The closed drawer is `inert`, and the open one takes the focus and closes on Escape.

The file input of a new transaction is `sr-only`, so the keyboard reaches it and its label shows the focus. It empties after each transaction is created, and "Remover anexo" removes a chosen file and returns the focus to the field. The "Buscar" label points to the search field of the extract, and the breadcrumb is a `nav` named "Navegação estrutural".

## Small screens

At 375 px no page scrolls sideways. Long transaction types such as "Câmbio de Moeda" broke in the middle of a word, so the date moved to the line of the amount. The pagination stacks on small screens, and every small target (hide balance, close menu, logo, links, period buttons) is at least 24 px tall.

## How to validate

- Lighthouse accessibility is 100 on `/dashboard` and `/transactions`, mobile and desktop ([performance.md](performance.md#lighthouse-before-and-after)).
- Storybook runs the a11y addon on every story, and the interaction tests prove the focus of the drawer, the modals and the idle warning ([testing.md](testing.md#storybook)). The "Foundations/Colors" page shows the tokens.
- With the keyboard: every control shows the focus, the pie legend filters with Enter, a modal keeps the focus inside and gives it back on Escape, and clicking "Buscar" focuses the search field.
- DevTools at 375 px: no route scrolls sideways or cuts text.

## Known limits

- On the 404 pages a button sits inside a link, which gives two tab stops for one action.
- The contrast of images and of the chart drawings was not measured.
- The audit was automatic. No screen reader was used.
