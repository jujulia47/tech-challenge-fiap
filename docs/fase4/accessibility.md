# Phase 4: accessibility (Step 6b)

An automatic audit opened every route and modal of the three apps, at 375 px and at 1280 px, on the production build in Docker. For each visible text it calculated the contrast between the real text color and the real background, including opacity and the landing gradient. It also looked for horizontal scrolling, cut text, targets under 24 px, titles and icons exposed to screen readers. A browser run then covered the keyboard.

## Contrast

Target: WCAG AA, 4.5:1 for normal text and 3:1 for large text and icons. Everything was fixed through tokens, in `globals.css` of the three apps (since step 7a, the single `theme.css` of the design system), and through classes that use them.

### Token changes

| Token | Before | After | Why |
|---|---|---|---|
| `text-secondary` | `#8B8B8B` | `#565656` | Failed on every surface |
| `success` | `#47A138` | `#267018` | Text on light surfaces and white on green |
| `success-light` | new | `#47A138` | The old green, for the black surface of `ProfileMenu`, where the new one would fail |
| `public-accent` | `#3AB44A` | `#267018` | Same as `success` |
| `accent` | `#FF5031` | `#FF6A4D` | Lighter, for icons on the dark header |
| `accent-strong` | new | `#B8341A` | For text and for filled buttons on light surfaces |
| `error` | `#BF1313` | `#A50F0F` | Error messages on the gray card |

### Password strength colors

The bar of the strength indicator goes from red to green in four levels. Two tokens were added for the middle ones. The bar is a graphic, so its target is 3:1 against what is next to it: the gray track and, on Minha conta, the gray card (`surface-form`, `#CBCBCB`), where the track disappears.

| Level | Token | Color | On the track or the gray card `#CBCBCB` | On a modal `#F8F8F8` |
|---|---|---|---|---|
| Fraca | `error` | `#A50F0F` | 4.84 | 7.39 |
| Razoável | `strength-fair` (new) | `#8A5A00` | 3.65 | 5.58 |
| Boa | `strength-good` (new) | `#4F6F00` | 3.59 | 5.48 |
| Forte | `success` | `#267018` | 3.79 | 5.79 |

The level is always written next to the bar ("Fraca", "Razoável", "Boa", "Forte"), so the color is never the only cue. The text is `text-primary`, not the color of the level: as text, the three last colors would fail 4.5:1 on the gray card. The bar is `aria-hidden`, and a screen reader hears "Força da senha: …" when the level changes.

The `COLORS` array of Recharts did not change. The legend of the pie chart used those colors as text. It is now a row of buttons, with the color in a small square and the text in `text-primary`.

Placeholders had no color of their own, so the browser used a pale version of the text. They now use `text-secondary`, in a base rule.

### Pairs, before and after

| Where | Before | Ratio | After | Ratio |
|---|---|---|---|---|
| Labels of the new transaction form, on gray | `#DEE9EA` on `#CBCBCB` | 1.31 | `#004D61` on `#CBCBCB` | 5.79 |
| Labels of the fields, on modals | `#DEE9EA` on `#F8F8F8` | 1.17 | `#004D61` on `#F8F8F8` | 8.85 |
| Help text on gray | `#8B8B8B` on `#CBCBCB` | 2.10 | `#565656` on `#CBCBCB` | 4.52 |
| Secondary text on the page | `#8B8B8B` on `#E4EDE3` | 2.84 | `#565656` on `#E4EDE3` | 6.12 |
| Secondary text on cards | `#8B8B8B` on `#F5F5F5` | 3.13 | `#565656` on `#F5F5F5` | 6.73 |
| Secondary text on modals | `#8B8B8B` on `#F8F8F8` | 3.21 | `#565656` on `#F8F8F8` | 6.91 |
| Secondary text on white | `#8B8B8B` on `#FFFFFF` | 3.41 | `#565656` on `#FFFFFF` | 7.34 |
| Placeholders | `#80A6AF` on `#FFFFFF` | 2.62 | `#565656` on `#FFFFFF` | 7.34 |
| Green text on cards | `#47A138` on `#F5F5F5` | 3.00 | `#267018` on `#F5F5F5` | 5.64 |
| Active menu item (sidebar) | `#47A138` on `#E4EDE3` | 2.73 | `#267018` on `#E4EDE3` | 5.13 |
| Amounts on the investments card | `#47A138` on `#CBCBCB` | 2.02 | `#004D61` on `#CBCBCB` | 5.79 |
| Green text on dark blue | `#47A138` on `#004D61` | 2.87 | `#FFFFFF` on `#004D61` | 9.40 |
| Green button | `#FFFFFF` on `#47A138` | 3.27 | `#FFFFFF` on `#267018` | 6.15 |
| Green button of the landing | `#FFFFFF` on `#3AB44A` | 2.69 | `#FFFFFF` on `#267018` | 6.15 |
| Links of the public modals | `#3AB44A` on `#F8F8F8` | 2.53 | `#267018` on `#F8F8F8` | 5.79 |
| "Já tenho conta" on the landing | `#3AB44A` on `#004D61` | 3.49 | `#FFFFFF` on `#004D61` | 9.40 |
| Active item of the drawer | `#FF5031` on `#E4EDE3` | 2.72 | `#B8341A` on `#E4EDE3` | 4.94 |
| "Limpar filtro" on the charts | `#FF5031` on `#F5F5F5` | 2.99 | `#B8341A` on `#F5F5F5` | 5.43 |
| Type suggestion, on gray | `#FF5031` on `#CBCBCB` | 2.01 | `#004D61` on `#CBCBCB` | 5.79 |
| Orange button | `#FFFFFF` on `#FF5031` | 3.26 | `#FFFFFF` on `#B8341A` | 5.93 |
| Errors, on gray | `#BF1313` on `#CBCBCB` | 3.90 | `#A50F0F` on `#CBCBCB` | 4.84 |
| Gray card: name | `#FFFFFF` on `#8B8B8B` | 3.41 | `#FFFFFF` on `#565656` | 7.34 |
| Gray card: number, 70% opacity | `#DCDCDC` on `#8B8B8B` | 2.49 | `#CCCCCC` on `#565656` | 4.58 |
| Legend of the pie chart | `#FF5031` on `#F5F5F5` | 2.99 | `#000000` on `#F5F5F5` | 19.26 |
| Header icons (3:1) | `#FF5031` on `#004D61` | 2.88 | `#FF6A4D` on `#004D61` | 3.32 |

Passing before and unchanged:

- White on the landing gradient: at least 5.58 for body text and 6.14 for the large title.
- The black "Vantagens do nosso banco": at least 4.46, which is large text, with a minimum of 3:1.

Exempt from AA: disabled controls, such as "‹ Anterior" on the first page (1.55).

## Other changes

- **Titles and descriptions:** every route has a title in Portuguese, through a `%s | Bytebank` template in the root layouts, and a description. `lang="pt-BR"` was already in place.
- **Icons:** the Material Icons are text, so a screen reader would read "account_balance". All are `aria-hidden` now (the font is a subset: "Icon font" in `performance.md`), and the buttons with only an icon keep their `aria-label`.
- **Charts:** each chart is a `figure` named by its title. The drawing is hidden from screen readers, and a visually hidden table has the same data. The axis uses `nov/22`, with every month shown, and the tooltip the full name.
- **Pie chart filter (step 6c):** the types are buttons with `aria-pressed`, tied to the same filter as a click on a slice, so it works with the keyboard. Pressing one announces "Gráfico de meses filtrado por Depósito" through a hidden `aria-live`, and pressing it again announces "Filtro removido". The focus stays on the button. The slices left the tab order (`rootTabIndex={-1}`), which solved the only error of Lighthouse, `aria-hidden-focus`: accessibility is 100 on both pages, on mobile and on desktop.
- **Focus:** a base rule shows the focus on every element, with two colors so that it works on light and dark surfaces. It also covers the calendar button of a date field, which only `:focus-within` sees.
- **Modals:** Tab stays inside, and the focus goes back on close. Escape on the attachment viewer closes only the viewer.
- **Drawer:** closed, it is `inert`. Before, the keyboard reached its links out of the screen. Open, it takes the focus and closes on Escape.
- **Attachment field:** the file input was `hidden`, so the keyboard never reached it. It is `sr-only` now, and the label shows the focus.

## 375 px

No page had horizontal scrolling, and no button was out of the screen. What broke:

| Problem | Fix |
|---|---|
| The transaction type was cut ("Câmbio de Moeda"), and with wrapping it broke in the middle of a word ("Transferênci/a") | The date went down to the line of the amount, so the name has the width it needs |
| The placeholder of the type select was cut | The text of a select can use two lines |
| "‹ Anterior" and "Próxima ›" broke in two lines | The pagination stacks on small screens, with no wrapping on the buttons |
| Targets under 24 px: hide balance, closing the profile menu, logo, footer and navbar links, "Ver todas as transações", breadcrumb, period buttons | Minimum height of 24 px on each |

## Known limits

- **`<Link><Button /></Link>`** on the 404 pages nests a button inside a link, which gives two tab stops for one action.
- **The contrast of images and of the charts** was not measured. The audit reads text and placeholders.
- **The test was automatic.** No screen reader was used, so what it announces was not heard by anyone.
