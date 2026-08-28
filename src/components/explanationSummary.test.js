import { describe, expect, it } from 'vitest'
import { formatTarget, getStepEffects, phaseHasEffects } from './explanationSummary'

describe('getStepEffects', () => {
  it('combines changes to one target across phases', () => {
    const step = { phases: [
      { id: 'ingredientEnergy', events: [
        { target: 'energy', before: 0, after: 24 },
      ] },
      { id: 'resolveDeities', events: [
        { target: 'energy', before: 24, after: 16 },
      ] },
    ] }

    expect(getStepEffects(step)).toEqual([
      { target: 'energy', before: 0, after: 16, phaseId: 'resolveDeities' },
    ])
  })

  it('omits a target when its final value equals its first value', () => {
    const step = { phases: [
      { id: 'ingredientRules', events: [
        { target: 'attackDamage', before: 4, after: 6 },
        { target: 'attackDamage', before: 6, after: 4 },
      ] },
    ] }

    expect(getStepEffects(step)).toEqual([])
  })

  it('ignores events without comparable values', () => {
    const step = { phases: [{ id: 'ingredientRules', events: [
      { operation: 'queueDeity', target: 'oak' },
      { operation: 'addAttribute', target: 'attackDamage', before: 4, after: 6 },
    ] }] }

    expect(getStepEffects(step)).toEqual([
      { target: 'attackDamage', before: 4, after: 6, phaseId: 'ingredientRules' },
    ])
  })

  it('omits transient pending-card changes', () => {
    const step = { phases: [{ id: 'ingredientRules', events: [
      { operation: 'setPendingCard', target: 'pendingCard', before: null, after: 'card:oak' },
    ] }] }

    expect(getStepEffects(step)).toEqual([])
  })

  it('keeps separate movements for cards with the same ID', () => {
    const step = { phases: [{ id: 'pushAfterDeityCard', events: [
      { operation: 'moveCard', target: 'card:oak', before: 'pending', after: 'hidden' },
      { operation: 'moveCard', target: 'card:oak', before: 'hidden', after: 'first' },
    ] }] }

    expect(getStepEffects(step)).toEqual([
      { operation: 'moveCard', target: 'card:oak', before: 'pending', after: 'hidden', phaseId: 'pushAfterDeityCard' },
      { operation: 'moveCard', target: 'card:oak', before: 'hidden', after: 'first', phaseId: 'pushAfterDeityCard' },
    ])
  })
})

it('marks only phases with changed before and after values', () => {
  expect(phaseHasEffects({ events: [{ before: 1, after: 2 }] })).toBe(true)
  expect(phaseHasEffects({ events: [{ before: 1, after: 1 }] })).toBe(false)
  expect(phaseHasEffects({ events: [] })).toBe(false)
})

it('formats camel-case targets as labels', () => {
  expect(formatTarget('attackDamage')).toBe('Attack Damage')
})
