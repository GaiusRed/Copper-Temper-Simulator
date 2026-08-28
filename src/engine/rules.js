import { attemptDeity, DEITY_QUEUE_ORDER } from './deities'

export const CONDITION_TYPES = ['compare', 'equipmentFamily', 'equipmentId', 'materialId', 'cardAtPosition', 'worldMode', 'hasTrait', 'hasCard']
export const EFFECT_TYPES = ['addAttribute', 'subtractAttribute', 'setAttribute', 'multiplyAttribute', 'grantTrait', 'removeTrait', 'addEnergy', 'spendEnergy', 'setEnergy', 'attemptDeity', 'queueDeity', 'increaseDeity', 'decreaseDeity', 'reduceDeityResistance', 'setPendingCard', 'moveCard', 'removeCard', 'retainCard', 'transformCard', 'setSticky', 'clearSticky', 'setWorldMode']

function valueFor(target, state) {
  if (target === 'energy') return state.energy
  if (target === 'totalDeityLevels') return Object.values(state.deityLevels ?? {}).reduce((total, level) => total + level, 0)
  return state.attributes?.[target] ?? state.deityLevels?.[target]
}

function canQueueDeityAttempt(state, role) {
  if (!['birch', 'spruce'].includes(role) || state.worldMode === 'independent') return true
  const opposingRole = role === 'birch' ? 'spruce' : 'birch'
  return state.deityLevels[opposingRole] === 0 || state.deityLevels.oak === state.deityLevels.dark_oak
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
    deityResistances: { ...(context.state.deityResistances ?? {}) },
    deityQueue: [...(context.state.deityQueue ?? [])],
    deityQueueAttempts: [...(context.state.deityQueueAttempts ?? [])],
    cards: { ...(context.state.cards ?? {}) },
    stickyCardIds: [...(context.state.stickyCardIds ?? [])],
  }
  let pendingCardId = context.pendingCardId ?? null
  let events = [...(context.events ?? [])]
  for (const effect of effects) {
    if (effect.effects) {
      if (effect.condition && !evaluateCondition(effect.condition, { ...context, state })) continue
      const result = applyEffects(effect.effects, { ...context, state, pendingCardId, events })
      state = result.state
      pendingCardId = result.pendingCardId
      events = [...result.events]
      continue
    }
    let target = effect.attribute ?? effect.role ?? effect.traitId ?? effect.cardId ?? effect.position
    let before = effect.attribute ? state.attributes[effect.attribute]
      : effect.role ? state.deityLevels[effect.role]
        : ['addEnergy', 'spendEnergy', 'setEnergy'].includes(effect.type) ? state.energy
          : effect.cardId ?? effect.position
    if (['addEnergy', 'spendEnergy', 'setEnergy'].includes(effect.type)) target = 'energy'
    if (effect.type === 'setPendingCard') {
      target = 'pendingCard'
      before = pendingCardId
    }
    if (effect.type === 'moveCard') {
      target = effect.from === 'pending' ? pendingCardId : state.cards[effect.from]
      before = effect.from
    }
    if (effect.type === 'removeCard') {
      const position = effect.position ?? Object.keys(state.cards).find((entry) => state.cards[entry] === effect.cardId)
      target = effect.cardId ?? state.cards[position]
      before = position
    }
    if (['retainCard', 'setSticky', 'clearSticky'].includes(effect.type)) {
      target = effect.cardId ?? state.cards[effect.position]
      before = state.stickyCardIds.includes(target)
    }
    if (effect.type === 'setWorldMode') {
      target = 'worldMode'
      before = state.worldMode
    }
    if (['addAttribute', 'subtractAttribute', 'setAttribute', 'multiplyAttribute'].includes(effect.type)) {
      if (state.baseItem?.fields && !state.baseItem.fields.includes(effect.attribute)) throw new Error(`Unknown equipment attribute: ${effect.attribute}`)
      const current = state.attributes[effect.attribute]
      const next = effect.type === 'addAttribute' ? current + effect.value
        : effect.type === 'subtractAttribute' ? current - effect.value
          : effect.type === 'multiplyAttribute' ? current * effect.value : effect.value
      state.attributes[effect.attribute] = effect.truncate || ['harvestLevel', 'maxDurability', 'enchantability', 'armorPoints'].includes(effect.attribute) ? Math.trunc(next) : next
    }
    if (effect.type === 'grantTrait' && !state.traits.includes(effect.traitId)) {
      const trait = context.catalogMaps?.traits?.get(effect.traitId)
      if (!trait) throw new Error(`Unknown trait ID: ${effect.traitId}`)
      if (!trait.validFamilies.includes(state.family) || (trait.validEquipmentIds.length > 0 && !trait.validEquipmentIds.includes(state.equipmentId))) {
        throw new Error(`${effect.traitId} does not apply to ${state.equipmentId}`)
      }
      state.traits.push(effect.traitId)
    }
    if (effect.type === 'removeTrait') state.traits = state.traits.filter((traitId) => traitId !== effect.traitId)
    if (effect.type === 'addEnergy') state.energy += effect.value
    if (effect.type === 'spendEnergy') state.energy = Math.max(0, state.energy - effect.value)
    if (effect.type === 'setEnergy') state.energy = effect.value
    if (['increaseDeity', 'decreaseDeity'].includes(effect.type)) {
      const adjustment = effect.value ?? 1
      if (!Number.isInteger(adjustment) || adjustment < 1) throw new Error('Deity adjustment value must be a positive integer')
      state.deityLevels[effect.role] = effect.type === 'increaseDeity'
        ? Math.min(15, state.deityLevels[effect.role] + adjustment)
        : Math.max(0, state.deityLevels[effect.role] - adjustment)
    }
    if (effect.type === 'reduceDeityResistance') {
      const resistance = state.deityResistances[effect.role]
      state.deityResistances[effect.role] = Math.max(1, effect.factor === 0.5
        ? Math.trunc(resistance / 2)
        : Math.trunc(resistance / 4) * 3)
    }
    if (effect.type === 'queueDeity') {
      if (!DEITY_QUEUE_ORDER.includes(effect.role)) throw new Error(`Cannot queue immediate deity role: ${effect.role}`)
      state.deityQueue.push(effect.role)
      state.deityQueueAttempts.push({ role: effect.role, resistance: effect.resistance, sourceId: context.sourceId })
    }
    if (effect.type === 'attemptDeity') {
      if (DEITY_QUEUE_ORDER.includes(effect.role)) {
        if (!canQueueDeityAttempt(state, effect.role)) {
          events.push(Object.freeze({ phase: context.phase, sourceId: context.sourceId, operation: 'attemptDeity', target: effect.role, before, after: before, energyCost: 0, reason: 'blocked' }))
          continue
        }
        state.deityQueue.push(effect.role)
        state.deityQueueAttempts.push({ role: effect.role, resistance: effect.resistance, sourceId: context.sourceId })
        events.push(Object.freeze({ phase: context.phase, sourceId: context.sourceId, operation: 'queueDeity', target: effect.role, before: undefined, after: effect.role }))
        continue
      }
      const resistance = effect.resistance
        ?? state.deityResistances?.[effect.role]
        ?? context.catalogMaps?.materials?.get(state.materialId)?.deityResistances?.[effect.role]
        ?? 8
      const result = attemptDeity({ state, role: effect.role, mode: state.worldMode, resistance })
      state = { ...result.state, attributes: { ...result.state.attributes }, traits: [...result.state.traits], deityLevels: { ...result.state.deityLevels }, deityQueue: [...result.state.deityQueue], deityQueueAttempts: [...(result.state.deityQueueAttempts ?? [])], cards: { ...result.state.cards }, stickyCardIds: [...result.state.stickyCardIds] }
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
    let after = effect.attribute ? state.attributes[effect.attribute]
      : effect.role ? state.deityLevels[effect.role]
        : ['addEnergy', 'spendEnergy', 'setEnergy'].includes(effect.type) ? state.energy
          : effect.cardId ?? effect.position
    if (effect.type === 'setPendingCard') after = pendingCardId
    if (effect.type === 'moveCard') after = effect.to
    if (effect.type === 'removeCard') after = null
    if (['retainCard', 'setSticky', 'clearSticky'].includes(effect.type)) after = state.stickyCardIds.includes(target)
    if (effect.type === 'transformCard') after = effect.transformTo
    if (effect.type === 'setWorldMode') after = state.worldMode
    if (effect.type === 'reduceDeityResistance') {
      target = effect.role
      before = context.state.deityResistances?.[effect.role]
      after = state.deityResistances[effect.role]
    }
    events.push(Object.freeze({ phase: context.phase, sourceId: context.sourceId, operation: effect.type, target, before, after, ...(effect.type === 'attemptDeity' && before !== undefined ? { energyCost: Math.max(0, context.state.energy - state.energy) } : {}) }))
  }
  return {
    ...context,
    pendingCardId,
    state: Object.freeze({ ...state, attributes: Object.freeze(state.attributes), traits: Object.freeze(state.traits), deityLevels: Object.freeze(state.deityLevels), deityResistances: Object.freeze(state.deityResistances), deityQueue: Object.freeze(state.deityQueue), deityQueueAttempts: Object.freeze(state.deityQueueAttempts.map((attempt) => Object.freeze({ ...attempt }))), cards: Object.freeze(state.cards), stickyCardIds: Object.freeze(state.stickyCardIds) }),
    events: Object.freeze(events),
  }
}