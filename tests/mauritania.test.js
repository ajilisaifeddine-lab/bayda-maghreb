import { getDialect } from '../index.js'
import { test, expect } from 'vitest'

test('mauritania has 176w Gen Z', () => {
  const m = getDialect('mauritania')
  const count = new Set([...Object.keys(m.keywords), ...Object.keys(m.vocabulary || {})]).size
  console.log('count:', count)
  expect(count).toBeGreaterThan(150)
})
