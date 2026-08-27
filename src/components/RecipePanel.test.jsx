import { fireEvent, render, screen } from '@testing-library/preact'
import { expect, it, vi } from 'vitest'
import { createCompiledFixtures } from '../test/catalogFixtures'
import { RecipePanel } from './RecipePanel'

it('selects a recipe row when the user clicks it', () => {
  const onSelect = vi.fn()
  const { catalogMaps } = createCompiledFixtures()
  render(<RecipePanel ingredientIds={['minecraft:coal']} catalogMaps={catalogMaps} selectedStep={0} onSelect={onSelect} onRemove={() => {}} onReorder={() => {}} />)

  fireEvent.click(screen.getByText('Coal'))
  expect(onSelect).toHaveBeenCalledWith(1)
})

it('removes a row with the close control or a double click', () => {
  const onRemove = vi.fn()
  const { catalogMaps } = createCompiledFixtures()
  const view = render(<RecipePanel ingredientIds={['minecraft:coal']} catalogMaps={catalogMaps} selectedStep={1} onSelect={() => {}} onRemove={onRemove} onReorder={() => {}} />)

  fireEvent.click(view.container.querySelector('button'))
  fireEvent.dblClick(view.container.querySelector('span'))

  expect(onRemove).toHaveBeenNthCalledWith(1, 0)
  expect(onRemove).toHaveBeenNthCalledWith(2, 0)
})

it('reorders rows with native drag events', () => {
  const onReorder = vi.fn()
  const { catalogMaps } = createCompiledFixtures()
  const view = render(<RecipePanel ingredientIds={['minecraft:coal', 'minecraft:coal']} catalogMaps={catalogMaps} selectedStep={1} onSelect={() => {}} onRemove={() => {}} onReorder={onReorder} />)
  const rows = view.container.querySelectorAll('li')

  fireEvent.dragStart(rows[0])
  fireEvent.dragOver(rows[1])
  fireEvent.drop(rows[1])

  expect(onReorder).toHaveBeenCalledWith(0, 1)
})