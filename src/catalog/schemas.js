const namespacedId = '^[a-z0-9_.-]+:[a-z0-9_./-]+$'

const id = { type: 'string', pattern: namespacedId }
const positions = ['hidden', 'first', 'second', 'third', 'leaving']
const roles = ['oak', 'dark_oak', 'birch', 'spruce', 'acacia', 'jungle', 'cherry', 'mangrove']
const armorFields = ['armorPoints', 'armorToughness', 'maxDurability', 'knockbackResistance', 'enchantability']
const toolFields = ['attackDamage', 'attackSpeed', 'miningSpeed', 'harvestLevel', 'maxDurability', 'enchantability']

const condition = {
  oneOf: [
    { type: 'object', additionalProperties: false, required: ['all'], properties: { all: { type: 'array', minItems: 1, items: { $ref: '#/$defs/condition' } } } },
    { type: 'object', additionalProperties: false, required: ['any'], properties: { any: { type: 'array', minItems: 1, items: { $ref: '#/$defs/condition' } } } },
    { type: 'object', additionalProperties: false, required: ['not'], properties: { not: { $ref: '#/$defs/condition' } } },
    { type: 'object', additionalProperties: false, required: ['type', 'target', 'operator', 'value'], properties: { type: { const: 'compare' }, target: { type: 'string' }, operator: { enum: ['gte', 'gt', 'lte', 'lt', 'eq'] }, value: { type: 'number' } } },
    { type: 'object', additionalProperties: false, required: ['type', 'value'], properties: { type: { const: 'equipmentFamily' }, value: { enum: ['armor', 'tool'] } } },
    { type: 'object', additionalProperties: false, required: ['type', 'value'], properties: { type: { const: 'equipmentId' }, value: id } },
    { type: 'object', additionalProperties: false, required: ['type', 'value'], properties: { type: { const: 'materialId' }, value: id } },
    { type: 'object', additionalProperties: false, required: ['type', 'value'], properties: { type: { const: 'worldMode' }, value: { enum: ['normal', 'independent', 'mirrored'] } } },
    { type: 'object', additionalProperties: false, required: ['type', 'traitId'], properties: { type: { const: 'hasTrait' }, traitId: id } },
    { type: 'object', additionalProperties: false, required: ['type', 'cardId'], properties: { type: { const: 'hasCard' }, cardId: id } },
    { type: 'object', additionalProperties: false, required: ['type', 'position', 'cardId'], properties: { type: { const: 'cardAtPosition' }, position: { enum: positions }, cardId: id } },
  ],
}

const effect = {
  oneOf: [
    { type: 'object', additionalProperties: false, required: ['type', 'attribute', 'value'], properties: { type: { enum: ['addAttribute', 'subtractAttribute', 'setAttribute', 'multiplyAttribute'] }, attribute: { type: 'string' }, value: { type: 'number' }, truncate: { type: 'boolean' } } },
    { type: 'object', additionalProperties: false, required: ['type', 'traitId'], properties: { type: { enum: ['grantTrait', 'removeTrait'] }, traitId: id } },
    { type: 'object', additionalProperties: false, required: ['type', 'value'], properties: { type: { enum: ['addEnergy', 'spendEnergy', 'setEnergy'] }, value: { type: 'number' } } },
    { type: 'object', additionalProperties: false, required: ['type', 'role'], properties: { type: { const: 'attemptDeity' }, role: { enum: roles }, resistance: { type: 'integer', minimum: 1 } } },
    { type: 'object', additionalProperties: false, required: ['type', 'role'], properties: { type: { const: 'queueDeity' }, role: { enum: ['birch', 'spruce', 'acacia', 'jungle', 'cherry', 'mangrove'] }, resistance: { type: 'integer', minimum: 1 } } },
    { type: 'object', additionalProperties: false, required: ['type', 'role'], properties: { type: { enum: ['increaseDeity', 'decreaseDeity'] }, role: { enum: roles }, value: { type: 'integer', minimum: 1 } } },
    { type: 'object', additionalProperties: false, required: ['type', 'cardId'], properties: { type: { const: 'setPendingCard' }, cardId: id } },
    { type: 'object', additionalProperties: false, required: ['type', 'from', 'to'], properties: { type: { const: 'moveCard' }, from: { enum: [...positions, 'pending'] }, to: { enum: positions } } },
    { type: 'object', additionalProperties: false, required: ['type'], anyOf: [{ required: ['cardId'] }, { required: ['position'] }], properties: { type: { enum: ['removeCard', 'retainCard', 'setSticky', 'clearSticky'] }, cardId: id, position: { enum: positions } } },
    { type: 'object', additionalProperties: false, required: ['type', 'cardId', 'transformTo'], properties: { type: { const: 'transformCard' }, cardId: id, transformTo: id } },
    { type: 'object', additionalProperties: false, required: ['type', 'value'], properties: { type: { const: 'setWorldMode' }, value: { enum: ['normal', 'independent', 'mirrored'] } } },
  ],
}

const rule = {
  anyOf: [
    { $ref: '#/$defs/effect' },
    { type: 'object', required: ['effects'], additionalProperties: false, properties: { condition: { $ref: '#/$defs/condition' }, effects: { type: 'array', minItems: 1, items: { $ref: '#/$defs/effect' } } } },
  ],
}

function catalogSchema(entry) {
  return {
    type: 'object',
    required: ['schemaVersion', 'minecraftVersion', 'entries'],
    additionalProperties: false,
    properties: {
      schemaVersion: { const: 1 },
      minecraftVersion: { const: '1.21.11' },
      entries: { type: 'array', items: entry },
    },
    $defs: { condition, effect },
  }
}

const namedEntry = {
  type: 'object',
  required: ['id', 'name'],
  properties: { id, name: { type: 'string', minLength: 1 } },
}

export const catalogSchemas = {
  categories: catalogSchema({
    ...namedEntry,
    required: ['id', 'name', 'order'],
    additionalProperties: false,
    properties: { ...namedEntry.properties, order: { type: 'integer', minimum: 0 } },
  }),
  deities: catalogSchema({
    ...namedEntry,
    required: ['id', 'role', 'name', 'shortName'],
    additionalProperties: false,
    properties: { ...namedEntry.properties, role: { type: 'string' }, shortName: { type: 'string', minLength: 1 } },
  }),
  materials: catalogSchema({
    ...namedEntry,
    required: ['id', 'name', 'families', 'deityResistances', 'compatibility', 'itemIds'],
    additionalProperties: false,
    properties: {
      ...namedEntry.properties,
      families: { type: 'array', minItems: 1, items: { enum: ['armor', 'tool'] } },
      deityResistances: {
        type: 'object',
        required: ['oak', 'dark_oak', 'birch', 'spruce', 'acacia', 'jungle', 'cherry', 'mangrove'],
        additionalProperties: false,
        properties: Object.fromEntries(['oak', 'dark_oak', 'birch', 'spruce', 'acacia', 'jungle', 'cherry', 'mangrove'].map((role) => [role, { type: 'integer', minimum: 1 }])),
      },
      compatibility: { type: 'array', items: id },
      itemIds: { type: 'object', additionalProperties: id },
      tool: { type: 'object', additionalProperties: false, properties: { maxDurability: { type: 'integer' }, miningSpeed: { type: 'number' }, harvestLevel: { type: 'integer' }, attackBonus: { type: 'number' }, enchantability: { type: 'integer' }, combat: { type: 'object', additionalProperties: { type: 'array', minItems: 2, maxItems: 2, items: { type: 'number' } } } } },
      armor: { type: 'object', additionalProperties: false, required: ['protection', 'durability', 'enchantability'], properties: { protection: { type: 'object', additionalProperties: { type: 'integer' } }, toughness: { type: 'number' }, knockbackResistance: { type: 'number' }, durability: { type: 'object', additionalProperties: { type: 'integer' } }, enchantability: { type: 'integer' } } },
      hooks: { type: 'object', additionalProperties: false, properties: { beforeIngredient: { type: 'array', items: rule }, afterIngredient: { type: 'array', items: rule } } },
    },
  }),
  equipment: catalogSchema({
    ...namedEntry,
    required: ['id', 'name', 'family', 'fields', 'base'],
    additionalProperties: false,
    properties: { ...namedEntry.properties, family: { enum: ['armor', 'tool'] }, fields: { type: 'array', minItems: 1, uniqueItems: true, items: { type: 'string' } }, base: { type: 'object', additionalProperties: { type: ['number', 'string'] } }, combinationRules: { type: 'array', items: rule } },
    allOf: [
      { if: { properties: { family: { const: 'armor' } } }, then: { properties: { fields: { items: { enum: armorFields } } } } },
      { if: { properties: { family: { const: 'tool' } } }, then: { properties: { fields: { items: { enum: toolFields } } } } },
    ],
  }),
  ingredients: catalogSchema({
    ...namedEntry,
    required: ['id', 'name', 'minecraftItemId', 'categoryId', 'energy', 'rules'],
    additionalProperties: false,
    properties: { ...namedEntry.properties, minecraftItemId: id, categoryId: id, energy: { type: 'integer', minimum: 0 }, rules: { type: 'array', items: rule } },
  }),
  cards: catalogSchema({
    ...namedEntry,
    required: ['id', 'name', 'rulesByPosition', 'capabilities'],
    additionalProperties: false,
    properties: {
      ...namedEntry.properties,
      rulesByPosition: { type: 'object', required: positions, additionalProperties: false, properties: Object.fromEntries(positions.map((position) => [position, { type: 'array', items: rule }])) },
      capabilities: { type: 'object', additionalProperties: false, properties: { sticky: { type: 'boolean' }, isWorldCard: { type: 'boolean' }, worldMode: { enum: ['normal', 'independent', 'mirrored'] }, removeAfterActivation: { type: 'boolean' }, retainLeavingCardId: id, transformTo: id }, allOf: [{ if: { required: ['isWorldCard'], properties: { isWorldCard: { const: true } } }, then: { required: ['worldMode'] } }] },
    },
  }),
  traits: catalogSchema({
    ...namedEntry,
    required: ['id', 'name', 'validFamilies', 'validEquipmentIds'],
    additionalProperties: false,
    properties: { ...namedEntry.properties, validFamilies: { type: 'array', items: { enum: ['armor', 'tool'] } }, validEquipmentIds: { type: 'array', items: id } },
  }),
}