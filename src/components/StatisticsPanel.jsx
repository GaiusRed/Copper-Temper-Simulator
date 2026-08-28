export function StatisticsPanel({ state, catalogMaps }) {
  if (!state) return null
  const deities = [...catalogMaps.deities.values()]
  const material = catalogMaps.materials.get(state.materialId)
  const labelFor = (field) => field.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())
  const nameFor = (cardId) => catalogMaps.cards.get(cardId)?.name ?? '-'
  return <section class="panel statistics-panel"><div class="panel-heading"><h2>Statistics</h2></div>
    <div class="statistics-name"><span class="item-mark">+</span><span>{state.baseItem.itemId.replace('minecraft:', '').replaceAll('_', ' ')}</span></div>
    <div class="statistics-rows compact-attributes"><div class="stat-row"><span>Energy</span><span>{state.energy}</span></div>{state.baseItem.fields.map((field) => <div class="stat-row"><span>{labelFor(field)}</span><span>{state.attributes[field]}</span></div>)}</div>
    <div class="deity-matrix" aria-label="Deity levels"><div class="deity-heading"><span />{deities.map((deity) => <span>{deity.shortName}</span>)}</div><div class="deity-row"><span>Levels</span>{deities.map((deity) => <span>{state.deityLevels[deity.role]}</span>)}</div></div>
    <div class="deity-matrix deity-resistance" aria-label="Deity resistances"><div class="deity-row"><span>Resists</span>{deities.map((deity) => <span>{material?.deityResistances[deity.role] ?? '-'}</span>)}</div></div>
    <div class="lower-stat-section"><h3>Cards</h3><div class="card-summary"><div class="card-entry card-hidden"><span>hidden</span><span>{nameFor(state.cards.hidden)}</span></div><div class="card-entry card-first"><span>first</span><span>{nameFor(state.cards.first)}</span></div><div class="card-queue-spacer" aria-hidden="true" /><div class="card-entry card-second"><span>second</span><span>{nameFor(state.cards.second)}</span></div><div class="card-entry card-leaving"><span>leaving</span><span>{nameFor(state.cards.leaving)}</span></div><div class="card-entry card-third"><span>third</span><span>{nameFor(state.cards.third)}</span></div></div></div>
    <div class="lower-stat-section"><h3>Traits</h3><div class="trait-summary">{state.traits.length ? state.traits.map((traitId) => <span>{catalogMaps.traits.get(traitId)?.name ?? traitId}</span>) : <span>-</span>}</div></div>
  </section>
}