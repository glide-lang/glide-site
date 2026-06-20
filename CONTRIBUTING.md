# Contributing to the Glide Site

Thanks for helping improve [glide-lang.org](https://glide-lang.org). This repository holds the static marketing/landing pages only — not the book (see [glide-lang/glide-book](https://github.com/glide-lang/glide-book)) and not the server.

## What you can contribute

- **Fixes**: typos, broken links, layout bugs, outdated version numbers or examples.
- **Polish**: copy, accessibility, SEO/structured-data, responsive behavior.
- **Translations**: keeping the Portuguese (`pt/`) pages at parity with English.

## Layout

- Root: English pages (`index.html`, `tutorial.html`, `vs-*.html`, `examples.html`, `404.html`).
- `pt/`: Portuguese mirror of those pages.
- `css/`, `js/`, `assets/`: shared styles, scripts, and media.

A change to a page in one language should be mirrored in the other. If you can only do one, say so in the pull request.

## Conventions

- Plain, hand-written HTML/CSS/JS — no build step.
- Keep the existing structure, class names, and JSON-LD/structured-data shape.
- Code samples on the pages must compile and behave as shown on the current Glide release; bump version strings when the language ships a new version.
- Keep prose direct.

## Pull requests

1. Fork and branch from `main`.
2. One focused change per pull request.
3. Check the page renders in a browser and the Portuguese mirror still matches.

By contributing you agree that your work is licensed under the repository's [MIT License](LICENSE).
