export function getStepEffects(step) {
  const effects = []
  const effectIndexes = new Map()
  for (const phase of step?.phases ?? []) {
    for (const event of phase.events) {
      if (event.operation === 'setPendingCard') continue
      if (event.target == null || event.before === undefined || event.after === undefined) continue
      if (event.operation === 'moveCard') {
        effects.push({ operation: event.operation, target: event.target, before: event.before, after: event.after, phaseId: phase.id })
        continue
      }
      const currentIndex = effectIndexes.get(event.target)
      if (currentIndex === undefined) {
        effectIndexes.set(event.target, effects.length)
        effects.push({ target: event.target, before: event.before, after: event.after, phaseId: phase.id })
      } else {
        effects[currentIndex] = { ...effects[currentIndex], after: event.after, phaseId: phase.id }
      }
    }
  }
  return effects.filter((effect) => effect.before !== effect.after)
}

export function phaseHasEffects(phase) {
  return phase?.events.some((event) => event.before !== undefined && event.after !== undefined && event.before !== event.after) ?? false
}

export function formatTarget(target) {
  return target.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())
}
