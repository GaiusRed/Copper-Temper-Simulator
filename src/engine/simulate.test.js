import { expect, it } from 'vitest'
import { createCatalogFixtures } from '../test/catalogFixtures'
import { validateCatalogSet } from '../catalog/validate'
import { createInitialState, PHASES, simulateIngredient, simulateRecipe } from './simulate'

function fixtures() {
  const catalogs = createCatalogFixtures()
  validateCatalogSet(catalogs)
  return {
    catalogMaps: Object.fromEntries(Object.entries(catalogs).map(([name, catalog]) => [name, new Map(catalog.entries.map((entry) => [entry.id, entry]))])),
    recipe: { schemaVersion: 1, materialId: 'minecraft:iron', equipmentId: 'coppertemper:sword', ingredientIds: [] },
  }
}

it('creates immutable initial state', () => {
  const state = createInitialState(fixtures())
  expect(state.energy).toBe(0)
  expect(state.cards).toEqual({ hidden: null, first: null, second: null, third: null, leaving: null })
  expect(state.worldMode).toBe('normal')
  expect(Object.isFrozen(state)).toBe(true)
})

it('defines the thirteen phases in order', () => {
  expect(PHASES).toHaveLength(13)
  expect(PHASES[0]).toBe('reset')
  expect(PHASES.at(-1)).toBe('finalize')
})

it('runs every phase and expires remaining ingredient energy', () => {
  const fixture = fixtures()
  fixture.recipe.ingredientIds = ['minecraft:coal']
  const result = simulateRecipe(fixture)

  expect(result.steps[0].phases.map(({ id }) => id)).toEqual(PHASES)
  expect(result.steps[0].phases.find(({ id }) => id === 'ingredientEnergy').state.energy).toBe(24)
  expect(result.steps[0].final.energy).toBe(0)
})

it('records complete values when ingredient energy replaces step energy', () => {
  const fixture = fixtures()
  fixture.recipe.ingredientIds = ['minecraft:coal']

  const phase = simulateRecipe(fixture).steps[0].phases.find(({ id }) => id === 'ingredientEnergy')

  expect(phase.events).toContainEqual(expect.objectContaining({
    operation: 'setEnergy',
    target: 'energy',
    before: 0,
    after: 24,
  }))
})

it('replaces energy for each ingredient and runs equipment combination rules', () => {
  const fixture = fixtures()
  fixture.catalogMaps.ingredients.get('minecraft:coal').rules = [{ type: 'setPendingCard', cardId: 'coppertemper:test_card' }]
  fixture.catalogMaps.ingredients.get('minecraft:coal').energy = 7
  fixture.catalogMaps.equipment.get('coppertemper:sword').combinationRules = [{
    condition: { type: 'hasCard', cardId: 'coppertemper:test_card' },
    effects: [{ type: 'addAttribute', attribute: 'attackDamage', value: 5 }],
  }]
  fixture.recipe.ingredientIds = ['minecraft:coal', 'minecraft:coal']

  const result = simulateRecipe(fixture)

  expect(result.steps[1].phases.find(({ id }) => id === 'ingredientEnergy').state.energy).toBe(7)
  expect(result.steps[0].phases.find(({ id }) => id === 'cardCombinations').state.attributes.attackDamage).toBe(11)
})

it('adds the derived deity bonus to armor points', () => {
  const fixture = fixtures()
  fixture.catalogMaps.materials.set('minecraft:iron_armor', {
    ...fixture.catalogMaps.materials.get('minecraft:iron'),
    id: 'minecraft:iron_armor', families: ['armor'], compatibility: ['coppertemper:helmet'],
    itemIds: { 'coppertemper:helmet': 'minecraft:iron_helmet' },
    armor: { protection: { helmet: 2 }, durability: { helmet: 165 }, enchantability: 9 },
  })
  fixture.catalogMaps.equipment.set('coppertemper:helmet', {
    id: 'coppertemper:helmet', name: 'Helmet', family: 'armor',
    fields: ['armorPoints', 'armorToughness', 'knockbackResistance', 'maxDurability', 'enchantability'], base: { slot: 'helmet' },
  })
  fixture.catalogMaps.ingredients.get('minecraft:coal').rules = [{ type: 'increaseDeity', role: 'oak', value: 2 }]
  fixture.recipe = { ...fixture.recipe, materialId: 'minecraft:iron_armor', equipmentId: 'coppertemper:helmet', ingredientIds: ['minecraft:coal'] }

  expect(simulateRecipe(fixture).steps[0].final.attributes.armorPoints).toBe(3)
})

it('resets dynamic sticky state before each ingredient', () => {
  const fixture = fixtures()
  const initial = { ...createInitialState(fixture), stickyCardIds: ['coppertemper:test_card'] }

  expect(simulateIngredient({ catalogMaps: fixture.catalogMaps, state: initial, ingredientId: 'minecraft:coal' }).phases.find(({ id }) => id === 'prepareCards').state.stickyCardIds).toEqual([])
})

it('runs card transformation in the card combinations phase', () => {
  const fixture = fixtures()
  fixture.catalogMaps.ingredients.get('minecraft:coal').rules = [{ type: 'setPendingCard', cardId: 'coppertemper:test_card' }]
  fixture.catalogMaps.cards.set('coppertemper:test_card', { id: 'coppertemper:test_card', capabilities: { transformTo: 'coppertemper:after_card' }, rulesByPosition: { hidden: [], first: [], second: [], third: [], leaving: [] } })
  fixture.catalogMaps.cards.set('coppertemper:after_card', { id: 'coppertemper:after_card', capabilities: {}, rulesByPosition: { hidden: [], first: [], second: [], third: [], leaving: [] } })

  const phases = simulateRecipe({ ...fixture, recipe: { ...fixture.recipe, ingredientIds: ['minecraft:coal'] } }).steps[0].phases

  expect(phases.find(({ id }) => id === 'activateCards').state.cards.hidden).toBe('coppertemper:test_card')
  expect(phases.find(({ id }) => id === 'cardCombinations').state.cards.hidden).toBe('coppertemper:after_card')
})

it('records energy expiry during finalization', () => {
  const fixture = fixtures()
  const result = simulateRecipe({ ...fixture, recipe: { ...fixture.recipe, ingredientIds: ['minecraft:coal'] } })

  expect(result.steps[0].phases.find(({ id }) => id === 'finalize').events).toContainEqual(expect.objectContaining({ operation: 'setEnergy', before: 24, after: 0, reason: 'energy_expired' }))
})

it('queues Birch until the resolve deities phase', () => {
  const fixture = fixtures()
  fixture.catalogMaps.ingredients.get('minecraft:coal').rules = [{ type: 'attemptDeity', role: 'birch' }]
  fixture.recipe.ingredientIds = ['minecraft:coal']

  const phases = simulateRecipe(fixture).steps[0].phases

  expect(phases.find(({ id }) => id === 'ingredientRules').state.deityLevels.birch).toBe(0)
  expect(phases.find(({ id }) => id === 'ingredientRules').state.deityQueue).toEqual(['birch'])
  expect(phases.find(({ id }) => id === 'resolveDeities').state.deityLevels.birch).toBe(1)
})

it('uses explicit resistance for a queued deity attempt', () => {
  const fixture = fixtures()
  fixture.catalogMaps.ingredients.get('minecraft:coal').rules = [{ type: 'attemptDeity', role: 'birch', resistance: 3 }]
  fixture.recipe.ingredientIds = ['minecraft:coal']

  const phases = simulateRecipe(fixture).steps[0].phases

  expect(phases.find(({ id }) => id === 'resolveDeities').state.energy).toBe(21)
})

it('records the source and phase for a resolved queued deity attempt', () => {
  const fixture = fixtures()
  fixture.catalogMaps.ingredients.get('minecraft:coal').rules = [{ type: 'attemptDeity', role: 'birch' }]
  fixture.recipe.ingredientIds = ['minecraft:coal']

  const phases = simulateRecipe(fixture).steps[0].phases
  const resolution = phases.find(({ id }) => id === 'resolveDeities')

  expect(resolution.events).toContainEqual(expect.objectContaining({
    phase: 'resolveDeities',
    sourceId: 'minecraft:coal',
    operation: 'attemptDeity',
    target: 'birch',
  }))
})

it('deep-freezes queued deity attempt metadata in phase snapshots', () => {
  const fixture = fixtures()
  fixture.catalogMaps.ingredients.get('minecraft:coal').rules = [{ type: 'attemptDeity', role: 'birch' }]
  fixture.recipe.ingredientIds = ['minecraft:coal']

  const phases = simulateRecipe(fixture).steps[0].phases
  const queuedAttempt = phases.find(({ id }) => id === 'ingredientRules').state.deityQueueAttempts[0]

  expect(Object.isFrozen(queuedAttempt)).toBe(true)
})

it('preserves long-lived state while restoring base attributes for each ingredient', () => {
  const fixture = fixtures()
  fixture.catalogMaps.ingredients.get('minecraft:coal').rules = [
    { type: 'increaseDeity', role: 'oak', value: 2 },
    { type: 'addAttribute', attribute: 'attackDamage', value: 5 },
    { type: 'setPendingCard', cardId: 'coppertemper:test_card' },
    { type: 'grantTrait', traitId: 'coppertemper:test_trait' },
  ]
  fixture.catalogMaps.ingredients.set('minecraft:charcoal', {
    ...fixture.catalogMaps.ingredients.get('minecraft:coal'), id: 'minecraft:charcoal', name: 'Charcoal', rules: [],
  })
  fixture.recipe.ingredientIds = ['minecraft:coal', 'minecraft:charcoal']

  const result = simulateRecipe(fixture)
  const second = result.steps[1]

  expect(second.final.deityLevels.oak).toBe(2)
  expect(second.final.cards.hidden).toBe('coppertemper:test_card')
  expect(second.final.traits).toContain('coppertemper:test_trait')
  expect(second.phases.find(({ id }) => id === 'restoreBase').state.attributes.attackDamage).toBe(6)
  expect(second.final.attributes.attackDamage).toBe(7)
})

it('is deterministic and does not mutate frozen recipe or catalog inputs', () => {
  const fixture = fixtures()
  fixture.recipe.ingredientIds = ['minecraft:coal']
  Object.freeze(fixture.recipe)
  Object.freeze(fixture.catalogMaps)

  const first = simulateRecipe(fixture)
  const second = simulateRecipe(fixture)

  expect(second).toEqual(first)
  expect(fixture.recipe.ingredientIds).toEqual(['minecraft:coal'])
})