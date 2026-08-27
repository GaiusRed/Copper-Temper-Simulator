import { expect, it } from 'vitest'
import { applyEffects, evaluateCondition } from './rules'

const context = {
  state: { energy: 8, family: 'tool', attributes: { attackDamage: 5 }, traits: [] },
}

it('evaluates nested conditions', () => {
  expect(evaluateCondition({ all: [{ type: 'compare', target: 'energy', operator: 'gte', value: 8 }, { type: 'equipmentFamily', value: 'tool' }] }, context)).toBe(true)
})

it('matches an equipment ID', () => {
  const equipmentContext = {
    ...context,
    state: { ...context.state, equipmentId: 'coppertemper:sword' },
  }

  expect(evaluateCondition({ type: 'equipmentId', value: 'coppertemper:sword' }, equipmentContext)).toBe(true)
  expect(evaluateCondition({ type: 'equipmentId', value: 'coppertemper:axe' }, equipmentContext)).toBe(false)
})

it('finds a card in any active position', () => {
  const cardContext = {
    ...context,
    state: {
      ...context.state,
      cards: { hidden: null, first: 'coppertemper:test_card', second: null, third: null, leaving: null },
    },
  }

  expect(evaluateCondition({ type: 'hasCard', cardId: 'coppertemper:test_card' }, cardContext)).toBe(true)
  expect(evaluateCondition({ type: 'hasCard', cardId: 'coppertemper:other_card' }, cardContext)).toBe(false)
})

it('applies effects in order', () => {
  const result = applyEffects([
    { type: 'multiplyAttribute', attribute: 'attackDamage', value: 1.5 },
    { type: 'addAttribute', attribute: 'attackDamage', value: 1 },
    { type: 'grantTrait', traitId: 'coppertemper:test_trait' },
  ], context)
  expect(result.state.attributes.attackDamage).toBe(8.5)
  expect(result.state.traits).toEqual(['coppertemper:test_trait'])
})

it('evaluates material, world, trait, and card-position conditions', () => {
  const fullContext = {
    ...context,
    state: {
      ...context.state,
      materialId: 'minecraft:iron',
      worldMode: 'independent',
      traits: ['coppertemper:test_trait'],
      cards: { first: 'coppertemper:test_card' },
    },
  }
  expect(evaluateCondition({ type: 'materialId', value: 'minecraft:iron' }, fullContext)).toBe(true)
  expect(evaluateCondition({ type: 'worldMode', value: 'independent' }, fullContext)).toBe(true)
  expect(evaluateCondition({ type: 'hasTrait', traitId: 'coppertemper:test_trait' }, fullContext)).toBe(true)
  expect(evaluateCondition({ type: 'cardAtPosition', position: 'first', cardId: 'coppertemper:test_card' }, fullContext)).toBe(true)
})

it('applies energy, deity, card, and world effects immutably', () => {
  const result = applyEffects([
    { type: 'addEnergy', value: 8 },
    { type: 'spendEnergy', value: 3 },
    { type: 'increaseDeity', role: 'oak', value: 2 },
    { type: 'setPendingCard', cardId: 'coppertemper:test_card' },
    { type: 'moveCard', from: 'pending', to: 'first' },
    { type: 'setWorldMode', value: 'mirrored' },
  ], {
    ...context,
    state: { ...context.state, deityLevels: { oak: 0 }, cards: { first: null } },
  })
  expect(result.state).toMatchObject({ energy: 13, deityLevels: { oak: 2 }, cards: { first: 'coppertemper:test_card' }, worldMode: 'mirrored' })
})

it('uses the selected material resistance for deity attempts', () => {
  const result = applyEffects([{ type: 'attemptDeity', role: 'oak' }], {
    ...context,
    state: { ...context.state, materialId: 'minecraft:iron', deityLevels: { oak: 0 }, energy: 10 },
    catalogMaps: { materials: new Map([['minecraft:iron', { deityResistances: { oak: 3 } }]]) },
  })

  expect(result.state).toMatchObject({ energy: 7, deityLevels: { oak: 1 } })
})

it('compares the sum of all deity levels', () => {
  expect(evaluateCondition({ type: 'compare', target: 'totalDeityLevels', operator: 'gte', value: 3 }, {
    ...context,
    state: { ...context.state, deityLevels: { oak: 2, birch: 1 } },
  })).toBe(true)
})

it('clears a dynamic sticky card flag', () => {
  const result = applyEffects([{ type: 'clearSticky', cardId: 'coppertemper:test_card' }], {
    ...context,
    state: { ...context.state, stickyCardIds: ['coppertemper:test_card'] },
  })

  expect(result.state.stickyCardIds).toEqual([])
})

it('records actual values for applied attribute effects', () => {
  const result = applyEffects([{ type: 'addAttribute', attribute: 'attackDamage', value: 2 }], { ...context, phase: 'ingredientRules', sourceId: 'minecraft:coal' })

  expect(result.events).toContainEqual(expect.objectContaining({ phase: 'ingredientRules', sourceId: 'minecraft:coal', operation: 'addAttribute', target: 'attackDamage', before: 5, after: 7 }))
})

it('records one complete event for a deity attempt', () => {
  const result = applyEffects([{ type: 'attemptDeity', role: 'oak' }], {
    ...context,
    phase: 'ingredientRules',
    sourceId: 'minecraft:coal',
    state: { ...context.state, materialId: 'minecraft:iron', energy: 10, deityLevels: { oak: 0 } },
    catalogMaps: { materials: new Map([['minecraft:iron', { deityResistances: { oak: 3 } }]]) },
  })

  expect(result.events).toEqual([expect.objectContaining({
    phase: 'ingredientRules', sourceId: 'minecraft:coal', operation: 'attemptDeity', target: 'oak', before: 0, after: 1, energyCost: 3,
  })])
})