/* Offline validation of migration/import.ndjson.
 *
 * Runs before anything is written to Sanity. Schema validation rules live in
 * the Studio and do NOT run on API/CLI writes, so a bad document would import
 * silently and only surface as a broken card months later. This catches that
 * here instead.
 *
 *   node scripts/validate.mjs
 *
 * Exits non-zero if any error-level check fails.
 */

import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const MIGRATION_DIR = path.resolve(HERE, '..')
const SOURCE = path.join(MIGRATION_DIR, 'source')
const NDJSON = path.join(MIGRATION_DIR, 'import.ndjson')
const REPORTS_DIR = path.join(MIGRATION_DIR, 'reports')

/* Must mirror studio/schemaTypes/post.ts. If you add a style or block type
 * there, add it here too — this list is what stops the transform from quietly
 * emitting something the Studio cannot render. */
const ALLOWED = {
  blockTypes: new Set(['block', 'image', 'table', 'divider']),
  styles: new Set(['normal', 'h2', 'h3', 'h4', 'blockquote']),
  listItems: new Set(['bullet', 'number']),
  decorators: new Set(['strong', 'em', 'code', 'strike-through']),
  annotations: new Set(['link']),
  kinds: new Set(['BLOG', 'WHITEPAPER', 'PRESS', 'CASE STUDY', 'ESSAY', 'FIELD NOTE', 'BRIEF', 'VIDEOCAST']),
  domains: new Set(['industry', 'delivery', 'platform', 'talent', 'governance', 'culture']),
  thumbStyles: new Set(['alt-1', 'alt-2', 'alt-3', 'alt-4', 'alt-5', 'alt-6']),
}

const errors = []
const warnings = []
const err = (id, msg) => errors.push(`[${id}] ${msg}`)
const warn = (id, msg) => warnings.push(`[${id}] ${msg}`)

if (!fs.existsSync(NDJSON)) {
  console.error('import.ndjson not found — run `npm run transform` first.')
  process.exit(1)
}

const lines = fs.readFileSync(NDJSON, 'utf8').split('\n').filter((l) => l.trim())
const docs = []
lines.forEach((line, i) => {
  try {
    docs.push(JSON.parse(line))
  } catch (e) {
    errors.push(`Line ${i + 1} is not valid JSON: ${e.message}`)
  }
})

const byId = new Map(docs.map((d) => [d._id, d]))
const categories = docs.filter((d) => d._type === 'category')
const posts = docs.filter((d) => d._type === 'post')

/* ---------- structural ---------- */
for (const doc of docs) {
  const id = doc._id || '(no _id)'
  if (!doc._type) err(id, 'Missing _type')
  if (!doc._id) errors.push('A document has no _id — reruns would duplicate it')
}

/* ---------- slug uniqueness ---------- */
const seenSlug = new Map()
for (const p of posts) {
  const slug = p.slug?.current
  if (!slug) {
    err(p._id, 'Missing slug.current')
    continue
  }
  if (seenSlug.has(slug)) err(p._id, `Duplicate slug "${slug}" (also on ${seenSlug.get(slug)})`)
  else seenSlug.set(slug, p._id)
  if (p._id !== `post-${slug}` && p._id !== `drafts.post-${slug}`) {
    warn(p._id, `_id does not follow the post-<slug> convention`)
  }
}

/* ---------- required fields + enums ---------- */
for (const p of posts) {
  const id = p._id
  if (!p.title?.trim()) err(id, 'Missing title')
  if (!p.excerpt?.trim()) warn(id, 'Empty excerpt — the card and meta description will be blank')
  if (typeof p.order !== 'number') err(id, 'Missing numeric order — Hub sequence would be undefined')
  if (p.kind && !ALLOWED.kinds.has(p.kind)) err(id, `kind "${p.kind}" is not in the schema list`)
  if (p.domain && !ALLOWED.domains.has(p.domain)) err(id, `domain "${p.domain}" is not in the schema list`)
  if (p.thumbStyle && !ALLOWED.thumbStyles.has(p.thumbStyle)) err(id, `thumbStyle "${p.thumbStyle}" is not in the schema list`)

  /* references */
  if (!p.category) {
    err(id, 'No category reference — this post would not appear under any Hub tab')
  } else if (!p.category._ref) {
    err(id, 'category reference has an empty _ref')
  } else if (!byId.has(p.category._ref)) {
    err(id, `category._ref "${p.category._ref}" does not exist in this import`)
  }
}

for (const c of categories) {
  if (!c.slug?.current) err(c._id, 'Category missing slug.current')
  if (!c.ctaLabel) err(c._id, 'Category missing ctaLabel')
  if (typeof c.order !== 'number') err(c._id, 'Category missing numeric order')
}

/* ---------- portable text ---------- */
let totalBlocks = 0
for (const p of posts) {
  const id = p._id
  if (!Array.isArray(p.body)) {
    err(id, 'body is not an array — Portable Text must never be a raw string')
    continue
  }
  if (p.body.length === 0) warn(id, 'Empty body')

  const keys = new Set()
  for (const block of p.body) {
    totalBlocks++
    if (!block._type) {
      err(id, 'A body block has no _type')
      continue
    }
    if (!ALLOWED.blockTypes.has(block._type)) {
      err(id, `Body contains block type "${block._type}" which the schema does not define`)
    }
    if (!block._key) err(id, `A "${block._type}" block has no _key`)
    else if (keys.has(block._key)) err(id, `Duplicate _key "${block._key}" in body`)
    else keys.add(block._key)

    if (block._type === 'block') {
      if (block.style && !ALLOWED.styles.has(block.style)) {
        err(id, `Block style "${block.style}" is not allowed by the schema`)
      }
      if (block.listItem && !ALLOWED.listItems.has(block.listItem)) {
        err(id, `List type "${block.listItem}" is not allowed by the schema`)
      }
      const defKeys = new Set((block.markDefs || []).map((d) => d._key))
      for (const def of block.markDefs || []) {
        if (!ALLOWED.annotations.has(def._type)) {
          err(id, `Annotation type "${def._type}" is not allowed by the schema`)
        }
        if (def._type === 'link' && !def.href) err(id, 'A link annotation has no href')
      }
      for (const child of block.children || []) {
        for (const mark of child.marks || []) {
          if (ALLOWED.decorators.has(mark)) continue
          if (!defKeys.has(mark)) {
            err(id, `Span references mark "${mark}" with no matching markDef — the link would silently vanish`)
          }
        }
      }
    }

    if (block._type === 'table') {
      const widths = new Set((block.rows || []).map((r) => (r.cells || []).length))
      if (!block.rows?.length) err(id, 'Table has no rows')
      if (widths.size > 1) warn(id, `Table rows have inconsistent cell counts: ${[...widths].join(', ')}`)
    }
  }
}

/* ---------- assets ---------- */
let assetCount = 0
let missingAssets = 0
function checkAssets(value, id, where) {
  if (Array.isArray(value)) return value.forEach((v) => checkAssets(v, id, where))
  if (!value || typeof value !== 'object') return
  if (typeof value._sanityAsset === 'string') {
    assetCount++
    const directive = value._sanityAsset
    if (!directive.startsWith('image@')) {
      err(id, `Asset directive is not an image@ directive: ${directive}`)
      return
    }
    const uri = directive.slice('image@'.length)
    if (uri.startsWith('file://')) {
      const filePath = fileURLToPath(uri)
      if (!fs.existsSync(filePath)) {
        missingAssets++
        err(id, `${where} points at a file that does not exist: ${filePath}`)
      }
    } else if (!/^https?:\/\//.test(uri)) {
      err(id, `${where} has an unusable asset URI: ${uri}`)
    }
  }
  for (const [k, v] of Object.entries(value)) checkAssets(v, id, k)
}
for (const p of posts) checkAssets(p, p._id, 'asset')

/* ---------- coverage against the Decap sources ---------- */
const knowledge = JSON.parse(fs.readFileSync(path.join(SOURCE, 'knowledge.json'), 'utf8'))
const sourceCards = knowledge.items || []
const sourceSlugs = new Set(
  sourceCards.map((i) => (String(i.href || '').match(/[?&]slug=([^&]+)/) || [])[1]).filter(Boolean)
)
const sourceFiles = new Set(
  fs.readdirSync(path.join(SOURCE, 'posts')).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''))
)
const migratedSlugs = new Set(posts.map((p) => p.slug?.current).filter(Boolean))

for (const s of sourceSlugs) {
  if (!migratedSlugs.has(s)) errors.push(`Hub card "${s}" did not make it into the import`)
}
for (const f of sourceFiles) {
  if (!migratedSlugs.has(f)) errors.push(`Markdown file "${f}.md" did not make it into the import`)
}
if (categories.length !== (knowledge.categories || []).length) {
  errors.push(`Category count mismatch: ${categories.length} migrated vs ${(knowledge.categories || []).length} in knowledge.json`)
}

/* ---------- report ---------- */
const summary = {
  documents: docs.length,
  categories: categories.length,
  posts: posts.filter((p) => !p._id.startsWith('drafts.')).length,
  drafts: posts.filter((p) => p._id.startsWith('drafts.')).length,
  bodyBlocks: totalBlocks,
  assetDirectives: assetCount,
  missingAssetFiles: missingAssets,
  sourceCards: sourceCards.length,
  sourceMarkdownFiles: sourceFiles.size,
  errors: errors.length,
  warnings: warnings.length,
}

fs.mkdirSync(REPORTS_DIR, {recursive: true})
fs.writeFileSync(
  path.join(REPORTS_DIR, 'validation-report.json'),
  JSON.stringify({summary, errors, warnings}, null, 2),
  'utf8'
)

console.table(summary)
if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`)
  warnings.slice(0, 15).forEach((w) => console.log('  - ' + w))
  if (warnings.length > 15) console.log(`  ... and ${warnings.length - 15} more`)
}
if (errors.length) {
  console.log(`\n${errors.length} ERROR(s):`)
  errors.slice(0, 25).forEach((e) => console.log('  - ' + e))
  if (errors.length > 25) console.log(`  ... and ${errors.length - 25} more`)
  console.log('\nFAILED — do not import until these are fixed.')
  process.exit(1)
}
console.log('\nPASSED — import.ndjson is safe to import.')
