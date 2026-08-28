import { render, screen } from '@testing-library/preact'
import { expect, it } from 'vitest'
import { createCatalogFixtures } from '../test/catalogFixtures'
import { IngredientsPanel } from './IngredientsPanel'

it('renders each ingredient category as a collapsible section', () => {
  const catalogs = createCatalogFixtures()
  render(<IngredientsPanel catalogs={catalogs} materialId="" equipmentId="" onMaterialChange={() => {}} onEquipmentChange={() => {}} onAddIngredient={() => {}} />)

  expect(screen.getByText('Fuel').closest('summary')).not.toBeNull()
})

it('disables equipment selection until a material is selected', () => {
  const catalogs = createCatalogFixtures()
  const view = render(<IngredientsPanel catalogs={catalogs} materialId="" equipmentId="" onMaterialChange={() => {}} onEquipmentChange={() => {}} onAddIngredient={() => {}} />)
  const equipment = view.container.querySelector('#equipment')

  expect(equipment).toBeDisabled()
  expect(equipment).toHaveTextContent('Select equipment')
  expect(equipment).not.toHaveTextContent('Sword')
})

it('filters equipment by material and orders categories from the catalog', () => {
  const catalogs = createCatalogFixtures()
  catalogs.equipment.entries.push({ id: 'coppertemper:helmet', name: 'Helmet', family: 'armor', fields: [], base: {} })
  catalogs.materials.entries.push({
    ...catalogs.materials.entries[0], id: 'minecraft:leather', name: 'Leather', families: ['armor'], compatibility: ['coppertemper:helmet'], itemIds: { 'coppertemper:helmet': 'minecraft:leather_helmet' },
  })
  catalogs.categories.entries.push({ id: 'coppertemper:rare', name: 'Rare', order: 0 })
  const view = render(<IngredientsPanel catalogs={catalogs} materialId="minecraft:leather" equipmentId="" onMaterialChange={() => {}} onEquipmentChange={() => {}} onAddIngredient={() => {}} />)

  expect(view.container.querySelectorAll('summary')[0]).toHaveTextContent('Rare')
  expect(view.container.querySelector('option[value="coppertemper:helmet"]')).toHaveTextContent('Helmet')
  expect(view.container.querySelector('option[value="coppertemper:sword"]')).toBeNull()
})