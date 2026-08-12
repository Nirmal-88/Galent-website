/* Decap CMS -> Sanity transform.
 *
 * Reads the two Decap sources, snapshotted under migration/source/ when the
 * blog stopped being served from the repo:
 *   migration/source/knowledge.json   the Hub cards + the category tabs
 *   migration/source/posts/*.md       the essay bodies (front-matter + Markdown)
 *
 * and emits migration/import.ndjson, ready for:
 *   sanity dataset import ../migration/import.ndjson production --replace
 *
 * Design notes worth knowing before you change anything here:
 *
 * - Decap modelled a post as TWO objects that had to be kept in sync by hand
 *   (a markdown file and a card entry whose `href` pointed at it). Sanity gets
 *   ONE `post` document per post. The join key is the slug parsed out of the
 *   card's `href`.
 *
 * - Every id is derived from the slug, and every array `_key` comes from a
 *   per-document counter, so re-running this produces byte-identical output.
 *   That is what makes `--replace` safe to run repeatedly.
 *
 * - Images are emitted as `_sanityAsset: "image@file:///..."` directives.
 *   The Sanity CLI uploads the local file and swaps in a real asset reference
 *   at import time, so there is no separate upload step and no dependency on
 *   the old /assets/ URLs surviving.
 */

import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'
import matter from 'gray-matter'
import {markdownToPortableText} from '@portabletext/markdown'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const MIGRATION_DIR = path.resolve(HERE, '..')
const REPO_ROOT = path.resolve(MIGRATION_DIR, '..')
/* Images still live in the site tree; only the Decap content files moved. */
const SRC = path.join(REPO_ROOT, 'src')
const SOURCE = path.join(MIGRATION_DIR, 'source')
const POSTS_DIR = path.join(SOURCE, 'posts')
const KNOWLEDGE_JSON = path.join(SOURCE, 'knowledge.json')

const OUT_NDJSON = path.join(MIGRATION_DIR, 'import.ndjson')
const REPORTS_DIR = path.join(MIGRATION_DIR, 'reports')

/* Fixed so reruns are byte-identical; override when you want a real stamp. */
const MIGRATED_AT = process.env.MIGRATED_AT || '2026-08-12T00:00:00.000Z'

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** Deterministic _key source. One counter per document keeps reruns stable. */
function makeKeyGen() {
  let n = 0
  return () => `k${(n++).toString(36)}`
}

/** Turn a site-absolute /assets/... path into a file:// URI the CLI can read. */
function assetDirective(webPath, warnings, context) {
  if (!webPath || !String(webPath).trim()) return undefined
  const clean = String(webPath).trim().split('?')[0].split('#')[0]
  if (/^https?:\/\//i.test(clean)) {
    // Nothing in the current corpus hits this, but a remote URL is a valid
    // directive too, so pass it straight through rather than dropping it.
    return `image@${clean}`
  }
  const abs = path.join(SRC, clean.replace(/^\//, ''))
  if (!fs.existsSync(abs)) {
    warnings.push(`Missing image file for ${context}: ${clean}`)
    return undefined
  }
  return `image@${pathToFileURL(abs).href}`
}

/** Build a Sanity image field from a Decap image path. */
function imageField(webPath, alt, warnings, context) {
  const directive = assetDirective(webPath, warnings, context)
  if (!directive) return undefined
  const img = {_type: 'image', _sanityAsset: directive}
  if (alt) img.alt = alt
  return img
}

/** Flatten a Portable Text array to plain text (used for table cells). */
function ptToPlainText(blocks) {
  return (blocks || [])
    .map((b) =>
      b && b._type === 'block'
        ? (b.children || []).map((c) => c.text || '').join('')
        : ''
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Markdown -> Portable Text, constrained to what the `post.body` schema allows.
 *
 * The three matchers below exist because the library's defaults do not fit
 * this schema:
 *   image  - defaults to {src, alt}, which is not a Sanity asset reference.
 *   table  - with no schema supplied the default shreds a table into one
 *            paragraph per cell, which silently destroys the content.
 *   hr     - defaults to a `horizontal-rule` type this schema does not define.
 */
function convertBody(markdown, keyGenerator, warnings, context) {
  return markdownToPortableText(markdown, {
    keyGenerator,
    types: {
      image: ({value}) => {
        const directive = assetDirective(value.src, warnings, `${context} body image`)
        if (!directive) return undefined
        const img = {_type: 'image', _key: keyGenerator(), _sanityAsset: directive}
        if (value.alt) img.alt = value.alt
        if (value.title) img.caption = value.title
        /* The old CSS singled out author headshots with an [src*="-author"]
         * selector. Sanity's CDN URLs do not contain the original filename, so
         * that selector can no longer match — the intent is carried on the
         * document as an explicit field instead, which an editor can also set. */
        img.variant = /-author\.[a-z]+$/i.test(value.src || '') ? 'avatar' : 'full'
        return img
      },

      table: ({value}) => {
        // Cells become plain strings. The only table in the corpus is a
        // two-column metrics table whose emphasis is carried by the column
        // itself, so nothing meaningful is lost -- but it is logged, because
        // inline marks inside cells genuinely are dropped here.
        const rows = (value.rows || []).map((row) => ({
          _type: 'row',
          _key: keyGenerator(),
          cells: (row.cells || []).map((cell) => ptToPlainText(cell.value)),
        }))
        warnings.push(
          `Table converted to plain-text cells (${rows.length} rows) in ${context} — inline bold/italic inside cells was dropped.`
        )
        return {
          _type: 'table',
          _key: keyGenerator(),
          headerRows: value.headerRows ?? 1,
          rows,
        }
      },

      horizontalRule: () => ({
        _type: 'divider',
        _key: keyGenerator(),
        style: 'rule',
      }),
    },
  })
}

/* ------------------------------------------------------------------ *
 * Read sources
 * ------------------------------------------------------------------ */

const knowledge = JSON.parse(fs.readFileSync(KNOWLEDGE_JSON, 'utf8'))
const hubItems = Array.isArray(knowledge.items) ? knowledge.items : []
const hubCategories = Array.isArray(knowledge.categories) ? knowledge.categories : []

const postFiles = fs
  .readdirSync(POSTS_DIR)
  .filter((f) => f.endsWith('.md'))
  .sort()

/** slug -> parsed markdown file */
const postsBySlug = new Map()
for (const file of postFiles) {
  const slug = file.replace(/\.md$/, '')
  const parsed = matter(fs.readFileSync(path.join(POSTS_DIR, file), 'utf8'))
  postsBySlug.set(slug, {slug, file, data: parsed.data, content: parsed.content})
}

/** Pull the slug out of a Decap card href: "post.html?slug=foo" -> "foo" */
function slugFromHref(href) {
  const m = String(href || '').match(/[?&]slug=([^&]+)/)
  return m ? decodeURIComponent(m[1]) : null
}

/* ------------------------------------------------------------------ *
 * Transform
 * ------------------------------------------------------------------ */

const docs = []
const report = {
  migratedAt: MIGRATED_AT,
  counts: {},
  warnings: [],
  perDocument: [],
  skipped: [],
}

/* --- Categories (written first: posts reference them) --- */
const categoryIdBySlug = new Map()
hubCategories.forEach((cat, i) => {
  const slug = String(cat.id)
  const _id = `category-${slug}`
  categoryIdBySlug.set(slug, _id)
  docs.push({
    _id,
    _type: 'category',
    title: cat.label || slug,
    slug: {_type: 'slug', current: slug},
    ctaLabel: cat.ctaLabel || 'Read',
    order: (i + 1) * 10,
  })
})

/* --- Posts --- */
const usedSlugs = new Set()

hubItems.forEach((item, index) => {
  const slug = slugFromHref(item.href)
  const context = `card "${item.title || item.id}"`
  const warnings = []

  if (!slug) {
    report.skipped.push({item: item.id || item.title, reason: `Unparseable href: ${item.href}`})
    return
  }
  if (usedSlugs.has(slug)) {
    report.skipped.push({item: slug, reason: 'Duplicate slug — a later card reused an earlier slug'})
    return
  }

  const md = postsBySlug.get(slug)
  if (!md) {
    // A card pointing at a post that does not exist. In Decap this rendered a
    // dead link; there is nothing to migrate, so record it loudly.
    report.skipped.push({item: slug, reason: 'Card has no matching markdown file'})
    return
  }
  usedSlugs.add(slug)

  const keyGen = makeKeyGen()
  const fm = md.data || {}

  /* Card values win over front-matter: the Hub card is what visitors saw, and
   * where the two disagree the card was the more recently edited of the pair. */
  const pick = (cardValue, fmValue) => {
    const c = cardValue == null ? '' : String(cardValue).trim()
    const f = fmValue == null ? '' : String(fmValue).trim()
    if (c && f && c !== f) {
      warnings.push(`Field differed between card and front-matter — used the card value ("${c}" over "${f}")`)
    }
    return c || f || undefined
  }

  const categorySlug = String(item.category || '').trim()
  const categoryRef = categoryIdBySlug.get(categorySlug)
  if (!categoryRef) {
    warnings.push(`Unknown category "${categorySlug}" — post left without a tab and will not appear on the Hub`)
  }

  const doc = {
    _id: `post-${slug}`,
    _type: 'post',
    title: pick(item.title, fm.title) || 'Untitled',
    slug: {_type: 'slug', current: slug},
    excerpt: pick(item.excerpt, fm.excerpt) || '',
    kind: pick(item.kind, fm.kind) || 'BLOG',
    domain: pick(item.domain, fm.domain) || 'platform',
    order: (index + 1) * 10,
    thumbStyle: item.thumbStyle || 'alt-1',
    body: convertBody(md.content || '', keyGen, warnings, context),
    migration: {
      _type: 'object',
      sourceSystem: 'decap',
      sourceId: slug,
      legacyUrl: `/post.html?slug=${slug}`,
      migratedAt: MIGRATED_AT,
    },
  }

  if (categoryRef) doc.category = {_type: 'reference', _ref: categoryRef}

  const length = pick(item.length, fm.length)
  if (length) doc.length = length
  const author = pick(item.author, fm.author)
  if (author) doc.author = author
  if (item.runtime) doc.runtime = item.runtime

  const embedUrl = pick(fm.embedUrl, item.embedUrl)
  if (embedUrl) doc.embedUrl = embedUrl
  const embedTitle = pick(fm.embedTitle, item.embedTitle)
  if (embedTitle) doc.embedTitle = embedTitle

  const card = imageField(item.cardImage, doc.title, warnings, `${context} card image`)
  if (card) doc.cardImage = card
  const banner = imageField(item.bannerImage, doc.title, warnings, `${context} banner image`)
  if (banner) doc.bannerImage = banner

  if (warnings.length) doc.migration.notes = warnings

  docs.push(doc)
  report.perDocument.push({slug, blocks: doc.body.length, warnings})
  report.warnings.push(...warnings.map((w) => `[${slug}] ${w}`))
})

/* --- Orphan markdown: posts with no Hub card --- *
 * These were never visible on the site (the Hub is the only route to a post).
 * They are imported as Sanity DRAFTS: invisible to the published-only queries
 * the front-end runs, but present in the Studio so nothing is lost. */
const blogsCategory = categoryIdBySlug.get('blogs') || categoryIdBySlug.values().next().value
let orphanIndex = 0
for (const [slug, md] of postsBySlug) {
  if (usedSlugs.has(slug)) continue
  const keyGen = makeKeyGen()
  const fm = md.data || {}
  const warnings = ['Imported as a draft: this markdown file had no Knowledge Hub card, so it was never reachable on the live site.']
  orphanIndex += 1

  docs.push({
    _id: `drafts.post-${slug}`,
    _type: 'post',
    title: fm.title || slug,
    slug: {_type: 'slug', current: slug},
    excerpt: fm.excerpt || '',
    kind: fm.kind || 'BLOG',
    domain: fm.domain || 'platform',
    length: fm.length || undefined,
    author: fm.author || undefined,
    order: (hubItems.length + orphanIndex) * 10,
    thumbStyle: 'alt-1',
    category: blogsCategory ? {_type: 'reference', _ref: blogsCategory} : undefined,
    body: convertBody(md.content || '', keyGen, warnings, `orphan "${slug}"`),
    migration: {
      _type: 'object',
      sourceSystem: 'decap',
      sourceId: slug,
      legacyUrl: `/post.html?slug=${slug}`,
      migratedAt: MIGRATED_AT,
      notes: warnings,
    },
  })
  report.perDocument.push({slug, draft: true, warnings})
}

/* ------------------------------------------------------------------ *
 * Write output
 * ------------------------------------------------------------------ */

/** Drop undefined values so they are simply unset in Sanity, never null. */
function prune(value) {
  if (Array.isArray(value)) return value.map(prune)
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue
      out[k] = prune(v)
    }
    return out
  }
  return value
}

const ndjson = docs.map((d) => JSON.stringify(prune(d))).join('\n') + '\n'
fs.mkdirSync(REPORTS_DIR, {recursive: true})
fs.writeFileSync(OUT_NDJSON, ndjson, 'utf8')

report.counts = {
  categories: docs.filter((d) => d._type === 'category').length,
  posts: docs.filter((d) => d._type === 'post' && !d._id.startsWith('drafts.')).length,
  draftPosts: docs.filter((d) => d._id.startsWith('drafts.')).length,
  sourceCards: hubItems.length,
  sourceMarkdownFiles: postFiles.length,
  imageDirectives: (ndjson.match(/"_sanityAsset"/g) || []).length,
  warnings: report.warnings.length,
  skipped: report.skipped.length,
}

fs.writeFileSync(
  path.join(REPORTS_DIR, 'transform-report.json'),
  JSON.stringify(report, null, 2),
  'utf8'
)

console.log('Wrote', path.relative(REPO_ROOT, OUT_NDJSON))
console.table(report.counts)
if (report.skipped.length) {
  console.log('\nSkipped:')
  report.skipped.forEach((s) => console.log(`  - ${s.item}: ${s.reason}`))
}
if (report.warnings.length) {
  console.log(`\n${report.warnings.length} warning(s) — see reports/transform-report.json`)
  report.warnings.slice(0, 10).forEach((w) => console.log(`  - ${w}`))
  if (report.warnings.length > 10) console.log(`  ... and ${report.warnings.length - 10} more`)
}
