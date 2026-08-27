const ingredientCategories = [
  'Coins',
  'Stones and Crystals',
  'Seeds',
  'Produce & Meat',
  'Fangs & Claws',
  'Eyes',
  'Wings & Feathers',
  'Misc.',
]

function Panel({ title, children, className = '' }) {
  const titleId = `${title.toLowerCase().replaceAll(' ', '-')}-title`

  return (
    <section class={`panel ${className}`} aria-labelledby={titleId}>
      <div class="panel-heading"><h2 id={titleId}>{title}</h2></div>
      {children}
    </section>
  )
}

function StaticSelect({ id, label, placeholder }) {
  return (
    <label class="field-label" for={id}>
      {label}
      <select id={id} disabled><option>{placeholder}</option></select>
    </label>
  )
}

function StepControls() {
  return (
    <div class="step-section">
      <div class="step-controls">
        <button aria-label="First step" disabled type="button">&#171;</button>
        <button aria-label="Previous step" disabled type="button">&#8249;</button>
        <label for="step">Step:<input id="step" disabled value="" /></label>
        <button aria-label="Next step" disabled type="button">&#8250;</button>
        <button aria-label="Last step" disabled type="button">&#187;</button>
      </div>
      <div class="step-controls sub-step-controls">
        <button aria-label="Previous sub-step" disabled type="button">&#8249;</button>
        <StaticSelect id="sub-step" label="Sub-step:" placeholder="" />
        <button aria-label="Next sub-step" disabled type="button">&#8250;</button>
      </div>
    </div>
  )
}

function Statistics() {
  const rows = ['Price', 'Attack', 'Sh/He/Fo/Te']
  const affinityRows = ['Stats', 'Resists', 'Essence', 'Markers', 'Immunity']

  return (
    <>
      <Panel title="Statistics" className="statistics-panel">
        <div class="statistics-name"><span class="gear-mark">&#9881;</span><span /></div>
        <div class="statistics-rows">
          {rows.map((label) => <div class="stat-row" key={label}><span>{label}</span><span aria-label="Empty statistic value" class="value-slot" /></div>)}
        </div>
        <div class="affinity-table" aria-label="Statistics panel">
          <div class="affinity-heading"><span /><span>Pwr</span><span>Dex</span><span>Def</span><span>Mag</span><span>Con</span><span>Mnd</span><span>Chm</span><span>Lck</span></div>
          {affinityRows.map((label) => <div class="affinity-row" key={label}><span>{label}</span>{Array.from({ length: 8 }, (_, index) => <span aria-label="Empty statistic value" class="value-slot" key={index} />)}</div>)}
        </div>
        <div class="statistics-rows lower-rows">
          <div class="stat-row"><span>Cards</span><span aria-label="Empty statistic value" class="value-slot" /></div>
          <div class="stat-row"><span>Effects</span><span aria-label="Empty statistic value" class="value-slot" /></div>
        </div>
      </Panel>
      <section class="panel menu-panel" aria-label="Static menu">
        {Array.from({ length: 5 }, (_, index) => <button aria-label={`Empty menu control ${index + 1}`} disabled key={index} type="button" />)}
        <StaticSelect id="language" label="Language:" placeholder="" />
      </section>
    </>
  )
}

export default function App() {
  return (
    <div class="app-shell">
      <header class="site-header"><h1>CopperTemper</h1></header>
      <main class="workspace">
        <Panel title="Ingredients" className="ingredients-panel">
          <div class="ingredients-body">
            <StaticSelect id="material" label="Material" placeholder="" />
            <StaticSelect id="equipment" label="Equipment" placeholder="" />
            <div class="category-list">
              {ingredientCategories.map((category) => (
                <fieldset key={category}>
                  <legend>{category}</legend>
                  <button aria-label={`Empty ${category} items`} disabled type="button" />
                </fieldset>
              ))}
            </div>
            <StepControls />
          </div>
        </Panel>
        <Panel title="Recipe" className="recipe-panel"><div aria-label="Recipe steps" class="recipe-content" /></Panel>
        <div class="statistics-column"><Statistics /></div>
      </main>
    </div>
  )
}