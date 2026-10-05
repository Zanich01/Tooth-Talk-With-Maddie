# Tooth Talk With Maddie

A static dental education website for Madison Migliore, RDH. Built with HTML, CSS, and JavaScript; no build step or package installation is required.

## Run locally

Run `node server.cjs` from the project directory, then open http://127.0.0.1:8000. Node 22 or newer is sufficient; no package installation or AI credential is needed. The server provides both the site and the intent-based answer endpoint.

For a static-only preview, `python -m http.server 8000 --bind 127.0.0.1` still works. The chat automatically uses the identical engine in the browser when the backend is unavailable. Product search needs a local server to fetch JSON.

## Project layout

```text
index.html             Home
about.html             Biography and full-size logo
faq.html               Common oral care questions
homecare-routine.html  Daily care techniques
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

- Edit page content in its HTML file. Navigation is static so it works without JavaScript; update all HTML pages when adding a link.
- Use the shared stylesheet for visual changes.
- Update both data/products.json and the cards in pr.html when changing products. Image paths are relative to the site root.
- Search matches topics, names, categories, descriptions, and keywords. It handles partial loading failures and closes with Escape or an outside click. Update data/topics.json when changing a guide. Product filters match each unique card to one or more care needs and progressively enhance the static catalog; all products remain readable without JavaScript.
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

## Future Amazon affiliate links

Current retailer links remain ordinary links. Before monetization, supply the approved Amazon Associates URLs for the exact products; do not invent a tracking tag or silently change product variants. Update both pr.html and data/products.json. Add a clear commission disclosure near shopping links and search product results, and prominently display: “As an Amazon Associate I earn from qualifying purchases.” Mark affiliate links with rel="sponsored noopener noreferrer". Verify product image rights and current Amazon program policies before launch. Compensation is for qualifying purchases under the program, not simply for clicks. See https://affiliate-program.amazon.com/help/node/topic/GPXFHVYZMTGPUMPE.

## Dental question engine

The Q&A chat uses 24 sourced answers in `data/answers.json`. The shared `assets/js/dental-engine.js` recognizes question intent, topic aliases, basic negation, and selected contextual follow-ups. It distinguishes appointment preparation from visit frequency, symptoms from routine questions, and adult from baby loose teeth. Close matches and incomplete questions can request clarification; unsupported questions receive a fallback instead of invented advice. This is a curated intent system, not generative AI or a diagnostic tool. Coverage remains limited and clinician review is pending.

`server.cjs` provides `POST /api/answer` with `{question, context}` and returns an answer, clarification, or unknown result. Context includes only the last answer intent. The browser handles chat history and does not persist it. The local server does not log or save questions and makes no outside AI calls. It binds to loopback, limits body size and requests, checks origins, and only serves public website files. If it is unavailable, the browser resolves answers with the same engine and catalog.

The existing GitHub Pages deployment runs the browser engine only. Hosting the Node backend publicly would require a server-capable host and deployment work; this local preview does not deploy it. Public hosting may cost money even though the engine has no API usage charges. The basic per-process rate limit is for local/small-instance use; shared deployment needs coordinated limits.

Validation:

```
node scripts/check_answers.cjs
node scripts/check_backend.cjs
python scripts/check_site.py
```

Before changing answer wording, verify the linked clinical sources and obtain Maddie’s review. Add regression examples for each new intent, ambiguous wording, and unsupported requests. Do not call the system clinician-reviewed until that review happens.

## Floating chat

Every page has an “Ask a question” launcher in place of the former back-to-top button. It opens a nonmodal chat panel so the current guide stays visible. Closing and reopening preserves that page’s conversation; navigating or reloading starts a new session. The Q&A page moves its existing conversation into the panel and restores it on close, avoiding duplicate chats. Other pages load the conversation markup and scripts directly into the page when the launcher is opened, avoiding a separate iframe viewport on mobile. Close with the close button or Escape. The launcher and panel are excluded from print layouts.

## Daily routine update

The Homecare Routine and FAQ pages present Maddie’s preference to floss first, then brush. Walkthroughs follow that sequence; water flossing is described as additional gum care. The library now has 27 sourced answers, including technique, tool alternatives, and floss reuse. Regression checks ensure tool mentions do not override bleeding-gum or frequency questions. Clinician review remains pending.
