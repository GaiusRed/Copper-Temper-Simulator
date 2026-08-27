# CopperTemper Static UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static Preact page that looks like ManaForge and uses the CopperTemper brand.

**Architecture:** Vite will build a small Preact application. `App` will compose static presentational panels and reusable blank controls. CSS will provide the responsive three-column layout and ManaForge-like visual style.

**Tech Stack:** Vite, Preact, Vitest, Testing Library, plain CSS.

## Global Constraints

- Use the current stable Vite and Preact releases.
- Do not add Vue, Tailwind, ManaForge source files, game data, or simulator code.
- Use CopperTemper branding in the header.
- Do not show a footer, version note, or changelog link.
- Do not add event handlers, application state, network requests, persistence, or calculations.
- Keep all displayed controls inert.

---

## File Structure

- `package.json`: project scripts and current dependencies.
- `vite.config.js`: Vite configuration for Preact and Vitest.
- `index.html`: application document.
- `src/main.jsx`: Preact application entry point.
- `src/App.jsx`: static page structure and local display constants.
- `src/App.css`: responsive layout and control styles.
- `src/App.test.jsx`: static page assertions.

### Task 1: Create the Preact Project Foundation

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.jsx`

**Interfaces:**
- Produces: the `dev`, `build`, and `test` scripts.
- Produces: the `#app` mount element for `src/main.jsx`.

- [ ] **Step 1: Create the Vite Preact application files**

Create the project with the Vite Preact template. Add Vitest, jsdom, and
Testing Library as development dependencies.

```powershell
npm create vite@latest . -- --template preact
npm install
npm install --save-dev vitest jsdom @testing-library/preact @testing-library/jest-dom
```

- [ ] **Step 2: Configure the test command**

Add a `test` script and a `test` block in `vite.config.js`.

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "test": "vitest run"
}
```

```js
test: {
  environment: 'jsdom',
}
```

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: PASS. Vite creates the `dist` directory.

### Task 2: Define the Static Page Contract

**Files:**
- Create: `src/App.test.jsx`

**Interfaces:**
- Consumes: `App` from `src/App.jsx`.
- Produces: a test contract for the static CopperTemper page.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/preact'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('shows the CopperTemper static forge layout', () => {
    render(<App />)

    expect(screen.getByRole('banner')).toHaveTextContent('CopperTemper')
    expect(screen.getByRole('heading', { name: 'Ingredients' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Forge' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Explanations' })).toBeVisible()
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button')).not.toHaveLength(0)
    screen.getAllByRole('button').forEach((button) => {
      expect(button).toBeDisabled()
    })
  })
})
```

- [ ] **Step 2: Run the test to show the initial error**

Run: `npm test -- App.test.jsx`

Expected: FAIL. `src/App.jsx` does not exist.

### Task 3: Build the Static Preact Layout

**Files:**
- Create: `src/App.jsx`
- Create: `src/App.css`
- Modify: `src/main.jsx`

**Interfaces:**
- Consumes: the static display constants in `src/App.jsx`.
- Produces: `App`, the default Preact page component.

- [ ] **Step 1: Add static presentation components**

Create `Panel`, `BlankButton`, and `BlankGrid` in `src/App.jsx`. Give
`BlankButton` these fixed properties:

```jsx
function BlankButton() {
  return <button aria-label="Empty item slot" disabled type="button" />
}
```

- [ ] **Step 2: Add the page hierarchy**

Render the title bar and these panels in `App`:

```jsx
<header class="site-header"><h1>CopperTemper</h1></header>
<main class="workspace">
  <Panel title="Ingredients">...</Panel>
  <Panel title="Forge">...</Panel>
  <Panel title="Explanations">...</Panel>
</main>
```

Use local category names only: `Coins`, `Stones and Crystals`, `Seeds`,
`Produce and Meat`, `Fangs and Claws`, `Eyes`, `Wings and Feathers`, and
`Misc.`. Use blank controls inside each category. Do not use ManaForge item
names or data.

- [ ] **Step 3: Add the visual style**

In `src/App.css`, use the following layout rules:

```css
.workspace { display: grid; gap: 0.75rem; grid-template-columns: 1fr; }
@media (min-width: 840px) {
  .workspace { grid-template-columns: minmax(15rem, 1fr) minmax(18rem, 1.2fr) minmax(15rem, 1fr); }
}
```

Use a slate header, white panels, compact gray form controls, fieldset
borders, and subdued disabled buttons. Do not create a footer selector or
element.

- [ ] **Step 4: Mount the page and import the stylesheet**

```jsx
import { render } from 'preact'
import App from './App'
import './App.css'

render(<App />, document.getElementById('app'))
```

- [ ] **Step 5: Run the focused test**

Run: `npm test -- App.test.jsx`

Expected: PASS. The test finds the three panel headings and disabled blank
buttons. The test does not find a footer.

### Task 4: Make Sure That the Build and Page Meet the Contract

**Files:**
- Modify: `src/App.jsx` only if the test or build reports an error.
- Modify: `src/App.css` only if the layout does not work at narrow or wide widths.

**Interfaces:**
- Consumes: the complete static Preact page.
- Produces: a production-ready static website.

- [ ] **Step 1: Run the full test command**

Run: `npm test`

Expected: PASS. The static page contract passes.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: PASS. Vite creates a production bundle in `dist`.

- [ ] **Step 3: Inspect the page in a browser**

Run: `npm run dev -- --host 127.0.0.1`

Expected: The page shows the CopperTemper header, three main panels on a wide
screen, stacked panels on a narrow screen, blank disabled controls, and no
footer.