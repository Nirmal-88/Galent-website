# Site content — JSON files

These files back the parts of the site that are **not** the Knowledge Hub.
Each is fetched at runtime by a matching module in `src/js/`, so editing one
and pushing is all it takes — no HTML, CSS or JS to touch.

| File | Powers | Read by |
|---|---|---|
| `leadership.json` | Leader cards on the About page | `js/leadership-cms.js` |
| `cases.json` | "What Gets Delivered" on the home page | `js/cases-cms.js` |
| `services.json` + `services/` | Stats and capability cards on the 8 service pages | `js/service-cms.js` |
| `contact.json` | Everything on `/contact.html` | `js/contact-cms.js` |

## Blog content is no longer here

As of 2026-08-12 the Knowledge Hub moved to **Sanity**. `knowledge.json` and
`posts/*.md` used to live in this folder; they are now a migration snapshot at
`migration/source/` and nothing on the live site reads them.

- Edit blogs, whitepapers, news and case studies at **https://galent.sanity.studio**
- The content model and the reasoning behind it: `migration/README.md`
- Editor instructions: `docs/CMS-GUIDE.md`

Do not re-add a `knowledge.json` here. Two systems owning the same content is
exactly the failure this migration removed.

## How to edit the files that remain

### Option A — From GitHub (easiest, no local setup)

1. Open the repo on github.com
2. Navigate to the file, e.g. `src/content/leadership.json`
3. Click the pencil icon (top right of the file view)
4. Make your edits in the browser
5. Scroll down → "Commit changes" → write a short note → Commit
6. Vercel rebuilds automatically. Refresh the page in ~30–60s

### Option B — From your local clone

```
git pull
# edit src/content/<file>.json
git add src/content/<file>.json
git commit -m "Update <what changed>"
git push
```

### Option C — The admin panel

https://galent-website.vercel.app/admin/ gives these same files a form-based
editor. See `docs/CMS-GUIDE.md` §9.

## If a page goes blank after an edit

You almost certainly broke the JSON — a trailing comma or a missing quote.
Paste the file into https://jsonlint.com to find it.
