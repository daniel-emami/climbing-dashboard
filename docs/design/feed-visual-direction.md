# Feed visual direction

The Feed is the first page to receive the new visual design. Logbook, Map, and detail pages keep their existing appearance until the Feed has been evaluated.

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
- Climber and boulder are the first visual cues, followed by grade, location, and date.
- Videos are limited to 420px inline on laptops and retain native full-screen controls. They fill the card width on phones.
- All comments and the comment field remain visible because discussions are typically short.
- Account access stays in the header. Sign-in opens a dialog. TheTopo import opens from Tools in a side drawer on laptops and a full-screen sheet on phones.
- Add Ascent remains in the header on laptops and fixed near the bottom on phones.
