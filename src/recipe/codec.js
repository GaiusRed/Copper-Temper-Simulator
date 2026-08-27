export class RecipeValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'RecipeValidationError'
    this.errors = [message]
  }
}

export function exportRecipe(recipe) {
  return `${JSON.stringify(recipe, null, 2)}\n`
}

function requireEntry(catalogMaps, catalogName, id) {
  if (!catalogMaps[catalogName]?.has(id)) {
    throw new RecipeValidationError(`Unknown ${catalogName.slice(0, -1)} ID: ${id}`)
  }
  return catalogMaps[catalogName].get(id)
}

export function importRecipe(text, catalogMaps) {
  let recipe
  try {
    recipe = JSON.parse(text)
  } catch {
    throw new RecipeValidationError('Recipe JSON is invalid')
  }

  if (recipe?.schemaVersion !== 1) throw new RecipeValidationError('Unsupported recipe schema version')
  if (!Array.isArray(recipe.ingredientIds)) throw new RecipeValidationError('Recipe ingredientIds must be an array')

  const material = requireEntry(catalogMaps, 'materials', recipe.materialId)
  requireEntry(catalogMaps, 'equipment', recipe.equipmentId)
  if (!material.compatibility.includes(recipe.equipmentId)) throw new RecipeValidationError(`${recipe.materialId} is not compatible with ${recipe.equipmentId}`)
  recipe.ingredientIds.forEach((id) => requireEntry(catalogMaps, 'ingredients', id))

  return Object.freeze({ schemaVersion: 1, materialId: recipe.materialId, equipmentId: recipe.equipmentId, ingredientIds: Object.freeze([...recipe.ingredientIds]) })
}