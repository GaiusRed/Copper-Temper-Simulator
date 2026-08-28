import { render, screen } from '@testing-library/preact'
import { expect, it } from 'vitest'
import { ExplanationPanel } from './ExplanationPanel'

it('uses a distinct explanation for the initial item state', () => {
  render(<ExplanationPanel selectedStep={0} selectedPhase={1} onStepChange={() => {}} onPhaseChange={() => {}} />)

  expect(screen.getByRole('button', { name: 'Initial state' })).toBeVisible()
  expect(screen.getByText('Select an ingredient step to inspect its calculation.')).toBeVisible()
  expect(screen.queryByText('Initial item state.')).toBeNull()
})

it('formats structured attribute events for a selected phase', () => {
  render(<ExplanationPanel simulation={{ steps: [{ ingredientId: 'minecraft:coal', phases: [{ id: 'ingredientRules', events: [{ operation: 'addAttribute', target: 'attackDamage', before: 5, after: 7 }] }] }] }} selectedStep={1} selectedPhase={1} onStepChange={() => {}} onPhaseChange={() => {}} />)

  expect(screen.getByText('Attack Damage increased from 5 to 7.')).toBeVisible()
})

it('formats rejected deity attempts without exposing a reason code', () => {
  render(<ExplanationPanel simulation={{ steps: [{ ingredientId: 'minecraft:coal', phases: [{ id: 'resolveDeities', events: [{ operation: 'attemptDeity', target: 'oak', before: 1, after: 1, reason: 'insufficient_energy' }] }] }] }} selectedStep={1} selectedPhase={1} onStepChange={() => {}} onPhaseChange={() => {}} />)

  expect(screen.getByText('Oak could not increase because there was not enough energy.')).toBeVisible()
  expect(screen.queryByText(/insufficient_energy/)).toBeNull()
})

it('formats successful deity attempts with their energy cost', () => {
  render(<ExplanationPanel simulation={{ steps: [{ ingredientId: 'minecraft:coal', phases: [{ id: 'resolveDeities', events: [{ operation: 'attemptDeity', target: 'oak', before: 1, after: 2, energyCost: 16 }] }] }] }} selectedStep={1} selectedPhase={1} onStepChange={() => {}} onPhaseChange={() => {}} />)

  expect(screen.getByText('Oak increased from 1 to 2. Energy cost: 16.')).toBeVisible()
})

it('formats non-deity effects from their structured values', () => {
  render(<ExplanationPanel simulation={{ steps: [{ ingredientId: 'minecraft:coal', phases: [{ id: 'ingredientRules', events: [{ operation: 'setAttribute', target: 'attackDamage', before: 5, after: 8 }, { operation: 'spendEnergy', target: 'energy', before: 24, after: 16 }] }] }] }} selectedStep={1} selectedPhase={1} onStepChange={() => {}} onPhaseChange={() => {}} />)

  expect(screen.getByText('Attack Damage changed from 5 to 8.')).toBeVisible()
  expect(screen.getByText('Energy decreased from 24 to 16.')).toBeVisible()
})