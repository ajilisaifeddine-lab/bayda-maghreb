import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { dialects } from './src/dialect-registry.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function load(entry) {
  const p = path.join(__dirname, 'data/dialects', entry.file)
  const dialect = JSON.parse(fs.readFileSync(p, 'utf8'))
  return dialect
}

export function getDialect(code = 'kab') {
  const entry = dialects.find(d => d.code === code)
  if (!entry) throw new Error(`${code} not found`)
  return load(entry)
}

export function getAllDialects() {
  return dialects.map(e => load(e))
}

export { dialects }

// باش يبقى يخدم كيما قبل كي تعمل node index.js kab
const arg = process.argv[2] || 'kab'
if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  if (arg === '--test') {
    let bad = 0
    for (const e of dialects) {
      try {
        const d = load(e)
        console.log(`✅ ${e.code} - ${Object.keys(d.keywords).length} words`)
      } catch (err) {
        console.log(`❌ ${e.code}: ${err.message}`); bad++
      }
    }
    process.exit(bad ? 1 : 0)
  } else {
    try {
      const d = getDialect(arg)
      console.log(`✅ loaded: ${d.name} - ${Object.keys(d.keywords).length} words`)
    } catch (e) {
      console.error(`❌ ${e.message}`); process.exit(1)
    }
  }
}

// export default باش يخدم مع require و import
export default { getDialect, getAllDialects, dialects }
export const kab = getDialect('kab')
