# Glide Site

The marketing and landing pages for **[glide-lang.org](https://glide-lang.org)** — the home of the [Glide programming language](https://github.com/glide-lang/Glide).

This repository holds only the static site (the home page, tutorial, comparisons, and assets). The **book** lives in [glide-lang/glide-book](https://github.com/glide-lang/glide-book), and the **server** that serves both is the Glide proxy.

## Layout

The site is organized **one folder per language**, so adding a language is just a new folder:

- `en/` — English.
- `pt-br/` — Portuguese (Brazil).
- *(more languages land as sibling folders: `es/`, `fr/`, …)*

Each language folder holds the same set of pages:

- `index.html` — home page.
- `tutorial.html` — short language tour.
- `vs-go.html`, `vs-rust.html`, `vs-zig.html` — comparisons.
- `examples.html` — code gallery.
- `404.html` — not-found page.

Shared, language-independent files live at the root:

- `css/`, `js/`, `assets/` — styles, scripts, images, fonts (referenced by absolute paths, e.g. `/css/style.css`).
- `install.sh`, `install.ps1` — the one-line installers.
- `robots.txt`, `sitemap.xml`, `llms.txt` — crawler / SEO / LLM metadata.

## Languages & URLs

English is the default language, served at the root (`/`, `/tutorial`, …); each other language is served under its own prefix matching its folder (`/pt-br/`, `/pt-br/tutorial`, …). All languages are kept at parity. The actual URL routing is done by the [proxy](https://github.com/glide-lang/glide-proxy).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for how to make changes. Report security issues per [`SECURITY.md`](SECURITY.md).

## License

[MIT](LICENSE) © Murillo Deolino.
