# Knowledge Hub — Content

This folder is the **single source of truth** for everything that appears in
the Knowledge Hub page. Edit `knowledge.json`, push to GitHub, Vercel
redeploys. No HTML, no CSS, no JS to touch.

## Files

- **`knowledge.json`** — the content
- **`README.md`** — this file (schema reference)

## How to edit

### Option A — From GitHub (easiest, no local setup)

1. Open the repo on github.com
2. Navigate to `src/content/knowledge.json`
3. Click the pencil icon (top right of the file view)
4. Make your edits in the browser
5. Scroll down → "Commit changes" → write a short note → Commit
6. Vercel rebuilds automatically. Refresh the Knowledge Hub page in ~30–60s

### Option B — From your local clone

```
git pull
# edit src/content/knowledge.json
git add src/content/knowledge.json
git commit -m "Add new essay: <title>"
git push
```

## Schema

```json
{
  "categories": {
    "blogs":       { "label": "Blogs",       "ctaLabel": "Read essay" },
    "whitepapers": { "label": "Whitepapers", "ctaLabel": "Request access" },
    "videocasts":  { "label": "Videocasts",  "ctaLabel": "Watch" }
  },
  "items": [ { ... }, { ... } ]
}
```

### Item fields

| Field        | Required | What it is |
|--------------|:--:|-----------|
| `id`         | yes | Unique slug. Lower-case, hyphens. Used only as a key. |
| `category`   | yes | One of: `blogs`, `whitepapers`, `videocasts`. Controls which tab the card lands in. |
| `kind`       | yes | The capitalised label in the meta row. Examples: `ESSAY`, `WHITEPAPER`, `VIDEOCAST`. |
| `title`      | yes | The headline shown on the card. |
| `excerpt`    | yes | Short description (1–2 sentences). |
| `domain`     | yes | Coloured tag. One of: `industry`, `delivery`, `platform`, `talent`, `governance`, `culture`. |
| `length`     | yes | Reading time / pages. Examples: `10 MIN`, `32 PAGES`. |
| `author`     | yes | Byline. Examples: `BY ASHWIN BHARATH`, `COMING SOON`. |
| `href`       | yes | Where the card links to. Relative path from `src/` (e.g. `knowledge/my-post.html`). |
| `thumbStyle` | yes | Card thumbnail tint. One of: `alt-1`, `alt-2`, `alt-3`, `alt-4`, `alt-5`, `alt-6`. |
| `icon`       | no  | Symbol shown on the thumb (essays + whitepapers). Examples: `✎`, `⚙`, `◆`, `⌘`, `⊞`, `◐`, `📄`. Ignored for videocasts. |
| `runtime`    | no  | Video duration `HH:MM` (videocasts only). Example: `22:14`. |

### Adding a new item — minimal recipe

Paste this into the `items` array, edit the values, save:

```json
{
  "id": "your-slug-here",
  "category": "blogs",
  "kind": "ESSAY",
  "title": "Your headline here",
  "excerpt": "One or two sentence preview.",
  "domain": "platform",
  "length": "7 MIN",
  "author": "BY YOUR NAME",
  "href": "knowledge/your-post.html",
  "thumbStyle": "alt-3",
  "icon": "◆"
}
```

### Removing or reordering

- **Remove** — delete the item's JSON object (don't forget the comma between items).
- **Reorder** — drag the JSON objects up or down. Order in the array = order on the page.

### Counts in the tab badges

`All (12)`, `Blogs (6)` etc. are computed automatically from the JSON. Don't
edit them by hand.

## Common mistakes

- **Trailing comma after the last item** — JSON doesn't allow it. The page will fail to load.
- **Missing comma between items** — same.
- **Unescaped quotes in titles/excerpts** — write `\"` inside the string, or rephrase.
- **Wrong category name** — must be exactly `blogs`, `whitepapers`, or `videocasts`.

If the page goes blank after an edit, you almost certainly broke JSON syntax.
Paste the file contents into https://jsonlint.com to spot the problem.

## Future: hook a CMS UI on top

The JSON file is structured so a form-based CMS (Decap CMS, TinaCMS, Sanity)
can write to it directly. If you ever want a true admin panel with text
fields instead of editing JSON, the foundation is already here — only the
UI layer needs to be added.
