import { applyEffects } from './rules'

function isSticky(cardId, state, catalogMaps) {
  return state.stickyCardIds?.includes(cardId)
    || catalogMaps.cards.get(cardId)?.capabilities?.sticky === true
}

export function pushPendingCard({ state, pendingCardId, catalogMaps }) {
  if (!pendingCardId) return { state, events: [] }
  const cards = state.cards
  const nextCards = { ...cards, hidden: pendingCardId }
  let incomingCardId = cards.hidden

  for (const position of ['first', 'second', 'third']) {
    if (isSticky(cards[position], state, catalogMaps)) {
      nextCards.leaving = incomingCardId
      break
    }

    nextCards[position] = incomingCardId
    incomingCardId = cards[position]
    nextCards.leaving = incomingCardId
  }

  return {
    state: Object.freeze({
      ...state,
      cards: Object.freeze(nextCards),
    }),
    events: [],
  }
}

export function activateCards({ state, catalogMaps, phaseContext }) {
  const activationOrder = ['leaving', 'third', 'second', 'first', 'hidden']
  let context = { ...phaseContext, state, catalogMaps, events: [] }

  for (const position of activationOrder) {
    const cardId = context.state.cards[position]
    const card = catalogMaps.cards.get(cardId)
    const effects = card?.rulesByPosition?.[position] ?? []
    context = applyEffects(effects, { ...context, sourceId: cardId })
    if (cardId && card?.capabilities?.removeAfterActivation && context.state.cards[position] === cardId) {
      context = applyEffects([{ type: 'removeCard', position }], context)
    }
  }

  return { state: context.state, events: context.events, activationOrder }
}

export function applyCardLifecycle({ state, catalogMaps, phaseContext }) {
  let context = { ...phaseContext, state, catalogMaps, events: phaseContext.events ?? [] }
  for (const position of ['hidden', 'first', 'second', 'third', 'leaving']) {
    const cardId = context.state.cards[position]
    const capabilities = catalogMaps.cards.get(cardId)?.capabilities
    if (cardId && capabilities?.transformTo) context = applyEffects([{ type: 'transformCard', cardId, transformTo: capabilities.transformTo }], { ...context, sourceId: cardId })
    if (position === 'leaving' && cardId && capabilities?.retainLeavingCardId && context.state.cards.leaving === cardId) context = applyEffects([{ type: 'transformCard', cardId, transformTo: capabilities.retainLeavingCardId }], { ...context, sourceId: cardId })
  }
  return { state: context.state, events: context.events }
}

export function selectWorldMode({ state, catalogMaps }) {
  const worldCardId = ['third', 'second', 'first', 'hidden']
    .map((position) => state.cards[position])
    .find((cardId) => catalogMaps.cards.get(cardId)?.capabilities?.isWorldCard)
  const worldMode = worldCardId
    ? catalogMaps.cards.get(worldCardId).capabilities.worldMode
    : 'normal'

  return { state: Object.freeze({ ...state, worldMode }), events: [] }
}