import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { PHASES } from '../engine/simulate'
import { ExplanationPanel } from './ExplanationPanel'

afterEach(cleanup)

function createStep(ingredientId = 'minecraft:coal') {
  return {
    ingredientId,
    phases: PHASES.map((id) => ({
      id,
      events: id === 'ingredientRules'
        ? [{ operation: 'addAttribute', target: 'attackDamage', before: 4, after: 6 }]
        : [],
    })),
  }
}

function renderPanel(overrides = {}) {
  const props = {
    simulation: { steps: [createStep(), createStep('minecraft:charcoal')] },
    catalogMaps: {
      ingredients: new Map([
        ['minecraft:coal', { name: 'Coal' }],
        ['minecraft:charcoal', { name: 'Charcoal' }],
      ]),
      cards: new Map([['coppertemper:test_card', { name: 'Test Card' }]]),
    },
    selectedStep: 1,
    selectedPhase: PHASES.length,
    onStepChange: () => {},
    onPhaseChange: () => {},
    ...overrides,
  }
  return render(<ExplanationPanel {...props} />)
}

async function openInspector() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Open explanation inspector' }))
  return user
}

it('uses a distinct explanation for the initial item state', () => {
  renderPanel({ simulation: undefined, selectedStep: 0, selectedPhase: 1 })

  expect(screen.getByText('Select an ingredient step to inspect its calculation.')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Open explanation inspector' })).toBeNull()
})

it('shows a compact final-effect summary before the inspector opens', () => {
  renderPanel()

  expect(screen.getByText('Last ingredient effects')).toBeVisible()
  expect(screen.getByText('4 \u2192 6')).toBeVisible()
  expect(screen.queryByRole('dialog', { name: 'Explanation inspector' })).toBeNull()
})

it('opens the inspector with a step select and compact phase rail', async () => {
  renderPanel()
  await openInspector()

  expect(screen.getByRole('dialog', { name: 'Explanation inspector' })).toBeVisible()
  expect(screen.getByLabelText('Recipe step')).toHaveValue('1')
  expect(screen.getByRole('option', { name: 'Step 1: Coal' })).toBeVisible()
  expect(screen.getAllByRole('button', { name: /^Phase / })).toHaveLength(PHASES.length)
})

it('changes the selected step through the select and selects its final phase', async () => {
  const onStepChange = vi.fn()
  const onPhaseChange = vi.fn()
  renderPanel({ selectedStep: 2, onStepChange, onPhaseChange })
  const user = await openInspector()

  await user.selectOptions(screen.getByLabelText('Recipe step'), '1')

  expect(onStepChange).toHaveBeenCalledWith(1)
  expect(onPhaseChange).toHaveBeenCalledWith(PHASES.length)
})

it('marks the selected phase and phases with effects', async () => {
  renderPanel()
  await openInspector()

  expect(screen.getByRole('button', { name: 'Phase 15: finalize' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: 'Phase 7: ingredientRules, has effects' })).toBeVisible()
})

it('closes from the close button and returns focus to the trigger', async () => {
  renderPanel()
  const user = await openInspector()
  await user.click(screen.getByRole('button', { name: 'Close explanation inspector' }))

  expect(screen.queryByRole('dialog', { name: 'Explanation inspector' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Open explanation inspector' })).toHaveFocus()
})

it('closes when the backdrop is selected', async () => {
  const view = renderPanel()
  await openInspector()
  await userEvent.setup().click(view.container.querySelector('.explanation-backdrop'))

  expect(screen.queryByRole('dialog', { name: 'Explanation inspector' })).toBeNull()
})

it('closes when Escape is pressed', async () => {
  renderPanel()
  const user = await openInspector()
  await user.keyboard('{Escape}')

  expect(screen.queryByRole('dialog', { name: 'Explanation inspector' })).toBeNull()
})

it('shows a selected phase event in the detail area', async () => {
  renderPanel({ selectedPhase: 7 })
  await openInspector()

  expect(screen.getByRole('heading', { name: '7. ingredientRules' })).toBeVisible()
  expect(screen.getByText('Attack Damage increased from 4 to 6.')).toBeVisible()
})

it('formats rejected deity attempts without exposing a reason code', async () => {
  const step = createStep()
  step.phases[10].events = [{ operation: 'attemptDeity', target: 'oak', before: 1, after: 1, reason: 'insufficient_energy' }]
  renderPanel({ simulation: { steps: [step] }, selectedPhase: 11 })
  await openInspector()

  expect(screen.getByText('Oak could not increase because there was not enough energy.')).toBeVisible()
  expect(screen.queryByText(/insufficient_energy/)).toBeNull()
})

it('formats successful deity attempts with their energy cost', async () => {
  const step = createStep()
  step.phases[10].events = [{ operation: 'attemptDeity', target: 'oak', before: 1, after: 2, energyCost: 16 }]
  renderPanel({ simulation: { steps: [step] }, selectedPhase: 11 })
  await openInspector()

  expect(screen.getByText('Oak increased from 1 to 2. Energy cost: 16.')).toBeVisible()
})

it('formats non-deity effects from their structured values', async () => {
  const step = createStep()
  step.phases[6].events = [
    { operation: 'setAttribute', target: 'attackDamage', before: 5, after: 8 },
    { operation: 'spendEnergy', target: 'energy', before: 24, after: 16 },
  ]
  renderPanel({ simulation: { steps: [step] }, selectedPhase: 7 })
  await openInspector()

  expect(screen.getByText('Attack Damage changed from 5 to 8.')).toBeVisible()
  expect(screen.getByText('Energy decreased from 24 to 16.')).toBeVisible()
})

it('explains cards moving between queue slots', async () => {
  const step = createStep()
  step.phases[7].events = [
    { operation: 'moveCard', target: 'coppertemper:test_card', before: 'hidden', after: 'first' },
  ]
  renderPanel({ simulation: { steps: [step] }, selectedPhase: 8 })
  await openInspector()

  expect(screen.getByText('Existing Test Card moved from hidden to first.')).toBeVisible()
})

it('uses card names in the final-effect summary', () => {
  const step = createStep()
  step.phases[7].events = [
    { operation: 'moveCard', target: 'coppertemper:test_card', before: 'pending', after: 'hidden' },
  ]
  renderPanel({ simulation: { steps: [step] } })

  expect(screen.getByText('New Test Card')).toBeVisible()
  expect(screen.queryByText('Coppertemper:test_card')).toBeNull()
})

it('shows each same-card movement in the final-effect summary', () => {
  const step = createStep()
  step.phases[12].events = [
    { operation: 'moveCard', target: 'coppertemper:test_card', before: 'pending', after: 'hidden' },
    { operation: 'moveCard', target: 'coppertemper:test_card', before: 'hidden', after: 'first' },
  ]
  renderPanel({ simulation: { steps: [step] } })

  expect(screen.getByText('pending \u2192 hidden')).toBeVisible()
  expect(screen.getByText('hidden \u2192 first')).toBeVisible()
  expect(screen.getByText('New Test Card')).toBeVisible()
  expect(screen.getByText('Existing Test Card')).toBeVisible()
})

it('uses card names in transformation events', async () => {
  const step = createStep()
  step.phases[9].events = [
    { operation: 'transformCard', target: 'coppertemper:test_card', before: 'coppertemper:test_card', after: 'coppertemper:after_card' },
  ]
  const catalogMaps = {
    ingredients: new Map([['minecraft:coal', { name: 'Coal' }]]),
    cards: new Map([
      ['coppertemper:test_card', { name: 'Test Card' }],
      ['coppertemper:after_card', { name: 'After Card' }],
    ]),
  }
  renderPanel({ simulation: { steps: [step] }, catalogMaps, selectedPhase: 10 })
  await openInspector()

  expect(screen.getByText('Test Card transformed into After Card.')).toBeVisible()
})
