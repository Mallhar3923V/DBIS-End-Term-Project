# PriceSense — Smooth Motion Edition

A responsive HTML, CSS and vanilla JavaScript frontend for the DBIS Price Comparison and Deal Intelligence System project. No npm packages, backend or WebGL required.

## Open the demo

Download and double-click `PriceSense_Interactive_Demo.html` to open it in Chrome or Edge. The single HTML file embeds every product illustration and script and works offline.

For the split source, open `pricesense-frontend/index.html`. The source optionally loads Google Fonts; system fonts work when offline. Run `python build_demo.py` inside that folder to rebuild the standalone file in its parent directory.

## Repairs in this version

- Removed the WebGL orbital renderer, animated blur layers and backdrop filters.
- Confined actual 3D rendering to the six-face cube. Product cards use a small 2D hover lift.
- Kept slow automatic cube rotation, mouse dragging, horizontal touch dragging, face selection and pause/resume. Focus the cube and use arrow keys to rotate; Home restores its initial angle.
- Page scrolling never drives cube rotation. The cube section and feature gallery stay in normal document flow.
- Cube headings stay stable while it rotates. Face content fits without clipping across the checked screen widths.
- Automatic cube rotation stops off screen and in hidden tabs. Hero and marquee animation also pause off screen. Reduced-motion users start with automatic rotation disabled.
- Removed the overlapping price badge beside the cube and fixed the narrow search toolbar.
- Fixed the small-screen sticky explainer so it cannot cover the following text.
- Feature panels use three columns on large screens and native horizontal scrolling on smaller screens.
- Saving a product updates its heart without rebuilding all product cards or replaying their entrance animation.
- Closed watchlists are inert, with background content disabled while the drawer is open.

## Features retained

Eight sample products, search, category filtering, sorting, store comparisons including delivery, a locally saved watchlist and interactive 30-day, 90-day and one-year price-history charts.

## Verification

The standalone file was checked in Chromium at viewport widths 320, 390, 768, 1024 and 1363 pixels. The checks found no horizontal page overflow, overflowing product cards or clipped cube-face content.

Browser checks covered search and empty results, category filtering and sorting, saving and persisted saved items, comparison totals, the watchlist drawer, chart periods, mouse dragging, pause/resume controls, keyboard rotation and off-screen cube suspension. JavaScript syntax and standalone packaging were checked separately. These checks are not an FPS benchmark on the user's laptop.

## Demo data

All product prices, availability, reviews and historical observations are illustrative sample values. This version has no database/API connection, authentication or delivered price notifications. Connect a backend API when the DBIS schema is ready; do not connect browser JavaScript directly to PostgreSQL.

## Files

- `index.html`: page structure
- `styles.css`: layout, responsive rules and lightweight animations
- `colour.css`: violet, cyan, coral and lime colour system
- `data.js`: sample catalog and observations
- `script.js`: search, comparisons, saved items and charts
- `motion.js`: visible-scene cube controls and animation lifecycle
- `assets/`: local SVG product illustrations
- `build_demo.py`: standard-library Python bundler

