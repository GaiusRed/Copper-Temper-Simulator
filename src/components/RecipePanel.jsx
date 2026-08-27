export function RecipePanel({ ingredientIds, catalogMaps, selectedStep, onSelect, onRemove, onReorder }) {
  let draggedIndex = null
  return <section class="panel recipe-panel"><div class="panel-heading"><h2>Recipe</h2></div><ol class="recipe-content" aria-label="Recipe">{ingredientIds.map((id, index) => {
    const ingredient = catalogMaps.ingredients.get(id)
    return <li draggable aria-current={selectedStep === index + 1 ? 'step' : undefined} onClick={() => onSelect(index + 1)} onDragStart={() => { draggedIndex = index }} onDragOver={(event) => event.preventDefault()} onDrop={() => onReorder(draggedIndex, index)} onDblClick={() => onRemove(index)}><span>{ingredient?.name ?? id}</span><button type="button" aria-label={`Remove ${ingredient?.name ?? id}`} onClick={(event) => { event.stopPropagation(); onRemove(index) }}>x</button></li>
  })}</ol></section>
}