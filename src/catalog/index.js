import categories from './data/categories.json'
import deities from './data/deities.json'
import materials from './data/materials.json'
import equipment from './data/equipment.json'
import ingredients from './data/ingredients.json'
import cards from './data/cards.json'
import traits from './data/traits.json'
import { validateCatalogSet } from './validate'

export const catalogs = { categories, deities, materials, equipment, ingredients, cards, traits }

validateCatalogSet(catalogs)

export const catalogMaps = Object.fromEntries(
  Object.entries(catalogs).map(([name, catalog]) => [
    name,
    new Map(catalog.entries.map((entry) => [entry.id, Object.freeze(entry)])),
  ]),
)

export function getCatalogEntry(catalogName, id) {
  return catalogMaps[catalogName]?.get(id)
}