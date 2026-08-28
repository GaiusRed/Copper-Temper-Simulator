import { useEffect, useState } from 'preact/hooks'
import { exportRecipe, importRecipe } from '../recipe/codec'

export function RecipeDialog({ mode, recipe, catalogMaps, onImport, onClose }) {
  const [text, setText] = useState(mode === 'export' ? exportRecipe(recipe) : '')
  const [error, setError] = useState('')
  useEffect(() => {
    setText(mode === 'export' ? exportRecipe(recipe) : '')
    setError('')
  }, [mode, recipe])
  if (!mode) return null
  function submit() { try { onImport(importRecipe(text, catalogMaps)); onClose() } catch (caught) { setError(caught.message) } }
  return <div role="dialog" aria-modal="true" class="dialog"><div class="dialog-content"><h2>{mode === 'export' ? 'Export recipe' : 'Import recipe'}</h2><textarea readOnly={mode === 'export'} value={text} onInput={(event) => setText(event.currentTarget.value)} />{error && <p role="alert">{error}</p>}<button type="button" onClick={onClose}>Close</button>{mode === 'import' && <button type="button" onClick={submit}>Import</button>}</div></div>
}