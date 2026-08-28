import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { createCatalogFixtures } from './test/catalogFixtures'
import App from './App'

afterEach(cleanup)

async function renderReadyApp() {
  const catalogs = createCatalogFixtures()
  const catalogMaps = Object.fromEntries(Object.entries(catalogs).map(([name, catalog]) => [name, new Map(catalog.entries.map((entry) => [entry.id, entry]))]))
  const user = userEvent.setup()
  render(<App catalogSource={{ catalogs, catalogMaps }} />)
  await user.selectOptions(screen.getByLabelText('Material'), 'minecraft:iron')
  await user.selectOptions(screen.getByLabelText('Equipment'), 'coppertemper:sword')
  return { user }
}

describe('App', () => {
  it('edits a recipe and shows simulated statistics', async () => {
    const { user } = await renderReadyApp()
    await user.click(screen.getByRole('button', { name: 'Coal' }))

    expect(screen.getByRole('list', { name: 'Recipe' })).toHaveTextContent('Coal')
    expect(screen.getByText('Attack Damage')).toBeVisible()
    expect(screen.getByText('OA')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Export recipe' })).toBeEnabled()
  })

  it('selects the final phase when an ingredient is added', async () => {
    const { user } = await renderReadyApp()
    await user.click(screen.getByRole('button', { name: 'Coal' }))
    await user.click(screen.getByRole('button', { name: 'Open explanation inspector' }))

    expect(screen.getByRole('button', { name: /^Phase 15: finalize/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('selects the final phase when a recipe step is selected', async () => {
    const { user } = await renderReadyApp()
    await user.click(screen.getByRole('button', { name: 'Coal' }))
    await user.click(screen.getByRole('button', { name: 'Open explanation inspector' }))
    await user.click(screen.getByRole('button', { name: /^Phase 5: ingredientEnergy/ }))
    await user.click(screen.getByText('Coal', { selector: 'li span' }))

    expect(screen.getByRole('button', { name: /^Phase 15: finalize/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('selects the final phase after removal', async () => {
    const { user } = await renderReadyApp()
    await user.click(screen.getByRole('button', { name: 'Coal' }))
    await user.click(screen.getByRole('button', { name: 'Coal' }))
    await user.click(screen.getByRole('button', { name: 'Open explanation inspector' }))
    await user.click(screen.getByRole('button', { name: /^Phase 5: ingredientEnergy/ }))
    await user.click(within(screen.getByRole('list', { name: 'Recipe' })).getAllByRole('button', { name: 'Remove Coal' })[1])

    expect(screen.getByLabelText('Recipe step')).toHaveValue('1')
    expect(screen.getByRole('button', { name: /^Phase 15: finalize/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('selects the final phase after reordering', async () => {
    const { user } = await renderReadyApp()
    await user.click(screen.getByRole('button', { name: 'Coal' }))
    await user.click(screen.getByRole('button', { name: 'Coal' }))
    await user.click(screen.getByRole('button', { name: 'Open explanation inspector' }))
    await user.click(screen.getByRole('button', { name: /^Phase 5: ingredientEnergy/ }))
    const items = screen.getAllByRole('listitem')
    fireEvent.dragStart(items[0])
    fireEvent.drop(items[1])

    expect(screen.getByRole('button', { name: /^Phase 15: finalize/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('selects the imported recipe last step and final phase', async () => {
    const { user } = await renderReadyApp()
    await user.click(screen.getByRole('button', { name: 'Import recipe' }))
    const dialog = screen.getByRole('dialog')
    const text = JSON.stringify({
      schemaVersion: 1,
      materialId: 'minecraft:iron',
      equipmentId: 'coppertemper:sword',
      ingredientIds: ['minecraft:coal'],
    })
    const textbox = within(dialog).getByRole('textbox')
    await user.click(textbox)
    await user.paste(text)
    await waitFor(() => expect(textbox).toHaveValue(text))
    await user.click(within(dialog).getByRole('button', { name: 'Import' }))
    await user.click(screen.getByRole('button', { name: 'Open explanation inspector' }))

    expect(screen.getByLabelText('Recipe step')).toHaveValue('1')
    expect(screen.getByRole('button', { name: /^Phase 15: finalize/ })).toHaveAttribute('aria-pressed', 'true')
  })
})