# Triplicat

Static website for triplicat.com: free lab calculators, an in-browser analysis toolkit (enzyme kinetics, Bradford, thermal shift) and articles. Audience: wet-lab students and researchers who measure more often than they code.

If `CLAUDE.local.md` exists in this folder, read it first. It holds the owner's context, working preferences, decisions and open steps, and is not part of the public repository.

## Layout

- `docs/` is the website and what GitHub Pages serves.
- `docs/build.py` generates every `.html` file plus `sitemap.xml`, `robots.txt`, `favicon.svg`, `CNAME`, `.nojekyll`. Page texts, `BRAND`, `SITE_URL`, `LEGAL`, `HOSTING`, the `TILES`, `TOOLS` and `ARTICLES` lists all live in it.
- `docs/src/cards.html` holds the markup of the calculator cards.
- `docs/css/site.css` and `docs/js/*.js` are hand-written and edited directly.
- `Articles/*.md` are the article sources.

## Rules that are easy to break

- **Never edit generated files by hand** (`docs/*.html`, sitemap, robots, favicon, CNAME). Change `build.py`, `src/cards.html` or the Markdown, then run `python3 docs/build.py`. The build must leave `git status` clean when nothing changed.
- **No third-party requests.** No CDN scripts, no web fonts, no analytics. Everything the pages need is in `docs/`. This is a promise made on the site and in the privacy notice ("nothing leaves your device").
- **User data stays in the browser.** Analyses must never send values or files anywhere. The one exception is the click counter for the demand test: `COUNTER["endpoint"]` in `build.py` (GoatCounter pixel API). When it is set, `site.js` sends only an event name (`pro-<page>`, `waitlist-pro`, `waitlist-updates`) on those clicks, never on page load and never any data, and the privacy notice gets its "Click counter" section automatically. Any other provider has to be named in the privacy notice before it is switched on. The waiting list is a `mailto:` link to the contact address, not a form provider.
- **Legal gate.** While `LEGAL` has empty fields the build prints `NOT READY TO PUBLISH` and the legal page shows a red notice. Do not remove this check. The legal text is a template, not legal advice.
- **Site language is English, with a decimal point in output.** Input accepts both comma and point. German CSV (semicolon, decimal comma) must keep working.
- **No em or en dashes in any written text** (pages, articles, notes, commit messages, chat). Use commas, parentheses or separate sentences. The minus sign (U+2212) is fine. The long dash used as an "empty value" marker in result tables is a known leftover.
- **Honest labelling.** Demo data is synthetic and is labelled as such. Do not present planned features as existing. The Pro version does not exist; the panel says so.
- **Never invent references, numbers or measurement data** in articles or page texts. If a fact is not verified, say so in the Markdown and leave it out of the published text.

## How the pieces work

**Build (`docs/build.py`)**
- `page(fname, title, desc, body, current, scripts, robots)` wraps every page in the shared header, footer and head tags, appends a content hash to local css/js links (cache busting) and records the page for the sitemap. Pages with `noindex` are left out of the sitemap.
- The landing page is written before the articles are loaded; its teaser row is filled in afterwards via the `__ARTICLE_TEASERS__` placeholder.
- Articles: `load_article()` strips frontmatter, callout lines (starting with `>`), the `**Target search:**` and `**Links to:**` lines, and everything from `## Open points for Linus` on. Open points are not kept in the public sources: they live in `Articles/open-points.local.md`, which is excluded from git on the owner's machine. Put new ones there, not in the article files. `md_to_html()` is a small converter that knows h2/h3, paragraphs, bullet lists, fenced code, inline code, bold, italic and links. Inline HTML such as `<sub>` passes through. No tables or images yet.
- `ARTICLES_REVIEWED` is one switch for all articles. `False` adds a draft notice and `noindex`. Set it to `False` when adding an unchecked article, or make it per-article first.

**Calculators (`js/calc.js`, `src/cards.html`)**
- Seven tools on one page: dilution, mass and molarity, percent solution, dilution series, master mix, A280, rpm and RCF. Ported from the owner's private dashboard module (German) and translated. A Bradford calculator was removed on purpose because Bradford belongs to the toolkit.
- `sig()` cuts floating-point dust to 12 significant digits before rounding. Keep that.
- The RCF constant is `1.118e-6` for a radius in mm (it would be `1.118e-5` for cm).
- In the dilution series, every printed column must follow from the others (transfer + diluent = prepared).

**Toolkit**
- `js/stats.js`: numerics only, no DOM, also loadable in Node (`require`). Table parsing, linear and quadratic least squares with standard errors, Levenberg-Marquardt nonlinear least squares, Michaelis-Menten fit, Savitzky-Golay derivative, Tm search, Welch t test, Student t functions.
- `js/toolkit.js`: SVG plot builder with a screen palette (light and dark) and a fixed light palette for export, the watermark, editable title and axis labels (`applyLabels`), downloads (SVG, PNG, CSV, text) and `wire()`, which reruns the analysis on every input, on theme change and after a file was opened.
- `js/xlsx.js`: self-written reader for the first worksheet of an `.xlsx` or `.xlsm` file (zip directory, `DecompressionStream`, `DOMParser`). No library. Old `.xls` is rejected with a message.
- `js/tool-kinetics.js`, `js/tool-bradford.js`, `js/tool-tsa.js`: one file per analysis. Each reads the textarea, runs the fit, renders plot, table and notes, and offers downloads. Kinetics and Bradford also export an R script that reproduces the fit.
- Methods, as stated on the pages: Michaelis-Menten by nonlinear least squares on all individual points with confidence intervals as estimate ± t · SE; Bradford as a linear or quadratic fit through all individual readings with the blank at 0 included; Tm as the maximum of dF/dT from a quadratic Savitzky-Golay filter (default 9 points), refined with a parabola, or (switch "Tm method") by a Boltzmann fit `boltzFit()` from the lowest reading before the maximum up to the maximum, where a Tm outside that range counts as "no transition"; ΔTm with a 95 % CI from the Welch test. `boltzFit` matched SciPy `curve_fit` to 1e-5 °C (Tm) and 1e-4 relative (SE) on synthetic curves and a real 48-well plate; the Welch CI matched SciPy `ttest_ind(...).confidence_interval()` to 8 digits.

## Verifying changes

Do not report a change as working without checking it.

- **Numerics:** any change in `stats.js` is compared against SciPy or R on synthetic data before it ships. The existing functions matched SciPy to 1e-6 relative for the Michaelis-Menten fit (parameters, SE, CI) and to machine precision for regression, Savitzky-Golay, Welch test and t quantiles. The demo results matched R (`nls`, `lm`). Python with SciPy and `Rscript` are available on the owner's machine.
- **Pages:** start the preview (`python3 -m http.server 8765 --directory docs`, also defined in `.claude/launch.json`), load the page, click "Load demo data", read the results and the console. Check desktop width, phone width (375 px, no horizontal scroll) and both colour schemes.
- **Syntax:** `node --check docs/js/<file>.js` for every edited script.
- Say plainly what was not tested. Known untested areas: real instrument exports, workbooks saved by Excel itself, the actual download files, real phones, browsers other than the built-in one.

## Adding things

- **Article:** new Markdown file in `Articles/` (same structure as the existing ones), one line in `ARTICLES` in `build.py`, build.
- **Calculator:** card markup in `src/cards.html`, a function in `calc.js` added to `ALL`, an entry in `NAV` and `TILES` in `build.py` (keep the tile grid filling its rows), and its id in one of the two `CALC_COLS` lists (keep both columns about equally tall; the build stops if the ids do not match).
- **Analysis:** numerics in `stats.js` (validated), a `tool-<name>.js`, a `tool(...)` call and a `TOOLS` entry in `build.py`.

## Publishing

Steps are in `README.md`. Pushing to the public repository publishes the site, so push only when the owner asks for it in that session.
