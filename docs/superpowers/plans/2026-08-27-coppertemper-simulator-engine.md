# CopperTemper Simulator Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a data-driven Minecraft tempering simulator that preserves ManaForge energy, deity, card, step, and sub-step behavior.

**Architecture:** Bundled JSON catalogs pass through an Ajv validation layer before use. A pure simulation engine produces immutable state snapshots and structured events. Preact components edit recipes and show engine output without calculating rules.

**Tech Stack:** Vite 8, Preact 10, JavaScript modules, JSON Schema, Ajv, Vitest, jsdom, Testing Library, plain CSS.

## Implementation Status

Status date: 2026-08-28. The checked test suite has 178 passing tests in 14
files. This section records the current code and the remaining audit work.

| Task | Status | Implemented | Still planned |
|---|---|---|---|
| 1. Catalog schemas and validation | Complete | Ajv schemas, normalized errors, ID checks, cross-catalog references, bounded rule types, direct transformation cycle checks, and fixed deity role uniqueness. | No planned code work. |
| 2. Bundled catalogs and build gate | Complete | Seven bundled catalogs, catalog lookup maps, import-time validation, and the `validate:catalogs` build gate. | Keep catalog content synchronized with Tasks 3, 7, and 8. |
| 3. Exact vanilla base items | Complete | Exact vanilla tool and armor values, composition, compatibility checks, and full-table tests. | No planned code work. |
| 4. Recipe JSON codec | Complete | Versioned import and export, validation of IDs and compatibility, and immutable recipe output. | No planned code work. |
| 5. Engine state and events | Complete | Immutable state, all 13 phase snapshots, normalized events, energy expiration, and deferred deity resolution. | No planned code work. |
| 6. Fixed deity rules and bonuses | Complete | Normal, independent, and mirrored modes, costs, refunds, ordered queue resolution, caps, and derived bonuses. | No planned code work. |
| 7. Declarative conditions and effects | Complete | All listed condition and effect operations, field checks, truncation, references, strict object boundaries, and trait applicability checks. | No planned code work. |
| 8. Card queue and capabilities | Complete | Queue movement, sticky cards, activation order, self-removal, transformations, retention, world selection, and combinations. | No planned code work. |
| 9. Complete phase pipeline | Complete | `simulateIngredient`, `simulateRecipe`, all phase actions, snapshots, persistence, reset behavior, energy expiration, and immutable-input coverage. | No planned code work. |
| 10. Ingredient and recipe panels | Complete | Material and equipment selectors, collapsible categories, recipe insertion, selection, native dragging, removal, integration, and interaction coverage. | No planned code work. |
| 11. Statistics, explanations, and dialog | Complete | Statistics, step and phase controls, readable event text, accessible import/export dialogs, and component coverage. | No planned code work. |
| 12. Application integration and final validation | Complete | Simulator application, responsive layout, README commands, full validation, and desktop and narrow browser checks. | No planned code work. |

### Current Verification

- `npm test`: 178 tests passed in 14 files.
- `npm run build`: catalog validation passed and Vite created `dist`.
- Desktop and 375px browser checks found the required three-column and
  one-column layouts, with no horizontal overflow.

## Global Constraints

- Use Minecraft Java Edition `1.21.11` for bundled vanilla values.
- Use namespaced IDs for all catalog entries and recipe references.
- Keep the fixed Oak, Dark Oak, Birch, Spruce, Acacia, Jungle, Cherry, and Mangrove deity roles.
- Keep deity levels in the inclusive range `0` through `15`.
- Use resistance `8` for every deity in the first vanilla material catalog.
- Reset equipment attributes to their vanilla base values before each ingredient.
- Preserve deity levels, card positions, traits, and world state between ingredients.
- Do not clamp final equipment attributes to vanilla ranges.
- Use decimal arithmetic for decimal attributes and truncation for discrete attributes.
- Keep production ingredient, card, and trait content outside this plan.
- Use test fixture catalogs for ingredient, card, and trait engine behavior.
- Preserve the current ManaForge layout, visual style, and recipe editing behavior.
- Do not add runtime catalog import, browser persistence, a language selector, or a price output.

---

## File Structure

- `scripts/validate-catalogs.js`: validates bundled catalogs during the build.
- `src/catalog/schemas.js`: exports all JSON Schema objects.
- `src/catalog/validate.js`: validates schemas, IDs, and cross-catalog references.
- `src/catalog/index.js`: imports bundled JSON and exports compiled lookup maps.
- `src/catalog/data/*.json`: stores the seven bundled catalogs.
- `src/test/catalogFixtures.js`: creates complete valid fixture catalogs for tests.
- `src/engine/baseItem.js`: composes exact vanilla item attributes.
- `src/engine/deities.js`: applies fixed deity rules and derived bonuses.
- `src/engine/rules.js`: evaluates declarative conditions and effects.
- `src/engine/cards.js`: owns card movement and lifecycle behavior.
- `src/engine/simulate.js`: runs phases and returns immutable snapshots and events.
- `src/recipe/codec.js`: imports and exports versioned recipe JSON.
- `src/components/IngredientsPanel.jsx`: selects material, equipment, and ingredients.
- `src/components/RecipePanel.jsx`: selects, reorders, and removes recipe rows.
- `src/components/StatisticsPanel.jsx`: shows attributes, deities, cards, and traits.
- `src/components/ExplanationPanel.jsx`: shows step controls, phases, and events.
- `src/components/RecipeDialog.jsx`: imports and exports recipe JSON.
- `src/App.jsx`: owns UI state and connects components to the engine.
- `src/App.css`: extends the current responsive ManaForge-style presentation.

### Task 1: Catalog Schemas And Validation

**Task state: Complete.** The catalog schemas, cross-reference checks, rule
validation, role uniqueness, and focused tests are complete.

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/catalog/schemas.js`
- Create: `src/catalog/validate.js`
- Create: `src/catalog/validate.test.js`
- Create: `src/test/catalogFixtures.js`

**Interfaces:**
- Produces: `validateCatalogSet(rawCatalogs)` from `src/catalog/validate.js`.
- Produces: `CatalogValidationError` with an `errors` array.
- Produces: `createCatalogFixtures()` from `src/test/catalogFixtures.js`.
- Produces: `createCompiledFixtures()` with catalogs, lookup maps, and a valid recipe.
- Each validation error has `catalog`, `entryId`, `field`, `value`, and `message`.

- [x] **Step 1: Install Ajv and the user interaction test helper**

Run:

```powershell
npm install ajv; npm install --save-dev @testing-library/user-event
```

Expected: `ajv` appears in `dependencies`. `@testing-library/user-event`
appears in `devDependencies`. The lock file changes.

- [x] **Step 2: Write failing schema and reference tests**

Create `src/catalog/validate.test.js` with these behaviors:

```js
import { describe, expect, it } from 'vitest'
import { createCatalogFixtures } from '../test/catalogFixtures'
import { CatalogValidationError, validateCatalogSet } from './validate'

describe('validateCatalogSet', () => {
  it('accepts a complete catalog set', () => {
    expect(validateCatalogSet(createCatalogFixtures())).toEqual({ valid: true })
  })

  it('rejects a missing fixed deity role', () => {
    const catalogs = createCatalogFixtures()
    catalogs.deities.entries = catalogs.deities.entries.filter(({ role }) => role !== 'mangrove')

    expect(() => validateCatalogSet(catalogs)).toThrow(CatalogValidationError)
    expect(() => validateCatalogSet(catalogs)).toThrow('Missing deity role: mangrove')
  })

  it('rejects a missing category reference', () => {
    const catalogs = createCatalogFixtures()
    catalogs.ingredients.entries[0].categoryId = 'coppertemper:missing'

    expect(() => validateCatalogSet(catalogs)).toThrow('Unknown category ID: coppertemper:missing')
  })

  it('reports the catalog, entry, and field', () => {
    const catalogs = createCatalogFixtures()
    catalogs.materials.entries[0].deityResistances.oak = 0

    try {
      validateCatalogSet(catalogs)
    } catch (error) {
      expect(error.errors[0]).toMatchObject({
        catalog: 'materials',
        entryId: 'minecraft:iron',
        field: 'deityResistances.oak',
      })
    }
  })
})
```

The fixture set must include one entry in every catalog. It must include all
eight deity roles and a valid material, sword, ingredient, card, and trait.

Export this helper for later engine tests:

```js
export function createCompiledFixtures() {
  const catalogs = createCatalogFixtures()
  validateCatalogSet(catalogs)
  const catalogMaps = Object.fromEntries(
    Object.entries(catalogs).map(([name, catalog]) => [name, new Map(catalog.entries.map((entry) => [entry.id, entry]))]),
  )
  return {
    catalogs,
    catalogMaps,
    recipe: Object.freeze({
      schemaVersion: 1,
      materialId: 'minecraft:iron',
      equipmentId: 'coppertemper:sword',
      ingredientIds: ['minecraft:coal'],
    }),
  }
}
```

- [x] **Step 3: Run the validation tests and observe the expected error**

Run:

```powershell
npm test -- src/catalog/validate.test.js
```

Expected: FAIL because `src/catalog/validate.js` does not exist.

- [x] **Step 4: Add the catalog schemas**

Export `catalogSchemas` from `src/catalog/schemas.js`. Use this common ID
pattern:

```js
const namespacedId = '^[a-z0-9_.-]+:[a-z0-9_./-]+$'
```

Require these entry fields:

| Catalog | Required entry fields |
|---|---|
| categories | `id`, `name`, `order` |
| deities | `id`, `role`, `name`, `shortName` |
| materials | `id`, `name`, `families`, `deityResistances`, `compatibility`, `itemIds` |
| equipment | `id`, `name`, `family`, `fields`, `base` |
| ingredients | `id`, `name`, `minecraftItemId`, `categoryId`, `energy`, `rules` |
| cards | `id`, `name`, `rulesByPosition`, `capabilities` |
| traits | `id`, `name`, `validFamilies`, `validEquipmentIds` |

Every top-level schema must require `schemaVersion`, `minecraftVersion`, and
`entries`. Set `additionalProperties: false` at every defined object boundary.

- [x] **Step 5: Implement schema and cross-reference validation**

Use this public structure in `src/catalog/validate.js`:

```js
import Ajv from 'ajv'
import { catalogSchemas } from './schemas'

export const DEITY_ROLES = [
  'oak', 'dark_oak', 'birch', 'spruce',
  'acacia', 'jungle', 'cherry', 'mangrove',
]

export class CatalogValidationError extends Error {
  constructor(errors) {
    super(errors.map(({ message }) => message).join('\n'))
    this.name = 'CatalogValidationError'
    this.errors = errors
  }
}

export function validateCatalogSet(rawCatalogs) {
  // Compile each schema, normalize Ajv errors, then validate unique IDs,
  // deity roles, category references, card references, trait references,
  // equipment compatibility, and direct transformation cycles.
  return { valid: true }
}
```

Replace the orienting comment with focused helper calls. Do not expose Ajv
error objects outside this module.

- [x] **Step 6: Run the focused tests**

Run:

```powershell
npm test -- src/catalog/validate.test.js
```

Expected: PASS.

### Task 2: Bundled Catalogs And Build Gate

**Task state: Complete.** The catalog files, lookup maps, and build gate are
implemented and verified. Task 3 will extend the material values.

**Files:**
- Create: `src/catalog/data/categories.json`
- Create: `src/catalog/data/deities.json`
- Create: `src/catalog/data/materials.json`
- Create: `src/catalog/data/equipment.json`
- Create: `src/catalog/data/ingredients.json`
- Create: `src/catalog/data/cards.json`
- Create: `src/catalog/data/traits.json`
- Create: `src/catalog/index.js`
- Create: `src/catalog/index.test.js`
- Create: `scripts/validate-catalogs.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: `validateCatalogSet(rawCatalogs)`.
- Produces: `catalogs`, `catalogMaps`, and `getCatalogEntry(catalogName, id)`.
- Produces: `npm run validate:catalogs`.

- [x] **Step 1: Write failing bundled-catalog tests**

```js
import { describe, expect, it } from 'vitest'
import { catalogs, catalogMaps, getCatalogEntry } from './index'

describe('bundled catalogs', () => {
  it('contains the fixed deity mapping', () => {
    expect(catalogs.deities.entries.map(({ role, name }) => [role, name])).toEqual([
      ['oak', 'Oak'], ['dark_oak', 'Dark Oak'], ['birch', 'Birch'], ['spruce', 'Spruce'],
      ['acacia', 'Acacia'], ['jungle', 'Jungle'], ['cherry', 'Cherry'], ['mangrove', 'Mangrove'],
    ])
  })

  it('uses neutral resistance values for the initial materials', () => {
    for (const material of catalogs.materials.entries) {
      expect(Object.values(material.deityResistances)).toEqual(Array(8).fill(8))
    }
  })

  it('indexes entries by namespaced ID', () => {
    expect(getCatalogEntry('materials', 'minecraft:iron')).toBe(catalogMaps.materials.get('minecraft:iron'))
  })
})
```

- [x] **Step 2: Run the test and observe the missing module error**

Run:

```powershell
npm test -- src/catalog/index.test.js
```

Expected: FAIL because `src/catalog/index.js` does not exist.

- [x] **Step 3: Add the bundled JSON files**

Use `schemaVersion: 1` and `minecraftVersion: "1.21.11"` in every file.
Use an empty `entries` array for categories, ingredients, cards, and traits.

Add the eight deity entries in approved role order. Add these initial material
sets:

| Family | Materials |
|---|---|
| armor | leather, chainmail, iron, gold, diamond, netherite |
| tool | wood, stone, iron, gold, diamond, netherite |

When one material supports both families, use one shared entry. Use resistance
`8` for every deity.

Add these equipment archetypes:

| Family | Archetypes |
|---|---|
| armor | helmet, chestplate, leggings, boots |
| tool | sword, axe, pickaxe, shovel, hoe |

Use exact 1.21.11 base values. Lock the values with tests in Task 3 rather
than duplicating the complete tables in schema tests.

- [x] **Step 4: Import, validate, and index the catalogs**

Use this interface in `src/catalog/index.js`:

```js
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
```

- [x] **Step 5: Add build-time validation**

Create `scripts/validate-catalogs.js` to read all seven files with
`node:fs/promises`, parse them, call `validateCatalogSet`, print each structured
error, and set `process.exitCode = 1` on error.

Add these scripts:

```json
{
  "validate:catalogs": "node scripts/validate-catalogs.js",
  "build": "npm run validate:catalogs && vite build"
}
```

- [x] **Step 6: Run focused validation**

Run:

```powershell
npm test -- src/catalog/index.test.js; npm run validate:catalogs
```

Expected: both commands PASS.

### Task 3: Exact Vanilla Base Items

**Task state: Complete.** The composer and full vanilla material and armor
tables are implemented and covered by tests.

**Files:**
- Create: `src/engine/baseItem.js`
- Create: `src/engine/baseItem.test.js`
- Modify: `src/catalog/data/materials.json`
- Modify: `src/catalog/data/equipment.json`

**Interfaces:**
- Consumes: compiled catalog maps, a material ID, and an equipment ID.
- Produces: `composeBaseItem({ catalogMaps, materialId, equipmentId })`.
- Returns: `{ itemId, family, materialId, equipmentId, attributes, fields }`.

- [x] **Step 1: Write failing representative composition tests**

```js
import { describe, expect, it } from 'vitest'
import { catalogMaps } from '../catalog'
import { composeBaseItem } from './baseItem'

describe('composeBaseItem', () => {
  it('composes an iron sword', () => {
    expect(composeBaseItem({ catalogMaps, materialId: 'minecraft:iron', equipmentId: 'coppertemper:sword' })).toMatchObject({
      itemId: 'minecraft:iron_sword',
      family: 'tool',
      attributes: {
        attackDamage: 6,
        attackSpeed: 1.6,
        miningSpeed: 6,
        harvestLevel: 2,
        maxDurability: 250,
        enchantability: 14,
      },
    })
  })

  it('composes a netherite chestplate', () => {
    expect(composeBaseItem({ catalogMaps, materialId: 'minecraft:netherite', equipmentId: 'coppertemper:chestplate' })).toMatchObject({
      itemId: 'minecraft:netherite_chestplate',
      family: 'armor',
      attributes: {
        armorPoints: 8,
        armorToughness: 3,
        knockbackResistance: 0.1,
        maxDurability: 592,
        enchantability: 15,
      },
    })
  })

  it('rejects an incompatible pair', () => {
    expect(() => composeBaseItem({
      catalogMaps,
      materialId: 'minecraft:leather',
      equipmentId: 'coppertemper:sword',
    })).toThrow('minecraft:leather is not compatible with coppertemper:sword')
  })
})
```

- [x] **Step 2: Run the focused test and observe the missing module error**

Run:

```powershell
npm test -- src/engine/baseItem.test.js
```

Expected: FAIL because `src/engine/baseItem.js` does not exist.

- [x] **Step 3: Complete the vanilla catalog values**

Use these tool material values:

| Material | Durability | Mining speed | Harvest level | Attack bonus | Enchantability |
|---|---:|---:|---:|---:|---:|
| wood | 59 | 2 | 0 | 0 | 15 |
| stone | 131 | 4 | 1 | 1 | 5 |
| iron | 250 | 6 | 2 | 2 | 14 |
| gold | 32 | 12 | 0 | 0 | 22 |
| diamond | 1561 | 8 | 3 | 3 | 10 |
| netherite | 2031 | 9 | 4 | 4 | 15 |

Use exact attack damage and speed per valid tool combination. Add a full-table
test with these rows:

```js
const toolCombat = {
  sword: { wood: [4, 1.6], stone: [5, 1.6], iron: [6, 1.6], gold: [4, 1.6], diamond: [7, 1.6], netherite: [8, 1.6] },
  axe: { wood: [7, 0.8], stone: [9, 0.8], iron: [9, 0.9], gold: [7, 1], diamond: [9, 1], netherite: [10, 1] },
  pickaxe: { wood: [2, 1.2], stone: [3, 1.2], iron: [4, 1.2], gold: [2, 1.2], diamond: [5, 1.2], netherite: [6, 1.2] },
  shovel: { wood: [2.5, 1], stone: [3.5, 1], iron: [4.5, 1], gold: [2.5, 1], diamond: [5.5, 1], netherite: [6.5, 1] },
  hoe: { wood: [1, 1], stone: [1, 2], iron: [1, 3], gold: [1, 1], diamond: [1, 4], netherite: [1, 4] },
}
```

Use these armor protection rows in helmet, chestplate, leggings, boots order:

```js
const armorProtection = {
  leather: [1, 3, 2, 1],
  chainmail: [2, 5, 4, 1],
  iron: [2, 6, 5, 2],
  gold: [2, 5, 3, 1],
  diamond: [3, 8, 6, 3],
  netherite: [3, 8, 6, 3],
}

const armorDurability = {
  leather: [55, 80, 75, 65],
  chainmail: [165, 240, 225, 195],
  iron: [165, 240, 225, 195],
  gold: [77, 112, 105, 91],
  diamond: [363, 528, 495, 429],
  netherite: [407, 592, 555, 481],
}
```

Use toughness `2` for diamond and `3` for netherite. Use knockback resistance
`0.1` for netherite. Use enchantability `15`, `12`, `9`, `25`, `10`, and `15`
for leather, chainmail, iron, gold, diamond, and netherite.

- [x] **Step 4: Implement base item composition**

`composeBaseItem` must validate both IDs and compatibility. It must return a
new frozen attributes object on every call. It must include only fields listed
by the equipment entry.

- [x] **Step 5: Run all base-item and catalog tests**

Run:

```powershell
npm test -- src/engine/baseItem.test.js src/catalog/index.test.js
```

Expected: PASS for every material and equipment combination.

### Task 4: Recipe JSON Codec

**Task state: Complete.** The codec and its focused tests are implemented
and verified.

**Files:**
- Create: `src/recipe/codec.js`
- Create: `src/recipe/codec.test.js`

**Interfaces:**
- Produces: `exportRecipe(recipe)` and `importRecipe(text, catalogMaps)`.
- Recipe shape: `{ schemaVersion, materialId, equipmentId, ingredientIds }`.
- Produces: `RecipeValidationError` with an `errors` array.

- [x] **Step 1: Write failing codec tests**

```js
import { describe, expect, it } from 'vitest'
import { createCompiledFixtures } from '../test/catalogFixtures'
import { exportRecipe, importRecipe } from './codec'

const recipe = {
  schemaVersion: 1,
  materialId: 'minecraft:iron',
  equipmentId: 'coppertemper:sword',
  ingredientIds: ['minecraft:coal', 'minecraft:coal'],
}

it('round trips stable namespaced IDs', () => {
  const { catalogMaps } = createCompiledFixtures()
  expect(importRecipe(exportRecipe(recipe), catalogMaps)).toEqual(recipe)
})

it('rejects an unknown ingredient without changing caller state', () => {
  const { catalogMaps } = createCompiledFixtures()
  const text = JSON.stringify({ ...recipe, ingredientIds: ['coppertemper:missing'] })
  expect(() => importRecipe(text, catalogMaps)).toThrow('Unknown ingredient ID: coppertemper:missing')
})
```

- [x] **Step 2: Run the codec test and observe the missing module error**

Run: `npm test -- src/recipe/codec.test.js`

Expected: FAIL because `src/recipe/codec.js` does not exist.

- [x] **Step 3: Implement strict versioned import and export**

Use two-space JSON formatting and a final newline:

```js
export function exportRecipe(recipe) {
  return `${JSON.stringify(recipe, null, 2)}\n`
}
```

`importRecipe` must reject malformed JSON, schema versions other than `1`,
missing IDs, incompatible material and equipment, and unknown ingredients. It
must return a new frozen recipe object.

- [x] **Step 4: Run the focused test**

Run: `npm test -- src/recipe/codec.test.js`

Expected: PASS.

### Task 5: Engine State And Structured Events

**Task state: Complete.** Initial state, phase IDs, snapshots, and structured
events are implemented and verified.

**Files:**
- Create: `src/engine/simulate.js`
- Create: `src/engine/simulate.test.js`

**Interfaces:**
- Produces: `createInitialState({ catalogMaps, recipe })`.
- Produces: `createEvent({ phase, sourceId, operation, target, before, after, energyCost, reason })`.
- Produces: `PHASES`, an ordered array of 13 stable phase IDs.
- State shape: `{ baseItem, family, materialId, equipmentId, attributes, energy, deityLevels, deityQueue, cards, traits, worldMode, stickyCardIds }`.

- [x] **Step 1: Write failing initial-state tests**

```js
import { describe, expect, it } from 'vitest'
import { createCompiledFixtures } from '../test/catalogFixtures'
import { createInitialState, PHASES } from './simulate'

it('creates the initial item state', () => {
  const { catalogMaps, recipe } = createCompiledFixtures()
  const state = createInitialState({ catalogMaps, recipe })

  expect(state.energy).toBe(0)
  expect(state.deityLevels).toEqual({ oak: 0, dark_oak: 0, birch: 0, spruce: 0, acacia: 0, jungle: 0, cherry: 0, mangrove: 0 })
  expect(state.cards).toEqual({ hidden: null, first: null, second: null, third: null, leaving: null })
  expect(state.traits).toEqual([])
  expect(state.worldMode).toBe('normal')
  expect(Object.isFrozen(state)).toBe(true)
})

it('defines all engine phases in order', () => {
  expect(PHASES).toEqual([
    'reset', 'prepareCards', 'restoreBase', 'selectWorld', 'ingredientEnergy',
    'materialBefore', 'ingredientRules', 'pushCard', 'activateCards',
    'cardCombinations', 'resolveDeities', 'materialAfter', 'finalize',
  ])
})
```

- [x] **Step 2: Run the test and observe the missing module error**

Run: `npm test -- src/engine/simulate.test.js`

Expected: FAIL because `src/engine/simulate.js` does not exist.

- [x] **Step 3: Implement frozen initial state and normalized events**

Use `composeBaseItem` for base attributes. Clone nested state before mutation,
then freeze the completed snapshot. Omit undefined event fields so event
snapshots remain concise.

- [x] **Step 4: Run the focused test**

Run: `npm test -- src/engine/simulate.test.js`

Expected: PASS.

### Task 6: Fixed Deity Rules And Bonuses

**Task state: Complete.** All world modes, costs, refunds, queue rules, caps,
and derived bonuses are implemented and covered.

**Files:**
- Create: `src/engine/deities.js`
- Create: `src/engine/deities.test.js`

**Interfaces:**
- Produces: `attemptDeity({ state, role, mode, resistance })`.
- Produces: `resolveDeityQueue({ state, queue, mode, resistances })`.
- Produces: `getDeityBonus(deityLevels)`.
- Returns `{ state, events }` without mutating the input state.

- [x] **Step 1: Write failing cost and normal-world tests**

Define this local test helper before the tests:

```js
const emptyLevels = {
  oak: 0, dark_oak: 0, birch: 0, spruce: 0,
  acacia: 0, jungle: 0, cherry: 0, mangrove: 0,
}

function stateWith({ energy = 0, ...levels } = {}) {
  return Object.freeze({
    energy,
    deityLevels: Object.freeze({ ...emptyLevels, ...levels }),
  })
}
```

```js
it('spends resistance times two to the current level', () => {
  const result = attemptDeity({ state: stateWith({ energy: 24, oak: 1 }), role: 'oak', mode: 'normal', resistance: 8 })
  expect(result.state.energy).toBe(8)
  expect(result.state.deityLevels.oak).toBe(2)
})

it('lets Oak remove lower Dark Oak levels', () => {
  const result = attemptDeity({ state: stateWith({ energy: 8, oak: 0, dark_oak: 2 }), role: 'oak', mode: 'normal', resistance: 8 })
  expect(result.state.deityLevels).toMatchObject({ oak: 1, dark_oak: 0 })
})

it('resolves the rare-tree cycle', () => {
  const result = attemptDeity({ state: stateWith({ energy: 24, jungle: 1 }), role: 'acacia', mode: 'normal', resistance: 8 })
  expect(result.state.deityLevels).toMatchObject({ acacia: 1, jungle: 0 })
})

it('sums each deity half-level separately', () => {
  expect(getDeityBonus({ oak: 1, dark_oak: 1, birch: 2, spruce: 3, acacia: 0, jungle: 0, cherry: 0, mangrove: 0 })).toBe(2)
})
```

- [x] **Step 2: Run the deity tests and observe the missing module error**

Run: `npm test -- src/engine/deities.test.js`

Expected: FAIL because `src/engine/deities.js` does not exist.

- [x] **Step 3: Implement normal, independent, and mirrored modes**

Use these normal-mode rules:

| Role | Rule |
|---|---|
| Oak | Attempt Oak. When Oak exceeds Dark Oak, remove all Dark Oak levels. |
| Dark Oak | Attempt only when Oak is zero. When Oak exceeds Dark Oak, remove all Dark Oak levels. |
| Birch | Queue when Spruce is zero or Oak equals Dark Oak. When Oak dominates, decrease Spruce first. |
| Spruce | Queue when Birch is zero or Oak equals Dark Oak. When Dark Oak dominates, decrease Birch first. |
| Acacia | Require Mangrove at zero, decrease Jungle, then queue Acacia. |
| Jungle | Require Acacia at zero, decrease Cherry, then queue Jungle. |
| Cherry | Require Jungle at zero, decrease Mangrove, then queue Cherry. |
| Mangrove | Require Cherry at zero, decrease Acacia, then queue Mangrove. |

Use these mirrored-mode changes:

| Role | Rule |
|---|---|
| Oak | Require Dark Oak at zero. When Dark Oak exceeds Oak, remove all Oak levels. |
| Dark Oak | Always attempt Dark Oak. When Dark Oak exceeds Oak, remove all Oak levels. |
| Birch | Use Dark Oak dominance to decrease Spruce. |
| Spruce | Use Oak dominance to decrease Birch. |
| Acacia | Require Jungle at zero and decrease Mangrove. |
| Jungle | Require Cherry at zero and decrease Acacia. |
| Cherry | Require Mangrove at zero and decrease Jungle. |
| Mangrove | Require Acacia at zero and decrease Cherry. |

Independent mode attempts Oak and Dark Oak directly. It queues each other
role without opposition.

Enforce the level cap before spending energy. A decrease removes one level and
refunds `resistance * 2^newLevel`. Oak and Dark Oak decreases have no minimum
energy. Other decreases require at least `4` energy.

Record rejected attempts with reason codes `insufficient_energy`, `blocked`,
and `level_cap`.

Resolve queued roles in this order:

```js
export const DEITY_QUEUE_ORDER = ['birch', 'spruce', 'acacia', 'jungle', 'cherry', 'mangrove']
```

- [x] **Step 4: Add mirrored and independent golden tests**

Create one table-driven test per role and mode. Each row must assert levels,
remaining energy, and reason codes. Include the `0`, `1`, `14`, and `15` level
boundaries.

- [x] **Step 5: Run the focused deity suite**

Run: `npm test -- src/engine/deities.test.js`

Expected: PASS for all three world modes.

### Task 7: Declarative Conditions And Effects

**Task state: Complete.** The bounded condition and effect registry, strict
schemas, cross-reference checks, and effect validation are complete.

**Files:**
- Create: `src/engine/rules.js`
- Create: `src/engine/rules.test.js`
- Modify: `src/catalog/schemas.js`
- Modify: `src/catalog/validate.test.js`

**Interfaces:**
- Produces: `evaluateCondition(condition, context)`.
- Produces: `applyEffects(effects, context)`.
- Context contains `state`, `catalogMaps`, `sourceId`, `phase`, and `pendingCardId`.
- Returns updated context and structured events.

- [x] **Step 1: Write failing condition tests**

Define one real-state helper for both condition and effect tests:

```js
function fixtureContext({ energy = 24, family = 'tool', attackDamage = 6 } = {}) {
  const { catalogMaps, recipe } = createCompiledFixtures()
  const initial = createInitialState({ catalogMaps, recipe })
  return {
    catalogMaps,
    sourceId: 'minecraft:coal',
    phase: 'ingredientRules',
    pendingCardId: null,
    state: Object.freeze({
      ...initial,
      energy,
      family,
      attributes: Object.freeze({ ...initial.attributes, attackDamage }),
    }),
  }
}
```

```js
it('combines all, any, and not conditions', () => {
  const condition = {
    all: [
      { type: 'compare', target: 'energy', operator: 'gte', value: 8 },
      { not: { type: 'hasTrait', traitId: 'coppertemper:frozen' } },
      { any: [
        { type: 'equipmentFamily', value: 'tool' },
        { type: 'equipmentId', value: 'coppertemper:helmet' },
      ] },
    ],
  }
  expect(evaluateCondition(condition, fixtureContext({ energy: 8, family: 'tool' }))).toBe(true)
})
```

- [x] **Step 2: Write failing ordered-effect tests**

```js
it('applies effects in JSON order', () => {
  const effects = [
    { type: 'multiplyAttribute', attribute: 'attackDamage', value: 1.5 },
    { type: 'addAttribute', attribute: 'attackDamage', value: 1 },
    { type: 'grantTrait', traitId: 'coppertemper:frozen' },
  ]
  const result = applyEffects(effects, fixtureContext({ attackDamage: 5 }))
  expect(result.state.attributes.attackDamage).toBe(8.5)
  expect(result.state.traits).toEqual(['coppertemper:frozen'])
})
```

- [x] **Step 3: Run the rule tests and observe the missing module error**

Run: `npm test -- src/engine/rules.test.js`

Expected: FAIL because `src/engine/rules.js` does not exist.

- [x] **Step 4: Implement the bounded rule registry**

Support these condition types:

```js
export const CONDITION_TYPES = [
  'compare', 'equipmentFamily', 'equipmentId', 'materialId', 'cardAtPosition',
  'worldMode', 'hasTrait', 'hasCard',
]
```

Support these effect types:

```js
export const EFFECT_TYPES = [
  'addAttribute', 'subtractAttribute', 'setAttribute', 'multiplyAttribute',
  'grantTrait', 'removeTrait', 'addEnergy', 'spendEnergy', 'setEnergy',
  'attemptDeity', 'queueDeity', 'increaseDeity', 'decreaseDeity',
  'setPendingCard', 'moveCard', 'removeCard', 'retainCard', 'transformCard',
  'setSticky', 'setWorldMode',
]
```

Reject an attribute operation when the selected equipment does not expose that
attribute. Apply `Math.trunc` only when an effect has `truncate: true` or the
target attribute is discrete.

- [x] **Step 5: Extend schema validation for every rule type**

Use a discriminator on `type` for conditions and effects. Reject unknown fields
with `additionalProperties: false`. Add one invalid-schema test for each
unknown condition and effect type.

- [x] **Step 6: Run rule and validation tests**

Run:

```powershell
npm test -- src/engine/rules.test.js src/catalog/validate.test.js
```

Expected: PASS.

### Task 8: Card Queue And Capability Parity

**Task state: Complete.** Queue movement, sticky-card preservation, ordered
activation, world-card selection, and lifecycle capabilities are complete.

**Files:**
- Create: `src/engine/cards.js`
- Create: `src/engine/cards.test.js`

**Interfaces:**
- Produces: `prepareCardStep(state)`.
- Produces: `pushPendingCard({ state, pendingCardId, catalogMaps })`.
- Produces: `activateCards({ state, catalogMaps, phaseContext })`.
- Produces: `selectWorldMode(state, catalogMaps)`.

- [x] **Step 1: Write failing queue tests**

Create a local helper that adds the card records required by this suite:

```js
const { catalogMaps: fixtureMaps, recipe: fixtureRecipe } = createCompiledFixtures()
const catalogMaps = {
  ...fixtureMaps,
  cards: new Map([
    ['card:newest', { id: 'card:newest', capabilities: {} }],
    ['card:newer', { id: 'card:newer', capabilities: {} }],
    ['card:new', { id: 'card:new', capabilities: {} }],
    ['card:one', { id: 'card:one', capabilities: {} }],
    ['card:two', { id: 'card:two', capabilities: {} }],
    ['card:three', { id: 'card:three', capabilities: {} }],
    ['card:normal', { id: 'card:normal', capabilities: {} }],
    ['card:sticky_a', { id: 'card:sticky_a', capabilities: { sticky: true } }],
    ['card:sticky_b', { id: 'card:sticky_b', capabilities: { sticky: true } }],
  ]),
}

function cardState(cards) {
  const initial = createInitialState({ catalogMaps, recipe: fixtureRecipe })
  return Object.freeze({
    ...initial,
    cards: Object.freeze({ hidden: null, first: null, second: null, third: null, leaving: null, ...cards }),
  })
}
```

```js
it('pushes hidden cards through the three visible positions', () => {
  const state = cardState({ hidden: 'card:newer', first: 'card:one', second: 'card:two', third: 'card:three' })
  const result = pushPendingCard({ state, pendingCardId: 'card:newest', catalogMaps })
  expect(result.state.cards).toEqual({
    hidden: 'card:newest', first: 'card:newer', second: 'card:one', third: 'card:two', leaving: 'card:three',
  })
})

it('skips the oldest contiguous sticky cards', () => {
  const state = cardState({ first: 'card:normal', second: 'card:sticky_a', third: 'card:sticky_b' })
  const result = pushPendingCard({ state, pendingCardId: 'card:new', catalogMaps })
  expect(result.state.cards.third).toBe('card:sticky_b')
  expect(result.state.cards.second).toBe('card:sticky_a')
  expect(result.state.cards.leaving).toBe('card:normal')
})
```

- [x] **Step 2: Write failing lifecycle capability tests**

Cover activation order, hidden behavior, self-removal, transformation,
leaving-card retention, one active world card, and equipment combinations.
Assert this activation order:

```js
expect(result.activationOrder).toEqual(['leaving', 'third', 'second', 'first', 'hidden'])
```

- [x] **Step 3: Run the card tests and observe the missing module error**

Run: `npm test -- src/engine/cards.test.js`

Expected: FAIL because `src/engine/cards.js` does not exist.

- [x] **Step 4: Implement immutable card movement and activation**

Use card catalog flags for sticky, world-card eligibility, self-removal,
retention, and transformation. Use `applyEffects` for lifecycle and combination
rules. Select world cards in `third`, `second`, `first`, `hidden` priority.

- [x] **Step 5: Run the focused card suite**

Run: `npm test -- src/engine/cards.test.js`

Expected: PASS.

### Task 9: Complete Phase Pipeline

**Files:**
- Modify: `src/engine/simulate.js`
- Modify: `src/engine/simulate.test.js`

**Interfaces:**
- Produces: `simulateIngredient({ catalogMaps, state, ingredientId })`.
- Produces: `simulateRecipe({ catalogMaps, recipe })`.
- `simulateRecipe` returns `{ initial, steps }`.
- Each step returns `{ ingredientId, phases, final }`.

- [x] **Step 1: Write a failing phase-order integration test**

Create fixture rules that make each phase observable:

```js
it('runs all phases in the approved order', () => {
  const { catalogMaps, recipe } = createCompiledFixtures()
  const result = simulateRecipe({ catalogMaps, recipe })

  expect(result.steps[0].phases.map(({ id }) => id)).toEqual(PHASES)
  expect(result.steps[0].phases.find(({ id }) => id === 'ingredientEnergy').state.energy).toBe(24)
  expect(result.steps[0].final.energy).toBe(0)
})
```

- [x] **Step 2: Write a failing persistence and reset test**

Use two fixture ingredients. The first must raise Oak to `2`, alter attack
damage, create a card, and grant a trait. The second must prove these results:

```js
expect(second.final.deityLevels.oak).toBe(2)
expect(second.final.cards.first).toBe('coppertemper:test_card')
expect(second.final.traits).toContain('coppertemper:test_trait')
expect(second.phases.find(({ id }) => id === 'restoreBase').state.attributes.attackDamage).toBe(6)
expect(second.final.attributes.attackDamage).toBe(7)
```

The final `7` is the separate Oak level bonus.

- [x] **Step 3: Run the pipeline tests and observe the expected assertion errors**

Run: `npm test -- src/engine/simulate.test.js`

Expected: FAIL because `simulateRecipe` does not exist.

- [x] **Step 4: Connect all thirteen phases**

At each phase, store a frozen state snapshot and only that phase's events.
Apply material hooks at `materialBefore` and `materialAfter`. Expire remaining
energy during `finalize` after recording the pre-expiration value.

- [x] **Step 5: Add determinism and input-mutation tests**

Run the same recipe twice and compare complete results with `toEqual`. Freeze
the input recipe and catalogs before the call. The engine must not throw or
alter either input.

- [x] **Step 6: Run the complete engine suite**

Run: `npm test -- src/engine`

Expected: PASS.

### Task 10: Active Ingredient And Recipe Panels

**Files:**
- Create: `src/components/IngredientsPanel.jsx`
- Create: `src/components/RecipePanel.jsx`
- Create: `src/components/IngredientsPanel.test.jsx`
- Create: `src/components/RecipePanel.test.jsx`
- Modify: `src/App.jsx`
- Modify: `src/App.css`

**Interfaces:**
- `IngredientsPanel` receives catalogs, selected IDs, and selection callbacks.
- `RecipePanel` receives ingredient IDs, selected step, and edit callbacks.
- `onAddIngredient(id)` inserts after the current selected step.
- `onReorder(fromIndex, toIndex)` performs native drag reordering.
- `onRemove(index)` removes one row.

- [x] **Step 1: Write failing material-filter tests**

```jsx
render(<IngredientsPanel {...fixtureProps} materialId="minecraft:leather" />)
expect(screen.getByRole('option', { name: 'Helmet' })).toBeVisible()
expect(screen.queryByRole('option', { name: 'Sword' })).not.toBeInTheDocument()
```

Also assert that categories use catalog order and each ingredient button uses
its catalog name.

- [x] **Step 2: Write failing recipe interaction tests**

```jsx
it('removes a row by close control or double click', async () => {
  const onRemove = vi.fn()
  render(<RecipePanel ingredientIds={['minecraft:coal']} selectedStep={1} onRemove={onRemove} onReorder={() => {}} />)
  await user.click(screen.getByRole('button', { name: 'Remove Coal' }))
  expect(onRemove).toHaveBeenCalledWith(0)
  await user.dblClick(screen.getByText('Coal'))
  expect(onRemove).toHaveBeenLastCalledWith(0)
})
```

Use native `dragStart`, `dragOver`, and `drop` events to assert reorder indices.

- [x] **Step 3: Run component tests and observe missing module errors**

Run:

```powershell
npm test -- src/components/IngredientsPanel.test.jsx src/components/RecipePanel.test.jsx
```

Expected: FAIL because both components do not exist.

- [x] **Step 4: Implement the two active panels**

Keep the current panel headings and compact control style. Use semantic buttons
for ingredients and removal. Use the native `draggable` attribute for recipe
rows. Do not add a separate duplicate command.

- [x] **Step 5: Connect insertion behavior in App**

Use this operation:

```js
function insertIngredient(ingredientIds, selectedStep, ingredientId) {
  const next = [...ingredientIds]
  next.splice(selectedStep, 0, ingredientId)
  return { ingredientIds: next, selectedStep: selectedStep + 1 }
}
```

- [x] **Step 6: Run the component tests**

Run:

```powershell
npm test -- src/components/IngredientsPanel.test.jsx src/components/RecipePanel.test.jsx
```

Expected: PASS.

### Task 11: Statistics, Explanations, And Recipe Dialog

**Files:**
- Create: `src/components/StatisticsPanel.jsx`
- Create: `src/components/ExplanationPanel.jsx`
- Create: `src/components/RecipeDialog.jsx`
- Create: `src/components/StatisticsPanel.test.jsx`
- Create: `src/components/ExplanationPanel.test.jsx`
- Create: `src/components/RecipeDialog.test.jsx`
- Modify: `src/App.jsx`
- Modify: `src/App.css`

**Interfaces:**
- `StatisticsPanel` receives one state snapshot and catalog maps.
- `ExplanationPanel` receives simulation output, selected step, and selected phase.
- `RecipeDialog` receives mode, recipe, catalog maps, `onImport`, and `onClose`.

- [x] **Step 1: Write failing statistics tests**

For a sword, assert that attack damage, attack speed, mining speed, harvest
level, durability, and enchantability are visible. Assert that armor points
and toughness are absent. Assert all eight deity names, all five card
positions, and granted traits.

- [x] **Step 2: Write failing explanation tests**

```jsx
expect(screen.getByRole('option', { name: '7. Ingredient rules' })).toBeVisible()
expect(screen.getByText('Oak increased from 1 to 2.')).toBeVisible()
expect(screen.getByText('Energy cost: 16.')).toBeVisible()
```

Step navigation must clamp between initial state `0` and recipe length.
Sub-step navigation must clamp between phase `1` and phase `13`.

- [x] **Step 3: Write failing dialog tests**

Assert that export shows `exportRecipe(recipe)`. Assert that valid import calls
`onImport` once. Assert that invalid import shows errors and does not call
`onImport`.

- [x] **Step 4: Run the three component suites and observe missing modules**

Run:

```powershell
npm test -- src/components/StatisticsPanel.test.jsx src/components/ExplanationPanel.test.jsx src/components/RecipeDialog.test.jsx
```

Expected: FAIL because the components do not exist.

- [x] **Step 5: Implement output formatting**

Map reason codes to fixed English sentences in `ExplanationPanel`. Format
events from structured values. Do not read authored explanation text from
catalogs.

Remove the price and language controls. Keep Energy, Deities, Cards, Traits,
and only the attributes listed in the selected equipment's `fields` array.

- [x] **Step 6: Implement accessible modal dialogs**

Use a conditionally rendered element with `role="dialog"` and
`aria-modal="true"`. Import must parse a local textarea value before calling
`onImport`. Export must use a read-only textarea.

- [x] **Step 7: Run the focused UI suites**

Run:

```powershell
npm test -- src/components/StatisticsPanel.test.jsx src/components/ExplanationPanel.test.jsx src/components/RecipeDialog.test.jsx
```

Expected: PASS.

### Task 12: Application Integration And Final Validation

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/App.test.jsx`
- Modify: `src/App.css`
- Create: `README.md`

**Interfaces:**
- Consumes: bundled catalogs, `simulateRecipe`, recipe codec, and all panels.
- Produces: the complete active CopperTemper simulator page.

- [x] **Step 1: Replace the static application test with a failing workflow test**

The test must perform this workflow:

```jsx
render(<App />)
await user.selectOptions(screen.getByLabelText('Material'), 'minecraft:iron')
await user.selectOptions(screen.getByLabelText('Equipment'), 'coppertemper:sword')
await user.click(screen.getByRole('button', { name: 'Test Coal' }))

expect(screen.getByRole('list', { name: 'Recipe' })).toHaveTextContent('Test Coal')
expect(screen.getByText('Attack Damage')).toBeVisible()
expect(screen.getByText('Oak')).toBeVisible()
expect(screen.getByRole('button', { name: 'Export recipe' })).toBeEnabled()
```

Use a test-only dependency injection prop on `App`, named `catalogSource`, so
the workflow can use fixture ingredients without production catalog content.
The default value must remain the bundled catalogs.

Use this exact prop shape:

```jsx
const defaultCatalogSource = { catalogs, catalogMaps }

export default function App({ catalogSource = defaultCatalogSource }) {
  // Application state and derived simulation output.
}
```

Replace the orienting comment with the state declarations in Step 3.

- [x] **Step 2: Run the App test and observe the static-page assertion error**

Run: `npm test -- src/App.test.jsx`

Expected: FAIL because the current `App` has disabled static controls.

- [x] **Step 3: Connect the active application state**

`App` must own material ID, equipment ID, ingredient IDs, selected step,
selected phase, and dialog mode. Derive simulation output from those values.
When material changes, clear an incompatible equipment selection. When recipe
order changes, recalculate from the beginning.

- [x] **Step 4: Update responsive styles without changing the visual language**

Keep the current slate header, white panels, compact fields, and three-column
wide layout. Add visible focus styles, recipe drag handles, remove controls,
event rows, and modal styles. Keep panels stacked below `640px`.

- [x] **Step 5: Document catalog and recipe commands**

Add these commands and file locations to `README.md`:

```text
npm test
npm run validate:catalogs
npm run build
src/catalog/data/
```

State that production ingredient and card catalogs require separate approved
content specifications.

- [x] **Step 6: Run the full automated validation**

Run:

```powershell
npm test; npm run build
```

Expected: all tests PASS, catalog validation PASS, and Vite creates `dist`.

- [x] **Step 7: Start the local development server**

Run:

```powershell
npm run dev -- --host 127.0.0.1
```

Expected: Vite reports a local URL. The active page preserves the ManaForge
layout and supports the complete test-fixture workflow.

- [x] **Step 8: Inspect desktop and narrow layouts**

At a wide viewport, make sure that Ingredients, Recipe, and Statistics use
three columns. Below `640px`, make sure that the panels stack without clipped
controls or overlapping text.

---

## Audit Follow-up Tasks

Audit date: 2026-08-27. These tasks close gaps found during the implementation
audit. They supplement the numbered tasks above.

- [x] **A1: Implement phase 10 card combinations**

  Run equipment combination rules after card activation. Add fixture-based
  tests that prove the rules change the step snapshot.

- [x] **A2: Apply deity bonuses to both equipment families**

  Add the derived deity bonus to tool attack damage and armor points. Add tests
  for both target fields.

- [x] **A3: Add step and sub-step controls**

  Let users select the initial state or each completed ingredient. Let users
  select all 13 simulation phases and show the selected snapshot and events.

- [x] **A4: Make catalog rule validation strict**

  Replace permissive rule schemas with bounded condition and effect schemas.
  Reject unknown operations, invalid targets, references, phases, and direct
  card transformation cycles.

- [x] **A5: Complete sticky and retention card behavior**

  Honor dynamic sticky flags and leaving-card retention. Add tests for both
  paths.

- [x] **A6: Use material deity resistance for rule attempts**

  Pass the selected material resistance to `attemptDeity` effects unless a
  rule explicitly supplies another value. Add a custom-resistance test.

- [x] **A7: Repair the outdated deity-header assertion**

  Update the application test to expect the approved `OA` deity abbreviation.

- [x] **A8: Run complete validation**

  Run the full test suite, production build, catalog validation, and browser
  inspection. Record any remaining gaps in this plan.

  Verification: `npm test` passed with 93 tests in 11 files. `npm run build`
  passed with catalog validation. Desktop and 375px browser inspections found
  no horizontal overflow.

- [x] **A9: Refine explanation and card queue presentation**

  Keep `Initial state` as the step selector. Replace the repeated initial-state
  message with a prompt to select an ingredient step. Lay out cards as hidden,
  first, spacer and second, leaving and third. The layout shows the card path
  without overflow at desktop or 375px widths.

  Verification: `npm test` passed with 95 tests in 12 files. `npm run build`
  passed with catalog validation.

- [x] **A10: Complete the branch audit findings**

  Do not advance cards without a pending card. Reset dynamic sticky state at
  the start of each ingredient. Record complete structured events and show
  readable event text. Run transformations and retention in phase 10. Add
  total-deity conditions and a clear-sticky effect. Make ingredient categories
  collapsible. Clamp the selected step after recipe edits. Add focused tests
  for ingredient and recipe panels.

  Verification: `npm test` passed with 106 tests in 14 files. `npm run build`
  passed with catalog validation.

## Branch Audit Follow-up

Audit date: 2026-08-27. This audit compares the current branch with the
simulator-engine design. Desktop and 375px checks found no horizontal overflow.

- [x] **A11: Permit total deity level comparisons in catalog validation**

  The rule engine supports `totalDeityLevels`, but catalog validation rejects
  it as an unknown comparison target. Add it to the accepted validation targets
  and add a catalog test that accepts a valid rule.

- [x] **A12: Validate effect values by operation type**

  The schema accepts a string for numeric effects, such as
  `{ type: 'addEnergy', value: '2' }`. This can change numeric engine values
  into strings. Use type-specific schemas so numeric effects require numbers
  and `setWorldMode` requires one valid world mode.

- [x] **A13: Emit one complete event for each deity attempt**

  `applyEffects` currently emits both the deity result event and a generic
  `attemptDeity` event. The generic event can report a cumulative energy cost.
  Emit one event with the actual prior value, result value, energy cost, and
  reason code. Format all event operations and reason codes with fixed UI text.

- [x] **A14: Complete the required behavior test coverage**

  Add table-driven deity tests for every role, world mode, and levels 0, 1, 14,
  and 15. Add pipeline determinism and immutable-input tests. Add material
  filtering, category-order, recipe drag, double-click removal, valid import,
  invalid import, and complete explanation event tests.

  Verification: `npm test` passed with 123 tests in 14 files. `npm run build`
  passed with catalog validation.

## Branch Audit: 2026-08-28

This audit compares commit `ba1f3de` with the simulator-engine design.
The full test suite and production build pass. The following defects remain.

- [x] **A15: Reject duplicate fixed deity roles**

  The validator only rejects unknown roles. It accepts two entries with the
  same valid role, such as two `oak` deities. Require every fixed role exactly
  once. Add a regression test for a duplicate role.

- [x] **A16: Queue non-Oak deity attempts until phase 11**

  The design requires Oak and Dark Oak attempts to resolve immediately.
  Birch, Spruce, Acacia, Jungle, Cherry, and Mangrove must remain queued until
  `resolveDeities`. `applyEffects` now resolves every `attemptDeity` effect
  immediately. Route the six queued roles to `deityQueue`, and add phase tests
  for one immediate and one queued attempt.

- [x] **A17: Enforce trait targets when rules grant traits**

  `grantTrait` now rejects unknown trait IDs and traits that do not apply to
  the selected target. Tool, armor, equipment-specific, and unknown-ID
  regressions cover the calculation error path.

  Verification: `npm test -- src/catalog/validate.test.js src/engine/simulate.test.js src/engine/rules.test.js`
  passed with 36 tests in 3 files.

## Branch Audit: 2026-08-28, Follow-up

Tasks 9, 10, and 11 have no pending checkboxes. Their implementations and
focused tests cover the planned phase pipeline, panel interactions, output,
and dialog behavior. The following design mismatches remain.

- [x] **A18: Read deity display labels from the catalog**

  `StatisticsPanel` renders each deity's `shortName` in catalog order. The
  bundled catalog stores the compact display labels. A component regression
  test verifies that a custom short name replaces the bundled value.

- [x] **A19: Enforce Birch and Spruce queue gates**

  In normal and mirrored modes, Birch and Spruce queue only when the opposing
  deity is zero or Oak and Dark Oak are equal. Rejected attempts emit a
  structured `blocked` event. Regression tests cover bright, balanced,
  shaded, opposition-free, and independent states.

  Verification: `npm test; npm run build` passed with 132 tests in 14 files.

## Branch Audit: 2026-08-28, Validation And Deity Follow-up

The plan has no stale unchecked tasks. This audit found four additional
deviations from the simulator-engine design.

- [x] **A20: Preserve explicit resistance for queued deity attempts**

  Queue metadata preserves an explicit `resistance` value through phase 11.
  The public deity queue remains a role list. An integration regression test
  verifies the queued Birch cost.

- [x] **A21: Keep declarative deity levels integral and within range**

  The schema and engine reject non-positive or non-integer deity adjustment
  values. Valid adjustments remain within the inclusive range from 0 through
  15.

- [x] **A22: Validate each compatible material and equipment mapping**

  Every equipment ID in a material's `compatibility` list must have an
  `itemIds` entry and complete family-specific base values. Validation now
  checks tool fields, tool fallback values, and armor slot values before a
  simulation can create undefined item attributes or an undefined item ID.

- [x] **A23: Provide complete structured catalog validation errors**

  Each validation error now includes stable `file` and `expectedRule` fields,
  as well as catalog, entry, field, invalid value, and message. The build
  validator writes each complete record as JSON.

  Verification: `npm test; npm run build` passed with 143 tests in 14 files.

## Branch Audit: 2026-08-28, World Card Follow-up

The plan has no stale unchecked tasks. This audit found one catalog validation
gap.

- [x] **A24: Require a mode for each world card**

  A card with `isWorldCard: true` must define one valid `worldMode` value.
  Catalog validation rejects world cards without a mode before phase 4 can
  set an undefined mode. A regression test covers this catalog state.

  Verification: `npm test; npm run build` passed with 144 tests in 14 files.

## Branch Audit: 2026-08-28, Rule Validation Follow-up

The plan has no stale unchecked tasks. This audit found two strict validation
gaps.

- [x] **A25: Validate condition values by condition type**

  Comparison conditions require numbers. Equipment-family and world-mode
  conditions require one catalog-supported value. Regressions reject invalid
  values for all three condition types.

- [x] **A26: Validate combination attributes against their equipment**

  Combination attributes are checked against the owning equipment's `fields`
  list, rather than the global field union. A regression rejects an armor-only
  attribute from a sword rule.

  Verification: `npm test -- src/catalog/validate.test.js` passed with 24
  tests. `npm test; npm run build` passed with 148 tests in 14 files.

## Branch Audit: 2026-08-28, Deity Queue Follow-up

The plan has no stale unchecked tasks. This audit found two deity queue gaps.

- [x] **A27: Reject unsupported queued deity roles**

  `queueDeity` accepts only the six roles that phase 11 resolves. Catalog
  validation rejects Oak and Dark Oak queue effects. The engine also rejects
  these roles when a caller bypasses catalog validation.

- [x] **A28: Preserve queued deity event context**

  Queued attempts retain the source ID. Phase 11 labels each resolved deity
  event with the `resolveDeities` phase and its originating source.

  Verification: `npm test -- src/catalog/validate.test.js src/engine/simulate.test.js`
  passed with 39 tests in 2 files. `npm test; npm run build` passed with 151
  tests in 14 files.

## Branch Audit: 2026-08-28, Phase And Target Follow-up

The plan has no stale unchecked tasks. This audit found four validation and
immutability gaps.

- [x] **A29: Reject deferred deity effects after phase 11**

  Catalog validation rejects `queueDeity` and deferred `attemptDeity` effects
  in `afterIngredient` hooks. Immediate Oak and Dark Oak attempts remain valid.

- [x] **A30: Reject direct card transformation cycles of any length**

  Graph traversal rejects self-cycles and direct transformation cycles of any
  length. Two-card and three-card regressions cover the cycle paths.

- [x] **A31: Validate rule attributes against reachable equipment**

  Attribute effects are checked against reachable material and equipment
  pairs. Equipment-family, equipment-ID, material-ID, and logical conditions
  narrow the possible targets before validation.

- [x] **A32: Deep-freeze queued deity attempt metadata**

  Every queued-attempt record is copied and frozen when rule state and phase
  snapshots are created. A regression checks the nested object.

  Verification: `npm test -- src/catalog/validate.test.js src/engine/simulate.test.js`
  passed with 44 tests in 2 files. `npm test; npm run build` passed with 156
  tests in 14 files.

## Branch Audit: 2026-08-28, Deity And Contract Reconciliation

The plan has no stale unchecked tasks. These findings refine separate parts
of earlier completed tasks and do not reverse them.

- [x] **A33: Use role-specific Birch and Spruce dominance**

  Resolution now selects support by role and mode. Normal Spruce uses Dark
  Oak, mirrored Spruce uses Oak, and Birch uses the opposite pair. This does
  not change the A19 queue-admission gates.

- [x] **A34: Remove all opposition from independent mode**

  Independent Birch and Spruce attempts no longer decrease each other. The
  six deferred roles still enter and resolve through the fixed queue order.

- [x] **A35: Emit correct values for card and world effects**

  Pending-card, movement, removal, retention, transformation, and world-mode
  events now record operation-specific targets, prior values, and results.
  Explanation text uses these structured values.

- [x] **A36: Validate trait grants against reachable equipment**

  Catalog validation rejects a trait grant when any reachable target is
  outside its valid families or explicit equipment IDs.

- [x] **A37: Restrict equipment fields by family**

  Armor and tool schemas permit only the approved family fields. Field lists
  must contain at least one unique field.

  Verification: `npm test -- src/engine/deities.test.js` passed with 13 tests.
  `npm test -- src/engine/rules.test.js` passed with 28 tests.
  `npm test -- src/catalog/validate.test.js` passed with 34 tests.
  `npm test; npm run build` passed with 170 tests in 14 files.

## Branch Audit: 2026-08-28, Schema And Workflow Matrix

The plan has no stale unchecked tasks. These findings cover requirements that
A1 through A37 did not change.

- [x] **A38: Validate category reference ownership**

  Ingredient category IDs must resolve to the categories catalog. Validation
  rejects missing IDs and IDs owned by another catalog.

- [x] **A39: Use discriminated condition and effect schemas**

  Conditions and effects use disjoint strict schema objects. Validation
  rejects mixed condition forms and fields that do not apply to an effect.

- [x] **A40: Complete structured energy events**

  Declarative energy effects target `energy` and record prior and result
  values. Phase 5 records the complete energy replacement event.

- [x] **A41: Enforce material-first equipment selection**

  The equipment selector stays disabled and empty until material selection.
  It then lists only equipment that the selected material supports.

  Verification: `npm test -- src/catalog/validate.test.js` passed with 37
  tests. `npm test -- src/engine/rules.test.js src/engine/simulate.test.js`
  passed with 46 tests. `npm test -- src/components/IngredientsPanel.test.jsx`
  passed with 3 tests. `npm test; npm run build` passed with 178 tests in 14
  files.