function getEntry(catalogMaps, catalogName, id) {
  const entry = catalogMaps[catalogName]?.get(id)
  if (!entry) throw new Error(`Unknown ${catalogName.slice(0, -1)} ID: ${id}`)
  return entry
}

export function composeBaseItem({ catalogMaps, materialId, equipmentId }) {
  const material = getEntry(catalogMaps, 'materials', materialId)
  const equipment = getEntry(catalogMaps, 'equipment', equipmentId)

  if (!material.compatibility.includes(equipmentId)) {
    throw new Error(`${materialId} is not compatible with ${equipmentId}`)
  }

  if (equipment.family === 'tool' && material.tool) {
    const [attackDamage, attackSpeed] = material.tool.combat?.[equipmentId]
      ?? [equipment.base.attackDamage + material.tool.attackBonus, equipment.base.attackSpeed]
    const values = {
      attackDamage,
      attackSpeed,
      miningSpeed: material.tool.miningSpeed,
      harvestLevel: material.tool.harvestLevel,
      maxDurability: material.tool.maxDurability,
      enchantability: material.tool.enchantability,
    }
    return createItem(material, equipment, materialId, equipmentId, values)
  }

  if (equipment.family === 'armor' && material.armor) {
    const slot = equipment.base.slot ?? equipment.id.split(':')[1]
    const values = {
      armorPoints: material.armor.protection[slot],
      armorToughness: material.armor.toughness ?? 0,
      knockbackResistance: material.armor.knockbackResistance ?? 0,
      maxDurability: material.armor.durability[slot],
      enchantability: material.armor.enchantability,
    }
    return createItem(material, equipment, materialId, equipmentId, values)
  }

  {
    throw new Error(`Base values are not defined for ${materialId} and ${equipmentId}`)
  }
}

function createItem(material, equipment, materialId, equipmentId, values) {
  const attributes = Object.freeze(Object.fromEntries(equipment.fields.map((field) => [field, values[field]])))

  return Object.freeze({
    itemId: material.itemIds[equipmentId],
    family: equipment.family,
    materialId,
    equipmentId,
    fields: Object.freeze([...equipment.fields]),
    attributes,
  })
}