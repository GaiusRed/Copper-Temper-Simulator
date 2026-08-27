const namespacedId = '^[a-z0-9_.-]+:[a-z0-9_./-]+$'

const id = { type: 'string', pattern: namespacedId }
const positions = ['hidden', 'first', 'second', 'third', 'leaving']
const roles = ['oak', 'dark_oak', 'birch', 'spruce', 'acacia', 'jungle', 'cherry', 'mangrove']
const effectTypes = ['addAttribute', 'subtractAttribute', 'setAttribute', 'multiplyAttribute', 'grantTrait', 'removeTrait', 'addEnergy', 'spendEnergy', 'setEnergy', 'attemptDeity', 'queueDeity', 'increaseDeity', 'decreaseDeity', 'setPendingCard', 'moveCard', 'removeCard', 'retainCard', 'transformCard', 'setSticky', 'clearSticky', 'setWorldMode']

const condition = {
  type: 'object',
  additionalProperties: false,
  properties: {
    all: { type: 'array', minItems: 1, items: { $ref: '#/$defs/condition' } },
    any: { type: 'array', minItems: 1, items: { $ref: '#/$defs/condition' } },
    not: { $ref: '#/$defs/condition' },
    type: { enum: ['compare', 'equipmentFamily', 'equipmentId', 'materialId', 'cardAtPosition', 'worldMode', 'hasTrait', 'hasCard'] },
    target: { type: 'string' }, operator: { enum: ['gte', 'gt', 'lte', 'lt', 'eq'] }, value: {},
    cardId: id, traitId: id, position: { enum: positions },
  },
  anyOf: [
    { required: ['all'] }, { required: ['any'] }, { required: ['not'] },
    { required: ['type', 'target', 'operator', 'value'], properties: { type: { const: 'compare' } } },
    { required: ['type', 'value'], properties: { type: { enum: ['equipmentFamily', 'equipmentId', 'materialId', 'worldMode'] } } },
    { required: ['type', 'traitId'], properties: { type: { const: 'hasTrait' } } },
    { required: ['type', 'cardId'], properties: { type: { const: 'hasCard' } } },
    { required: ['type', 'position', 'cardId'], properties: { type: { const: 'cardAtPosition' } } },
  ],
}

const effect = {
  type: 'object',
  additionalProperties: false,
  required: ['type'],
  properties: {
    type: { enum: effectTypes }, attribute: { type: 'string' }, value: { type: ['number', 'string'] }, truncate: { type: 'boolean' },
    traitId: id, role: { enum: roles }, resistance: { type: 'integer', minimum: 1 }, cardId: id, from: { enum: [...positions, 'pending'] }, to: { enum: positions }, position: { enum: positions }, transformTo: id,
  },
  allOf: [{ if: { properties: { type: { enum: ['addAttribute', 'subtractAttribute', 'setAttribute', 'multiplyAttribute'] } } }, then: { required: ['attribute', 'value'], properties: { value: { type: 'number' } } } }, { if: { properties: { type: { enum: ['grantTrait', 'removeTrait'] } } }, then: { required: ['traitId'] } }, { if: { properties: { type: { enum: ['addEnergy', 'spendEnergy', 'setEnergy'] } } }, then: { required: ['value'], properties: { value: { type: 'number' } } } }, { if: { properties: { type: { enum: ['attemptDeity', 'queueDeity', 'increaseDeity', 'decreaseDeity'] } } }, then: { required: ['role'] } }, { if: { properties: { type: { enum: ['increaseDeity', 'decreaseDeity'] } } }, then: { properties: { value: { type: 'number' } } } }, { if: { properties: { type: { const: 'setPendingCard' } } }, then: { required: ['cardId'] } }, { if: { properties: { type: { const: 'moveCard' } } }, then: { required: ['from', 'to'] } }, { if: { properties: { type: { enum: ['removeCard', 'retainCard', 'setSticky', 'clearSticky'] } } }, then: { anyOf: [{ required: ['cardId'] }, { required: ['position'] }] } }, { if: { properties: { type: { const: 'transformCard' } } }, then: { required: ['cardId', 'transformTo'] } }, { if: { properties: { type: { const: 'setWorldMode' } } }, then: { required: ['value'], properties: { value: { enum: ['normal', 'independent', 'mirrored'] } } } }],
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
    properties: { ...namedEntry.properties, family: { enum: ['armor', 'tool'] }, fields: { type: 'array', items: { type: 'string' } }, base: { type: 'object', additionalProperties: { type: ['number', 'string'] } }, combinationRules: { type: 'array', items: rule } },
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
      capabilities: { type: 'object', additionalProperties: false, properties: { sticky: { type: 'boolean' }, isWorldCard: { type: 'boolean' }, worldMode: { enum: ['normal', 'independent', 'mirrored'] }, removeAfterActivation: { type: 'boolean' }, retainLeavingCardId: id, transformTo: id } },
    },
  }),
  traits: catalogSchema({
    ...namedEntry,
    required: ['id', 'name', 'validFamilies', 'validEquipmentIds'],
    additionalProperties: false,
    properties: { ...namedEntry.properties, validFamilies: { type: 'array', items: { enum: ['armor', 'tool'] } }, validEquipmentIds: { type: 'array', items: id } },
  }),
}