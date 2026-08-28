import { composeBaseItem } from './baseItem'
import { activateCards, applyCardLifecycle, pushPendingCard, selectWorldMode } from './cards'
import { getDeityBonus, resolveDeityQueue } from './deities'
import { applyEffects, evaluateCondition } from './rules'

export const PHASES = [
  'reset', 'prepareCards', 'restoreBase', 'selectWorld', 'ingredientEnergy',
  'materialBefore', 'ingredientRules', 'pushCard', 'activateCards',
  'cardCombinations', 'resolveDeities', 'afterDeityRules', 'pushAfterDeityCard',
  'materialAfter', 'finalize',
]

const deityRoles = ['oak', 'dark_oak', 'birch', 'spruce', 'acacia', 'jungle', 'cherry', 'mangrove']

export function createInitialState({ catalogMaps, recipe }) {
  const baseItem = composeBaseItem({ catalogMaps, materialId: recipe.materialId, equipmentId: recipe.equipmentId })
  return Object.freeze({
    baseItem,
    family: baseItem.family,
    materialId: recipe.materialId,
    equipmentId: recipe.equipmentId,
    attributes: Object.freeze({ ...baseItem.attributes }),
    energy: 0,
    deityLevels: Object.freeze(Object.fromEntries(deityRoles.map((role) => [role, 0]))),
    deityResistances: Object.freeze({ ...catalogMaps.materials.get(recipe.materialId).deityResistances }),
    deityQueue: Object.freeze([]),
    deityQueueAttempts: Object.freeze([]),
    cards: Object.freeze({ hidden: null, first: null, second: null, third: null, leaving: null }),
    traits: Object.freeze([]),
    worldMode: 'normal',
    stickyCardIds: Object.freeze([]),
  })
}

export function createEvent({ phase, sourceId, operation, target, before, after, energyCost, reason }) {
  return Object.freeze(Object.fromEntries(Object.entries({ phase, sourceId, operation, target, before, after, energyCost, reason }).filter(([, value]) => value !== undefined)))
}

function freezeState(state) {
  return Object.freeze({
    ...state,
    attributes: Object.freeze({ ...state.attributes }),
    deityLevels: Object.freeze({ ...state.deityLevels }),
    deityResistances: Object.freeze({ ...state.deityResistances }),
    deityQueue: Object.freeze([...state.deityQueue]),
    deityQueueAttempts: Object.freeze((state.deityQueueAttempts ?? []).map((attempt) => Object.freeze({ ...attempt }))),
    cards: Object.freeze({ ...state.cards }),
    traits: Object.freeze([...state.traits]),
    stickyCardIds: Object.freeze([...state.stickyCardIds]),
  })
}

function runRules(rules, context) {
  let next = context
  for (const rule of rules) {
    const effects = rule.effects ?? [rule]
    if (!rule.condition || evaluateCondition(rule.condition, next)) next = applyEffects(effects, next)
  }
  return next
}

function phase(phases, id, state, events = []) {
  phases.push(Object.freeze({ id, state: freezeState(state), events: Object.freeze([...events]) }))
}

export function simulateIngredient({ catalogMaps, state, ingredientId }) {
  const ingredient = catalogMaps.ingredients.get(ingredientId)
  if (!ingredient) throw new Error(`Unknown ingredient ID: ${ingredientId}`)
  const material = catalogMaps.materials.get(state.materialId)
  const phases = []
  let nextState = freezeState(state)
  let pendingCardId = null

  nextState = freezeState({ ...nextState, cards: { ...nextState.cards, leaving: null }, deityQueue: [], deityQueueAttempts: [] })
  phase(phases, 'reset', nextState)
  nextState = freezeState({ ...nextState, stickyCardIds: [] })
  phase(phases, 'prepareCards', nextState)
  nextState = freezeState({
    ...nextState,
    attributes: { ...nextState.baseItem.attributes },
    deityResistances: { ...material.deityResistances },
  })
  phase(phases, 'restoreBase', nextState)
  ;({ state: nextState } = selectWorldMode({ state: nextState, catalogMaps }))
  phase(phases, 'selectWorld', nextState)
  const priorEnergy = nextState.energy
  nextState = freezeState({ ...nextState, energy: ingredient.energy })
  phase(phases, 'ingredientEnergy', nextState, [createEvent({ phase: 'ingredientEnergy', sourceId: ingredientId, operation: 'setEnergy', target: 'energy', before: priorEnergy, after: ingredient.energy })])

  let context = runRules(material.hooks?.beforeIngredient ?? [], { state: nextState, catalogMaps, sourceId: material.id, phase: 'materialBefore', pendingCardId })
  nextState = context.state
  pendingCardId = context.pendingCardId
  phase(phases, 'materialBefore', nextState, context.events)
  context = runRules(ingredient.rules ?? [], { state: nextState, catalogMaps, sourceId: ingredientId, phase: 'ingredientRules', pendingCardId })
  nextState = context.state
  pendingCardId = context.pendingCardId
  phase(phases, 'ingredientRules', nextState, context.events)
  let pushResult = pushPendingCard({ state: nextState, pendingCardId, catalogMaps })
  nextState = pushResult.state
  phase(phases, 'pushCard', nextState, pushResult.events.map((event) => createEvent({ ...event, phase: 'pushCard', sourceId: ingredientId })))
  const activation = activateCards({ state: nextState, catalogMaps, phaseContext: { phase: 'activateCards', pendingCardId } })
  nextState = activation.state
  phase(phases, 'activateCards', nextState, activation.events)
  context = runRules(catalogMaps.equipment.get(nextState.equipmentId)?.combinationRules ?? [], { state: nextState, catalogMaps, sourceId: nextState.equipmentId, phase: 'cardCombinations', pendingCardId: null })
  context = applyCardLifecycle({ state: context.state, catalogMaps, phaseContext: { phase: 'cardCombinations', events: context.events } })
  nextState = context.state
  phase(phases, 'cardCombinations', nextState, context.events)
  const deityResult = resolveDeityQueue({ state: nextState, queue: nextState.deityQueueAttempts, mode: nextState.worldMode, resistances: nextState.deityResistances })
  nextState = freezeState({ ...deityResult.state, deityQueue: [], deityQueueAttempts: [] })
  phase(phases, 'resolveDeities', nextState, deityResult.events.map((event) => createEvent({ ...event, phase: 'resolveDeities' })))
  context = runRules(ingredient.afterDeityRules ?? [], { state: nextState, catalogMaps, sourceId: ingredientId, phase: 'afterDeityRules', pendingCardId: null })
  nextState = context.state
  pendingCardId = context.pendingCardId
  phase(phases, 'afterDeityRules', nextState, context.events)
  pushResult = pushPendingCard({ state: nextState, pendingCardId, catalogMaps })
  nextState = pushResult.state
  phase(phases, 'pushAfterDeityCard', nextState, pushResult.events.map((event) => createEvent({ ...event, phase: 'pushAfterDeityCard', sourceId: ingredientId })))
  context = runRules(material.hooks?.afterIngredient ?? [], { state: nextState, catalogMaps, sourceId: material.id, phase: 'materialAfter', pendingCardId: null })
  nextState = context.state
  phase(phases, 'materialAfter', nextState, context.events)
  const deityBonus = getDeityBonus(nextState.deityLevels)
  const bonusAttribute = nextState.family === 'tool' ? 'attackDamage' : 'armorPoints'
  const finalEvents = []
  if (deityBonus > 0 && bonusAttribute in nextState.attributes) {
    const before = nextState.attributes[bonusAttribute]
    const after = before + deityBonus
    nextState = freezeState({ ...nextState, attributes: { ...nextState.attributes, [bonusAttribute]: after } })
    finalEvents.push(createEvent({ phase: 'finalize', sourceId: ingredientId, operation: 'addAttribute', target: bonusAttribute, before, after }))
  }
  if (nextState.energy !== 0) finalEvents.push(createEvent({ phase: 'finalize', sourceId: ingredientId, operation: 'setEnergy', target: 'energy', before: nextState.energy, after: 0, reason: 'energy_expired' }))
  nextState = freezeState({ ...nextState, energy: 0 })
  phase(phases, 'finalize', nextState, finalEvents)

  return Object.freeze({ ingredientId, phases: Object.freeze(phases), final: nextState })
}

export function simulateRecipe({ catalogMaps, recipe }) {
  const initial = createInitialState({ catalogMaps, recipe })
  let state = initial
  const steps = []
  for (const ingredientId of recipe.ingredientIds) {
    const step = simulateIngredient({ catalogMaps, state, ingredientId })
    steps.push(step)
    state = step.final
  }
  return Object.freeze({ initial, steps: Object.freeze(steps) })
}