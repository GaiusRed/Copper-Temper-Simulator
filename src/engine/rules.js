import { attemptDeity } from './deities'

export const CONDITION_TYPES = ['compare', 'equipmentFamily', 'equipmentId', 'materialId', 'cardAtPosition', 'worldMode', 'hasTrait', 'hasCard']
export const EFFECT_TYPES = ['addAttribute', 'subtractAttribute', 'setAttribute', 'multiplyAttribute', 'grantTrait', 'removeTrait', 'addEnergy', 'spendEnergy', 'setEnergy', 'attemptDeity', 'queueDeity', 'increaseDeity', 'decreaseDeity', 'setPendingCard', 'moveCard', 'removeCard', 'retainCard', 'transformCard', 'setSticky', 'clearSticky', 'setWorldMode']

function valueFor(target, state) {
  if (target === 'energy') return state.energy
  if (target === 'totalDeityLevels') return Object.values(state.deityLevels ?? {}).reduce((total, level) => total + level, 0)
  return state.attributes?.[target] ?? state.deityLevels?.[target]
}

export function evaluateCondition(condition, context) {
  if (condition.all) return condition.all.every((entry) => evaluateCondition(entry, context))
  if (condition.any) return condition.any.some((entry) => evaluateCondition(entry, context))
  if (condition.not) return !evaluateCondition(condition.not, context)
  if (condition.type === 'equipmentFamily') return context.state.family === condition.value
  if (condition.type === 'equipmentId') return context.state.equipmentId === condition.value
  if (condition.type === 'materialId') return context.state.materialId === condition.value
  if (condition.type === 'worldMode') return context.state.worldMode === condition.value
  if (condition.type === 'hasTrait') return context.state.traits?.includes(condition.traitId)
  if (condition.type === 'hasCard') return Object.values(context.state.cards ?? {}).includes(condition.cardId)
  if (condition.type === 'cardAtPosition') return context.state.cards?.[condition.position] === condition.cardId
  if (condition.type === 'compare') {
    const value = valueFor(condition.target, context.state)
    return ({ gte: value >= condition.value, gt: value > condition.value, lte: value <= condition.value, lt: value < condition.value, eq: value === condition.value })[condition.operator] ?? false
  }
  return false
}

export function applyEffects(effects, context) {
  let state = {
    ...context.state,
    attributes: { ...context.state.attributes },
    traits: [...(context.state.traits ?? [])],
    deityLevels: { ...(context.state.deityLevels ?? {}) },
    deityQueue: [...(context.state.deityQueue ?? [])],
    cards: { ...(context.state.cards ?? {}) },
    stickyCardIds: [...(context.state.stickyCardIds ?? [])],
  }
  let pendingCardId = context.pendingCardId ?? null
  const events = [...(context.events ?? [])]
  for (const effect of effects) {
    const target = effect.attribute ?? effect.role ?? effect.traitId ?? effect.cardId ?? effect.position
    const before = effect.attribute ? state.attributes[effect.attribute]
      : effect.role ? state.deityLevels[effect.role]
        : ['addEnergy', 'spendEnergy', 'setEnergy'].includes(effect.type) ? state.energy
          : effect.cardId ?? effect.position
    if (['addAttribute', 'subtractAttribute', 'setAttribute', 'multiplyAttribute'].includes(effect.type)) {
      if (state.baseItem?.fields && !state.baseItem.fields.includes(effect.attribute)) throw new Error(`Unknown equipment attribute: ${effect.attribute}`)
      const current = state.attributes[effect.attribute]
      const next = effect.type === 'addAttribute' ? current + effect.value
        : effect.type === 'subtractAttribute' ? current - effect.value
          : effect.type === 'multiplyAttribute' ? current * effect.value : effect.value
      state.attributes[effect.attribute] = effect.truncate || ['harvestLevel', 'maxDurability', 'enchantability', 'armorPoints'].includes(effect.attribute) ? Math.trunc(next) : next
    }
    if (effect.type === 'grantTrait' && !state.traits.includes(effect.traitId)) state.traits.push(effect.traitId)
    if (effect.type === 'removeTrait') state.traits = state.traits.filter((traitId) => traitId !== effect.traitId)
    if (effect.type === 'addEnergy') state.energy += effect.value
    if (effect.type === 'spendEnergy') state.energy = Math.max(0, state.energy - effect.value)
    if (effect.type === 'setEnergy') state.energy = effect.value
    if (effect.type === 'increaseDeity') state.deityLevels[effect.role] = Math.min(15, state.deityLevels[effect.role] + (effect.value ?? 1))
    if (effect.type === 'decreaseDeity') state.deityLevels[effect.role] = Math.max(0, state.deityLevels[effect.role] - (effect.value ?? 1))
    if (effect.type === 'queueDeity') state.deityQueue.push(effect.role)
    if (effect.type === 'attemptDeity') {
      const resistance = effect.resistance
        ?? context.catalogMaps?.materials?.get(state.materialId)?.deityResistances?.[effect.role]
        ?? 8
      const result = attemptDeity({ state, role: effect.role, mode: state.worldMode, resistance })
      state = { ...result.state, attributes: { ...result.state.attributes }, traits: [...result.state.traits], deityLevels: { ...result.state.deityLevels }, deityQueue: [...result.state.deityQueue], cards: { ...result.state.cards }, stickyCardIds: [...result.state.stickyCardIds] }
      events.push(...result.events.map((event) => Object.freeze({ ...event, phase: context.phase, sourceId: context.sourceId })))
      continue
    }
    if (effect.type === 'setPendingCard') pendingCardId = effect.cardId
    if (effect.type === 'moveCard') {
      const cardId = effect.from === 'pending' ? pendingCardId : state.cards[effect.from]
      if (effect.from === 'pending') pendingCardId = null
      else state.cards[effect.from] = null
      state.cards[effect.to] = cardId
    }
    if (effect.type === 'removeCard') {
      for (const position of Object.keys(state.cards)) if (state.cards[position] === effect.cardId || position === effect.position) state.cards[position] = null
    }
    if (effect.type === 'retainCard' || effect.type === 'setSticky') {
      const cardId = effect.cardId ?? state.cards[effect.position]
      if (cardId && !state.stickyCardIds.includes(cardId)) state.stickyCardIds.push(cardId)
    }
    if (effect.type === 'clearSticky') state.stickyCardIds = state.stickyCardIds.filter((cardId) => cardId !== (effect.cardId ?? state.cards[effect.position]))
    if (effect.type === 'transformCard') {
      for (const position of Object.keys(state.cards)) if (state.cards[position] === effect.cardId) state.cards[position] = effect.transformTo
      if (pendingCardId === effect.cardId) pendingCardId = effect.transformTo
    }
    if (effect.type === 'setWorldMode') state.worldMode = effect.value
    const after = effect.attribute ? state.attributes[effect.attribute]
      : effect.role ? state.deityLevels[effect.role]
        : ['addEnergy', 'spendEnergy', 'setEnergy'].includes(effect.type) ? state.energy
          : effect.cardId ?? effect.position
    events.push(Object.freeze({ phase: context.phase, sourceId: context.sourceId, operation: effect.type, target, before, after, ...(effect.type === 'attemptDeity' && before !== undefined ? { energyCost: Math.max(0, context.state.energy - state.energy) } : {}) }))
  }
  return {
    ...context,
    pendingCardId,
    state: Object.freeze({ ...state, attributes: Object.freeze(state.attributes), traits: Object.freeze(state.traits), deityLevels: Object.freeze(state.deityLevels), deityQueue: Object.freeze(state.deityQueue), cards: Object.freeze(state.cards), stickyCardIds: Object.freeze(state.stickyCardIds) }),
    events: Object.freeze(events),
  }
}