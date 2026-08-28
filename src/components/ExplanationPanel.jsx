import { useLayoutEffect, useRef, useState } from 'preact/hooks'
import { PHASES } from '../engine/simulate'
import { formatTarget, getStepEffects, phaseHasEffects } from './explanationSummary'

function catalogName(id, catalogMaps) {
  return catalogMaps?.ingredients?.get(id)?.name ?? catalogMaps?.cards?.get(id)?.name
}

function displayTarget(target, catalogMaps) {
  return catalogName(target, catalogMaps) ?? formatTarget(target)
}

function displayValue(value, catalogMaps) {
  return catalogName(value, catalogMaps) ?? String(value ?? 'none')
}

function displayEffectTarget(effect, catalogMaps) {
  const target = displayTarget(effect.target, catalogMaps)
  if (effect.operation !== 'moveCard') return target
  return `${effect.before === 'pending' ? 'New' : 'Existing'} ${target}`
}

function formatEvent(event, catalogMaps) {
  const target = displayTarget(event.target, catalogMaps)
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
  if (event.operation === 'setPendingCard') return `The pending card changed from ${displayValue(event.before, catalogMaps)} to ${displayValue(event.after, catalogMaps)}.`
  if (event.operation === 'moveCard' && event.before === 'pending') return `New ${target} was added to ${event.after}.`
  if (event.operation === 'moveCard') return `Existing ${target} moved from ${event.before} to ${event.after}.`
  if (event.operation === 'removeCard') return `${target} was removed.`
  if (event.operation === 'retainCard' || event.operation === 'setSticky') return `${target} was retained.`
  if (event.operation === 'clearSticky') return `${target} was no longer retained.`
  if (event.operation === 'transformCard') return `${displayValue(event.before, catalogMaps)} transformed into ${displayValue(event.after, catalogMaps)}.`
  if (event.operation === 'setWorldMode') return `The world rule mode changed from ${event.before} to ${event.after}.`
  return `${event.operation}${event.target ? `: ${event.target}` : ''}.`
}

export function ExplanationPanel({ simulation, catalogMaps, selectedStep, selectedPhase, onStepChange, onPhaseChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef(null)
  const closeButtonRef = useRef(null)
  const step = simulation?.steps[selectedStep - 1]
  const phase = step?.phases[selectedPhase - 1]
  const effects = getStepEffects(step)
  const isFinalPhase = selectedPhase === PHASES.length

  useLayoutEffect(() => {
    if (!isOpen) return undefined
    closeButtonRef.current?.focus()
    function closeOnEscape(event) {
      if (event.key === 'Escape') closeInspector()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [isOpen])

  function closeInspector() {
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  function changeStep(event) {
    const nextStep = Number(event.currentTarget.value)
    onStepChange(nextStep)
    onPhaseChange(nextStep === 0 ? 1 : PHASES.length)
  }

  return <section class="panel explanation-panel">
    <div class="panel-heading"><h2>Explanations</h2></div>
    <div class="explanation-body">
      {step ? <div class="explanation-summary">
        <div class="explanation-summary-heading"><h3>Last ingredient effects</h3><button ref={triggerRef} type="button" onClick={() => setIsOpen(true)}>Open explanation inspector</button></div>
        {effects.length ? <div class="effect-list">{effects.map((effect, index) => <div class="effect-row" key={`${effect.operation ?? 'change'}-${effect.target}-${index}`}><span>{displayEffectTarget(effect, catalogMaps)}</span><strong>{displayValue(effect.before, catalogMaps)}{' \u2192 '}{displayValue(effect.after, catalogMaps)}</strong><small>Changed during {effect.phaseId}</small></div>)}</div> : <p>This ingredient did not change the final state.</p>}
      </div> : <p>Select an ingredient step to inspect its calculation.</p>}
    </div>
    {isOpen && <div class="explanation-backdrop" onClick={closeInspector}>
      <section role="dialog" aria-modal="true" aria-labelledby="explanation-inspector-title" class="explanation-inspector" onClick={(event) => event.stopPropagation()}>
        <header class="inspector-heading"><h2 id="explanation-inspector-title">Explanation inspector</h2><button ref={closeButtonRef} type="button" aria-label="Close explanation inspector" onClick={closeInspector}>x</button></header>
        <div class="inspector-step-bar"><label for="explanation-step">Recipe step</label><select id="explanation-step" value={selectedStep} onChange={changeStep}><option value="0">Initial state</option>{simulation?.steps.map((entry, index) => <option key={`${entry.ingredientId}-${index}`} value={index + 1}>Step {index + 1}: {catalogName(entry.ingredientId, catalogMaps) ?? entry.ingredientId}</option>)}</select>{step && <span>{isFinalPhase ? 'Final state selected' : `Phase ${selectedPhase} selected`}</span>}</div>
        <div class="inspector-body">
          <nav class="phase-rail" aria-label="Simulation phases">{step?.phases.map((entry, index) => {
            const hasEffects = phaseHasEffects(entry)
            const label = `Phase ${index + 1}: ${entry.id}${hasEffects ? ', has effects' : ''}`
            return <button key={entry.id} type="button" aria-label={label} aria-pressed={selectedPhase === index + 1} onClick={() => onPhaseChange(index + 1)}><span>{index + 1}</span>{entry.id}{hasEffects && <small>Effect</small>}</button>
          })}</nav>
          <div class="phase-details">
            {step && isFinalPhase ? <><span class="phase-kicker">Phase {PHASES.length} of {PHASES.length}</span><h3>Final state</h3>{effects.length ? <div class="effect-list">{effects.map((effect, index) => <div class="effect-row" key={`${effect.operation ?? 'change'}-${effect.target}-${index}`}><span>{displayEffectTarget(effect, catalogMaps)}</span><strong>{displayValue(effect.before, catalogMaps)}{' \u2192 '}{displayValue(effect.after, catalogMaps)}</strong><small>Changed during {effect.phaseId}</small></div>)}</div> : <p>This ingredient did not change the final state.</p>}</> : phase ? <><span class="phase-kicker">Phase {selectedPhase} of {PHASES.length}</span><h3>{selectedPhase}. {phase.id}</h3>{phase.events.length ? phase.events.map((event, index) => <p key={`${event.operation}-${event.target}-${index}`}>{formatEvent(event, catalogMaps)}</p>) : <p>This phase did not produce an event.</p>}</> : <p>Select an ingredient step to inspect its calculation.</p>}
          </div>
        </div>
      </section>
    </div>}
  </section>
}