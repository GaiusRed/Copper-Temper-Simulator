import { describe, expect, it } from 'vitest'
import { catalogs, catalogMaps, getCatalogEntry } from './index'

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
})