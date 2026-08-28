import { describe, expect, it } from 'vitest'
import { createCatalogFixtures } from '../test/catalogFixtures'
import { validateCatalogSet } from '../catalog/validate'
import { exportRecipe, importRecipe } from './codec'

function fixtureMaps() {
  const catalogs = createCatalogFixtures()
  validateCatalogSet(catalogs)
  return Object.fromEntries(Object.entries(catalogs).map(([name, catalog]) => [name, new Map(catalog.entries.map((entry) => [entry.id, entry]))]))
}

const recipe = Object.freeze({
  schemaVersion: 1,
  materialId: 'minecraft:iron',
  equipmentId: 'coppertemper:sword',
  ingredientIds: ['minecraft:coal', 'minecraft:coal'],
})

describe('recipe codec', () => {
  it('round trips stable namespaced IDs', () => {
    expect(importRecipe(exportRecipe(recipe), fixtureMaps())).toEqual(recipe)
  })

  it('rejects an unknown ingredient', () => {
    const text = JSON.stringify({ ...recipe, ingredientIds: ['coppertemper:missing'] })
    expect(() => importRecipe(text, fixtureMaps())).toThrow('Unknown ingredient ID: coppertemper:missing')
  })
})