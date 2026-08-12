# Decap → Sanity migration

**Status: done and live in Sanity, not yet pushed to the site.**

| | |
|---|---|
| Project | `am365mmi` — https://www.sanity.io/manage/project/am365mmi |
| Dataset | `production` (public) |
| Studio | https://galent.sanity.studio |
| Imported | 55 documents, 144 images, on 2026-08-12 |

The steps in **Run it** below have all been executed. They are kept as a record
of what was done and as the recipe for rebuilding the dataset from scratch.

The one remaining step is deploying the site itself: `src/js/sanity-config.js`
already points at the project, so the Hub switches to Sanity as soon as the
repo is pushed.

---

## What changed

**Before.** A post was two objects that had to be created in pairs and kept in
sync by hand: a Markdown file in `src/content/posts/` and a card entry in
`src/content/knowledge.json` whose `href` pointed at it. A card pointing at a
missing slug was the most common way the Hub broke. Publishing meant a Git
commit and a ~1 minute Vercel rebuild, and there were no drafts — Publish meant
live, immediately.

**After.** One `post` document holds both the card fields and the essay body,
so they cannot drift apart. Publishing is a button in the Studio and shows up on
the site in seconds with no deploy. Drafts are real: unpublished work is invisible
to the site.

**Scope.** Blog content only — posts and the Hub tabs. Leadership, Client
Outcomes, Service pages and Contact still live in JSON in this repo and are
still edited at `/admin/`. Decap was *not* removed wholesale, because those four
would have been left with no editor at all; only its two blog collections were
deleted from `src/admin/config.yml`.

---

## What is in this folder

```
migration/
  source/            the Decap content, moved out of src/ so the site has one
                     source of truth. This is the migration's input, not the
                     site's — the live Hub no longer reads it.
    knowledge.json
    posts/*.md
  scripts/
    transform.mjs    source/ -> import.ndjson
    validate.mjs     checks import.ndjson before anything reaches Sanity
  reports/           written by both scripts
  import.ndjson      generated; gitignored
```

`studio/` at the repo root is the Sanity Studio (schemas + editing UI).

---

## Run it

You need a Sanity account. Steps 1 and 5 need a browser; the rest is terminal.

### 1. Create the project  ✅ done

Go to **https://sanity.io/manage** → *Create new project*.

- Name: `Galent`
- Dataset: `production`, **visibility: Public**

Public matters: the site reads content straight from the browser with no token,
which is what removes the need for a server. Public means published content is
world-readable — which it already is, since it is a public marketing site. Drafts
stay out of it because every query filters them (`!(_id in path("drafts.**"))`).

Copy the **Project ID** from the project's dashboard.

### 2. Allow the site to read it  ✅ done

Still in sanity.io/manage → **API** → **CORS origins** → *Add origin*, once each for:

| Origin | Credentials |
|---|---|
| `https://galent-website.vercel.app` | No |
| `https://galent.com` | No |
| `http://localhost:3000` | No |

Skip this and the browser blocks every request — the Hub renders its
"couldn't load content" message and the console shows a CORS error.

### 3. Paste the Project ID in two places  ✅ done

- `studio/.env` — copy `studio/.env.example` to `studio/.env` and fill in
  `SANITY_STUDIO_PROJECT_ID`.
- `src/js/sanity-config.js` — replace `REPLACE_WITH_PROJECT_ID`.

That second one is the file the live site reads. A project ID is not a secret;
never put an API *token* there.

### 4. Build and check the import  ✅ done

```bash
cd migration
npm install
npm run transform
npm run validate
```

`validate` exits non-zero and refuses to bless the file if anything is wrong.
Expect: 55 documents, 49 posts, 2 drafts, 4 categories, 144 images, 0 errors.

### 5. Import  ✅ done

```bash
cd ../studio
npm install
npx sanity login          # opens a browser
npx sanity dataset import ../migration/import.ndjson production --replace
```

This uploads all 144 images as it goes, so it takes a few minutes. `--replace`
is safe to re-run: every `_id` is derived from the slug and the transform is
deterministic, so a second run converges instead of duplicating.

### 6. Deploy the Studio  ✅ done

```bash
npx sanity deploy
```

The hostname is pinned to `galent` in sanity.cli.ts, so this never prompts.
**https://galent.sanity.studio** is
the URL editors bookmark. It is hosted by Sanity and is not affected by site
deploys.

### 7. Check the site before pushing  ✅ done (verified in a headless browser)

Serve `src/` and open the Hub and a few posts:

```bash
cd ../src && npx serve -l 3000
```

Check: all four tabs and their counts, card images, pagination, search, a post
with body images, the GalentAI whitepaper's metrics table, and the Grand Prix
post's round author headshot.

Then commit and push — Vercel deploys and the Hub is live on Sanity.

---

## Verification checklist

Checked against a local server in a headless browser on 2026-08-12:

- [x] 49 posts across the four tabs — blogs 26, whitepapers 2, news-room 6, case-study 15
- [x] Tab order and card order match the old site (both driven by `order`)
- [x] Hero slideshow renders 8 slides, all images loaded
- [x] All 49 card images served from `cdn.sanity.io`
- [x] Pagination (8 per page) and search both work
- [x] A post opens at `/post.html?slug=<slug>` — all 49 slugs are unchanged, so
      existing links and shared URLs still resolve
- [x] Body images, blockquotes, lists, links and the divider render
- [x] The metrics table renders with a header row and 6 body rows
- [x] The author headshot renders as a 128px round avatar
- [x] The two draft posts (`hi-how-are-you`, `welcome-to-the-hub`) return
      "Post not found" and do not appear on the Hub
- [x] Zero console errors
- [ ] Editing a post and hitting Publish shows on the site after a reload
      — worth doing once by hand after the site is deployed

---

## Known fidelity notes

**One table lost its inline bold.** The metrics table in
`galentai-ai-native-sdlcplatform` had `**4X**`-style emphasis inside its cells.
Cells are modelled as plain strings, so those marks were dropped; the CSS bolds
the value column instead, so it looks the same. This is the only content in the
corpus that did not survive verbatim, and it is recorded in the document's
Migration metadata.

**Two orphan posts became drafts.** `hi-how-are-you` and `welcome-to-the-hub`
are Markdown files with no Hub card, so they were never reachable on the live
site. They imported as drafts rather than being deleted or published.

**Three unused images were not migrated.** `src/assets/images/uploads/` holds
147 files; 144 are referenced. The other three are not referenced by any post.

---

## Rollback

Nothing about the old system was deleted, so reverting is a `git revert` of the
cutover commit: `src/content/knowledge.json` and `src/content/posts/` come back
from `migration/source/`, the two Decap collections come back in `config.yml`,
and `cms.js` / `post-cms.js` return to reading local files. The Sanity project
can be left in place or deleted separately.
