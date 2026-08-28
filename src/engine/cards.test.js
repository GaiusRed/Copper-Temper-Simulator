import { expect, it } from 'vitest'
import { catalogMaps } from '../catalog'
import { activateCards, applyCardLifecycle, pushPendingCard, selectWorldMode } from './cards'

it('pushes hidden cards through visible slots and into leaving', () => {
  const state = {
    cards: { hidden: 'card:newer', first: 'card:one', second: 'card:two', third: 'card:three', leaving: null },
  }
  const result = pushPendingCard({ state, pendingCardId: 'card:newest', catalogMaps: { cards: new Map() } })
  expect(result.state.cards).toEqual({
    hidden: 'card:newest', first: 'card:newer', second: 'card:one', third: 'card:two', leaving: 'card:three',
  })
})

it('does not move cards without a pending card', () => {
  const state = { cards: { hidden: 'card:hidden', first: 'card:first', second: null, third: null, leaving: null } }

  expect(pushPendingCard({ state, pendingCardId: null, catalogMaps: { cards: new Map() } }).state.cards).toEqual(state.cards)
})

it('keeps oldest contiguous sticky cards in their visible positions', () => {
  const state = {
    cards: { hidden: null, first: 'card:normal', second: 'card:sticky_a', third: 'card:sticky_b', leaving: null },
  }
  const catalogMaps = {
    cards: new Map([
      ['card:normal', { id: 'card:normal', capabilities: {} }],
      ['card:sticky_a', { id: 'card:sticky_a', capabilities: { sticky: true } }],
      ['card:sticky_b', { id: 'card:sticky_b', capabilities: { sticky: true } }],
    ]),
  }

  const result = pushPendingCard({ state, pendingCardId: 'card:new', catalogMaps })

  expect(result.state.cards).toEqual({
    hidden: 'card:new', first: null, second: 'card:sticky_a', third: 'card:sticky_b', leaving: 'card:normal',
  })
})

it('keeps cards marked sticky by an earlier effect in their visible positions', () => {
  const state = {
    stickyCardIds: ['card:dynamic'],
    cards: { hidden: null, first: 'card:normal', second: 'card:dynamic', third: null, leaving: null },
  }
  const result = pushPendingCard({
    state,
    pendingCardId: 'card:new',
    catalogMaps: { cards: new Map([['card:normal', { capabilities: {} }], ['card:dynamic', { capabilities: {} }]]) },
  })

  expect(result.state.cards).toMatchObject({ second: 'card:dynamic', leaving: 'card:normal' })
})

it('activates card positions from leaving through hidden', () => {
  const card = (rulesByPosition) => ({ id: 'card:test', capabilities: {}, rulesByPosition })
  const result = activateCards({
    state: {
      attributes: { attackDamage: 0 },
      traits: [],
      cards: { hidden: 'card:hidden', first: 'card:first', second: 'card:second', third: 'card:third', leaving: 'card:leaving' },
    },
    catalogMaps: {
      cards: new Map([
        ['card:leaving', card({ leaving: [{ type: 'addAttribute', attribute: 'attackDamage', value: 1 }] })],
        ['card:third', card({ third: [{ type: 'multiplyAttribute', attribute: 'attackDamage', value: 10 }] })],
        ['card:second', card({ second: [{ type: 'addAttribute', attribute: 'attackDamage', value: 2 }] })],
        ['card:first', card({ first: [{ type: 'multiplyAttribute', attribute: 'attackDamage', value: 10 }] })],
        ['card:hidden', card({ hidden: [{ type: 'addAttribute', attribute: 'attackDamage', value: 3 }] })],
      ]),
    },
    phaseContext: { phase: 'activateCards' },
  })

  expect(result.activationOrder).toEqual(['leaving', 'third', 'second', 'first', 'hidden'])
  expect(result.state.attributes.attackDamage).toBe(123)
})

it('uses the highest-priority visible world card', () => {
  const result = selectWorldMode({
    state: {
      worldMode: 'normal',
      cards: { hidden: 'card:hidden', first: 'card:first', second: 'card:second', third: 'card:third', leaving: null },
    },
    catalogMaps: {
      cards: new Map([
        ['card:hidden', { capabilities: { isWorldCard: true, worldMode: 'independent' } }],
        ['card:first', { capabilities: { isWorldCard: true, worldMode: 'mirrored' } }],
        ['card:second', { capabilities: { isWorldCard: true, worldMode: 'independent' } }],
        ['card:third', { capabilities: {} }],
      ]),
    },
  })

  expect(result.state.worldMode).toBe('independent')
})

it('uses Tower to halve Witch resistances in a visible position', () => {
  const result = activateCards({
    state: {
      attributes: {}, traits: [], deityLevels: {}, deityResistances: { oak: 11, dark_oak: 11, birch: 11, spruce: 11, acacia: 11, jungle: 11, cherry: 11, mangrove: 11 },
      deityQueue: [], deityQueueAttempts: [], stickyCardIds: [],
      cards: { hidden: null, first: 'coppertemper:witch', second: null, third: 'coppertemper:tower', leaving: null },
    },
    catalogMaps,
    phaseContext: { phase: 'activateCards' },
  })

  expect(result.state.deityResistances).toMatchObject({ dark_oak: 5, spruce: 5, cherry: 5, mangrove: 5 })
  expect(result.state.deityResistances).toMatchObject({ oak: 11, birch: 11, acacia: 11, jungle: 11 })
})

it('uses Tower to halve Sorcerer resistances unless Tower is hidden', () => {
  const state = (hidden) => ({
    attributes: {}, traits: [], deityLevels: {}, deityResistances: { oak: 11, dark_oak: 11, birch: 11, spruce: 11, acacia: 11, jungle: 11, cherry: 11, mangrove: 11 },
    deityQueue: [], deityQueueAttempts: [], stickyCardIds: [],
    cards: { hidden, first: 'coppertemper:sorcerer', second: null, third: 'coppertemper:tower', leaving: null },
  })

  const visibleTower = activateCards({ state: state(null), catalogMaps, phaseContext: { phase: 'activateCards' } })
  const hiddenTower = activateCards({ state: state('coppertemper:tower'), catalogMaps, phaseContext: { phase: 'activateCards' } })

  expect(visibleTower.state.deityResistances).toMatchObject({ oak: 5, birch: 5, acacia: 5, jungle: 5 })
  expect(hiddenTower.state.deityResistances).toMatchObject({ oak: 6, birch: 6, acacia: 6, jungle: 6 })
})

it('applies card self-removal during activation and transformations during lifecycle', () => {
  const result = activateCards({
    state: { attributes: {}, traits: [], deityLevels: {}, deityQueue: [], stickyCardIds: [], cards: { hidden: 'card:remove', first: 'card:transform', second: null, third: null, leaving: null } },
    catalogMaps: { cards: new Map([
      ['card:remove', { capabilities: { removeAfterActivation: true }, rulesByPosition: { hidden: [] } }],
      ['card:transform', { capabilities: { transformTo: 'card:after' }, rulesByPosition: { first: [] } }],
      ['card:after', { capabilities: {}, rulesByPosition: {} }],
    ]) },
    phaseContext: { phase: 'activateCards' },
  })
  expect(result.state.cards).toMatchObject({ hidden: null, first: 'card:transform' })
  const lifecycle = applyCardLifecycle({
    state: result.state,
    catalogMaps: { cards: new Map([['card:transform', { capabilities: { transformTo: 'card:after' } }]]) },
    phaseContext: { phase: 'cardCombinations' },
  })
  expect(lifecycle.state.cards.first).toBe('card:after')
})

it('retains a configured leaving card during lifecycle', () => {
  const result = applyCardLifecycle({
    state: { attributes: {}, traits: [], deityLevels: {}, deityQueue: [], stickyCardIds: [], cards: { hidden: null, first: null, second: null, third: null, leaving: 'card:leaving' } },
    catalogMaps: { cards: new Map([
      ['card:leaving', { capabilities: { retainLeavingCardId: 'card:retained' }, rulesByPosition: { leaving: [] } }],
      ['card:retained', { capabilities: {}, rulesByPosition: {} }],
    ]) },
    phaseContext: { phase: 'cardCombinations' },
  })

  expect(result.state.cards.leaving).toBe('card:retained')
})