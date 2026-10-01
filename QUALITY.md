# Quality and content notes

## Implemented

- Four educational guides share summaries, numbered sections, jump links, sources, and related reading.
- Product categories have keyboard-operable filters and live listing counts. All listings remain available without JavaScript.
- Search covers guides and products, matches all query words, and preserves available results if one catalog fails. Failed requests can be retried.
- Health guidance was checked against the linked NIDCR and ADA sources. The hygienist role page cites BLS and notes that permitted services vary.
- Removed unsupported global disease counts, cancer percentages, universal whitening schedules, and the fixed 90-day bacterial claim. Association is distinguished from causation.
- Source dates record editorial checking, not review or approval by a clinician. Retailer stock, pricing, and specific product formulations are not verified.
- Removed the unrelated Dental Hygienist Association footer attribution.
- Fifteen image variants reduced those image bytes from 1,379,700 to 284,014 (79%). Original assets are retained. Dimensions reserve space and product images use lazy loading.

## Validation

- All six pages checked at 320, 390, 768, 1024, and 1440 CSS pixels in the in-app browser: no horizontal overflow or clipped links/cards.
- Text enlarged to 200% at phone and desktop widths. Fixed navigation word wrapping and the homepage banner's minimum width.
- All six product filters checked, including the all-products reset. Counts reflect listings: the two toothbrushes appear in both gum care and cavity prevention.
- Search, no-results feedback, Escape dismissal, and article jump links checked.
- Python structure checks cover nesting, IDs, landmarks, active navigation, local assets, fragment links, and both search catalogs. JavaScript syntax and Git whitespace checks pass.

## Remaining environment limitations

Actual Safari and Firefox engine tests have not been run: Safari is unavailable on this Windows host and Firefox is not installed. Screen-reader testing on physical devices is also outstanding. Responsive emulation does not replace those checks.

## Commands

```sh
python scripts/check_site.py
node --check assets/js/main.js
python -m http.server 8000 --bind 127.0.0.1
```
