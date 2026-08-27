import { PHASES } from '../engine/simulate'

function formatEvent(event) {
  const target = event.target?.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())
  if (event.operation === 'setEnergy' && event.reason === 'energy_expired') return `Energy expired from ${event.before} to ${event.after}.`
  if (event.operation === 'attemptDeity' && event.reason === 'insufficient_energy') return `${target} could not increase because there was not enough energy.`
  if (event.operation === 'attemptDeity' && event.reason === 'blocked') return `${target} could not increase because its rule conditions were not met.`
  if (event.operation === 'attemptDeity' && event.reason === 'level_cap') return `${target} is already at the maximum level.`
  if (event.operation === 'attemptDeity') return `${target} increased from ${event.before} to ${event.after}. Energy cost: ${event.energyCost}.`
  if (event.reason) return `${event.target} was not applied: ${event.reason}.`
  if (event.operation === 'addAttribute') return `${target} increased from ${event.before} to ${event.after}.`
  if (event.operation === 'subtractAttribute') return `${target} decreased from ${event.before} to ${event.after}.`
  if (['setAttribute', 'multiplyAttribute', 'setEnergy'].includes(event.operation)) return `${target} changed from ${event.before} to ${event.after}.`
  if (event.operation === 'addEnergy') return `Energy increased from ${event.before} to ${event.after}.`
  if (event.operation === 'spendEnergy') return `Energy decreased from ${event.before} to ${event.after}.`
  if (event.operation === 'increaseDeity') return `${target} increased from ${event.before} to ${event.after}.`
  if (event.operation === 'decreaseDeity') return `${target} decreased from ${event.before} to ${event.after}.`
  if (event.operation === 'queueDeity') return `${target} was queued.`
  if (event.operation === 'grantTrait') return `${target} was granted.`
  if (event.operation === 'removeTrait') return `${target} was removed.`
  if (event.operation === 'setPendingCard') return `The pending card was set to ${target}.`
  if (event.operation === 'moveCard') return `A card moved to ${target}.`
  if (event.operation === 'removeCard') return `${target} was removed.`
  if (event.operation === 'retainCard' || event.operation === 'setSticky') return `${target} was retained.`
  if (event.operation === 'clearSticky') return `${target} was no longer retained.`
  if (event.operation === 'transformCard') return `${target} was transformed.`
  if (event.operation === 'setWorldMode') return 'The world rule mode changed.'
  return `${event.operation}${event.target ? `: ${event.target}` : ''}.`
}

export function ExplanationPanel({ simulation, selectedStep, selectedPhase, onStepChange, onPhaseChange }) {
  const step = simulation?.steps[selectedStep - 1]
  const phase = step?.phases[selectedPhase - 1]
  return <section class="panel explanation-panel"><div class="panel-heading"><h2>Explanations</h2></div><div class="explanation-body">
    <div class="step-controls" aria-label="Recipe steps"><button type="button" aria-pressed={selectedStep === 0} onClick={() => { onStepChange(0); onPhaseChange(1) }}>Initial state</button>{simulation?.steps.map((entry, index) => <button type="button" aria-pressed={selectedStep === index + 1} onClick={() => { onStepChange(index + 1); onPhaseChange(1) }}>Step {index + 1}: {entry.ingredientId}</button>)}</div>
    {step && <div class="phase-controls" aria-label="Simulation phases">{PHASES.map((phaseId, index) => <button type="button" aria-pressed={selectedPhase === index + 1} onClick={() => onPhaseChange(index + 1)}>Phase {index + 1}: {phaseId}</button>)}</div>}
    {phase ? <><h3>{selectedPhase}. {phase.id}</h3>{phase.events.map((event) => <p>{formatEvent(event)}</p>)}</> : <p>Select an ingredient step to inspect its calculation.</p>}
  </div></section>
}