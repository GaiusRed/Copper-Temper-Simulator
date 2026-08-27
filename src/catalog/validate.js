import Ajv from 'ajv'
import { catalogSchemas } from './schemas.js'

export const DEITY_ROLES = [
  'oak', 'dark_oak', 'birch', 'spruce',
  'acacia', 'jungle', 'cherry', 'mangrove',
]

const catalogNames = Object.keys(catalogSchemas)

export class CatalogValidationError extends Error {
  constructor(errors) {
    super(errors.map(({ message }) => message).join('\n'))
    this.name = 'CatalogValidationError'
    this.errors = errors
  }
}

function makeError(catalog, entryId, field, value, message) {
  return { catalog, entryId, field, value, message }
}

function schemaErrors(catalogName, catalog, validate) {
  if (validate(catalog)) return []

  return validate.errors.map((error) => {
    const segments = error.instancePath.split('/').filter(Boolean)
    const entryIndex = segments[0] === 'entries' ? Number(segments[1]) : null
    const entry = Number.isInteger(entryIndex) ? catalog.entries[entryIndex] : null
    const field = segments.slice(entry ? 2 : 0).join('.') || error.params.missingProperty || 'root'
    return makeError(catalogName, entry?.id ?? null, field, field.split('.').reduce((value, key) => value?.[key], entry ?? catalog), `${catalogName}${entry?.id ? `/${entry.id}` : ''} ${field} ${error.message}`)
  })
}

function indexEntries(rawCatalogs, errors) {
  const ids = new Map()
  for (const catalogName of catalogNames) {
    for (const entry of rawCatalogs[catalogName]?.entries ?? []) {
      if (ids.has(entry.id)) {
        errors.push(makeError(catalogName, entry.id, 'id', entry.id, `Duplicate entry ID: ${entry.id}`))
      }
      ids.set(entry.id, { catalogName, entry })
    }
  }
  return ids
}

function validateDeities(rawCatalogs, errors) {
  const roles = rawCatalogs.deities.entries.map(({ role }) => role)
  for (const role of DEITY_ROLES) {
    if (!roles.includes(role)) errors.push(makeError('deities', null, 'role', role, `Missing deity role: ${role}`))
  }
  for (const role of roles) {
    if (!DEITY_ROLES.includes(role)) errors.push(makeError('deities', null, 'role', role, `Unknown deity role: ${role}`))
  }
}

function validateReferences(rawCatalogs, ids, errors) {
  for (const ingredient of rawCatalogs.ingredients.entries) {
    if (!ids.has(ingredient.categoryId)) errors.push(makeError('ingredients', ingredient.id, 'categoryId', ingredient.categoryId, `Unknown category ID: ${ingredient.categoryId}`))
  }
  for (const material of rawCatalogs.materials.entries) {
    for (const equipmentId of material.compatibility) {
      const target = ids.get(equipmentId)
      if (target?.catalogName !== 'equipment') errors.push(makeError('materials', material.id, 'compatibility', equipmentId, `Unknown equipment ID: ${equipmentId}`))
    }
  }
  for (const trait of rawCatalogs.traits.entries) {
    for (const equipmentId of trait.validEquipmentIds) {
      const target = ids.get(equipmentId)
      if (target?.catalogName !== 'equipment') errors.push(makeError('traits', trait.id, 'validEquipmentIds', equipmentId, `Unknown equipment ID: ${equipmentId}`))
    }
  }
  const validAttributes = new Set(rawCatalogs.equipment.entries.flatMap((equipment) => equipment.fields))
  const validateCondition = (condition, catalogName, entryId, field) => {
    if (!condition) return
    for (const entry of [...(condition.all ?? []), ...(condition.any ?? []), ...(condition.not ? [condition.not] : [])]) validateCondition(entry, catalogName, entryId, field)
    if (condition.cardId && ids.get(condition.cardId)?.catalogName !== 'cards') errors.push(makeError(catalogName, entryId, field, condition.cardId, `Unknown card ID: ${condition.cardId}`))
    if (condition.traitId && ids.get(condition.traitId)?.catalogName !== 'traits') errors.push(makeError(catalogName, entryId, field, condition.traitId, `Unknown trait ID: ${condition.traitId}`))
    if (condition.type === 'equipmentId' && ids.get(condition.value)?.catalogName !== 'equipment') errors.push(makeError(catalogName, entryId, field, condition.value, `Unknown equipment ID: ${condition.value}`))
    if (condition.type === 'materialId' && ids.get(condition.value)?.catalogName !== 'materials') errors.push(makeError(catalogName, entryId, field, condition.value, `Unknown material ID: ${condition.value}`))
    if (condition.type === 'compare' && condition.target !== 'energy' && condition.target !== 'totalDeityLevels' && !DEITY_ROLES.includes(condition.target) && !validAttributes.has(condition.target)) errors.push(makeError(catalogName, entryId, field, condition.target, `Unknown comparison target: ${condition.target}`))
  }
  const validateRules = (rules, catalogName, entryId, field) => {
    for (const rule of rules ?? []) {
      validateCondition(rule.condition, catalogName, entryId, field)
      const effects = rule.effects ?? [rule]
      for (const effect of effects) {
        if (['addAttribute', 'subtractAttribute', 'setAttribute', 'multiplyAttribute'].includes(effect.type) && !validAttributes.has(effect.attribute)) {
          errors.push(makeError(catalogName, entryId, field, effect.attribute, `Unknown equipment attribute: ${effect.attribute}`))
        }
        for (const cardId of [effect.cardId, effect.transformTo]) {
          if (cardId && ids.get(cardId)?.catalogName !== 'cards') errors.push(makeError(catalogName, entryId, field, cardId, `Unknown card ID: ${cardId}`))
        }
        if (effect.traitId && ids.get(effect.traitId)?.catalogName !== 'traits') errors.push(makeError(catalogName, entryId, field, effect.traitId, `Unknown trait ID: ${effect.traitId}`))
      }
    }
  }
  for (const ingredient of rawCatalogs.ingredients.entries) validateRules(ingredient.rules, 'ingredients', ingredient.id, 'rules')
  for (const material of rawCatalogs.materials.entries) {
    validateRules(material.hooks?.beforeIngredient, 'materials', material.id, 'hooks.beforeIngredient')
    validateRules(material.hooks?.afterIngredient, 'materials', material.id, 'hooks.afterIngredient')
  }
  for (const equipment of rawCatalogs.equipment.entries) validateRules(equipment.combinationRules, 'equipment', equipment.id, 'combinationRules')
  for (const card of rawCatalogs.cards.entries) {
    for (const [position, rules] of Object.entries(card.rulesByPosition)) validateRules(rules, 'cards', card.id, `rulesByPosition.${position}`)
    const transformTo = card.capabilities.transformTo
    if (transformTo && ids.get(transformTo)?.catalogName !== 'cards') errors.push(makeError('cards', card.id, 'capabilities.transformTo', transformTo, `Unknown card ID: ${transformTo}`))
    if (transformTo && rawCatalogs.cards.entries.find((entry) => entry.id === transformTo)?.capabilities.transformTo === card.id) {
      errors.push(makeError('cards', card.id, 'capabilities.transformTo', transformTo, `Direct card transformation cycle: ${card.id} -> ${transformTo}`))
    }
    const retainedCardId = card.capabilities.retainLeavingCardId
    if (retainedCardId && ids.get(retainedCardId)?.catalogName !== 'cards') errors.push(makeError('cards', card.id, 'capabilities.retainLeavingCardId', retainedCardId, `Unknown card ID: ${retainedCardId}`))
  }
}

export function validateCatalogSet(rawCatalogs) {
  const errors = []
  const ajv = new Ajv({ allErrors: true, strict: false })

  for (const catalogName of catalogNames) {
    const catalog = rawCatalogs[catalogName]
    if (!catalog) {
      errors.push(makeError(catalogName, null, 'root', catalog, `Missing catalog: ${catalogName}`))
      continue
    }
    errors.push(...schemaErrors(catalogName, catalog, ajv.compile(catalogSchemas[catalogName])))
  }

  if (errors.length > 0) throw new CatalogValidationError(errors)

  const ids = indexEntries(rawCatalogs, errors)
  validateDeities(rawCatalogs, errors)
  validateReferences(rawCatalogs, ids, errors)

  if (errors.length > 0) throw new CatalogValidationError(errors)
  return { valid: true }
}