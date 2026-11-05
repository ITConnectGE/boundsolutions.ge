// Move a finished build into the folder nginx serves, without the site ever
// being half-there.
//
//   node scripts/publish.mjs <built> <live>
//
// Pages, sitemaps and images are replaced. Hashed assets are only ever ADDED:
// a browser still holding the previous HTML keeps finding the CSS and JS it
// asks for, instead of being handed the SPA fallback and rendering unstyled.
// Old assets are dropped once they are older than KEEP_DAYS, long after any
// page could still reference them.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const KEEP_DAYS = 14
const ASSETS = 'assets'

function filesIn(dir, base = dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? filesIn(full, base) : [relative(base, full).split(sep).join('/')]
  })
}

const [built, live] = process.argv.slice(2)
if (!built || !live) {
  console.error('usage: node scripts/publish.mjs <built> <live>')
  process.exit(1)
}
if (!existsSync(join(built, 'index.html'))) {
  console.error(`publish: ${built}/index.html is missing - refusing to publish an incomplete build`)
  process.exit(1)
}

mkdirSync(live, { recursive: true })

// 1. Everything new goes live first, so the folder is never missing a file.
cpSync(built, live, { recursive: true })

const fresh = new Set(filesIn(built))
const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000
let removed = 0
let kept = 0

// 2. Then whatever this build no longer produces is cleared out - except the
//    assets, which are kept around for the caches still pointing at them.
for (const file of filesIn(live)) {
  if (fresh.has(file)) continue
  const isAsset = file.startsWith(`${ASSETS}/`)
  const full = join(live, file)
  if (isAsset && statSync(full).mtimeMs > cutoff) {
    kept++
    continue
  }
  rmSync(full)
  removed++
}

// 3. Directories left empty by that clean-up.
function pruneEmptyDirs(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (!statSync(full).isDirectory()) continue
    pruneEmptyDirs(full)
    if (readdirSync(full).length === 0) rmSync(full, { recursive: true })
  }
}
pruneEmptyDirs(live)

console.log(
  `publish: ${fresh.size} files live, ${removed} removed, ${kept} older assets kept for caches`,
)
