import { expect, it } from 'vitest'
import { applyEffects, evaluateCondition } from './rules'

const context = {
  state: { energy: 8, family: 'tool', attributes: { attackDamage: 5 }, traits: [] },
  catalogMaps: { traits: new Map([['coppertemper:test_trait', { validFamilies: ['tool'], validEquipmentIds: [] }]]) },
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

it.each([
  [{ type: 'addEnergy', value: 2 }, 10],
  [{ type: 'spendEnergy', value: 2 }, 6],
  [{ type: 'setEnergy', value: 2 }, 2],
])('records energy as the target for %s', (effect, after) => {
  const result = applyEffects([effect], context)

  expect(result.events).toContainEqual(expect.objectContaining({
    operation: effect.type,
    target: 'energy',
    before: 8,
    after,
  }))
})

it.each([
  ['setPendingCard', { type: 'setPendingCard', cardId: 'card:new' }, { pendingCardId: 'card:old' }, {}, { target: 'pendingCard', before: 'card:old', after: 'card:new' }],
  ['moveCard', { type: 'moveCard', from: 'first', to: 'second' }, {}, {}, { target: 'card:old', before: 'first', after: 'second' }],
  ['removeCard', { type: 'removeCard', position: 'first' }, {}, {}, { target: 'card:old', before: 'first', after: null }],
  ['retainCard', { type: 'retainCard', position: 'first' }, {}, {}, { target: 'card:old', before: false, after: true }],
  ['clearSticky', { type: 'clearSticky', position: 'first' }, {}, { stickyCardIds: ['card:old'] }, { target: 'card:old', before: true, after: false }],
  ['transformCard', { type: 'transformCard', cardId: 'card:old', transformTo: 'card:new' }, {}, {}, { target: 'card:old', before: 'card:old', after: 'card:new' }],
  ['setWorldMode', { type: 'setWorldMode', value: 'mirrored' }, {}, {}, { target: 'worldMode', before: 'normal', after: 'mirrored' }],
])('records structured values for %s', (_name, effect, contextOverrides, stateOverrides, expected) => {
  const result = applyEffects([effect], {
    ...context,
    ...contextOverrides,
    state: {
      ...context.state,
      worldMode: 'normal',
      cards: { hidden: null, first: 'card:old', second: null, third: null, leaving: null },
      stickyCardIds: [],
      ...stateOverrides,
    },
  })

  expect(result.events).toContainEqual(expect.objectContaining(expected))
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

it.each([
  ['bright', { oak: 1, dark_oak: 0, birch: 0, spruce: 1 }, false],
  ['balanced', { oak: 1, dark_oak: 1, birch: 0, spruce: 1 }, true],
  ['shaded', { oak: 0, dark_oak: 1, birch: 0, spruce: 1 }, false],
  ['opposition-free', { oak: 0, dark_oak: 1, birch: 0, spruce: 0 }, true],
])('queues Birch only for a %s normal-world state', (_name, deityLevels, queued) => {
  const result = applyEffects([{ type: 'attemptDeity', role: 'birch' }], {
    ...context,
    state: { ...context.state, deityLevels },
  })

  expect(result.state.deityQueue).toEqual(queued ? ['birch'] : [])
  expect(result.events).toEqual(queued
    ? [expect.objectContaining({ operation: 'queueDeity', target: 'birch' })]
    : [expect.objectContaining({ operation: 'attemptDeity', target: 'birch', reason: 'blocked' })])
})

it('queues Spruce in independent mode when Birch is present', () => {
  const result = applyEffects([{ type: 'attemptDeity', role: 'spruce' }], {
    ...context,
    state: {
      ...context.state,
      worldMode: 'independent',
      deityLevels: { oak: 1, dark_oak: 0, birch: 1, spruce: 0 },
    },
  })

  expect(result.state.deityQueue).toEqual(['spruce'])
})

it.each([-1, 0, 0.5])('rejects an invalid deity adjustment value of %s', (value) => {
  expect(() => applyEffects([{ type: 'increaseDeity', role: 'oak', value }], {
    ...context,
    state: { ...context.state, deityLevels: { oak: 1 } },
  })).toThrow('Deity adjustment value must be a positive integer')
})

it('rejects a trait that does not apply to the selected equipment', () => {
  expect(() => applyEffects([{ type: 'grantTrait', traitId: 'coppertemper:armor_trait' }], {
    ...context,
    state: { ...context.state, equipmentId: 'coppertemper:sword' },
    catalogMaps: { traits: new Map([['coppertemper:armor_trait', { validFamilies: ['armor'], validEquipmentIds: [] }]]) },
  })).toThrow('does not apply to coppertemper:sword')
})

it('rejects an unknown trait without changing state', () => {
  expect(() => applyEffects([{ type: 'grantTrait', traitId: 'coppertemper:missing_trait' }], {
    ...context,
    state: { ...context.state, equipmentId: 'coppertemper:sword' },
    catalogMaps: { traits: new Map() },
  })).toThrow('Unknown trait ID: coppertemper:missing_trait')
})