import { getDialect } from './index.js'
import { test, expect } from 'vitest'

test('mauritania has 176w Gen Z', () => {
  const m = getDialect('mauritania')
  const count = Object.keys(m.keywords).length
  console.log('count:', count)
  expect(count).toBeGreaterThan(150)
})
