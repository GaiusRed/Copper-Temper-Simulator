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

  it('rejects a duplicate fixed deity role', () => {
    const catalogs = createCatalogFixtures()
    catalogs.deities.entries.push({ ...catalogs.deities.entries[0], id: 'coppertemper:oak_duplicate' })

    expect(() => validateCatalogSet(catalogs)).toThrow('Duplicate deity role: oak')
  })

  it('rejects a missing category reference', () => {
    const catalogs = createCatalogFixtures()
    catalogs.ingredients.entries[0].categoryId = 'coppertemper:missing'

    expect(() => validateCatalogSet(catalogs)).toThrow('Unknown category ID: coppertemper:missing')
  })

  it('rejects a category reference to another catalog', () => {
    const catalogs = createCatalogFixtures()
    catalogs.ingredients.entries[0].categoryId = 'coppertemper:sword'

    expect(() => validateCatalogSet(catalogs)).toThrow('Unknown category ID: coppertemper:sword')
  })

  it('reports the catalog, entry, and field', () => {
    const catalogs = createCatalogFixtures()
    catalogs.materials.entries[0].deityResistances.oak = 0

    try {
      validateCatalogSet(catalogs)
    } catch (error) {
      expect(error.errors[0]).toMatchObject({
        catalog: 'materials',
        file: 'materials.json',
        entryId: 'minecraft:iron',
        field: 'deityResistances.oak',
        expectedRule: 'must be >= 1',
      })
    }
  })

  it('rejects compatible equipment without an item ID mapping', () => {
    const catalogs = createCatalogFixtures()
    delete catalogs.materials.entries[0].itemIds['coppertemper:sword']

    expect(() => validateCatalogSet(catalogs)).toThrow('Missing item ID for compatible equipment: coppertemper:sword')
  })

  it('rejects compatible equipment without matching family base values', () => {
    const catalogs = createCatalogFixtures()
    delete catalogs.materials.entries[0].tool

    expect(() => validateCatalogSet(catalogs)).toThrow('Base values are not defined for coppertemper:sword')
  })

  it('rejects compatible equipment without complete family base values', () => {
    const catalogs = createCatalogFixtures()
    delete catalogs.materials.entries[0].tool.maxDurability

    expect(() => validateCatalogSet(catalogs)).toThrow('Missing tool base value: maxDurability')
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

  it('rejects a condition that mixes logical and typed forms', () => {
    const catalogs = createCatalogFixtures()
    catalogs.ingredients.entries[0].rules = [{
      condition: {
        all: [{ type: 'equipmentFamily', value: 'tool' }],
        type: 'equipmentFamily',
        value: 'armor',
      },
      effects: [{ type: 'addEnergy', value: 1 }],
    }]

    expect(() => validateCatalogSet(catalogs)).toThrow(CatalogValidationError)
  })

  it('rejects fields that do not apply to an effect type', () => {
    const catalogs = createCatalogFixtures()
    catalogs.ingredients.entries[0].rules = [{
      type: 'addEnergy',
      value: 1,
      cardId: 'coppertemper:test_card',
    }]

    expect(() => validateCatalogSet(catalogs)).toThrow(CatalogValidationError)
  })

  it('rejects a missing card reference', () => {
    const catalogs = createCatalogFixtures()
    catalogs.cards.entries[0].capabilities.transformTo = 'coppertemper:missing_card'

    expect(() => validateCatalogSet(catalogs)).toThrow('Unknown card ID: coppertemper:missing_card')
  })

  it('rejects a world card without a world mode', () => {
    const catalogs = createCatalogFixtures()
    catalogs.cards.entries[0].capabilities.isWorldCard = true

    expect(() => validateCatalogSet(catalogs)).toThrow("must have required property 'worldMode'")
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

  it('rejects a direct card transformation cycle with more than two cards', () => {
    const catalogs = createCatalogFixtures()
    const card = catalogs.cards.entries[0]
    catalogs.cards.entries = [
      { ...card, id: 'coppertemper:card_a', capabilities: { transformTo: 'coppertemper:card_b' } },
      { ...card, id: 'coppertemper:card_b', capabilities: { transformTo: 'coppertemper:card_c' } },
      { ...card, id: 'coppertemper:card_c', capabilities: { transformTo: 'coppertemper:card_a' } },
    ]

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

  it.each([
    [{ type: 'compare', target: 'energy', operator: 'gte', value: '8' }],
    [{ type: 'equipmentFamily', value: 'weapon' }],
    [{ type: 'worldMode', value: 'invalid' }],
  ])('rejects an invalid typed condition value', (condition) => {
    const catalogs = createCatalogFixtures()
    catalogs.ingredients.entries[0].rules = [{ condition, effects: [{ type: 'addEnergy', value: 1 }] }]

    expect(() => validateCatalogSet(catalogs)).toThrow(CatalogValidationError)
  })

  it('rejects a combination attribute that does not apply to its equipment', () => {
    const catalogs = createCatalogFixtures()
    catalogs.equipment.entries.push({
      id: 'coppertemper:helmet',
      name: 'Helmet',
      family: 'armor',
      fields: ['armorPoints'],
      base: {},
    })
    catalogs.equipment.entries[0].combinationRules = [{ type: 'addAttribute', attribute: 'armorPoints', value: 1 }]

    expect(() => validateCatalogSet(catalogs)).toThrow('Unknown equipment attribute: armorPoints')
  })

  it('rejects a rule attribute that does not apply to every reachable equipment target', () => {
    const catalogs = createCatalogFixtures()
    catalogs.equipment.entries.push({
      id: 'coppertemper:helmet',
      name: 'Helmet',
      family: 'armor',
      fields: ['armorPoints'],
      base: { slot: 'helmet' },
    })
    const material = catalogs.materials.entries[0]
    material.families.push('armor')
    material.compatibility.push('coppertemper:helmet')
    material.itemIds['coppertemper:helmet'] = 'minecraft:iron_helmet'
    material.armor = { protection: { helmet: 2 }, durability: { helmet: 165 }, enchantability: 9 }
    catalogs.ingredients.entries[0].rules = [{ type: 'addAttribute', attribute: 'armorPoints', value: 1 }]

    expect(() => validateCatalogSet(catalogs)).toThrow('Attribute does not apply to reachable equipment: armorPoints')
  })

  it('rejects a trait grant that does not apply to reachable equipment', () => {
    const catalogs = createCatalogFixtures()
    catalogs.traits.entries.push({
      id: 'coppertemper:armor_trait',
      name: 'Armor Trait',
      validFamilies: ['armor'],
      validEquipmentIds: [],
    })
    catalogs.ingredients.entries[0].rules = [{
      condition: { type: 'equipmentFamily', value: 'tool' },
      effects: [{ type: 'grantTrait', traitId: 'coppertemper:armor_trait' }],
    }]

    expect(() => validateCatalogSet(catalogs)).toThrow('Trait does not apply to reachable equipment: coppertemper:armor_trait')
  })

  it.each([
    { fields: [] },
    { fields: ['attackDamage', 'attackDamage'] },
    { fields: ['attackDamage', 'price'] },
  ])('rejects an invalid tool field list: $fields', ({ fields }) => {
    const catalogs = createCatalogFixtures()
    catalogs.equipment.entries[0].fields = fields

    expect(() => validateCatalogSet(catalogs)).toThrow(CatalogValidationError)
  })

  it.each([-1, 0, 0.5])('rejects an invalid deity adjustment value of %s', (value) => {
    const catalogs = createCatalogFixtures()
    catalogs.ingredients.entries[0].rules = [{ type: 'increaseDeity', role: 'oak', value }]

    expect(() => validateCatalogSet(catalogs)).toThrow(CatalogValidationError)
  })

  it.each(['oak', 'dark_oak'])('rejects %s as a queued deity role', (role) => {
    const catalogs = createCatalogFixtures()
    catalogs.ingredients.entries[0].rules = [{ type: 'queueDeity', role }]

    expect(() => validateCatalogSet(catalogs)).toThrow(CatalogValidationError)
  })

  it.each([
    { type: 'attemptDeity', role: 'birch' },
    { type: 'queueDeity', role: 'birch' },
  ])('rejects a deferred deity effect in an after-ingredient hook', (effect) => {
    const catalogs = createCatalogFixtures()
    catalogs.materials.entries[0].hooks.afterIngredient = [effect]

    expect(() => validateCatalogSet(catalogs)).toThrow('Deferred deity effect cannot run after deity resolution')
  })
})