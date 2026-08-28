# Explanation Inspector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan inline, task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the growing explanation controls with a compact summary and a wide phase inspector that selects the final phase by default.

**Architecture:** `App` will continue to own recipe, step, and phase state. `ExplanationPanel` will own only the open state and focus behavior of the inspector. A small pure helper module will derive display summaries from simulation events without changing the engine.

**Tech Stack:** Preact 10, Vite 8, Vitest 4, Testing Library, plain CSS

## Global Constraints

- Do not change the simulation engine or its event format.
- Select phase `PHASES.length` whenever an action selects an ingredient step.
- Show the initial state without a selected phase when no ingredient is selected.
- Keep the browser document fixed at desktop widths.
- Keep all controls accessible on narrow screens through internal scrolling.
- Use the current visual language and dependencies. Do not add an icon package.

---

## File Structure

- Modify `src/App.jsx` to apply final-phase selection rules.
- Modify `src/App.test.jsx` to cover add, select, remove, reorder, and import behavior.
- Create `src/components/explanationSummary.js` for pure event aggregation.
- Create `src/components/explanationSummary.test.js` for summary rules.
- Modify `src/components/ExplanationPanel.jsx` to render the summary, step select, dialog, phase rail, and details.
- Modify `src/components/ExplanationPanel.test.jsx` to cover rendering, selection, dialog controls, and keyboard behavior.
- Modify `src/App.css` to constrain the desktop viewport and style the compact inspector.

### Task 1: Final-Phase Selection

**Files:**
- Modify: `src/App.jsx`
- Test: `src/App.test.jsx`

**Interfaces:**
- Consumes: `PHASES` from `src/engine/simulate.js`.
- Produces: `FINAL_PHASE`, equal to `PHASES.length`, for all ingredient-step selections.

- [ ] **Step 1: Write failing integration tests**

Replace the old phase-selection test and extend the state tests with these cases:

```jsx
it('selects the final phase when an ingredient is added', async () => {
  const { user } = renderReadyApp()

  await user.click(screen.getByRole('button', { name: 'Coal' }))

  expect(screen.getByRole('button', { name: 'Phase 15: finalize' }))
    .toHaveAttribute('aria-pressed', 'true')
})

it('selects the final phase when a recipe step is selected', async () => {
  const { user } = renderReadyApp()
  await user.click(screen.getByRole('button', { name: 'Coal' }))
  await user.click(screen.getByRole('button', { name: 'Phase 5: ingredientEnergy' }))
  await user.click(screen.getByText('Coal', { selector: 'li span' }))

  expect(screen.getByRole('button', { name: 'Phase 15: finalize' }))
    .toHaveAttribute('aria-pressed', 'true')
})

it('selects the imported recipe last step and final phase', async () => {
  const { user } = renderReadyApp()
  await user.click(screen.getByRole('button', { name: 'Import recipe' }))
  await user.type(screen.getByRole('textbox'), JSON.stringify({
    schemaVersion: 1,
    materialId: 'minecraft:iron',
    equipmentId: 'coppertemper:sword',
    ingredientIds: ['minecraft:coal'],
  }))
  await user.click(screen.getByRole('button', { name: 'Import' }))

  expect(screen.getByRole('button', { name: 'Step 1: minecraft:coal' }))
    .toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: 'Phase 15: finalize' }))
    .toHaveAttribute('aria-pressed', 'true')
})
```

Add a local `renderReadyApp()` test helper that creates the fixture maps, renders
`App`, and selects Iron and Sword. Keep the existing removal test, but update it
to assert that the remaining step and phase 15 are selected. Add a reorder case
that asserts phase 15 after a drop event.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run:

```powershell
npm test -- src/App.test.jsx
```

Expected: The new assertions fail because additions and recipe actions select
phase 1.

- [ ] **Step 3: Apply one final-phase constant to all state transitions**

Update the import and each selection callback in `App.jsx`:

```jsx
import { PHASES, simulateRecipe } from './engine/simulate'

const FINAL_PHASE = PHASES.length
```

Use `setSelectedPhase(FINAL_PHASE)` after add, recipe selection, reorder, and
removal. Import behavior must select the imported final step:

```jsx
setSelectedStep(nextRecipe.ingredientIds.length)
setSelectedPhase(nextRecipe.ingredientIds.length ? FINAL_PHASE : 1)
```

Keep `selectedStep === 0` for an empty recipe.

- [ ] **Step 4: Run the focused tests**

Run:

```powershell
npm test -- src/App.test.jsx
```

Expected: All App tests pass with the existing explanation controls.

### Task 2: Final-Step Effect Summary

**Files:**
- Create: `src/components/explanationSummary.js`
- Create: `src/components/explanationSummary.test.js`

**Interfaces:**
- Consumes: A simulation step with `phases[].events[]`.
- Produces: `getStepEffects(step)`, which returns `{ target, before, after, phaseId }[]`.
- Produces: `phaseHasEffects(phase)`, which returns a Boolean.
- Produces: `formatTarget(target)`, which returns a display label.

- [ ] **Step 1: Write failing helper tests**

Create tests for aggregation and unchanged values:

```js
import { describe, expect, it } from 'vitest'
import { getStepEffects, phaseHasEffects } from './explanationSummary'

describe('getStepEffects', () => {
  it('combines changes to one target across phases', () => {
    const step = { phases: [
      { id: 'ingredientEnergy', events: [
        { target: 'energy', before: 0, after: 24 },
      ] },
      { id: 'resolveDeities', events: [
        { target: 'energy', before: 24, after: 16 },
      ] },
    ] }

    expect(getStepEffects(step)).toEqual([
      { target: 'energy', before: 0, after: 16, phaseId: 'resolveDeities' },
    ])
  })

  it('omits a target when its final value equals its first value', () => {
    const step = { phases: [
      { id: 'ingredientRules', events: [
        { target: 'attackDamage', before: 4, after: 6 },
        { target: 'attackDamage', before: 6, after: 4 },
      ] },
    ] }

    expect(getStepEffects(step)).toEqual([])
  })
})

it('marks only phases with changed before and after values', () => {
  expect(phaseHasEffects({ events: [{ before: 1, after: 2 }] })).toBe(true)
  expect(phaseHasEffects({ events: [{ before: 1, after: 1 }] })).toBe(false)
  expect(phaseHasEffects({ events: [] })).toBe(false)
})
```

Also test that `formatTarget('attackDamage')` returns `Attack Damage`.

- [ ] **Step 2: Run the helper tests and confirm failure**

Run:

```powershell
npm test -- src/components/explanationSummary.test.js
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the pure summary helpers**

Use one map entry per event target. Keep the first `before`, the latest `after`,
and the phase of the latest change:

```js
export function getStepEffects(step) {
  const effects = new Map()
  for (const phase of step?.phases ?? []) {
    for (const event of phase.events) {
      if (event.target == null || event.before === undefined || event.after === undefined) continue
      const current = effects.get(event.target)
      effects.set(event.target, {
        target: event.target,
        before: current?.before ?? event.before,
        after: event.after,
        phaseId: phase.id,
      })
    }
  }
  return [...effects.values()].filter((effect) => effect.before !== effect.after)
}

export function phaseHasEffects(phase) {
  return phase?.events.some((event) => event.before !== undefined && event.after !== undefined && event.before !== event.after) ?? false
}

export function formatTarget(target) {
  return target.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())
}
```

Do not move event-sentence formatting into this module. The helper only derives
final display data.

- [ ] **Step 4: Run the helper tests**

Run:

```powershell
npm test -- src/components/explanationSummary.test.js
```

Expected: All summary-helper tests pass.

### Task 3: Compact Summary And Inspector Drawer

**Files:**
- Modify: `src/components/ExplanationPanel.jsx`
- Modify: `src/components/ExplanationPanel.test.jsx`

**Interfaces:**
- Consumes: `getStepEffects`, `phaseHasEffects`, and `formatTarget` from `explanationSummary.js`.
- Keeps: Existing `simulation`, `selectedStep`, `selectedPhase`, `onStepChange`, and `onPhaseChange` props.
- Produces: An **Open explanation inspector** button and an accessible dialog named **Explanation inspector**.

- [ ] **Step 1: Write failing component tests for the new structure**

Add `userEvent`, `vi`, and `PHASES` imports. Add tests with a complete 15-phase
step fixture:

```jsx
it('shows a compact final-effect summary before the inspector opens', () => {
  renderPanel({ selectedPhase: PHASES.length })

  expect(screen.getByText('Last ingredient effects')).toBeVisible()
  expect(screen.getByText('4 → 6')).toBeVisible()
  expect(screen.queryByRole('dialog', { name: 'Explanation inspector' })).toBeNull()
})

it('opens the inspector with a step select and compact phase rail', async () => {
  const user = userEvent.setup()
  renderPanel({ selectedPhase: PHASES.length })

  await user.click(screen.getByRole('button', { name: 'Open explanation inspector' }))

  expect(screen.getByRole('dialog', { name: 'Explanation inspector' })).toBeVisible()
  expect(screen.getByLabelText('Recipe step')).toHaveValue('1')
  expect(screen.getAllByRole('button', { name: /^Phase / })).toHaveLength(PHASES.length)
})

it('changes the selected step through the select and selects its final phase', async () => {
  const user = userEvent.setup()
  const onStepChange = vi.fn()
  const onPhaseChange = vi.fn()
  renderPanel({ onStepChange, onPhaseChange })
  await user.click(screen.getByRole('button', { name: 'Open explanation inspector' }))

  await user.selectOptions(screen.getByLabelText('Recipe step'), '1')

  expect(onStepChange).toHaveBeenCalledWith(1)
  expect(onPhaseChange).toHaveBeenCalledWith(PHASES.length)
})
```

Add tests for these behaviors:

- The selected phase button has `aria-pressed="true"`.
- A phase with changes includes accessible text such as `has effects`.
- Clicking the backdrop closes the dialog.
- Pressing Escape closes the dialog.
- Closing returns focus to **Open explanation inspector**.
- Selecting an earlier phase shows its existing formatted event sentences.

Keep the existing event-formatting tests. Open the inspector before each event
assertion.

- [ ] **Step 2: Run the component tests and confirm failure**

Run:

```powershell
npm test -- src/components/ExplanationPanel.test.jsx
```

Expected: FAIL because the compact summary and dialog do not exist.

- [ ] **Step 3: Implement the compact summary**

Render these states in `ExplanationPanel`:

- No selected ingredient: `Select an ingredient step to inspect its calculation.`
- Selected ingredient: **Last ingredient effects**, each aggregated effect, and
  **Open explanation inspector**.
- No net effects: `This ingredient did not change the final state.`

Format effect values as `before → after`. Keep the phase source in visually
secondary text: `Changed during {phaseId}`.

- [ ] **Step 4: Implement the dialog behavior**

Use `useEffect`, `useRef`, and `useState` from `preact/hooks`. Keep the dialog
open state local to the panel. Move focus to the close button when it opens.
Listen for Escape only while it is open. Return focus to the trigger when it
closes.

Use this semantic structure:

```jsx
<div class="explanation-backdrop" onClick={closeInspector}>
  <section
    ref={dialogRef}
    role="dialog"
    aria-modal="true"
    aria-labelledby="explanation-inspector-title"
    class="explanation-inspector"
    onClick={(event) => event.stopPropagation()}
  >
    <header class="inspector-heading">
      <h2 id="explanation-inspector-title">Explanation inspector</h2>
      <button ref={closeButtonRef} type="button" aria-label="Close explanation inspector" onClick={closeInspector}>×</button>
    </header>
    {/* Step select, phase rail, and phase details */}
  </section>
</div>
```

The step select values are numeric strings. Selecting `0` calls
`onStepChange(0)` and `onPhaseChange(1)`. Selecting an ingredient calls
`onStepChange(stepNumber)` and `onPhaseChange(PHASES.length)`.

- [ ] **Step 5: Implement the phase rail and detail area**

Render all phases as buttons in simulation order. Use the accessible name
`Phase {number}: {id}` and append `, has effects` when `phaseHasEffects` is
true. Keep `aria-pressed` for selection.

When the selected phase is final, render **Final state** and the complete
`getStepEffects(step)` list. For an earlier phase, render its heading and the
existing `formatEvent` output.

- [ ] **Step 6: Run the component and App tests**

Run:

```powershell
npm test -- src/components/ExplanationPanel.test.jsx src/App.test.jsx
```

Expected: All explanation and application tests pass.

### Task 4: Viewport Layout And Responsive Styling

**Files:**
- Modify: `src/App.css`

**Interfaces:**
- Consumes: The class names from Task 3.
- Produces: A fixed desktop app shell, internal panel scrolling, and a responsive inspector.

- [ ] **Step 1: Add desktop viewport constraints**

At desktop widths, use this layout model:

```css
html, body, #app { height: 100%; }
body { overflow: hidden; }
.app-shell { display: grid; grid-template-rows: auto minmax(0, 1fr); height: 100dvh; overflow: hidden; }
.workspace { min-height: 0; overflow: hidden; }
.ingredients-panel, .recipe-panel, .statistics-column { min-height: 0; max-height: 100%; }
.ingredients-panel, .recipe-panel { display: flex; flex-direction: column; }
.ingredients-body, .recipe-content, .statistics-column { overflow-y: auto; }
```

Remove or override the old viewport-based `min-height` rules that force the
document to grow.

- [ ] **Step 2: Style the summary and inspector**

Add styles for:

- `.explanation-summary` as a compact section under Statistics.
- `.explanation-backdrop` as a fixed viewport overlay below the site header.
- `.explanation-inspector` as a right-aligned drawer with a maximum width near
  `35rem` and a width near `68vw`.
- `.inspector-body` as `grid-template-columns: 9.5rem minmax(0, 1fr)`.
- `.phase-rail` with a font size near `0.68rem` and compact fixed row heights.
- `.phase-details` with independent overflow only when required.
- Effect rows with the existing teal accent and neutral backgrounds.

Keep border radii at `0.5rem` or less. Preserve visible focus outlines.

- [ ] **Step 3: Add narrow-screen behavior**

Below `640px`, make `.app-shell` the scrolling container and keep the browser
document fixed. Make the inspector full width and allow its body to scroll.
Do not hide content solely to remove a scrollbar.

- [ ] **Step 4: Run the complete automated checks**

Run:

```powershell
npm test
npm run build
```

Expected: All tests pass and Vite completes the production build.

- [ ] **Step 5: Verify the live desktop layout**

Use the existing Vite page at `http://localhost:5173/`. At a desktop viewport,
add an ingredient and open the inspector. Confirm all of these facts:

- The browser document has no vertical scrollbar.
- Phase 15 is selected.
- The Statistics panel shows the final state.
- All 15 phase controls fit in the rail at a common desktop height.
- The summary and details do not overlap.
- The drawer closes with its button, backdrop, and Escape.

Use a Playwright pixel check for `document.documentElement.scrollHeight === document.documentElement.clientHeight`.

- [ ] **Step 6: Verify the narrow layout**

At a viewport near `390 × 844`, confirm these facts:

- The inspector uses the full width.
- The workspace remains reachable through internal scrolling.
- Long text does not overlap controls.
- Keyboard focus remains visible.
- The close control remains visible while the details scroll.

- [ ] **Step 7: Review the final diff**

Run:

```powershell
git diff --check
git status --short
git diff -- src/App.jsx src/App.test.jsx src/components/ExplanationPanel.jsx src/components/ExplanationPanel.test.jsx src/components/explanationSummary.js src/components/explanationSummary.test.js src/App.css
```

Expected: No whitespace errors. The diff contains only the approved inspector,
phase-default, test, and layout changes.
