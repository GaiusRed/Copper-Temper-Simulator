# CopperTemper Simulator Engine Design

## Purpose

CopperTemper will port the ManaForge tempering structure to Minecraft Java
Edition 1.21.11. It will keep ordered ingredients, step inspection, energy,
deity interactions, and the card queue.

The simulator will replace Legend of Mana equipment values, character stats,
essences, cards, and special effects with Minecraft systems and original mod
lore.

This specification covers the web simulator, its data format, and its engine.
It does not cover Minecraft mod implementation. Separate specifications will
define the production ingredient catalog and card catalog.

This specification supersedes the static-behavior constraints in the earlier
static UI design. The existing layout and visual style remain the UI baseline.

## Architecture

CopperTemper will remain a Vite and Preact web application. It will have three
independent layers:

1. The catalog layer loads and validates bundled JSON files.
2. The simulation layer calculates immutable snapshots and structured events.
3. The UI layer edits recipes and displays simulation results.

The simulation layer will not depend on Preact or browser APIs. Tests and
future tools can call it with catalogs and a recipe.

The engine will use a fixed phase order and fixed eight-deity relationships.
Catalog rules can use only registered conditions, operations, flags, and card
behaviors.

JSON Schema and Ajv will validate fields and cross-catalog references. The
production build will run catalog validation before Vite builds the site.

## Identifiers And Versions

All catalog entries will use namespaced IDs. Examples are `minecraft:iron`
and `coppertemper:oak_card`.

Each catalog file will contain these top-level fields:

- `schemaVersion`
- `minecraftVersion`
- `entries`

The bundled vanilla data will use Minecraft Java Edition 1.21.11. Recipe files
will contain their schema version and stable catalog IDs. Catalog order will
not affect saved recipes.

## Catalog Files

The application will load these bundled JSON files:

- `categories.json` defines ingredient category IDs, names, and display order.
- `deities.json` defines the eight required tree deities and display data.
- `materials.json` defines compatibility, resistances, base values, and hooks.
- `equipment.json` defines armor and tool archetypes and applicable fields.
- `ingredients.json` defines item IDs, categories, energy, conditions, and effects.
- `cards.json` defines card lifecycle rules and special capabilities.
- `traits.json` defines unique non-numeric effects and valid equipment targets.

Developers can add or remove categories, materials, equipment, ingredients,
cards, and traits without JavaScript changes. Catalog changes require a new
application build. The application will not provide runtime catalog import or
an in-app catalog editor.

The eight deity roles are fixed. Validation will reject a missing deity role
or an additional deity role.

The production ingredient, card, and trait catalogs are outside this
specification. Dedicated fixture catalogs will supply content for engine tests.
Later approved catalog specifications will add production entries.

## Equipment Model

The user will select a material first. The equipment list will then show only
compatible archetypes.

The first bundled catalog will include standard material gear:

- Helmets, chestplates, leggings, and boots
- Swords, axes, pickaxes, shovels, and hoes

Armor materials will be leather, chainmail, iron, gold, diamond, and netherite.
Tool materials will be wood, stone, iron, gold, diamond, and netherite. Custom
materials can add compatible combinations through JSON.

The simulator will use two equipment families: armor and tools. Weapons are
tools in this model. An equipment entry will declare which fields apply.

Armor can use these fields:

- Armor points
- Armor toughness
- Maximum durability
- Knockback resistance
- Enchantability

Tools can use these fields:

- Attack damage
- Attack speed
- Mining speed
- Harvest level
- Maximum durability
- Enchantability

Valid material and equipment combinations will reproduce exact Minecraft
1.21.11 values before tempering. Each valid combination will resolve to one
Minecraft item ID.

Tool materials will provide durability, mining speed, harvest level, attack
bonus, and enchantability. Tool archetypes will provide attack and speed
modifiers.

Armor materials will provide protection by slot, toughness, knockback
resistance, durability multiplier, and enchantability. Armor archetypes will
provide the slot and its durability multiplier.

The engine will use decimal arithmetic for decimal Minecraft attributes. It
will use integer truncation for discrete fields, such as durability and
harvest level. The engine will not clamp final values to vanilla ranges.

## Tree Deities

The tree deities will replace the eight Legend of Mana essences. Their roles
and normal-world relationships will remain fixed.

| Source role | Tree deity | Normal relationship |
|---|---|---|
| Wisp | Oak | Dominates Dark Oak and supports Birch. |
| Shade | Dark Oak | Cannot grow while Oak is present and supports Spruce. |
| Dryad | Birch | Opposes Spruce through Oak and Dark Oak balance. |
| Aura | Spruce | Opposes Birch through Oak and Dark Oak balance. |
| Salamander | Acacia | Requires Mangrove at zero and reduces Jungle. |
| Gnome | Jungle | Requires Acacia at zero and reduces Cherry. |
| Jinn | Cherry | Requires Jungle at zero and reduces Mangrove. |
| Undine | Mangrove | Requires Cherry at zero and reduces Acacia. |

Oak and Birch form the bright common-forest alliance. Dark Oak and Spruce
form the shaded common-forest alliance.

The less-common trees form this cycle:

`Acacia -> Jungle -> Cherry -> Mangrove -> Acacia`

Each deity level will have a range from `0` through `15`. Each material will
define one positive integer resistance for every deity.

The first vanilla material catalog will use resistance `8` for every material
and deity. A later material-catalog specification can define distinct values.

An increase from level $L$ will cost:

$$
\text{resistance} \times 2^L
$$

A decrease will remove one level and refund the cost of the removed level.
Oak and Dark Oak decreases will not require minimum energy. Other decreases
will require at least `4` energy before the decrease.

Oak and Dark Oak attempts will resolve immediately. The engine will resolve
queued attempts in Birch, Spruce, Acacia, Jungle, Cherry, Mangrove order.

Tool attack damage and armor points will receive this derived bonus:

$$
\sum_{d \in \text{deities}} \left\lfloor \frac{L_d}{2} \right\rfloor
$$

The engine will calculate each deity contribution separately. Two deities at
level `1` will give no bonus. One deity at level `2` will give `+1`.

World cards can select the normal, independent, or mirrored deity rule set.
Card catalog data will assign the card that activates each rule set.

## Recipe Model

A recipe will contain:

1. A material ID
2. An equipment ID
3. An unlimited ordered list of ingredient IDs

Each ingredient will provide fresh energy. Unused energy will expire after
that ingredient. Energy will not continue to the next ingredient.

Deity levels, card positions, traits, and world state will persist between
ingredients. Equipment attributes will reset to their exact base values before
each ingredient. The current ingredient and active cards will then modify the
attributes for that step.

The browser will keep the current recipe in memory only. Manual recipe import
and export will use versioned JSON with namespaced IDs.

## Ingredient Step Order

The engine will run these phases for each ingredient:

1. Reset step-only values and the structured event list.
2. Prepare `hidden`, `leaving`, and sticky-card state.
3. Restore exact base equipment attributes.
4. Select the active world card.
5. Replace current energy with the ingredient energy.
6. Run the material `beforeIngredient` rules.
7. Run the ingredient direct rules and card condition.
8. Push the pending card into `hidden`.
9. Activate cards in `leaving`, `third`, `second`, `first`, `hidden` order.
10. Run equipment combinations, transformations, and retention rules.
11. Resolve queued deity attempts.
12. Run the material `afterIngredient` rules.
13. Add derived deity bonuses and finalize the snapshot.

Materials can define automatic rules for phases 6 and 12. These rules will
use the same condition and effect format as ingredients and cards.

The simulator will expose every phase as a selectable sub-step.

## Declarative Rule Format

Ingredients, cards, materials, and equipment combinations will use one bounded
rule format. A rule will contain an optional condition tree and an ordered
effect list.

Conditions will support these checks:

- Compare energy, deity levels, total deity levels, and attributes.
- Match equipment family, archetype, material, card ID, position, or world mode.
- Check the presence or absence of traits and cards.
- Combine conditions with `all`, `any`, and `not`.

Effects will support these operations:

- Add, subtract, set, or multiply an equipment attribute.
- Select truncation for an operation that needs an integer result.
- Grant or remove a unique trait.
- Add, spend, or replace energy.
- Attempt, queue, increase, or decrease a deity level.
- Create or replace the pending card.
- Move, remove, retain, or transform a card.
- Set or clear the sticky flag.
- Select a world rule mode.

Rules will not contain JavaScript, arbitrary expressions, loops, or file
references. JSON effect order will define execution order.

The validator will reject unknown operations, invalid targets, missing
references, invalid phases, and impossible attribute targets. It will also
reject direct card transformation cycles.

## Card System

Cards will remain the official name for this mechanic. Each armor item or tool
will have three visible card slots.

The card queue will contain these lifecycle positions:

1. `hidden`
2. `first`
3. `second`
4. `third`
5. `leaving`

A pending card will enter `hidden` and push older cards toward `third`. A
displaced card will enter `leaving` for its final activation.

Each card can define rules for `hidden`, `first`, `second`, `third`, and
`leaving`. The engine will also support these capabilities:

- Sticky movement in visible slots
- One active world card
- Self-removal after activation
- Leaving-card retention
- Card transformation
- Equipment-specific card combinations

These capabilities provide full ManaForge engine parity. The production card
catalog will use original mod lore and a new set of cards. It will not require
one-to-one replacements for ManaForge cards.

The lore structure and card identities will be decided in the card-catalog
specification.

## Traits

Data-defined traits will replace special effects, immunities, and plunge
attacks. A trait will have a namespaced ID and valid equipment targets.

Traits will form a unique set. Different trait IDs can coexist. Repeated grants
of the same trait will not create duplicates.

The simulator will not calculate a price, experience cost, or value score. The
ordered ingredient list will represent the recipe cost.

## Structured Events

The engine will emit a structured event for each applied or rejected
operation. Each event will contain applicable values from this set:

- Phase
- Source ID
- Operation
- Target
- Prior value
- Result value
- Energy cost
- Reason code

The UI will format explanations from these records. Catalog rules will not
store authored success or failure text.

The same recipe and catalogs must always produce identical snapshots and
events.

## User Interface

CopperTemper will preserve the current ManaForge layout and visual style.

The left **Ingredients** panel will contain the material selector, filtered
equipment selector, and collapsible ingredient categories.

Selecting an ingredient will insert it after the current simulation step. The
current step will then advance to the inserted ingredient.

The center **Recipe** panel will match ManaForge behavior:

- Dragging will reorder rows.
- The close control will remove a row.
- Double-clicking a row will remove it.
- Repeated ingredient selections will create duplicate rows.

The right **Statistics** column will show only fields that apply to the
selected armor item or tool. It will show:

- Base item name
- Current energy
- Applicable equipment attributes
- Eight deity levels and resistances
- `hidden`, `first`, `second`, `third`, and `leaving` cards
- Granted traits

Step controls will select the initial state or a completed ingredient. Sub-step
controls will select one engine phase. The explanation view will show the
structured events for that selection.

Recipe import and export will use modal dialogs. The inactive language control
and the Legend of Mana price output will be removed.

The page will keep CopperTemper branding and its responsive panel layout. The
first version will use English only.

## Validation And Errors

Invalid bundled catalog data will stop tests and production builds. Each error
will identify the file, entry ID, field, invalid value, and expected rule.

Recipe import will validate the schema version and all referenced IDs. A failed
import will leave the current recipe unchanged and show validation errors.

The simulator will treat a calculation failure as a defect. It will not skip a
failed effect or return a partial result.

## Test Strategy

Tests will cover these areas:

- Valid and invalid catalog schemas
- References between all catalog files
- Every supported vanilla material and equipment combination
- Each declarative condition and effect operation
- Normal, independent, and mirrored deity interactions
- Hidden, visible, leaving, sticky, transformation, retention, and world cards
- Material hooks, ingredients, card activation, deity attempts, and phase order
- Derived deity bonuses for tools and armor
- Recipe import and export round trips
- Material filtering and ingredient insertion
- Recipe dragging, removal, and step navigation
- Statistics, sub-steps, and explanations
- Production build validation

The simulation engine will use pure functions and immutable snapshots. Focused
golden tests will make each phase and relationship independently observable.

## Deferred Catalog Work

This engine specification deliberately defers two content projects:

1. The production ingredient catalog will define categories, energies, rules,
   card conditions, and vanilla or CopperTemper item IDs.
2. The production card catalog will define original lore, card groups,
   lifecycle rules, traits, transformations, and world cards.

Each content project will receive its own design specification before
implementation.