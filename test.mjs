import { kab, getDialect, getAllDialects } from './index.js'

const kabData = getDialect('kab')
console.log('✅ kab:', kabData.name, '-', Object.keys(kabData.keywords).length, 'words')

const dzData = getDialect('dz')
console.log('✅ dz:', dzData.name, '-', Object.keys(dzData.keywords).length, 'words')

console.log('✅ كلهم:', getAllDialects().length, 'لهجات')
