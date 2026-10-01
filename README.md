# Tooth Talk With Maddie

A static dental education website for Madison Migliore, RDH. Built with HTML, CSS, and JavaScript; no build step or package installation is required.

## Run locally

From the project directory, run Python 3:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Open http://localhost:8000. Use a local server: product search loads JSON with fetch and cannot reliably run from a file URL.

## Project layout

```text
index.html             Home and biography
whd.html               Dental hygienist responsibilities
sogd.html              Stages of gum disease
hshy.html              Oral health and overall health
cpd.html               Cavity prevention and decay
pr.html                Product recommendations
assets/css/styles.css  Shared responsive styles
assets/js/main.js      Product search and back to top
assets/images/         Site and product images
data/products.json     Product search catalog
data/topics.json       Educational search catalog
scripts/check_site.py  Structure and asset checks
```

Existing page URLs are retained for bookmarks and GitHub Pages. Untracked tire artwork in the root is unrelated and has been left in place.

## Editing

- Edit page content in its HTML file. Navigation is static so it works without JavaScript; update all six pages when adding a link.
- Use the shared stylesheet for visual changes.
- Update both data/products.json and the cards in pr.html when changing products. Image paths are relative to the site root.
- Search matches topics, names, categories, descriptions, and keywords. It handles partial loading failures and closes with Escape or an outside click. Update data/topics.json when changing a guide. Product filters progressively enhance the static catalog; all products remain readable without JavaScript.
- The unrelated world population widget and its external API request have been removed.

## Verification

```sh
python scripts/check_site.py
node --check assets/js/main.js
```

The Python check validates nesting, unique IDs, landmarks, current navigation links, local file references, and product records. Also preview desktop and narrow layouts and try search, empty results, Escape, and back to top.

## Deployment

The existing GitHub Actions workflow publishes static files to GitHub Pages on pushes to main. Relative paths support repository subdirectory hosting. Local preview does not deploy changes.

## Content maintenance

Educational guides and product guidance were checked against the linked NIDCR, ADA, and BLS sources on October 1, 2026. This is an editorial source check, not clinician sign-off. Do not label it as reviewed by Maddie unless she reviews it. Retailer availability and pricing remain unverified.

Optimized WebP assets are served where smaller, with original images retained. Images include dimensions; below-the-fold product images load lazily. See QUALITY.md for validation and remaining browser checks.
