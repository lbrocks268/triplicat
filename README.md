# Triplicat

Static website for triplicat.com: lab calculators, an in-browser analysis toolkit (enzyme kinetics, Bradford, thermal shift) and articles.

## Layout

- `docs/` is the website and what GitHub Pages serves. The `.html` files, `sitemap.xml`, `robots.txt`, `favicon.svg` and `CNAME` in it are **generated**; do not edit them by hand.
- `docs/build.py` generates them. Page texts, the site name, the legal details and the list of articles are in this file.
- `docs/src/cards.html` holds the input fields of the calculators.
- `docs/css/site.css` and `docs/js/*.js` are edited directly.
- `Articles/*.md` are the article sources. Internal parts (frontmatter, callouts, "Target search" lines, "Open points" sections) are removed during the build.

## Change something

```bash
python3 docs/build.py
```

```bash
python3 -m http.server 8765 --directory docs
```

Then open http://localhost:8765. The build prints `NOT READY TO PUBLISH` while the legal details at the top of `build.py` are empty.

## Before the first upload

1. Fill in `LEGAL` (name, street, city, email) at the top of `docs/build.py` and run the build. The imprint and privacy notice are a template, not legal advice: have them checked.
2. If the site is not hosted on GitHub Pages, change `HOSTING` in `build.py` so the privacy notice names the right provider.
3. The click counter (`COUNTER` in `build.py`) is off while its endpoint is empty. To switch it on, create a site at goatcounter.com and enter `https://<code>.goatcounter.com/count`; the privacy notice then names GoatCounter automatically. The waiting list is an email link to the contact address.

## Put it online with GitHub Pages

1. On github.com create a new **public** repository named `triplicat`, without README or licence. (Pages for private repositories needs a paid plan.)
2. Connect and push:
   ```bash
   git remote add origin git@github.com:<your-user>/triplicat.git
   ```
   ```bash
   git push -u origin main
   ```
3. In the repository: Settings, Pages. Source "Deploy from a branch", branch `main`, folder `/docs`. Save.
4. On the same page enter the custom domain `triplicat.com`. (The `CNAME` file in `docs/` already contains it.)
5. At the registrar set the DNS records of `triplicat.com`. Take the current values from GitHub's documentation "Managing a custom domain for your GitHub Pages site"; at the time of writing they were:
   - four `A` records for the bare domain: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - one `CNAME` record for `www` pointing to `<your-user>.github.io`
   Remove the registrar's parking record for the bare domain.
6. Wait until GitHub shows the DNS check as passed, then tick "Enforce HTTPS". The certificate can take up to a day.
7. For `triplicat.de` set up a redirect to `https://triplicat.com` at the registrar.

## Update the live site

Edit, run `python3 docs/build.py`, commit, push. GitHub Pages publishes the new version within a minute or two.
