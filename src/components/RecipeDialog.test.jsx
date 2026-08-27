import { render, screen } from '@testing-library/preact'
import { fireEvent } from '@testing-library/preact'
import { expect, it, vi } from 'vitest'
import { createCompiledFixtures } from '../test/catalogFixtures'
import { RecipeDialog } from './RecipeDialog'

it('shows formatted recipe JSON when it exports', () => {
  const recipe = { schemaVersion: 1, materialId: 'minecraft:iron', equipmentId: 'coppertemper:sword', ingredientIds: [] }
  render(<RecipeDialog mode="export" recipe={recipe} catalogMaps={{}} onImport={() => {}} onClose={() => {}} />)
  expect(screen.getAllByRole('textbox').at(-1)).toHaveValue(`${JSON.stringify(recipe, null, 2)}\n`)
})

it('loads exported recipe JSON when the dialog opens', () => {
  const recipe = { schemaVersion: 1, materialId: 'minecraft:iron', equipmentId: 'coppertemper:sword', ingredientIds: [] }
  const view = render(<RecipeDialog mode={null} recipe={recipe} catalogMaps={{}} onImport={() => {}} onClose={() => {}} />)
  view.rerender(<RecipeDialog mode="export" recipe={recipe} catalogMaps={{}} onImport={() => {}} onClose={() => {}} />)
  expect(screen.getAllByRole('textbox').at(-1)).toHaveValue(`${JSON.stringify(recipe, null, 2)}\n`)
})

it('imports a valid local recipe', async () => {
  const { catalogMaps, recipe } = createCompiledFixtures()
  const onImport = vi.fn()
  const onClose = vi.fn()
  const view = render(<RecipeDialog mode="import" recipe={recipe} catalogMaps={catalogMaps} onImport={onImport} onClose={onClose} />)

  fireEvent.input(view.container.querySelector('textarea'), { target: { value: JSON.stringify(recipe) } })
  fireEvent.click(view.container.querySelector('button:last-child'))

  expect(onImport).toHaveBeenCalledWith(recipe)
  expect(onClose).toHaveBeenCalledOnce()
})

it('shows a validation error without importing an invalid recipe', async () => {
  const { catalogMaps, recipe } = createCompiledFixtures()
  const onImport = vi.fn()
  const view = render(<RecipeDialog mode="import" recipe={recipe} catalogMaps={catalogMaps} onImport={onImport} onClose={() => {}} />)

  fireEvent.input(view.container.querySelector('textarea'), { target: { value: '{' } })
  fireEvent.click(view.container.querySelector('button:last-child'))

  expect(view.container.querySelector('[role="alert"]')).toHaveTextContent('Recipe JSON is invalid')
  expect(onImport).not.toHaveBeenCalled()
})