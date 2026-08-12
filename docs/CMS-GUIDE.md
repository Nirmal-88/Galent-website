# Galent CMS — Complete Beginner's Guide

Everything you need to edit the Galent website without touching code.

> **Updated 2026-08-12.** Blog content moved to Sanity. If you are looking for
> the old "a post is two things" instructions, they no longer apply — that
> problem is gone. See §4.

---

## 1. There are now two editors

Which one you want depends on what you are changing.

| I want to change… | Go to | Publishing speed |
|---|---|---|
| A blog, whitepaper, news item or case study | **Sanity Studio** — https://galent.sanity.studio | Seconds |
| The Knowledge Hub tabs | **Sanity Studio** | Seconds |
| Leadership cards on the About page | **`/admin/`** — https://galent-website.vercel.app/admin/ | ~1 minute |
| Client Outcomes on the home page | **`/admin/`** | ~1 minute |
| Service page stats and capabilities | **`/admin/`** | ~1 minute |
| The Contact page | **`/admin/`** | ~1 minute |

Everything in the Knowledge Hub is Sanity. Everything else is still the old
panel. They do not overlap, so there is no risk of editing the same thing in
two places.

> ⚠️ **Do not use `galent.com/admin`.** That redirects to a completely separate
> legacy WordPress site. `insights.galent.com` doesn't exist either.

---

## 2. Sanity Studio — the blog

### Getting in

Go to **https://galent.sanity.studio** and sign in with the account you were
invited with. To add a colleague: sanity.io/manage → the Galent project →
Members → Invite.

### How it works

Sanity is a real content database. There is no Git commit, no rebuild, and no
waiting — you press Publish and the site serves the new version within seconds.

Three things follow from that:

- **Drafts are real.** Anything unpublished is invisible on the live site. You
  can leave a half-written post sitting for weeks and nobody sees it.
- **Publish is instant**, so there is no "wait a minute" grace period to catch
  a mistake. But see *Undoing* below — every version is kept.
- **Nothing is committed to Git**, so images no longer bloat the repository.

### The layout

The sidebar has:

| | What it is |
|---|---|
| **Posts by tab** | Every post, grouped by the Hub tab it appears under. Usually where you want to be. |
| **All posts** | A flat list of everything. Good for searching. |
| **Hub tabs** | The tabs across the top of the Knowledge Hub page. |

---

## 3. Publishing a new post

1. **Posts by tab** → click the tab it belongs in → **＋** (top right).
   Starting from a tab pre-fills the Category for you.
2. Fill in the **Content** tab:
   - **Title** — the real headline.
   - **Slug** — generated from the title; press *Generate* if it is empty.
     This is the post's URL, so leave it alone after publishing.
   - **Excerpt** — 1–2 sentences. Used on the card, under the title on the post,
     and as the page description Google shows.
   - **Body** — the article. Toolbar handles headings, bold, italics, lists,
     quotes, links and images.
3. **Hub card** tab:
   - **Category** — which tab it appears under.
   - **Kind label** — the small tag on the card, e.g. `BLOG`.
   - **Domain tag**, **Length** (`8 MIN`), **Author byline** (`BY ASHWIN BHARATH`).
   - **Hub order** — see §5.
4. **Media** tab — Card image (~800×500) and Banner image (~1600×900).
5. Hit **Publish**.

That's it. There is no second object to create.

---

## 4. ⭐ What changed from the old system

**A blog post used to be TWO things** — an essay file and a separate Hub card
whose "Link target" had to match the essay's filename exactly. Getting that
string wrong by one character produced a card that 404'd, and it was by far the
most common breakage.

**That is gone.** A post is now one document. The card fields and the essay live
together, so they cannot fall out of sync, and there is no link target to type.

Your old links still work. Every one of the 49 migrated posts kept its slug, so
`/post.html?slug=whatever` resolves exactly as before.

---

## 5. Ordering — the one number that matters

Cards are ordered by **Hub order**, lowest first. The migration numbered
everything in tens — 10, 20, 30 — so there is room to slot something in between
without renumbering.

To put a new post at the top of a tab, give it a number lower than the current
first one (0, or -10). To place it between the posts at 30 and 40, use 35.

**Hub tabs** have their own *Tab order* field that works the same way and
controls the left-to-right order of the tabs.

---

## 6. Hub tabs

**Hub tabs** in the sidebar. Current ones:

| Slug | Tab label | Card button text |
|---|---|---|
| `blogs` | Blogs | Read blog |
| `whitepapers` | Whitepapers | Request access |
| `news-room` | News Room | Read |
| `case-study` | Case Study | Read |

To add one (say Podcasts): create a tab with label `Podcasts`, slug `podcasts`,
CTA label `Listen`, and a Tab order. Then set any post's Category to it.

Unlike the old system you pick the Category from a dropdown, so there is nothing
to spell correctly and a card can no longer silently vanish.

**Don't change a tab's slug after publishing** — it is used in the page URL.
Changing the label is completely safe.

---

## 7. Images

Click an image field → upload or pick from the library.

- **No need to compress as aggressively any more.** Images live in Sanity, not
  Git, and are resized automatically for each place they appear. Still, don't
  upload 20 MB camera originals.
- Card ~800×500, banner ~1600×900.
- **Alt text** describes the image for screen readers. Fill it in unless the
  image is purely decorative.
- Body images have a **Display as** setting: *Full width* (default) or *Avatar*,
  which renders a small round headshot for author portraits.

---

## 8. Saving, publishing, undoing

- Sanity **saves as you type**, into a draft. Drafts are not live.
- **Publish** makes it live, immediately.
- **Unpublish** (⋮ menu) takes a post off the site but keeps it as a draft.
- **Delete** (⋮ menu) removes it entirely.

**Undoing:** open the ⋮ menu → *Review changes* to see the document's full
history, and restore any earlier version. This works per document and is much
easier than the old approach of reverting a Git commit.

---

## 9. The `/admin/` panel — everything else

Unchanged from before. Log in with GitHub at
https://galent-website.vercel.app/admin/. Each collection edits a real file in
the repo, and publishing commits it and triggers a ~1 minute Vercel rebuild.
There are no drafts here — **Publish means live.**

### Leadership (About page)
**Leadership → Leadership team → Leaders.** Each entry: Slug, Name, Role, Bio,
Photo (portrait, ideally 4:5 — it gets cropped to face/torso), Alt text, and a
Connect URL (usually LinkedIn; put `#` for no link).
**List order = page order.** Drag to rearrange.

### Client Outcomes (home page)
**Client Outcomes → Case studies.** Anonymised wins. Each: Slug, Sector,
Problem (one sentence), **Big metric** (`10×`, `800%`, `99.99%`) and Metric
description (the sentence after the number). List order = page order.

### Service pages
**Service pages → Service outcomes (all 8).** One collapsed section per service:
Legacy Modernisation, Brownfield & Greenfield, Quality Engineering, ITSM
Transformation, SRE & Observability, Everything Ops, Data Transformation,
Enterprise Platforms.

Expand one and you get two blocks:
- **Outcomes** — a section title plus a list of **Stats**. Each stat is a
  *Number* (`15`, `$9.3`), a *Unit* (`×`, `%`, `%+`, `M`), a *Label*, and a
  *Colour*: `p` = purple, `g` = green, `o` = orange.
- **Key capabilities** — a section title plus **Capability cards**, each with a
  Number (`4.1`, `4.2`), Title, optional Kicker, and a list of Bullets.

Section titles accept one bit of HTML for the accent colour:
`Outcomes that <em class="ac-p">compound</em>`.

### Contact page
**Contact page → Contact page content.**
- **Hero** — Badge, Headline (accepts the same `<em class="ac-p">` trick),
  Intro paragraph, Primary CTA label.
- **Channels** — between 1 and 4. Each has an Icon style (`email`,
  `leadership`, `fde`), Label, Headline value, Link target (`mailto:`,
  `https://`, or `#`), and Subtext.
- **Offices** — City, Region label, and Address lines.
- **Footer note** — optional small print.

For `/admin/` images: they are committed to Git forever, so **compress before
uploading** — aim under ~300 KB.

**Undoing an `/admin/` mistake:** every publish is a Git commit. Find it in the
repo's history on GitHub and revert it, or ask a developer.

---

## 10. Troubleshooting

### Sanity (blog)

| Symptom | Cause & fix |
|---|---|
| Hub shows "couldn't load content" | Usually a CORS origin missing for the domain you're on. Developer fix in sanity.io/manage → API → CORS origins. |
| A post won't appear on the Hub | It's still a draft. Open it and Publish. |
| Published but the site looks the same | Hard-refresh (`Ctrl+Shift+R`). Sanity itself is instant. |
| Cards in the wrong order | Check **Hub order** — lowest number comes first. |
| Can't sign in | You haven't been invited to the project. sanity.io/manage → Members. |

### `/admin/` (everything else)

| Symptom | Cause & fix |
|---|---|
| Admin page shows a WordPress login | You're on `galent.com/admin`. Use `galent-website.vercel.app/admin/`. |
| Login popup errors out | The GitHub OAuth App's callback URL must be exactly `https://galent-website.vercel.app/api/callback`. Developer fix. |
| "Repo not found" | Your GitHub account lacks write access to `Nirmal-88/Galent-website`. |
| Login silently fails on a preview URL | Auth is pinned to the production domain. Use the real URL. |
| Published but nothing changed | Wait 60s, then `Ctrl+Shift+R`. Still nothing? Check Vercel for a failed deploy. |
| No Knowledge Hub or Posts collection | Correct — those moved to Sanity. |
| Popup blocked | Allow popups for `galent-website.vercel.app`. |

---

## 11. Rules of thumb

1. **Blog → Sanity. Everything else → `/admin/`.**
2. **Slugs are lower-case with hyphens, and permanent.** Changing one breaks
   every existing link to that post.
3. **Hub order is just a number** — lowest first, leave gaps of 10.
4. **In Sanity, Publish is instant. In `/admin/`, Publish is live too** — there
   is no review queue in either.
5. **Compress images before uploading to `/admin/`.** Sanity handles its own.
6. **The only HTML allowed in `/admin/` title fields is `<em class="ac-p">…</em>`.**
7. **Hard-refresh before concluding something is broken.**
