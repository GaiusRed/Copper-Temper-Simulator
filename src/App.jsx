import { useState } from 'preact/hooks'
import { catalogs, catalogMaps } from './catalog'
import { ExplanationPanel } from './components/ExplanationPanel'
import { IngredientsPanel } from './components/IngredientsPanel'
import { RecipeDialog } from './components/RecipeDialog'
import { RecipePanel } from './components/RecipePanel'
import { StatisticsPanel } from './components/StatisticsPanel'
import { PHASES, simulateRecipe } from './engine/simulate'

const defaultCatalogSource = { catalogs, catalogMaps }
const FINAL_PHASE = PHASES.length

export default function App({ catalogSource = defaultCatalogSource }) {
  const [materialId, setMaterialId] = useState('')
  const [equipmentId, setEquipmentId] = useState('')
  const [ingredientIds, setIngredientIds] = useState([])
  const [selectedStep, setSelectedStep] = useState(0)
  const [selectedPhase, setSelectedPhase] = useState(1)
  const [dialogMode, setDialogMode] = useState(null)
  const ready = materialId && equipmentId
  const recipe = { schemaVersion: 1, materialId, equipmentId, ingredientIds }
  const simulation = ready ? simulateRecipe({ catalogMaps: catalogSource.catalogMaps, recipe }) : null
  const displayState = selectedStep > 0
    ? simulation?.steps[selectedStep - 1]?.phases[selectedPhase - 1]?.state
    : simulation?.initial

  function changeMaterial(nextMaterialId) {
    setMaterialId(nextMaterialId)
    if (!catalogSource.catalogMaps.materials.get(nextMaterialId)?.compatibility.includes(equipmentId)) setEquipmentId('')
  }
  function addIngredient(ingredientId) {
    setIngredientIds((current) => [...current.slice(0, selectedStep), ingredientId, ...current.slice(selectedStep)])
    setSelectedStep((current) => current + 1)
    setSelectedPhase(FINAL_PHASE)
  }
  function reorderIngredient(fromIndex, toIndex) {
    if (fromIndex === null || fromIndex === toIndex) return
    setIngredientIds((current) => {
      const next = [...current]
      next.splice(toIndex, 0, next.splice(fromIndex, 1)[0])
      return next
    })
    setSelectedStep((current) => Math.min(current, ingredientIds.length))
    setSelectedPhase(FINAL_PHASE)
  }
  function importRecipe(nextRecipe) {
    setMaterialId(nextRecipe.materialId)
    setEquipmentId(nextRecipe.equipmentId)
    setIngredientIds([...nextRecipe.ingredientIds])
    setSelectedStep(nextRecipe.ingredientIds.length)
    setSelectedPhase(nextRecipe.ingredientIds.length ? FINAL_PHASE : 1)
  }

  return <div class="app-shell"><header class="site-header"><h1>CopperTemper</h1></header><main class="workspace">
    <IngredientsPanel catalogs={catalogSource.catalogs} materialId={materialId} equipmentId={equipmentId} onMaterialChange={changeMaterial} onEquipmentChange={setEquipmentId} onAddIngredient={addIngredient} />
    <RecipePanel ingredientIds={ingredientIds} catalogMaps={catalogSource.catalogMaps} selectedStep={selectedStep} onSelect={(step) => { setSelectedStep(step); setSelectedPhase(FINAL_PHASE) }} onRemove={(index) => { setIngredientIds((current) => current.filter((_, currentIndex) => currentIndex !== index)); setSelectedStep((current) => Math.min(current, ingredientIds.length - 1)); setSelectedPhase(FINAL_PHASE) }} onReorder={reorderIngredient} />
    <div class="statistics-column"><StatisticsPanel state={displayState} catalogMaps={catalogSource.catalogMaps} /><div class="recipe-actions"><button type="button" onClick={() => setDialogMode('import')}>Import recipe</button><button type="button" disabled={!ready} onClick={() => setDialogMode('export')}>Export recipe</button></div><ExplanationPanel simulation={simulation} catalogMaps={catalogSource.catalogMaps} selectedStep={selectedStep} selectedPhase={selectedPhase} onStepChange={setSelectedStep} onPhaseChange={setSelectedPhase} /></div>
  </main><RecipeDialog mode={dialogMode} recipe={recipe} catalogMaps={catalogSource.catalogMaps} onImport={importRecipe} onClose={() => setDialogMode(null)} /></div>
}