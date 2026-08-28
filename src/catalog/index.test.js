import { describe, expect, it } from 'vitest'
import { catalogs, catalogMaps, getCatalogEntry } from './index'
import { simulateRecipe } from '../engine/simulate'

describe('bundled catalogs', () => {
  it('contains the fixed deity mapping', () => {
    expect(catalogs.deities.entries.map(({ role, name }) => [role, name])).toEqual([
      ['oak', 'Oak'], ['dark_oak', 'Dark Oak'], ['birch', 'Birch'], ['spruce', 'Spruce'],
      ['acacia', 'Acacia'], ['jungle', 'Jungle'], ['cherry', 'Cherry'], ['mangrove', 'Mangrove'],
    ])
  })

  it('uses neutral resistance values for the initial materials', () => {
    for (const material of catalogs.materials.entries) {
      expect(Object.values(material.deityResistances)).toEqual(Array(8).fill(8))
    }
  })

  it('indexes entries by namespaced ID', () => {
    expect(getCatalogEntry('materials', 'minecraft:iron')).toBe(catalogMaps.materials.get('minecraft:iron'))
  })

  it('provides Barya and catalyst ingredients with their card effects', () => {
    expect(catalogs.categories.entries.map(({ id }) => id)).toEqual(['coppertemper:coins', 'coppertemper:catalysts'])
    expect(catalogs.ingredients.entries).toHaveLength(20)
    expect(catalogMaps.ingredients.get('coppertemper:oak_barya')).toMatchObject({
      name: 'Oak Barya', minecraftItemId: 'coppertemper:oak_barya', categoryId: 'coppertemper:coins', energy: 48,
    })
    expect(catalogMaps.ingredients.get('coppertemper:gilded_oak_barya')).toMatchObject({
      name: 'Gilded Oak Barya', energy: 64,
    })
    expect(catalogMaps.ingredients.get('coppertemper:brass_catalyst')).toMatchObject({
      name: 'Brass Catalyst', categoryId: 'coppertemper:catalysts', energy: 24,
    })

    const result = simulateRecipe({
      catalogMaps,
      recipe: { schemaVersion: 1, materialId: 'minecraft:iron', equipmentId: 'coppertemper:sword', ingredientIds: ['coppertemper:oak_barya'] },
    })

    expect(result.steps[0].final.deityLevels.oak).toBe(1)
    expect(result.steps[0].final.cards.hidden).toBe('coppertemper:oak_wood_card')
  })
})