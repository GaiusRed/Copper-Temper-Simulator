const roles = [
  'oak', 'dark_oak', 'birch', 'spruce',
  'acacia', 'jungle', 'cherry', 'mangrove',
]

const resistances = Object.fromEntries(roles.map((role) => [role, 8]))

function mapsFor(catalogs) {
  return Object.fromEntries(Object.entries(catalogs).map(([name, catalog]) => [name, new Map(catalog.entries.map((entry) => [entry.id, entry]))]))
}

function catalog(entries) {
  return { schemaVersion: 1, minecraftVersion: '1.21.11', entries }
}

export function createCatalogFixtures() {
  return {
    categories: catalog([{ id: 'coppertemper:fuel', name: 'Fuel', order: 1 }]),
    deities: catalog(roles.map((role) => ({
      id: `coppertemper:${role}`,
      role,
      name: role.replaceAll('_', ' '),
      shortName: ['OA', 'DO', 'BI', 'SP', 'AC', 'JU', 'CH', 'MA'][roles.indexOf(role)],
    }))),
    materials: catalog([{
      id: 'minecraft:iron',
      name: 'Iron',
      families: ['tool'],
      deityResistances: { ...resistances },
      compatibility: ['coppertemper:sword'],
      itemIds: { 'coppertemper:sword': 'minecraft:iron_sword' },
      tool: { maxDurability: 250, miningSpeed: 6, harvestLevel: 2, attackBonus: 2, enchantability: 14 },
      hooks: { beforeIngredient: [], afterIngredient: [] },
    }]),
    equipment: catalog([{
      id: 'coppertemper:sword',
      name: 'Sword',
      family: 'tool',
      fields: ['attackDamage', 'attackSpeed', 'miningSpeed', 'harvestLevel', 'maxDurability', 'enchantability'],
      base: { attackDamage: 4, attackSpeed: 1.6 },
    }]),
    ingredients: catalog([{
      id: 'minecraft:coal',
      name: 'Coal',
      minecraftItemId: 'minecraft:coal',
      categoryId: 'coppertemper:fuel',
      energy: 24,
      rules: [],
    }]),
    cards: catalog([{
      id: 'coppertemper:test_card',
      name: 'Test Card',
      rulesByPosition: { hidden: [], first: [], second: [], third: [], leaving: [] },
      capabilities: {},
    }]),
    traits: catalog([{
      id: 'coppertemper:test_trait',
      name: 'Test Trait',
      validFamilies: ['tool'],
      validEquipmentIds: ['coppertemper:sword'],
    }]),
  }
}

export function createCompiledFixtures() {
  const catalogs = createCatalogFixtures()
  return {
    catalogs,
    catalogMaps: mapsFor(catalogs),
    recipe: Object.freeze({ schemaVersion: 1, materialId: 'minecraft:iron', equipmentId: 'coppertemper:sword', ingredientIds: Object.freeze(['minecraft:coal']) }),
  }
}