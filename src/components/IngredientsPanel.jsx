export function IngredientsPanel({ catalogs, materialId, equipmentId, onMaterialChange, onEquipmentChange, onAddIngredient }) {
  const material = catalogs.materials.entries.find((entry) => entry.id === materialId)
  const equipment = material ? catalogs.equipment.entries.filter((entry) => material.compatibility.includes(entry.id)) : []
  const categories = [...catalogs.categories.entries].sort((left, right) => left.order - right.order)
  return <section class="panel ingredients-panel"><div class="panel-heading"><h2>Ingredients</h2></div><div class="ingredients-body">
    <label class="field-label" for="material">Material<select id="material" value={materialId} onChange={(event) => onMaterialChange(event.currentTarget.value)}><option value="">Select material</option>{catalogs.materials.entries.map((entry) => <option value={entry.id}>{entry.name}</option>)}</select></label>
    <label class="field-label" for="equipment">Equipment<select id="equipment" value={equipmentId} disabled={!material} onChange={(event) => onEquipmentChange(event.currentTarget.value)}><option value="">Select equipment</option>{equipment.map((entry) => <option value={entry.id}>{entry.name}</option>)}</select></label>
    <div class="category-list">{categories.map((category) => <details open><summary>{category.name}</summary>{catalogs.ingredients.entries.filter((entry) => entry.categoryId === category.id).map((entry) => <button type="button" onClick={() => onAddIngredient(entry.id)}>{entry.name}</button>)}</details>)}</div>
  </div></section>
}