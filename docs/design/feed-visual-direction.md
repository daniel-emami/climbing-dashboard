# Feed visual direction

The Feed establishes the shared header and utility controls for Feed, Logbook, Map, boulder detail, and boulderer profile pages. Each page keeps its own main content layout; Logbook and Map use the available width without an account/import sidebar.

## Current palette: cool ink and soft mint

| Role | Color |
| --- | --- |
| Page | `#101820` |
| Card | `#1B2731` |
| Main text | `#EFF4F2` |
| Secondary text | `#A9B9BD` |
| Primary action | `#91D6C0` |
| Text on primary action | `#0E2420` |

The active values live in `frontend/src/Styles/tokens.css` under the Feed theme selector. Mint is reserved for the primary action, selected navigation, and links; cards use neutral surfaces.

## Alternative palettes for a later comparison

| Theme | Page | Card | Main text | Secondary text | Primary action |
| --- | --- | --- | --- | --- | --- |
| Warm graphite / copper | `#141517` | `#202225` | `#F2F0EB` | `#B1ADA6` | `#D6A078` |
| Charcoal / muted violet | `#15151B` | `#23232B` | `#F2F0F7` | `#B3B1C2` | `#B8A6E7` |

## Layout decisions

- Recent activity is the main content. Feed cards sit in a centered column on laptops and use the available width on phones.
- Climber and boulder are the first visual cues. Both ascent and video cards show the climber’s own grade inline with the boulder name, falling back to TheTopo grade. If neither exists, the grade is omitted. Location and date follow below.
- Feed card titles, climber names, and grades use pale sage (`#C8E4DB`). Body text uses soft white (`#DCE6E3`), with muted sage for metadata (`#B2C5BF`) and timestamps (`#9DB1AA`). These colors are scoped to Feed cards.
- Videos are limited to 420px inline on laptops and retain native full-screen controls. They fill the card width on phones.
- All comments and the comment field remain visible because discussions are typically short.
- Account access stays in the shared header on every page. Login opens a dialog on laptops and phones. Admins can open Reset password beside Sign out. Import TheTopo opens a side drawer on laptops and a full-screen sheet on phones.
- Add Ascent remains in the header on laptops and fixed near the bottom on phones.
