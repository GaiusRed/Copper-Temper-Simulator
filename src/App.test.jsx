import { cleanup, render, screen, within } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { createCatalogFixtures } from './test/catalogFixtures'
import App from './App'

afterEach(cleanup)

describe('App', () => {
  it('edits a recipe and shows simulated statistics', async () => {
    const catalogs = createCatalogFixtures()
    const catalogMaps = Object.fromEntries(Object.entries(catalogs).map(([name, catalog]) => [name, new Map(catalog.entries.map((entry) => [entry.id, entry]))]))
    const user = userEvent.setup()
    render(<App catalogSource={{ catalogs, catalogMaps }} />)

    await user.selectOptions(screen.getByLabelText('Material'), 'minecraft:iron')
    await user.selectOptions(screen.getByLabelText('Equipment'), 'coppertemper:sword')
    await user.click(screen.getByRole('button', { name: 'Coal' }))

    expect(screen.getByRole('list', { name: 'Recipe' })).toHaveTextContent('Coal')
    expect(screen.getByText('Attack Damage')).toBeVisible()
    expect(screen.getByText('OA')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Export recipe' })).toBeEnabled()
  })

  it('shows the selected simulation phase', async () => {
    const catalogs = createCatalogFixtures()
    const catalogMaps = Object.fromEntries(Object.entries(catalogs).map(([name, catalog]) => [name, new Map(catalog.entries.map((entry) => [entry.id, entry]))]))
    const user = userEvent.setup()
    render(<App catalogSource={{ catalogs, catalogMaps }} />)

    await user.selectOptions(screen.getByLabelText('Material'), 'minecraft:iron')
    await user.selectOptions(screen.getByLabelText('Equipment'), 'coppertemper:sword')
    await user.click(screen.getByRole('button', { name: 'Coal' }))
    await user.click(screen.getByRole('button', { name: 'Phase 5: ingredientEnergy' }))

    expect(screen.getByRole('heading', { name: '5. ingredientEnergy' })).toBeVisible()
  })

  it('clamps the selected step after removal', async () => {
    const catalogs = createCatalogFixtures()
    const catalogMaps = Object.fromEntries(Object.entries(catalogs).map(([name, catalog]) => [name, new Map(catalog.entries.map((entry) => [entry.id, entry]))]))
    const user = userEvent.setup()
    render(<App catalogSource={{ catalogs, catalogMaps }} />)
    await user.selectOptions(screen.getByLabelText('Material'), 'minecraft:iron')
    await user.selectOptions(screen.getByLabelText('Equipment'), 'coppertemper:sword')
    await user.click(screen.getByRole('button', { name: 'Coal' }))
    await user.click(screen.getByRole('button', { name: 'Coal' }))
    await user.click(screen.getByRole('button', { name: 'Step 2: minecraft:coal' }))
    await user.click(within(screen.getByRole('list', { name: 'Recipe' })).getAllByRole('button', { name: 'Remove Coal' })[1])

    expect(screen.getByRole('button', { name: 'Step 1: minecraft:coal' })).toHaveAttribute('aria-pressed', 'true')
  })
})