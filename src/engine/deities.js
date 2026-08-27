const MAX_LEVEL = 15

export const DEITY_QUEUE_ORDER = ['birch', 'spruce', 'acacia', 'jungle', 'cherry', 'mangrove']

const rareRules = {
  normal: { acacia: ['mangrove', 'jungle'], jungle: ['acacia', 'cherry'], cherry: ['jungle', 'mangrove'], mangrove: ['cherry', 'acacia'] },
  mirrored: { acacia: ['jungle', 'mangrove'], jungle: ['cherry', 'acacia'], cherry: ['mangrove', 'jungle'], mangrove: ['acacia', 'cherry'] },
}

function snapshot(state, deityLevels, energy) {
  return Object.freeze({ ...state, energy, deityLevels: Object.freeze(deityLevels) })
}

function event(role, before, after, energyCost, reason) {
  return Object.freeze({ operation: 'attemptDeity', target: role, before, after, energyCost, ...(reason ? { reason } : {}) })
}

function resistanceFor(role, fallback, resistances) {
  return resistances?.[role] ?? fallback
}

function decrease(levels, role, energy, fallbackResistance, resistances) {
  if (levels[role] === 0) return energy
  levels[role] -= 1
  return energy + resistanceFor(role, fallbackResistance, resistances) * 2 ** levels[role]
}

function isBlocked(levels, role, mode) {
  return (mode === 'normal' && role === 'dark_oak' && levels.oak > 0)
    || (mode === 'mirrored' && role === 'oak' && levels.dark_oak > 0)
}

export function attemptDeity({ state, role, mode = 'normal', resistance, resistances }) {
  const levels = { ...state.deityLevels }
  const before = levels[role]
  if (before >= MAX_LEVEL) return { state, events: [event(role, before, before, 0, 'level_cap')] }
  if (isBlocked(levels, role, mode)) return { state, events: [event(role, before, before, 0, 'blocked')] }

  let energy = state.energy
  const rare = rareRules[mode]?.[role]
  if (rare) {
    const [requiredRole, decreasedRole] = rare
    if (levels[requiredRole] !== 0 || (levels[decreasedRole] > 0 && energy < 4)) {
      return { state, events: [event(role, before, before, 0, 'blocked')] }
    }
    energy = decrease(levels, decreasedRole, energy, resistance, resistances)
  }
  const dominance = mode === 'mirrored' ? ['dark_oak', 'oak'] : ['oak', 'dark_oak']
  const opposingRole = role === 'birch' ? 'spruce' : role === 'spruce' ? 'birch' : null
  if (opposingRole && levels[dominance[0]] > levels[dominance[1]] && levels[opposingRole] > 0) {
    if (energy < 4) return { state, events: [event(role, before, before, 0, 'blocked')] }
    energy = decrease(levels, opposingRole, energy, resistance, resistances)
  }

  const cost = resistance * 2 ** before
  if (energy < cost) return { state, events: [event(role, before, before, 0, 'insufficient_energy')] }
  levels[role] += 1
  if (mode === 'normal' && role === 'oak' && levels.oak > levels.dark_oak) levels.dark_oak = 0
  if (mode === 'normal' && role === 'dark_oak' && levels.oak > levels.dark_oak) levels.dark_oak = 0
  if (mode === 'mirrored' && role === 'dark_oak' && levels.dark_oak > levels.oak) levels.oak = 0

  return { state: snapshot(state, levels, energy - cost), events: [event(role, before, levels[role], cost)] }
}

export function resolveDeityQueue({ state, queue, mode = 'normal', resistances }) {
  let nextState = state
  const events = []
  for (const role of DEITY_QUEUE_ORDER) {
    for (const queuedRole of queue.filter((entry) => entry === role)) {
      const result = attemptDeity({ state: nextState, role: queuedRole, mode, resistance: resistanceFor(queuedRole, 8, resistances), resistances })
      nextState = result.state
      events.push(...result.events)
    }
  }
  return { state: snapshot(nextState, { ...nextState.deityLevels }, nextState.energy), events }
}

export function getDeityBonus(deityLevels) {
  return Object.values(deityLevels).reduce((total, level) => total + Math.floor(level / 2), 0)
}