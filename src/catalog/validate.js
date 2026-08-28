import Ajv from 'ajv'
import { catalogSchemas } from './schemas.js'

export const DEITY_ROLES = [
  'oak', 'dark_oak', 'birch', 'spruce',
  'acacia', 'jungle', 'cherry', 'mangrove',
]

const DEFERRED_DEITY_ROLES = ['birch', 'spruce', 'acacia', 'jungle', 'cherry', 'mangrove']

const catalogNames = Object.keys(catalogSchemas)

export class CatalogValidationError extends Error {
  constructor(errors) {
    super(errors.map(({ message }) => message).join('\n'))
    this.name = 'CatalogValidationError'
    this.errors = errors
  }
}

function makeError(catalog, entryId, field, value, message, expectedRule = message) {
  return { catalog, file: `${catalog}.json`, entryId, field, value, expectedRule, message }
}

function schemaErrors(catalogName, catalog, validate) {
  if (validate(catalog)) return []

  return validate.errors.map((error) => {
    const segments = error.instancePath.split('/').filter(Boolean)
    const entryIndex = segments[0] === 'entries' ? Number(segments[1]) : null
    const entry = Number.isInteger(entryIndex) ? catalog.entries[entryIndex] : null
    const field = segments.slice(entry ? 2 : 0).join('.') || error.params.missingProperty || 'root'
    return makeError(catalogName, entry?.id ?? null, field, field.split('.').reduce((value, key) => value?.[key], entry ?? catalog), `${catalogName}${entry?.id ? `/${entry.id}` : ''} ${field} ${error.message}`, error.message)
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
    if (roles.filter((entry) => entry === role).length > 1) errors.push(makeError('deities', null, 'role', role, `Duplicate deity role: ${role}`))
  }
  for (const role of roles) {
    if (!DEITY_ROLES.includes(role)) errors.push(makeError('deities', null, 'role', role, `Unknown deity role: ${role}`))
  }
}

function hasValue(record, field) {
  return Object.prototype.hasOwnProperty.call(record ?? {}, field) && record[field] !== undefined
}

function validateMaterialBaseValues(material, equipment, errors) {
  if (equipment.family === 'tool') {
    for (const field of ['maxDurability', 'miningSpeed', 'harvestLevel', 'enchantability']) {
      if (!hasValue(material.tool, field)) errors.push(makeError('materials', material.id, `tool.${field}`, equipment.id, `Missing tool base value: ${field}`))
    }
    if (!hasValue(material.tool?.combat, equipment.id)) {
      for (const field of ['attackBonus']) {
        if (!hasValue(material.tool, field)) errors.push(makeError('materials', material.id, `tool.${field}`, equipment.id, `Missing tool base value: ${field}`))
      }
      for (const field of ['attackDamage', 'attackSpeed']) {
        if (!hasValue(equipment.base, field)) errors.push(makeError('equipment', equipment.id, `base.${field}`, material.id, `Missing tool base value: ${field}`))
      }
    }
    return
  }

  const slot = equipment.base.slot ?? equipment.id.split(':')[1]
  for (const field of ['protection', 'durability']) {
    if (!hasValue(material.armor?.[field], slot)) errors.push(makeError('materials', material.id, `armor.${field}.${slot}`, equipment.id, `Missing armor base value: ${field}.${slot}`))
  }
  if (!hasValue(material.armor, 'enchantability')) errors.push(makeError('materials', material.id, 'armor.enchantability', equipment.id, 'Missing armor base value: enchantability'))
}

function conditionCanMatch(condition, target) {
  if (!condition) return true
  if (condition.all) {
    const results = condition.all.map((entry) => conditionCanMatch(entry, target))
    return results.includes(false) ? false : results.every((result) => result === true) ? true : null
  }
  if (condition.any) {
    const results = condition.any.map((entry) => conditionCanMatch(entry, target))
    return results.includes(true) ? true : results.every((result) => result === false) ? false : null
  }
  if (condition.not) {
    const result = conditionCanMatch(condition.not, target)
    return result === null ? null : !result
  }
  if (condition.type === 'equipmentFamily') return target.equipment.family === condition.value
  if (condition.type === 'equipmentId') return target.equipment.id === condition.value
  if (condition.type === 'materialId') return target.material.id === condition.value
  return null
}

function validateCardTransformationCycles(cards, errors) {
  const transformations = new Map(cards.map((card) => [card.id, card.capabilities.transformTo]).filter(([, target]) => target))
  const states = new Map()

  const visit = (cardId) => {
    if (states.get(cardId) === 'visiting') {
      errors.push(makeError('cards', cardId, 'capabilities.transformTo', transformations.get(cardId), `Direct card transformation cycle includes ${cardId}`))
      return
    }
    if (states.get(cardId) === 'complete') return
    states.set(cardId, 'visiting')
    const target = transformations.get(cardId)
    if (transformations.has(target)) visit(target)
    states.set(cardId, 'complete')
  }

  for (const cardId of transformations.keys()) visit(cardId)
}

function validateReferences(rawCatalogs, ids, errors) {
  for (const ingredient of rawCatalogs.ingredients.entries) {
    if (ids.get(ingredient.categoryId)?.catalogName !== 'categories') errors.push(makeError('ingredients', ingredient.id, 'categoryId', ingredient.categoryId, `Unknown category ID: ${ingredient.categoryId}`))
  }
  for (const material of rawCatalogs.materials.entries) {
    for (const equipmentId of material.compatibility) {
      const target = ids.get(equipmentId)
      if (target?.catalogName !== 'equipment') errors.push(makeError('materials', material.id, 'compatibility', equipmentId, `Unknown equipment ID: ${equipmentId}`))
      else {
        if (!material.itemIds[equipmentId]) errors.push(makeError('materials', material.id, 'itemIds', equipmentId, `Missing item ID for compatible equipment: ${equipmentId}`))
        if (!material.families.includes(target.entry.family)) errors.push(makeError('materials', material.id, 'families', target.entry.family, `Equipment family is not supported: ${target.entry.family}`))
        if (!material[target.entry.family]) errors.push(makeError('materials', material.id, target.entry.family, equipmentId, `Base values are not defined for ${equipmentId}`))
        else validateMaterialBaseValues(material, target.entry, errors)
      }
    }
  }
  for (const trait of rawCatalogs.traits.entries) {
    for (const equipmentId of trait.validEquipmentIds) {
      const target = ids.get(equipmentId)
      if (target?.catalogName !== 'equipment') errors.push(makeError('traits', trait.id, 'validEquipmentIds', equipmentId, `Unknown equipment ID: ${equipmentId}`))
    }
  }
  const validAttributes = new Set(rawCatalogs.equipment.entries.flatMap((equipment) => equipment.fields))
  const equipmentById = new Map(rawCatalogs.equipment.entries.map((equipment) => [equipment.id, equipment]))
  const reachableTargets = rawCatalogs.materials.entries.flatMap((material) => material.compatibility
    .map((equipmentId) => ({ material, equipment: equipmentById.get(equipmentId) }))
    .filter(({ equipment }) => equipment))
  const validateCondition = (condition, catalogName, entryId, field) => {
    if (!condition) return
    for (const entry of [...(condition.all ?? []), ...(condition.any ?? []), ...(condition.not ? [condition.not] : [])]) validateCondition(entry, catalogName, entryId, field)
    if (condition.cardId && ids.get(condition.cardId)?.catalogName !== 'cards') errors.push(makeError(catalogName, entryId, field, condition.cardId, `Unknown card ID: ${condition.cardId}`))
    if (condition.traitId && ids.get(condition.traitId)?.catalogName !== 'traits') errors.push(makeError(catalogName, entryId, field, condition.traitId, `Unknown trait ID: ${condition.traitId}`))
    if (condition.type === 'equipmentId' && ids.get(condition.value)?.catalogName !== 'equipment') errors.push(makeError(catalogName, entryId, field, condition.value, `Unknown equipment ID: ${condition.value}`))
    if (condition.type === 'materialId' && ids.get(condition.value)?.catalogName !== 'materials') errors.push(makeError(catalogName, entryId, field, condition.value, `Unknown material ID: ${condition.value}`))
    if (condition.type === 'compare' && condition.target !== 'energy' && condition.target !== 'totalDeityLevels' && !DEITY_ROLES.includes(condition.target) && !validAttributes.has(condition.target)) errors.push(makeError(catalogName, entryId, field, condition.target, `Unknown comparison target: ${condition.target}`))
  }
  const validateRules = (rules, catalogName, entryId, field, { allowedAttributes = validAttributes, targets = reachableTargets, rejectDeferredDeities = false } = {}) => {
    for (const rule of rules ?? []) {
      validateCondition(rule.condition, catalogName, entryId, field)
      const effects = rule.effects ?? [rule]
      const possibleTargets = targets.filter((target) => conditionCanMatch(rule.condition, target) !== false)
      for (const effect of effects) {
        if (['addAttribute', 'subtractAttribute', 'setAttribute', 'multiplyAttribute'].includes(effect.type) && !allowedAttributes.has(effect.attribute)) {
          errors.push(makeError(catalogName, entryId, field, effect.attribute, `Unknown equipment attribute: ${effect.attribute}`))
        } else if (['addAttribute', 'subtractAttribute', 'setAttribute', 'multiplyAttribute'].includes(effect.type) && possibleTargets.some(({ equipment }) => !equipment.fields.includes(effect.attribute))) {
          errors.push(makeError(catalogName, entryId, field, effect.attribute, `Attribute does not apply to reachable equipment: ${effect.attribute}`))
        }
        if (rejectDeferredDeities && (effect.type === 'queueDeity' || (effect.type === 'attemptDeity' && DEFERRED_DEITY_ROLES.includes(effect.role)))) {
          errors.push(makeError(catalogName, entryId, field, effect.role, 'Deferred deity effect cannot run after deity resolution'))
        }
        for (const cardId of [effect.cardId, effect.transformTo]) {
          if (cardId && ids.get(cardId)?.catalogName !== 'cards') errors.push(makeError(catalogName, entryId, field, cardId, `Unknown card ID: ${cardId}`))
        }
        if (effect.traitId && ids.get(effect.traitId)?.catalogName !== 'traits') errors.push(makeError(catalogName, entryId, field, effect.traitId, `Unknown trait ID: ${effect.traitId}`))
        if (effect.type === 'grantTrait' && ids.get(effect.traitId)?.catalogName === 'traits') {
          const trait = ids.get(effect.traitId).entry
          const hasInvalidTarget = possibleTargets.some(({ equipment }) => !trait.validFamilies.includes(equipment.family)
            || (trait.validEquipmentIds.length > 0 && !trait.validEquipmentIds.includes(equipment.id)))
          if (hasInvalidTarget) errors.push(makeError(catalogName, entryId, field, effect.traitId, `Trait does not apply to reachable equipment: ${effect.traitId}`))
        }
      }
    }
  }
  for (const ingredient of rawCatalogs.ingredients.entries) validateRules(ingredient.rules, 'ingredients', ingredient.id, 'rules')
  for (const material of rawCatalogs.materials.entries) {
    const targets = reachableTargets.filter((target) => target.material.id === material.id)
    validateRules(material.hooks?.beforeIngredient, 'materials', material.id, 'hooks.beforeIngredient', { targets })
    validateRules(material.hooks?.afterIngredient, 'materials', material.id, 'hooks.afterIngredient', { targets, rejectDeferredDeities: true })
  }
  for (const equipment of rawCatalogs.equipment.entries) validateRules(equipment.combinationRules, 'equipment', equipment.id, 'combinationRules', { allowedAttributes: new Set(equipment.fields), targets: reachableTargets.filter((target) => target.equipment.id === equipment.id) })
  for (const card of rawCatalogs.cards.entries) {
    for (const [position, rules] of Object.entries(card.rulesByPosition)) validateRules(rules, 'cards', card.id, `rulesByPosition.${position}`)
    const transformTo = card.capabilities.transformTo
    if (transformTo && ids.get(transformTo)?.catalogName !== 'cards') errors.push(makeError('cards', card.id, 'capabilities.transformTo', transformTo, `Unknown card ID: ${transformTo}`))
    const retainedCardId = card.capabilities.retainLeavingCardId
    if (retainedCardId && ids.get(retainedCardId)?.catalogName !== 'cards') errors.push(makeError('cards', card.id, 'capabilities.retainLeavingCardId', retainedCardId, `Unknown card ID: ${retainedCardId}`))
  }
  validateCardTransformationCycles(rawCatalogs.cards.entries, errors)
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