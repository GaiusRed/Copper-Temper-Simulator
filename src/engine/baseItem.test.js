import { describe, expect, it } from 'vitest'
import { catalogMaps } from '../catalog'
import { composeBaseItem } from './baseItem'

describe('composeBaseItem', () => {
  it('composes an iron sword', () => {
    expect(composeBaseItem({ catalogMaps, materialId: 'minecraft:iron', equipmentId: 'coppertemper:sword' })).toMatchObject({
      itemId: 'minecraft:iron_sword',
      family: 'tool',
      attributes: { attackDamage: 6, attackSpeed: 1.6, miningSpeed: 6, harvestLevel: 2, maxDurability: 250, enchantability: 14 },
    })
  })

  it('rejects an incompatible pair', () => {
    expect(() => composeBaseItem({ catalogMaps, materialId: 'minecraft:leather', equipmentId: 'coppertemper:sword' })).toThrow('minecraft:leather is not compatible with coppertemper:sword')
  })

  it.each([
    ['minecraft:wood', 'coppertemper:sword', 'minecraft:wooden_sword', 4, 1.6, 2, 0, 59, 15],
    ['minecraft:stone', 'coppertemper:pickaxe', 'minecraft:stone_pickaxe', 3, 1.2, 4, 1, 131, 5],
    ['minecraft:iron', 'coppertemper:axe', 'minecraft:iron_axe', 9, 0.9, 6, 2, 250, 14],
    ['minecraft:diamond', 'coppertemper:shovel', 'minecraft:diamond_shovel', 5.5, 1, 8, 3, 1561, 10],
    ['minecraft:netherite', 'coppertemper:hoe', 'minecraft:netherite_hoe', 1, 4, 9, 4, 2031, 15],
    ['minecraft:gold', 'coppertemper:sword', 'minecraft:golden_sword', 4, 1.6, 12, 0, 32, 22],
  ])('composes %s and %s', (materialId, equipmentId, itemId, attackDamage, attackSpeed, miningSpeed, harvestLevel, maxDurability, enchantability) => {
    expect(composeBaseItem({ catalogMaps, materialId, equipmentId })).toMatchObject({
      itemId,
      attributes: { attackDamage, attackSpeed, miningSpeed, harvestLevel, maxDurability, enchantability },
    })
  })

  it('composes a netherite chestplate', () => {
    expect(composeBaseItem({ catalogMaps, materialId: 'minecraft:netherite', equipmentId: 'coppertemper:chestplate' })).toMatchObject({
      itemId: 'minecraft:netherite_chestplate',
      family: 'armor',
      attributes: { armorPoints: 8, armorToughness: 3, knockbackResistance: 0.1, maxDurability: 592, enchantability: 15 },
    })
  })

  it.each([
    ['minecraft:leather', 'coppertemper:helmet', 'minecraft:leather_helmet', 1, 0, 0, 55, 15],
    ['minecraft:iron', 'coppertemper:leggings', 'minecraft:iron_leggings', 5, 0, 0, 225, 9],
  ])('composes armor slot %s and %s', (materialId, equipmentId, itemId, armorPoints, armorToughness, knockbackResistance, maxDurability, enchantability) => {
    expect(composeBaseItem({ catalogMaps, materialId, equipmentId })).toMatchObject({
      itemId,
      attributes: { armorPoints, armorToughness, knockbackResistance, maxDurability, enchantability },
    })
  })

  it.each([
    ['sword', 'wood', 4, 1.6], ['sword', 'stone', 5, 1.6], ['sword', 'iron', 6, 1.6], ['sword', 'gold', 4, 1.6], ['sword', 'diamond', 7, 1.6], ['sword', 'netherite', 8, 1.6],
    ['axe', 'wood', 7, 0.8], ['axe', 'stone', 9, 0.8], ['axe', 'iron', 9, 0.9], ['axe', 'gold', 7, 1], ['axe', 'diamond', 9, 1], ['axe', 'netherite', 10, 1],
    ['pickaxe', 'wood', 2, 1.2], ['pickaxe', 'stone', 3, 1.2], ['pickaxe', 'iron', 4, 1.2], ['pickaxe', 'gold', 2, 1.2], ['pickaxe', 'diamond', 5, 1.2], ['pickaxe', 'netherite', 6, 1.2],
    ['shovel', 'wood', 2.5, 1], ['shovel', 'stone', 3.5, 1], ['shovel', 'iron', 4.5, 1], ['shovel', 'gold', 2.5, 1], ['shovel', 'diamond', 5.5, 1], ['shovel', 'netherite', 6.5, 1],
    ['hoe', 'wood', 1, 1], ['hoe', 'stone', 1, 2], ['hoe', 'iron', 1, 3], ['hoe', 'gold', 1, 1], ['hoe', 'diamond', 1, 4], ['hoe', 'netherite', 1, 4],
  ])('uses vanilla %s values for %s', (tool, material, attackDamage, attackSpeed) => {
    const item = composeBaseItem({
      catalogMaps,
      materialId: `minecraft:${material}`,
      equipmentId: `coppertemper:${tool}`,
    })
    expect(item.attributes).toMatchObject({ attackDamage, attackSpeed })
  })

  it.each([
    ['leather', [1, 3, 2, 1], [55, 80, 75, 65], 0, 0, 15],
    ['chainmail', [2, 5, 4, 1], [165, 240, 225, 195], 0, 0, 12],
    ['iron', [2, 6, 5, 2], [165, 240, 225, 195], 0, 0, 9],
    ['gold', [2, 5, 3, 1], [77, 112, 105, 91], 0, 0, 25],
    ['diamond', [3, 8, 6, 3], [363, 528, 495, 429], 2, 0, 10],
    ['netherite', [3, 8, 6, 3], [407, 592, 555, 481], 3, 0.1, 15],
  ])('uses vanilla armor values for %s', (material, protection, durability, armorToughness, knockbackResistance, enchantability) => {
    for (const [index, slot] of ['helmet', 'chestplate', 'leggings', 'boots'].entries()) {
      const item = composeBaseItem({
        catalogMaps,
        materialId: `minecraft:${material}`,
        equipmentId: `coppertemper:${slot}`,
      })
      expect(item.attributes).toMatchObject({
        armorPoints: protection[index],
        maxDurability: durability[index],
        armorToughness,
        knockbackResistance,
        enchantability,
      })
    }
  })
})