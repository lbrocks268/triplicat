#!/usr/bin/env python3
"""Builds the static pages. Run from anywhere:  python3 build.py

Change BRAND here and rerun to rename the site everywhere.
The calculator cards live in src/cards.html (plain HTML, edit there).
"""
import hashlib
from urllib.parse import quote
import re
from pathlib import Path

BRAND = "Triplicat"   # chosen by Linus 2026-11-16 (triplicat.com unregistered that day); trademark registers not checked
ROOT = Path(__file__).resolve().parent
SITE_URL = "https://triplicat.com"     # used for canonical links, sitemap and the CNAME file

# ---- Fill in before going online. While a field is empty, the legal page shows a red notice
# ---- and the build ends with "NOT READY TO PUBLISH". Template only, not legal advice.
LEGAL = {
    "name": "Linus Brocks",        # full name of the person responsible, e.g. "Max Mustermann"
    "street": "Eckenerstraße 11",      # street and number of an address where post reaches you
    "city": "48147 Münster",        # postcode and city
    "country": "Germany",
    "email": "triplicat.service@gmail.com",       # contact address, e.g. "hello@triplicat.com"
}
HOSTING = {            # the privacy notice names the hosting provider; change if you host elsewhere
    "name": "GitHub Pages",
    "company": "GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA",
    "privacy_url": "https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement",
}
COUNTER = {            # click counter for the demand test; empty endpoint = nothing is sent anywhere
    "endpoint": "https://triplicat.goatcounter.com/count",
    "name": "GoatCounter",
    "company": "GoatCounter (operated by Martin Tournoij, Ireland; servers at Hetzner Online GmbH in Germany and Finland)",
    "privacy_url": "https://www.goatcounter.com/help/privacy",
}
LEGAL_READY = all(LEGAL[k].strip() for k in ("name", "street", "city", "email"))
PAGES = []             # (file name, indexable) for the sitemap

LOGO = ('<svg viewBox="0 0 28 28" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="1" x2="1" y2="0">'
        '<stop offset="0" stop-color="#5b78ff"/><stop offset="1" stop-color="#2fe0b0"/></linearGradient></defs>'
        '<rect width="28" height="28" rx="8" fill="#12141a"/>'
        '<path d="M6 21c2.2-9.5 6.5-13 16-13.6" fill="none" stroke="url(#lg)" stroke-width="2.6" stroke-linecap="round"/>'
        '<circle cx="8.6" cy="15.4" r="1.6" fill="#fff"/><circle cx="14.6" cy="10.2" r="1.6" fill="#fff"/></svg>')
ICON_THEME = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">'
              '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" fill="currentColor"/></svg>')
CHECK = ('<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" '
         'stroke-linejoin="round" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 4.8"/></svg>')
THEME_BOOT = ("<script>try{var t=localStorage.getItem('theme');"
              "if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}</script>")


COUNTER_ATTR = f' data-counter="{COUNTER["endpoint"]}"' if COUNTER["endpoint"] else ""


def page(fname, title, desc, body, current="", scripts="", robots=""):
    PAGES.append((fname, "noindex" not in robots))
    canonical = SITE_URL + "/" + ("" if fname == "index.html" else fname)
    plain_title = title.replace('"', "&quot;")
    def nav(href, label, key):
        cur = ' aria-current="page"' if key == current else ""
        return f'<a href="{href}"{cur}>{label}</a>'
    html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">{robots}
<meta name="theme-color" content="#f7f5ef" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0c0d11" media="(prefers-color-scheme: dark)">
<link rel="canonical" href="{canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{BRAND}">
<meta property="og:title" content="{plain_title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{canonical}">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
{THEME_BOOT}
<link rel="stylesheet" href="css/site.css">
</head>
<body data-brand="{BRAND}"{COUNTER_ATTR}>
<header class="top"><div class="wrap">
<a class="brand" href="index.html" aria-label="{BRAND} home">{LOGO}<b>{BRAND}</b></a>
<nav aria-label="Main">{nav("calculators.html", "Calculators", "calc")}{nav("toolkit.html", "Toolkit", "kit")}{nav("articles.html", "Articles", "art")}
<button class="theme" id="theme" type="button" aria-label="Switch between light and dark">{ICON_THEME}</button></nav>
</div></header>
{body}
<footer class="foot"><div class="wrap">
<span>{BRAND} &middot; Check critical results yourself before you pipette.</span>
<nav aria-label="Footer"><a href="calculators.html">Calculators</a><a href="toolkit.html">Toolkit</a><a href="articles.html">Articles</a><a href="legal.html">Imprint &amp; privacy</a></nav>
</div></footer>
<script src="js/site.js"></script>{scripts}
</body>
</html>
"""
    # cache busting: append a content hash to local css/js so browsers never show a stale version
    def bust(m):
        f = ROOT / m.group(2)
        return f'{m.group(1)}"{m.group(2)}?v={hashlib.md5(f.read_bytes()).hexdigest()[:8]}"'
    html = re.sub(r'((?:src|href)=)"((?:css|js)/[\w.-]+)"', bust, html)
    (ROOT / fname).write_text(html, encoding="utf-8")


# ---------- Hero plot: Michaelis-Menten demo curve (synthetic values) ----------
VMAX, KM, SMAX, VTOP = 12.4, 0.85, 8.0, 13.6
X0, X1, Y0, Y1 = 46, 466, 240, 22
def px(s): return X0 + s / SMAX * (X1 - X0)
def py(v): return Y0 - v / VTOP * (Y0 - Y1)
def mm(s): return VMAX * s / (KM + s)
curve = "M" + " L".join(f"{px(i * SMAX / 80):.1f} {py(mm(i * SMAX / 80)):.1f}" for i in range(81))
noise = [1.06, 0.95, 1.04, 0.97, 1.03, 0.985, 1.02, 0.99]
pts = "".join(
    f'<circle class="pt" cx="{px(s):.1f}" cy="{py(mm(s) * n):.1f}" r="4.6" style="animation-delay:{0.5 + i * 0.13:.2f}s"/>'
    for i, (s, n) in enumerate(zip([0.25, 0.5, 1, 2, 3, 4, 6, 8], noise)))
xt = "".join(f'<text class="lbl" x="{px(s):.0f}" y="258" text-anchor="middle">{s}</text>' for s in (0, 2, 4, 6, 8))
yt = "".join(f'<text class="lbl" x="38" y="{py(v) + 4:.0f}" text-anchor="end">{v}</text>'
             f'<line class="gridl" x1="{X0}" x2="{X1}" y1="{py(v):.1f}" y2="{py(v):.1f}"/>' for v in (4, 8, 12))
PLOT = f"""<figure class="plot" style="margin:0">
<div class="plot-head"><span class="dots"><i></i><i></i><i></i></span><span><b>kinetics.csv</b> &rarr; fit</span></div>
<svg viewBox="0 0 480 280" role="img" aria-label="Michaelis-Menten curve fitted through eight demo data points">
<defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/></linearGradient></defs>
{yt}
<line class="axis" x1="{X0}" x2="{X1}" y1="{Y0}" y2="{Y0}"/><line class="axis" x1="{X0}" x2="{X0}" y1="{Y1}" y2="{Y0}"/>
<line class="guide" x1="{px(KM):.1f}" x2="{px(KM):.1f}" y1="{Y0}" y2="{py(VMAX / 2):.1f}"/>
<line class="guide" x1="{X0}" x2="{px(KM):.1f}" y1="{py(VMAX / 2):.1f}" y2="{py(VMAX / 2):.1f}"/>
<text class="lbl" x="{px(KM) + 6:.0f}" y="{Y0 - 8}" style="fill:var(--accent-strong)">Km</text>
<path class="curve" d="{curve}"/>
{pts}
{xt}
<text class="lbl" x="{X1}" y="276" text-anchor="end">[S] / mM</text>
<text class="lbl" x="{X0 + 8}" y="{Y1 + 4}">v / U mg&#8315;&#185;</text>
</svg>
<div class="readout"><div><span>Vmax</span><b>{VMAX}</b></div><div><span>Km / mM</span><b>{KM}</b></div><div><span>R&sup2;</span><b>0.997</b></div></div>
<figcaption class="plot-cap">Illustration with made-up demo values.</figcaption>
</figure>"""

TOOLS = [
    ("kinetics.html", "Enzyme kinetics", "Michaelis-Menten fit with K<sub>m</sub>, V<sub>max</sub>, standard errors and confidence intervals.", "v = V<sub>max</sub>&middot;[S] / (K<sub>m</sub> + [S])"),
    ("bradford.html", "Bradford", "Standard curve, linear or quadratic, and the concentration of every sample with its dilution.", "A = b&#8320; + b&#8321;&middot;c"),
    ("thermal-shift.html", "Thermal shift", "T<sub>m</sub> per well from the melting curve, group means and the shift against a reference.", "T<sub>m</sub> = max dF/dT"),
]
# Small schematic drawings for the toolkit cards. Shapes from textbook formulas, no measured data, no numbers.
def _ill(kind):
    W, H, X0, X1, Y0, Y1 = 240, 116, 16, 228, 10, 98
    def path(pts): return "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts)
    sx = lambda t, a, b: X0 + (t - a) / (b - a) * (X1 - X0)
    sy = lambda v, a, b: Y1 - (v - a) / (b - a) * (Y1 - Y0)
    o = [f'<svg class="ill" viewBox="0 0 {W} {H}" aria-hidden="true" focusable="false">',
         f'<path class="ax" d="M{X0} {Y0 - 4} L{X0} {Y1} L{X1 + 4} {Y1}"/>']
    if kind == "kinetics":
        km, vmax = 1.6, 1.0
        f = lambda s: vmax * s / (km + s)
        X = lambda s: sx(s, 0, 10); Y = lambda v: sy(v, 0, 1.15)
        o.append(f'<path class="g" d="M{X0} {Y(vmax):.1f} L{X1} {Y(vmax):.1f}"/>')
        o.append(f'<path class="g" d="M{X0} {Y(vmax / 2):.1f} L{X(km):.1f} {Y(vmax / 2):.1f} L{X(km):.1f} {Y1}"/>')
        o.append(f'<path class="c1" d="{path([(X(s / 10), Y(f(s / 10))) for s in range(0, 101)])}"/>')
        for s, e in [(0.3, .02), (0.7, -.03), (1.2, .03), (2, -.02), (3.2, .02), (5, -.02), (7.5, .015), (9.6, -.01)]:
            o.append(f'<circle class="pt" cx="{X(s):.1f}" cy="{Y(f(s) + e):.1f}" r="3"/>')
        o.append(f'<text x="{X1}" y="{Y(vmax) - 5:.1f}" text-anchor="end">V<tspan dy="2" font-size="8">max</tspan></text>')
        o.append(f'<text x="{X(km):.1f}" y="{H - 3}" text-anchor="middle">K<tspan dy="2" font-size="8">m</tspan></text>')
    elif kind == "bradford":
        f = lambda c: 0.06 + 0.95 * c - 0.28 * c * c
        X = lambda c: sx(c, 0, 1); Y = lambda a: sy(a, 0, 0.85)
        a_s = 0.42
        c_s = (0.95 - (0.95 ** 2 - 4 * 0.28 * (a_s - 0.06)) ** 0.5) / (2 * 0.28)
        o.append(f'<path class="g" d="M{X0} {Y(a_s):.1f} L{X(c_s):.1f} {Y(a_s):.1f} L{X(c_s):.1f} {Y1}"/>')
        o.append(f'<path class="c1" d="{path([(X(c / 100), Y(f(c / 100))) for c in range(0, 101)])}"/>')
        for c, e in [(0, .01), (0.1, -.012), (0.2, .012), (0.4, -.01), (0.6, .012), (0.8, -.01), (1.0, .008)]:
            o.append(f'<circle class="pt" cx="{X(c):.1f}" cy="{Y(f(c) + e):.1f}" r="3"/>')
        o.append(f'<circle class="sm" cx="{X(c_s):.1f}" cy="{Y(a_s):.1f}" r="4.2"/>')
        o.append(f'<text x="{X(c_s) + 8:.1f}" y="{Y(a_s) + 14:.1f}">sample</text>')
    else:
        X = lambda t: sx(t, 25, 85); Y = lambda v: sy(v, 0, 1.12)
        def melt(tm): return lambda t: 0.05 + 0.95 / (1 + 2.718281828 ** ((tm - t) / 2.2)) - max(0.0, t - tm - 7) * 0.012
        for cls, tm in (("c1", 48), ("c2", 58)):
            m = melt(tm)
            o.append(f'<path class="{cls}" d="{path([(X(25 + t * 0.6), Y(m(25 + t * 0.6))) for t in range(0, 101)])}"/>')
        o.append(f'<path class="g" d="M{X(48):.1f} {Y0 + 12} L{X(48):.1f} {Y1}"/><path class="g" d="M{X(58):.1f} {Y0 + 12} L{X(58):.1f} {Y1}"/>')
        o.append(f'<path class="ar" d="M{X(48) + 3:.1f} {Y0 + 16} L{X(58) - 3:.1f} {Y0 + 16} M{X(58) - 8:.1f} {Y0 + 12} L{X(58) - 3:.1f} {Y0 + 16} L{X(58) - 8:.1f} {Y0 + 20}"/>')
        o.append(f'<text x="{(X(48) + X(58)) / 2:.1f}" y="{Y0 + 8}" text-anchor="middle">&#916;T<tspan dy="2" font-size="8">m</tspan></text>')
    return "".join(o) + "</svg>"

ILL = {"kinetics.html": "kinetics", "bradford.html": "bradford", "thermal-shift.html": "tsa"}
KIT_SHORT = {"kinetics.html": "K<sub>m</sub> and V<sub>max</sub> with confidence intervals.",
             "bradford.html": "Standard curve and the concentration of every sample.",
             "thermal-shift.html": "T<sub>m</sub> and &Delta;T<sub>m</sub>, plate layout and instrument exports."}
KIT_LINKS = "".join(f'<a href="{h}">{_ill(ILL[h])}<div><b>{t}</b><span>{KIT_SHORT[h]}</span></div></a>' for h, t, d, f in TOOLS)
TILES = [
    ("dilution", "Dilution", "Stock and solvent volumes for any target.", "C&#8321;V&#8321; = C&#8322;V&#8322;", "wide tint"),
    ("molarity", "Mass and molarity", "What to weigh, shown as it reads on the balance.", "m = c&middot;V&middot;M", ""),
    ("percent", "Percent solution", "% (w/v) and % (v/v).", "g <small>/</small> 100 mL", ""),
    ("series", "Dilution series", "Constant factor or a free list of targets, with a pipetting table.", "1:2 &rarr; 1:5 &rarr; 1:10", "wide"),
    ("mastermix", "Master mix", "Any components, excess included, water as the remainder.", "n &times; (1 + 10 %)", "wide"),
    ("a280", "A&#8322;&#8328;&#8320;", "Protein concentration from absorbance.", "A = &epsilon;&middot;c&middot;d", "wide"),
    ("rcf", "rpm &harr; RCF", "Both directions, radius in mm or cm.", "1.118&middot;10&#8315;&#8310;&middot;r&middot;rpm&sup2;", "wide"),
]
tiles = "".join(
    f'<a class="tile {cls}" href="calculators.html#{i}"><span class="go" aria-hidden="true">&#8599;</span>'
    f'<div class="f">{f}</div><div><b>{t}</b><span class="d">{d}</span></div></a>'
    for i, t, d, f, cls in TILES)

page("index.html", f"{BRAND} | Calculators and analysis tools for the wet lab",
     "Free lab calculators for dilutions, molarity, master mixes, A280 and RCF, plus an in-browser analysis toolkit for enzyme kinetics, Bradford and thermal shift data.",
     f"""<main>
<section class="hero"><div class="wrap">
  <div>
    <span class="eyebrow"><i></i>Free lab calculators &middot; no sign-up</span>
    <h1>Less arithmetic at the bench. <em>Cleaner numbers</em> in the notebook.</h1>
    <p class="sub">Seven calculators for everyday lab work, built for the phone next to your pipettes. And an analysis toolkit that turns raw measurements into fitted curves and figures, without programming.</p>
    <div class="btns">
      <a class="btn" href="calculators.html">Open the calculators <span class="arr" aria-hidden="true">&rarr;</span></a>
      <a class="btn ghost" href="toolkit.html">See the toolkit</a>
    </div>
    <div class="facts"><span>{CHECK}Runs in your browser</span><span>{CHECK}No data leaves your device</span><span>{CHECK}Comma or point decimals</span></div>
  </div>
  {PLOT}
</div></section>

<section class="sec"><div class="wrap">
  <div class="sec-head">
    <div><p class="kicker">Calculators</p><h2 class="big">The seven things you keep working out by hand.</h2></div>
    <a class="link" href="calculators.html">All on one page &rarr;</a>
  </div>
  <div class="bento">{tiles}</div>
</div></section>

<section class="sec"><div class="wrap">
  <div class="trio">
    <div><span class="n">01</span><h3>It tells you when not to trust it</h3><p>Volumes below what a pipette can deliver, targets above the stock concentration, absorbance beyond the linear range: flagged, not silently calculated.</p></div>
    <div><span class="n">02</span><h3>Made for one hand</h3><p>Large number fields, the numeric keypad on the phone, and results in the unit you actually set on the pipette or read on the balance.</p></div>
    <div><span class="n">03</span><h3>Nothing to install, nothing sent</h3><p>Every calculation happens on your device. No account, no tracking, and it keeps working when the lab Wi-Fi does not.</p></div>
  </div>
</div></section>

<section class="sec"><div class="wrap">
  <div class="ink">
    <div>
      <p class="kicker">Analysis toolkit &middot; beta</p>
      <h2>From raw export to a fit and a figure.</h2>
      <p>Enzyme kinetics, Bradford and thermal shift, analysed right in the browser. Paste from Excel or open a file; for thermal shift also the raw export of a qPCR instrument, grouped by your plate layout. No installation, and your data is not uploaded.</p>
      <a class="btn" href="toolkit.html">Open the toolkit <span class="arr" aria-hidden="true">&rarr;</span></a>
    </div>
    <div class="kits">{KIT_LINKS}</div>
  </div>
</div></section>

<section class="sec"><div class="wrap">
  <div class="sec-head">
    <div><p class="kicker">Articles</p><h2 class="big">The reasoning behind the numbers.</h2></div>
    <a class="link" href="articles.html">All articles &rarr;</a>
  </div>
  <div class="art-grid">__ARTICLE_TEASERS__</div>
</div></section>
</main>""")

# ---------- Calculators ----------
NAV = [("dilution", "Dilution"), ("molarity", "Molarity"), ("percent", "Percent"), ("series", "Series"),
       ("mastermix", "Master mix"), ("a280", "A&#8322;&#8328;&#8320;"), ("rcf", "rpm &harr; RCF")]
cards = (ROOT / "src" / "cards.html").read_text(encoding="utf-8")
# Two fixed columns instead of a row grid, so cards of different height do not leave gaps. Left: preparing
# (dilution, series, master mix); right: converting. On narrow screens the columns dissolve and the cards
# keep the order of NAV (CSS "order").
CALC_COLS = (["dilution", "series", "mastermix"], ["molarity", "percent", "a280", "rcf"])
def _split_cards(html):
    parts = re.split(r'(?=<section class="card calc-card" id=")', html.strip())
    out = {}
    for p in parts:
        m = re.match(r'<section class="card calc-card" id="([^"]+)"', p)
        if m: out[m.group(1)] = p.strip()
    return out
_cards = _split_cards(cards)
assert sorted(_cards) == sorted(i for c in CALC_COLS for i in c) == sorted(i for i, _ in NAV), "calculator ids differ between cards.html, NAV and CALC_COLS"
_order = {i: n for n, (i, _) in enumerate(NAV, 1)}
cards = "".join('<div class="calc-col">' + "\n".join(
    _cards[i].replace('<section class="card calc-card"', f'<section style="order:{_order[i]}" class="card calc-card"', 1) for i in col) + "</div>"
    for col in CALC_COLS)
page("calculators.html", f"Lab calculators: dilution, molarity, master mix, A280, RCF | {BRAND}",
     "Free lab calculators that run in your browser: C1V1 dilution, molarity, percent solutions, dilution series, PCR master mix, A280 protein concentration and rpm to RCF.",
     f"""<main class="wrap">
<div class="page-head"><h1>Lab calculators</h1>
<p>Everything is calculated in your browser and nothing leaves your device. Type a comma or a point as the decimal separator.</p></div>
<div class="calc-shell">
<nav class="calc-nav" aria-label="Calculators">{"".join(f'<a href="#{i}">{l}</a>' for i, l in NAV)}</nav>
<div class="calc-layout">
{cards}
</div>
</div>
</main>""", current="calc", scripts='\n<script src="js/calc.js"></script>')

# ---------- Toolkit hub ----------
hub = "".join(
    f'<a class="tile toolcard" href="{h}"><span class="go" aria-hidden="true">&#8599;</span>{_ill(ILL[h])}'
    f'<div><div class="f">{f}</div><b>{t}</b><span class="d">{d}</span></div></a>' for h, t, d, f in TOOLS)
page("toolkit.html", f"Analysis toolkit: enzyme kinetics, Bradford, thermal shift | {BRAND}",
     "Analyse enzyme kinetics, Bradford and thermal shift data in the browser: paste your values, get the fit, the numbers and a figure. No installation, no upload.",
     f"""<main class="wrap">
<div class="page-head">
  <span class="pill">Beta</span>
  <h1>From measurement to fit and figure.</h1>
  <p>Paste your values or open a file. The analysis runs in your browser, so nothing is installed and your data is not uploaded anywhere.</p>
</div>
<div class="bento three" style="margin-top:36px">{hub}</div>

<h2 class="sub">How it works</h2>
<div class="cols">
  <div class="panel"><span class="n">01</span><h3>Paste or open</h3><p>Copy the cells from Excel, or open an .xlsx or CSV file. Decimal commas and semicolons are understood.</p></div>
  <div class="panel"><span class="n">02</span><h3>Check the fit</h3><p>Parameters with their uncertainty, the plot, and warnings when the data do not support the result.</p></div>
  <div class="panel"><span class="n">03</span><h3>Take it with you</h3><p>Figure as SVG or PNG, results as CSV, and an R script that reproduces the fit for your methods section.</p></div>
</div>

<h2 class="sub">What beta means</h2>
<p class="lead-p">The calculations were checked against SciPy on test data. Compare important results with a second method before they go into a thesis or paper, and read the notes under each result: they say which method was used and where it stops being reliable.</p>

<div class="wl" id="waitlist" style="margin-top:56px">
  <h2>Updates</h2>
  <p>Want to hear when new analyses or the Pro version arrive? Send a short email and I will let you know. Your address is used for nothing else, and one reply is enough to have it deleted.</p>
  <p><a class="btn accent" href="mailto:{LEGAL["email"]}?subject=Triplicat%20updates" data-count="waitlist-updates">Email me about updates</a></p>
</div>
</main>""", current="kit")


# ---------- Analysis pages ----------
def data_box(tid, label, hint, rows=11, demo=True):
    btn = '<button class="chip" type="button" data-act="demo">Load demo data</button>' if demo else ""
    return f"""<div class="field"><div class="field-head"><label for="{tid}">{label}</label>
<span class="chips">{btn}<label class="chip">Open file<input type="file" accept=".xlsx,.xlsm,.csv,.tsv,.txt" data-target="{tid}" hidden></label></span></div>
<textarea id="{tid}" rows="{rows}" spellcheck="false" autocomplete="off" placeholder="{hint}"></textarea></div>"""

def opt(label, inner): return f'<div class="calc-lbl">{label}</div><div class="calc-in">{inner}</div>'
def text_in(i, v, mode="text"): return f'<input id="{i}" type="text" inputmode="{mode}" autocomplete="off" value="{v}" placeholder="optional" style="text-align:left">'

WHATFOR = {
    "kinetics.html": "Characterising an enzyme, comparing mutants or substrates, and finding the conditions under which it works best.",
    "bradford.html": "Knowing how much protein is in a sample, for example after a purification step or before loading a gel.",
    "thermal-shift.html": "Finding out how stable a protein is and whether a ligand binds, for example in a buffer or ligand screen.",
}

def tool(fname, title, desc, h1, lead, inputs, options, script, second_plot=False, rscript=True, clear="in"):
    fig = (opt("Title", text_in("f_title", "")) + opt("X axis label", text_in("f_x", "")) + opt("Y axis label", text_in("f_y", ""))
           + (opt("Y axis label (derivative)", text_in("f_y2", "")) if second_plot else "")
           + opt("X axis from", '<input id="f_xmin" type="text" inputmode="decimal" autocomplete="off" placeholder="auto" style="text-align:left">')
           + opt("X axis to", '<input id="f_xmax" type="text" inputmode="decimal" autocomplete="off" placeholder="auto" style="text-align:left">'))
    dl = ('<button class="chip" type="button" data-act="svg">Figure SVG</button><button class="chip" type="button" data-act="png">Figure PNG</button>'
          '<button class="chip" type="button" data-act="csv">Results CSV</button>'
          + ('<button class="chip" type="button" data-act="r">R script</button>' if rscript else ""))
    page(fname, f"{title} | {BRAND}", desc, f"""<main class="wrap wide">
<div class="page-head tool-head"><a class="crumb" href="toolkit.html">&larr; Toolkit</a>
<h1>{h1}</h1><p>{lead}</p>
<p class="whatfor"><b>What is this for?</b> {WHATFOR[fname]} <a href="enzyme-kinetics-bradford-thermal-shift.html">Which assay answers which question &rarr;</a></p></div>
<div class="tool">
  <section class="card tool-in" aria-label="Data">
    {inputs}
    <div class="calc-grid" style="margin-top:14px">{options}</div>
    <details class="figopts"><summary>Figure labels</summary><div class="calc-grid">{fig}</div>
    <p class="muted" style="margin:8px 0 0">Leave a field empty to use the default shown in grey. The axis range only changes the figure, not the calculation.</p></details>
    <div class="tool-foot"><button class="chip quiet" type="button" data-act="clear" data-target="{clear}">Clear</button>
    <span class="muted">Your data stays in this browser tab.</span></div>
    <label class="remember"><input type="checkbox" id="remember"> Remember my inputs in this browser (stored only on this device, untick to delete)</label>
    <p class="muted send-example">File from your instrument not read correctly? <a class="send-ex" href="mailto:{LEGAL["email"]}?subject={quote("Triplicat file example (" + h1 + ")")}&amp;body={quote("Instrument and software version:" + chr(10) + "What went wrong:" + chr(10) + chr(10) + "(Please attach the file. Only send data you are allowed to share.)")}">Send me an example</a> with the name of the instrument, and I will add the format. Only send data you are allowed to share.</p>
  </section>
  <section class="tool-out" aria-label="Results" aria-live="polite">
    <div class="card plotcard"><div id="out_plot"></div>{'<div id="out_plot2"></div>' if second_plot else ''}</div>
    <div class="card"><div id="out_res"></div><div id="out_notes"></div>
      <div class="dl" id="dl" hidden><span class="meta">Download</span>{dl}<button class="chip pro" type="button" data-act="pro" aria-controls="pro">Without watermark</button></div>
      <div class="pro-box" id="pro" hidden><span class="pill">Pro &middot; planned</span>
        <p>Downloads are free and carry a small &ldquo;made with {BRAND}&rdquo; mark. A paid Pro version is planned with:</p>
        <ul><li>figures without the mark, in print resolution</li><li>a report with the methods text for your thesis</li><li>several files in one go</li><li>more models, such as substrate inhibition</li></ul>
        <p class="muted">Pro is not available yet. If you would use it, <a href="mailto:{LEGAL["email"]}?subject=Triplicat%20Pro%20waiting%20list" data-count="waitlist-pro">send me a short email</a> and you will hear from me when it is ready.</p></div></div>
  </section>
</div>
</main>""", current="kit", scripts=f'\n<script src="js/stats.js"></script>\n<script src="js/xlsx.js"></script>\n<script src="js/toolkit.js"></script>\n<script src="js/{script}"></script>')

tool("kinetics.html", "Michaelis-Menten fit online: Km and Vmax with confidence intervals",
     "Fit Michaelis-Menten kinetics in the browser: paste substrate concentrations and rates, get Km and Vmax with standard errors, confidence intervals and a figure.",
     "Enzyme kinetics", "Michaelis-Menten fit by nonlinear least squares. First column substrate concentration, further columns rates, one column per replicate.",
     data_box("in", "Substrate concentration and rates", "S&#9;v1&#9;v2&#9;v3&#10;0.05&#9;0.71&#9;0.66&#9;0.74&#10;0.1&#9;1.34&#9;1.25&#9;1.41"),
     opt("Unit of [S]", text_in("u_s", "mM")) + opt("Unit of v", text_in("u_v", "U/mg")), "tool-kinetics.js")

tool("bradford.html", "Bradford assay calculator: standard curve and sample concentrations",
     "Bradford standard curve in the browser: linear or quadratic fit, sample concentrations with dilution factor, range checks and a figure.",
     "Bradford", "Standard curve and sample concentrations. Standards: first column concentration, further columns absorbance. Samples: name, optional dilution column, absorbance readings.",
     data_box("in", "Standards", "conc&#9;A1&#9;A2&#9;A3&#10;0&#9;0.052&#9;0.049&#9;0.055&#10;0.05&#9;0.146&#9;0.139&#9;0.151", rows=8)
     + data_box("in2", "Samples", "sample&#9;dilution&#9;A1&#9;A2&#10;Lysate&#9;20&#9;0.512&#9;0.498", rows=6, demo=False),
     '<div class="calc-lbl">Curve</div><div class="calc-mode" style="margin:0"><input type="radio" name="m" id="m_lin" checked><label for="m_lin">Linear</label>'
     '<input type="radio" name="m" id="m_quad"><label for="m_quad">Quadratic</label></div>' + opt("Unit of concentration", text_in("u_c", "mg/mL")),
     "tool-bradford.js", clear="in,in2")

tool("thermal-shift.html", "Thermal shift assay analysis: Tm and delta Tm from melting curves",
     "Analyse thermal shift (DSF) melting curves in the browser: Tm per well from the first derivative, group means, delta Tm against a reference and figures.",
     "Thermal shift", "Melting temperature from the steepest point of each curve. First column temperature, then one column per well, named like Reference_1, Reference_2, Ligand_1. Instrument exports with one row per well and reading are converted automatically.",
     '<div class="ptabs" id="ptabs" aria-label="Plates"></div><textarea id="plates_store" hidden aria-hidden="true" tabindex="-1"></textarea>'
     + data_box("in", "Temperature and fluorescence per well", "temp&#9;Reference_1&#9;Reference_2&#9;Ligand_1&#9;Ligand_2&#10;25&#9;118.2&#9;121.5&#9;119.9&#9;117.3", rows=12)
     + data_box("lay", "Plate layout (optional)", "&#9;1&#9;2&#9;3&#10;A&#9;Reference&#9;Ligand&#9;Ligand&#10;B&#9;Reference&#9;Ligand&#9;Ligand", rows=4, demo=False)
     + '<p class="muted" style="margin:8px 0 0">Needed when the wells are named by position (A01, B01, ...). Assign the samples on the plate below, or paste your plate map from the spreadsheet: row letters down, column numbers across, a sample name per well. Wells with the same name form a group, empty wells are left out. Write a combination as &ldquo;A + B&rdquo; (with spaces); the order does not matter.</p>'
     + '<p class="muted ped-hint" id="ped_hint" hidden>The wells in your data are named by sample (like Reference_1), so the groups come from those names and the plate layout is not used. To use the plate below, name the wells by position (A01, B01, ...), as instrument exports do.</p>'
     + '<div class="ped" id="ped"><div class="ped-head"><span class="meta">Plate</span><span class="muted">Click or drag over wells, type a name, press Enter.</span></div>'
       '<p class="muted" id="ped_empty" style="margin:0 0 6px; font-size:12.5px">No plate in the data yet. Plate shown: <select id="ped_size" aria-label="Plate size">'
       '<option value="24">24 wells</option><option value="48" selected>48 wells</option><option value="96">96 wells</option><option value="384">384 wells</option></select>'
       ' You can prepare the layout now; once data named by position are loaded, their plate is used.</p>'
       '<div class="calc-scroll"><div id="ped_grid"></div></div>'
       '<div class="ped-bar"><input id="ped_name" type="text" autocomplete="off" placeholder="Sample name" aria-label="Sample name for the selected wells">'
       '<button class="chip" type="button" data-ped="assign" title="Replace the name of the selected wells">Assign</button>'
       '<button class="chip" type="button" data-ped="add" title="Add this substance to what the selected wells already contain">Add</button>'
       '<button class="chip" type="button" data-ped="clear">Clear</button></div>'
       '<p class="muted" style="margin:6px 0 0; font-size:12.5px">Two substances in one well: assign the first, then select the wells again and click &ldquo;Add&rdquo; for the second. The name becomes &ldquo;A + B&rdquo;. You can also type it like that.</p>'
       '<div class="ped-bar"><button class="chip quiet" type="button" data-ped="all">Select all</button><button class="chip quiet" type="button" data-ped="none">Select none</button>'
       '<span class="muted">Number the selection in groups of</span><input id="ped_n" type="text" inputmode="numeric" autocomplete="off" value="3" aria-label="Wells per group">'
       '<button class="chip quiet" type="button" data-ped="down">down</button><button class="chip quiet" type="button" data-ped="across">across</button></div>'
       '<div class="ped-tpl"><div class="ped-head"><span class="meta">Templates</span><span class="muted">Save a layout you use often and load it for the next run. Stored only in this browser.</span></div>'
       '<div class="ped-bar"><select id="tpl_sel" aria-label="Saved templates"></select><button class="chip" type="button" data-ped="tload">Load</button><button class="chip quiet" type="button" data-ped="tdel">Delete</button></div>'
       '<div class="ped-bar"><input id="tpl_name" type="text" autocomplete="off" placeholder="Template name" aria-label="Template name"><button class="chip" type="button" data-ped="tsave">Save layout</button>'
       '<button class="chip quiet" type="button" data-ped="tdown">Download layout</button></div>'
       '<p class="muted" id="tpl_msg" style="margin:6px 0 0; font-size:12.5px" aria-live="polite"></p></div></div>',
     opt("Reference group", '<select id="o_ref" aria-label="Reference group" style="width:100%"></select>')
     + '<div class="calc-lbl">T<sub>m</sub> method</div><div class="calc-mode" style="margin:0"><input type="radio" name="tmm" id="t_der" checked><label for="t_der">First derivative</label>'
       '<input type="radio" name="tmm" id="t_bol"><label for="t_bol">Boltzmann fit</label></div>'
     + '<div class="calc-lbl" id="pl_lbl" hidden>Plates</div><div class="calc-mode" id="pl_box" style="margin:0" hidden><input type="radio" name="pl" id="a_raw" checked><label for="a_raw">As measured</label>'
       '<input type="radio" name="pl" id="a_ref"><label for="a_ref">Align on reference</label></div>'
     + opt("Smoothing window (points)", text_in("o_win", "9", "numeric"))
     + opt("Search from (&deg;C)", '<input id="o_min" type="text" inputmode="decimal" autocomplete="off" placeholder="optional">')
     + opt("Search to (&deg;C)", '<input id="o_max" type="text" inputmode="decimal" autocomplete="off" placeholder="optional">')
     + '<div class="calc-lbl">Curves</div><div class="calc-mode" style="margin:0"><input type="radio" name="v" id="v_well" checked><label for="v_well">Each well</label>'
       '<input type="radio" name="v" id="v_mean"><label for="v_mean">Mean per group</label></div>'
     + '<div class="calc-lbl">Scale</div><div class="calc-mode" style="margin:0"><input type="radio" name="n" id="n_raw" checked><label for="n_raw">Raw</label>'
       '<input type="radio" name="n" id="n_norm"><label for="n_norm">Normalised 0 to 1</label></div>',
     "tool-tsa.js", second_plot=True, rscript=False, clear="in,lay")

# ---------- Articles ----------
# Source of truth: the Markdown drafts in ../Articles/. Internal parts (frontmatter, warning box,
# "Target search" lines, "Open points for Linus") are stripped here and never reach the site.
# The last field says whether Linus has checked text and references. False builds the page with a
# draft notice and noindex, and keeps it out of the article list, the landing page and "More articles",
# so it can be read locally (or by its URL) before it is approved.
ARTICLES = [
    ("enzyme-kinetics-bradford-thermal-shift.html", "04 What each assay tells you.md", "Overview", True),
    ("michaelis-menten-fit.html", "01 Michaelis-Menten fit without Lineweaver-Burk.md", "Enzyme kinetics", True),
    ("bradford-curve-not-linear.html", "02 Bradford standard curve not linear.md", "Protein assays", True),
    ("thermal-shift-tm.html", "03 Tm from a thermal shift assay.md", "Thermal shift", True),
    ("initial-rates.html", "05 Initial rates from absorbance traces.md", "Enzyme kinetics", True),
    ("delta-tm-significant.html", "06 Is my delta Tm significant.md", "Thermal shift", True),
    ("thermal-shift-instrument-export.html", "07 Thermal shift data from an instrument export.md", "Thermal shift", True),
]

def md_inline(t):
    codes = []
    def keep(m): codes.append(m.group(1).replace("&", "&amp;").replace("<", "&lt;")); return f"\x00{len(codes) - 1}\x00"
    t = re.sub(r"`([^`]+)`", keep, t)
    t = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", r'<a href="\2">\1</a>', t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"(?<![\w*])\*([^*\n]+?)\*(?![\w*])", r"<em>\1</em>", t)
    return re.sub(r"\x00(\d+)\x00", lambda m: f"<code>{codes[int(m.group(1))]}</code>", t)

def md_to_html(text):
    """Small Markdown subset: h2/h3, paragraphs, bullet lists, fenced code, inline code/bold/italic/links. Inline HTML passes through."""
    out, para, items, code = [], [], [], None
    def flush():
        nonlocal para, items
        if para:
            body = " ".join(para)
            eq = re.match(r"^[A-Za-z] = ", body) and not body.rstrip().endswith(".")
            out.append(f'<p class="eq">{md_inline(body)}</p>' if eq else f"<p>{md_inline(body)}</p>")
            para = []
        if items:
            out.append("<ul>" + "".join(f"<li>{md_inline(i)}</li>" for i in items) + "</ul>"); items = []
    for line in text.split("\n"):
        if code is not None:
            if line.startswith("```"):
                out.append("<pre><code>" + "\n".join(code).replace("&", "&amp;").replace("<", "&lt;") + "</code></pre>"); code = None
            else: code.append(line)
            continue
        if line.startswith("```"): flush(); code = []; continue
        if not line.strip(): flush(); continue
        m = re.match(r"^(#{2,3}) (.+)$", line)
        if m: flush(); out.append(f"<h{len(m.group(1))}>{md_inline(m.group(2))}</h{len(m.group(1))}>"); continue
        if line.startswith("- "):
            if para: flush()
            items.append(line[2:]); continue
        if items and line.startswith("  "): items[-1] += " " + line.strip(); continue
        if items: flush()
        para.append(line.strip())
    flush()
    return "\n".join(out)

def load_article(fname):
    raw = (ROOT.parent / "Articles" / fname).read_text(encoding="utf-8")
    raw = re.sub(r"^---\n.*?\n---\n", "", raw, count=1, flags=re.S)                 # frontmatter
    title = re.search(r"^# (.+)$", raw, flags=re.M).group(1).strip()
    body = raw.split("\n# " + title, 1)[-1] if ("\n# " + title) in raw else raw.split("# " + title, 1)[-1]
    body = body.split("\n## Open points for Linus", 1)[0]                          # internal to-do list
    lines = [l for l in body.split("\n") if not l.startswith(">") and not l.startswith("**Target search:**") and not l.startswith("**Links to:**")]
    body = "\n".join(lines)
    body = re.sub(r"^\s*---\s*$", "", body, count=1, flags=re.M)                    # separator after the internal header
    body = body.replace("## References (to verify)", "## References")
    html = md_to_html(body)
    first = re.search(r"<p>(.*?)</p>", html, flags=re.S).group(1)
    plain = lambda t: re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", t)).strip()
    return {"title": title, "plain_title": plain(title), "html": html, "teaser": plain(first)}

def clip(t, n):
    return t if len(t) <= n else t[:n].rsplit(" ", 1)[0].rstrip(",;:") + " ..."

DRAFT_NOTE = '<p class="todo" style="margin-top:20px">Draft. The text and the references have not been checked yet.</p>'
loaded = [(href, load_article(src), topic, ok) for href, src, topic, ok in ARTICLES]
listed = [(href, a, topic) for href, a, topic, ok in loaded if ok]
for href, a, topic, ok in loaded:
    others = "".join(f'<a class="more-art" href="{h}"><span class="meta">{t}</span><b>{o["title"]}</b></a>' for h, o, t in listed if h != href)
    page(href, f'{a["plain_title"]} | {BRAND}', clip(a["teaser"], 155).replace('"', "&quot;"),
         f"""<main class="wrap narrow">
<article>
<div class="page-head art-head"><a class="crumb" href="articles.html">&larr; Articles</a>
<p class="kicker">{topic}</p><h1>{a["title"]}</h1></div>{"" if ok else DRAFT_NOTE}
<div class="prose">
{a["html"]}
</div>
</article>
<h2 class="sub">More articles</h2>
<div class="more-arts">{others}</div>
</main>""", current="art", robots="" if ok else '\n<meta name="robots" content="noindex">')

cards = "".join(
    f'<a class="art-card" href="{href}"><span class="meta">{topic}</span><h2>{a["title"]}</h2><p>{clip(a["teaser"], 210)}</p>'
    f'<span class="link">Read &rarr;</span></a>' for href, a, topic in listed)
page("articles.html", f"Articles on lab data analysis | {BRAND}",
     "Short, practical articles on analysing wet-lab data: enzyme kinetics, protein assays and thermal shift.",
     f"""<main class="wrap narrow">
<div class="page-head"><h1>Articles</h1><p>Short, practical pieces on getting reliable numbers out of everyday assays.</p></div>
<div class="art-list">{cards}</div>
</main>""", current="art")

# the landing page was written before the articles were loaded: fill in its teaser row now.
# Four cards fill the grid at every width (4, 2 or 1 columns): the overview (first entry) and the three newest.
home = listed if len(listed) <= 4 else listed[:1] + listed[-3:]
teasers = "".join(f'<a class="art-card" href="{href}"><span class="meta">{topic}</span><h3>{a["title"]}</h3><span class="link">Read &rarr;</span></a>' for href, a, topic in home)
_idx = ROOT / "index.html"
_idx.write_text(_idx.read_text(encoding="utf-8").replace("__ARTICLE_TEASERS__", teasers), encoding="utf-8")

# ---------- Legal ----------
if COUNTER["endpoint"]:
    COUNTER_NOTE = " The only measurement is the click counter described below."
    COUNTER_SECTION = f"""<h3>Click counter</h3>
<p>To find out whether a paid version is wanted, I count how often the &ldquo;Without watermark&rdquo; button and the email links for the waiting list are clicked. On such a click your browser sends a request to {COUNTER["company"]}. It contains the name of the click (for example &ldquo;pro-kinetics&rdquo;) and the technical data every browser sends, such as your IP address and browser type. No values or files from the analyses are sent, and nothing is sent when you only open a page. According to its <a href="{COUNTER["privacy_url"]}" rel="noopener">privacy policy</a>, {COUNTER["name"]} sets no cookies, does not store IP addresses and does not recognise you on later visits. The legal basis is Art. 6 (1) (f) GDPR (legitimate interest in knowing whether a paid version is worth building).</p>

"""
else:
    COUNTER_NOTE = COUNTER_SECTION = ""
# Template, not legal advice. Have it checked (lawyer or a reputable generator) before going online.
L = {k: (v.strip() or f"[{k.upper()} MISSING]") for k, v in LEGAL.items()}
legal_todo = "" if LEGAL_READY else '<p class="todo" style="margin-top:24px">Not complete. Name, address and email are still missing in <code>build.py</code>. Do not publish the site in this state.</p>'
page("legal.html", f"Imprint and privacy | {BRAND}", "Imprint (Impressum) and privacy notice.",
     f"""<main class="wrap narrow">
<div class="page-head"><h1>Imprint and privacy</h1></div>{legal_todo}
<div class="prose legal">
<h2 id="imprint">Imprint (Impressum)</h2>
<p>Information according to &sect; 5 DDG (German Digital Services Act):</p>
<p>{L["name"]}<br>{L["street"]}<br>{L["city"]}<br>{L["country"]}</p>
<p>Contact: <a href="mailto:{L["email"]}">{L["email"]}</a></p>
<p>Responsible for the content according to &sect; 18 (2) MStV: {L["name"]}, address as above.</p>

<h3>Liability</h3>
<p>The calculators, analyses and articles on this site are provided with care but without any guarantee of correctness. They do not replace your own check of results before you use them in the lab, in a thesis or in a publication.</p>

<h2 id="privacy">Privacy notice</h2>
<h3>Who is responsible</h3>
<p>The controller in the sense of the GDPR is the person named in the imprint. You can reach me at <a href="mailto:{L["email"]}">{L["email"]}</a>.</p>

<h3>Your data in the calculators and analyses</h3>
<p>Everything you type, paste or open on this site is processed only in your own browser. Your values and files are not transmitted to me or to anyone else, and they are not stored after you close the page, unless you choose to keep them as described under &ldquo;Cookies, tracking and local storage&rdquo;.</p>

<h3>Hosting and server logs</h3>
<p>This site is hosted on {HOSTING["name"]}, a service of {HOSTING["company"]}. When you open a page, the hosting provider processes technical data that your browser sends automatically, in particular your IP address, the time of the request and the requested file, in order to deliver the site and keep it secure. The legal basis is Art. 6 (1) (f) GDPR (legitimate interest in a reliable and secure website). The data may be processed in the USA. Details are in the provider's <a href="{HOSTING["privacy_url"]}" rel="noopener">privacy statement</a>.</p>

<h3>Cookies, tracking and local storage</h3>
<p>This site sets no cookies and uses no analytics or advertising services that follow you around.{COUNTER_NOTE} If you switch between the light and dark design, that choice is saved in your browser's local storage so that it is remembered on your next visit. It is not transmitted.</p>
<p>On the analysis pages you can tick &ldquo;Remember my inputs in this browser&rdquo;. Only then are your inputs on that page (pasted data, plate layout and settings) saved in your browser's local storage on your device, so that they are still there after a reload. They are not transmitted to me or to anyone else. When you untick the box, the saved inputs are deleted; you can also delete them at any time in your browser settings. The legal basis is your consent by ticking the box (&sect; 25 (1) TDDDG, Art. 6 (1) (a) GDPR).</p>
<p>On the thermal shift page you can save a plate layout as a template. Only when you click &ldquo;Save layout&rdquo; is the layout (well positions and the sample names you typed) stored under the name you chose in your browser's local storage on your device. It is not transmitted. You can remove a template with &ldquo;Delete&rdquo; or in your browser settings. The storage is necessary to provide the function you asked for (&sect; 25 (2) No. 2 TDDDG).</p>

{COUNTER_SECTION}<h3>Contact by email</h3>
<p>If you write to me, I use your address and the content of your message only to answer you (Art. 6 (1) (f) GDPR), and delete the correspondence when it is no longer needed. If you ask to be told about new analyses or the Pro version, I keep your address only for that purpose and delete it once I have told you, or earlier if you ask (Art. 6 (1) (a) GDPR, your request is the consent). Emails to this address are received and stored by Gmail, a service of Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland; data may also be processed in the USA. Details are in <a href="https://policies.google.com/privacy" rel="noopener">Google's privacy policy</a>.</p>

<h3>Your rights</h3>
<p>You have the right to access, rectification, erasure, restriction of processing, data portability and objection under Art. 15 to 21 GDPR. You also have the right to lodge a complaint with a data protection supervisory authority.</p>
</div>
</main>""", robots="" if LEGAL_READY else '\n<meta name="robots" content="noindex">')

# ---------- 404, favicon, robots, sitemap, hosting files ----------
page("404.html", f"Page not found | {BRAND}", "This page does not exist.",
     """<main class="wrap narrow"><div class="page-head"><p class="kicker">404</p><h1>This page does not exist.</h1>
<p>The address may be mistyped, or the page has moved.</p></div>
<div class="btns" style="margin-top:28px"><a class="btn" href="index.html">Go to the start page</a><a class="btn ghost" href="calculators.html">Calculators</a></div></main>""",
     robots='\n<meta name="robots" content="noindex">')
(ROOT / "favicon.svg").write_text(LOGO.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ').replace(' aria-hidden="true"', ""), encoding="utf-8")
(ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE_URL}/sitemap.xml\n", encoding="utf-8")
urls = "".join(f"  <url><loc>{SITE_URL}/{'' if f == 'index.html' else f}</loc></url>\n" for f, ok in PAGES if ok)
(ROOT / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + "</urlset>\n", encoding="utf-8")
(ROOT / "CNAME").write_text(SITE_URL.split("//", 1)[1] + "\n", encoding="utf-8")     # custom domain for GitHub Pages
(ROOT / ".nojekyll").write_text("", encoding="utf-8")                                 # serve files as they are

print(f"built {len(PAGES)} pages, sitemap with {sum(ok for _, ok in PAGES)} URLs")
if not LEGAL_READY:
    print("NOT READY TO PUBLISH: fill in LEGAL (name, street, city, email) at the top of build.py")
