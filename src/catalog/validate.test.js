import { describe, expect, it } from 'vitest'
import { createCatalogFixtures } from '../test/catalogFixtures'
import { CatalogValidationError, validateCatalogSet } from './validate'

describe('validateCatalogSet', () => {
  it('accepts a complete catalog set', () => {
    expect(validateCatalogSet(createCatalogFixtures())).toEqual({ valid: true })
  })

  it('rejects a missing fixed deity role', () => {
    const catalogs = createCatalogFixtures()
    catalogs.deities.entries = catalogs.deities.entries.filter(({ role }) => role !== 'mangrove')

    expect(() => validateCatalogSet(catalogs)).toThrow(CatalogValidationError)
    expect(() => validateCatalogSet(catalogs)).toThrow('Missing deity role: mangrove')
  })

  it('rejects a missing category reference', () => {
    const catalogs = createCatalogFixtures()
    catalogs.ingredients.entries[0].categoryId = 'coppertemper:missing'

    expect(() => validateCatalogSet(catalogs)).toThrow('Unknown category ID: coppertemper:missing')
  })

  it('reports the catalog, entry, and field', () => {
    const catalogs = createCatalogFixtures()
    catalogs.materials.entries[0].deityResistances.oak = 0

    try {
      validateCatalogSet(catalogs)
    } catch (error) {
      expect(error.errors[0]).toMatchObject({
        catalog: 'materials',
        entryId: 'minecraft:iron',
        field: 'deityResistances.oak',
      })
    }
  })

  it('rejects an unknown rule operation', () => {
    const catalogs = createCatalogFixtures()
    catalogs.ingredients.entries[0].rules = [{ type: 'unknownOperation' }]

    expect(() => validateCatalogSet(catalogs)).toThrow('must match a schema in anyOf')
  })

  it('rejects an unknown rule condition', () => {
    const catalogs = createCatalogFixtures()
    catalogs.ingredients.entries[0].rules = [{
      condition: { type: 'unknownCondition' },
      effects: [{ type: 'addEnergy', value: 1 }],
    }]

    expect(() => validateCatalogSet(catalogs)).toThrow(CatalogValidationError)
  })

  it('rejects a missing card reference', () => {
    const catalogs = createCatalogFixtures()
    catalogs.cards.entries[0].capabilities.transformTo = 'coppertemper:missing_card'

    expect(() => validateCatalogSet(catalogs)).toThrow('Unknown card ID: coppertemper:missing_card')
  })

  it('rejects a missing card ID in a rule condition', () => {
    const catalogs = createCatalogFixtures()
    catalogs.ingredients.entries[0].rules = [{ condition: { type: 'hasCard', cardId: 'coppertemper:missing_card' }, effects: [{ type: 'addEnergy', value: 1 }] }]

    expect(() => validateCatalogSet(catalogs)).toThrow('Unknown card ID: coppertemper:missing_card')
  })

  it('rejects direct card transformation cycles', () => {
    const catalogs = createCatalogFixtures()
    catalogs.cards.entries[0].capabilities.transformTo = 'coppertemper:other_card'
    catalogs.cards.entries.push({ ...catalogs.cards.entries[0], id: 'coppertemper:other_card', capabilities: { transformTo: 'coppertemper:test_card' } })

    expect(() => validateCatalogSet(catalogs)).toThrow('Direct card transformation cycle')
  })

  it('accepts total deity level comparisons', () => {
    const catalogs = createCatalogFixtures()
    catalogs.ingredients.entries[0].rules = [{
      condition: { type: 'compare', target: 'totalDeityLevels', operator: 'gte', value: 3 },
      effects: [{ type: 'addEnergy', value: 1 }],
    }]

    expect(validateCatalogSet(catalogs)).toEqual({ valid: true })
  })

  it('rejects a string value for a numeric effect', () => {
    const catalogs = createCatalogFixtures()
    catalogs.ingredients.entries[0].rules = [{ type: 'addEnergy', value: '2' }]

    expect(() => validateCatalogSet(catalogs)).toThrow(CatalogValidationError)
  })

  it('rejects an invalid world mode effect', () => {
    const catalogs = createCatalogFixtures()
    catalogs.ingredients.entries[0].rules = [{ type: 'setWorldMode', value: 'invalid' }]

    expect(() => validateCatalogSet(catalogs)).toThrow(CatalogValidationError)
  })
})