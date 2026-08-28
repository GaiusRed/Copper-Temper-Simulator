# ManaForge simulator mechanics

This document describes the behavior of the current simulator code. It does not describe undocumented game behavior outside this implementation.

## 1. Recipe model

A recipe is an ordered list:

1. Equipment type
2. Material
3. First tempering item
4. Second tempering item
5. More tempering items, in order

The simulator constructs the initial equipment from the first two values. It then applies each positive item value in sequence.

Each item receives a fresh energy value. Unused energy does not continue to the next item.

The following values persist between item steps:

- Element levels
- Current character stats
- Cards in `hidden`, `first`, `second`, and `third`
- Special effect
- Status immunities
- Plunge attacks

The following values reset before each item:

- Item stat limits and stat minimums
- Material weapon or armor modifiers
- Material element resistances
- `prehidden` and `leaving` card slots
- The pixie `sticky` flag

## 2. Initial state

The equipment and material create the state before the first tempering item.

| State | Initial value |
|---|---|
| Item energy | `0` |
| Wisp, Shade, Dryad, Aura, Salamander, Gnome, Jinn, Undine | `0` |
| Aerolite exception | Salamander starts at `4` |
| Dryad, Aura, Salamander, Gnome, Jinn, Undine taint | `0` |
| Power, Skill, Defense, Magic, HP, Spirit, Charm, Luck | `0` |
| Lower stat limits | `-1` |
| Upper stat limits | `1` |
| Stat minimums | `-10` |
| Hidden and visible cards | Empty |
| Special effect | No Effect |
| Immunities | None |
| Normal plunge attacks | Thrust, Uppercut, Jump |
| Bow plunge attacks | Double Shot, Shot, Jump |
| Material modifiers and resistances | Values from the selected material |

Aerolite materials are Jacobini Rock through Swifte Rock. Wood materials are Oak Wood through Fossil Wood.

### 2.1 Equipment data

The four coefficients multiply the four material modifiers. Weapons use Sharp, Heavy, Force, and Tech.

Armor uses Strike, Slash, Thrust, and Magic. The marker value controls when an element marker appears.

| Equipment | Coefficients | Marker | Price factor |
|---|---:|---:|---:|
| Knife | `[44,16,12,48]` | 1 | 45 |
| Sword | `[32,32,32,32]` | 1 | 50 |
| Axe | `[28,36,48,16]` | 2 | 50 |
| 2H Sword | `[40,40,40,40]` | 2 | 75 |
| 2H Axe | `[40,40,64,16]` | 3 | 75 |
| Hammer | `[8,72,64,16]` | 3 | 75 |
| Spear | `[52,20,24,48]` | 2 | 60 |
| Staff | `[4,44,16,32]` | 1 | 30 |
| Glove | `[0,32,24,56]` | 2 | 40 |
| Flail | `[0,40,28,44]` | 3 | 40 |
| Bow | `[40,4,20,40]` | 1 | 35 |
| Shield | `[8,8,8,4]` | 1 | 10 |
| Helm | `[8,7,6,2]` | 2 | 25 |
| Hat | `[4,2,2,4]` | 2 | 15 |
| Hauberk | `[12,16,16,2]` | 2 | 60 |
| Robe | `[6,6,6,8]` | 2 | 30 |
| Gauntlet | `[7,6,8,2]` | 2 | 25 |
| Ring | `[1,1,1,16]` | 1 | 5 |
| Boots | `[6,8,7,2]` | 2 | 25 |
| Shoes | `[2,4,2,4]` | 2 | 10 |
| Armor | `[26,26,26,4]` | 3 | 75 |
| Mantle | `[4,4,4,12]` | 2 | 20 |
| Pendant | `[0,0,0,24]` | 1 | 5 |

For a weapon, the simulator calculates attack as follows:

```text
floor(
  sum(material_modifier[i] * equipment_coefficient[i])
  * (material_energy_coefficient + total_element_levels)
  / (material_energy_coefficient * 128)
)
```

For armor, each defense is independent:

```text
strike defense = trunc(strike * coefficient[0] / 64)
slash defense  = trunc(slash  * coefficient[1] / 64)
thrust defense = trunc(thrust * coefficient[2] / 64)
magic defense  = trunc(magic  * coefficient[3] / 64)
```

The base price is `trunc(equipment price factor * material price / 150)`. The simulator then adds all occupied card-slot prices.

Weapon markers use the matching element level. Armor markers use these paired or previous element levels:

| Armor marker | Level used |
|---|---|
| Wisp | Shade |
| Shade | Wisp |
| Dryad | Aura |
| Aura | Dryad |
| Salamander | Undine |
| Gnome | Salamander |
| Jinn | Gnome |
| Undine | Jinn |

### 2.2 Material data

Each row uses this compact format:

- `E`: material energy coefficient for the attack formula.
- `W`: `[Sharp, Heavy, Force, Tech]`.
- `A`: `[Strike, Slash, Thrust, Magic]`.
- `R`: resistance for `[Wi, Sh, Dr, Au, Sa, Gn, Ji, Un]`.
- `P`: material price.

| Material | E | W | A | R | P |
|---|---:|---|---|---|---:|
| Menos Bronze | 18 | `[10,10,10,10]` | `[10,10,10,10]` | `[8,8,8,8,8,8,8,8]` | 150 |
| Valsena Iron | 20 | `[15,15,15,15]` | `[15,15,15,15]` | `[9,9,9,9,9,9,9,9]` | 300 |
| Granz Steel | 24 | `[20,20,20,20]` | `[20,20,20,20]` | `[9,9,9,9,9,9,9,9]` | 600 |
| Laurent Silver | 12 | `[25,25,25,25]` | `[25,25,25,25]` | `[8,6,7,7,7,7,7,7]` | 750 |
| Wendel Silver | 16 | `[30,30,30,30]` | `[30,30,30,30]` | `[9,7,8,8,8,8,8,8]` | 900 |
| Beiser Gold | 16 | `[35,35,35,35]` | `[35,35,35,35]` | `[7,9,9,9,9,9,9,9]` | 1200 |
| Ishe Platinum | 16 | `[40,40,40,40]` | `[40,40,40,40]` | `[7,7,8,8,8,8,8,8]` | 1500 |
| Lorimar Iron | 16 | `[45,45,45,45]` | `[45,45,45,45]` | `[7,9,9,9,9,9,9,9]` | 1800 |
| Altena Alloy | 18 | `[50,50,50,50]` | `[50,50,50,50]` | `[10,10,10,10,10,10,10,10]` | 2250 |
| Maia Lead | 48 | `[36,3,68,18]` | `[3,18,36,36]` | `[32,32,32,32,32,32,32,32]` | 1350 |
| Orichalcum | 12 | `[28,28,28,28]` | `[28,28,28,28]` | `[8,8,7,10,7,9,6,8]` | 1050 |
| Oak Wood | 16 | `[10,6,14,4]` | `[16,5,7,9]` | `[7,8,6,9,10,7,7,7]` | 150 |
| Holly Wood | 14 | `[15,9,21,6]` | `[24,7,10,13]` | `[7,8,6,9,10,7,7,7]` | 360 |
| Baobab Wood | 24 | `[20,12,28,8]` | `[32,10,14,18]` | `[7,8,6,9,10,7,7,7]` | 660 |
| Ebony Wood | 24 | `[25,15,35,10]` | `[40,12,17,22]` | `[7,8,6,9,10,7,7,7]` | 900 |
| Maple Wood | 12 | `[35,21,49,14]` | `[56,17,24,31]` | `[7,8,6,9,10,7,7,7]` | 1200 |
| Dior Wood | 10 | `[50,30,70,20]` | `[80,25,35,45]` | `[7,8,5,9,10,7,7,7]` | 1560 |
| Ash Wood | 11 | `[30,18,42,12]` | `[48,15,21,27]` | `[7,8,6,9,10,7,7,7]` | 1050 |
| Fossil Wood | 22 | `[40,24,56,16]` | `[64,20,28,36]` | `[7,6,6,9,10,6,7,7]` | 1500 |
| Marble | 28 | `[12,2,21,16]` | `[7,9,12,15]` | `[7,8,9,7,7,6,10,7]` | 300 |
| Obsidian | 32 | `[24,4,43,33]` | `[14,18,24,30]` | `[8,6,9,7,7,6,10,8]` | 660 |
| Pedan Stone | 24 | `[36,7,64,50]` | `[21,27,36,45]` | `[7,8,9,7,7,7,11,7]` | 1350 |
| Gaia's Tears | 20 | `[48,9,86,67]` | `[28,36,48,60]` | `[8,8,9,7,10,6,10,6]` | 1950 |
| Animal Hide | 8 | `[10,1,1,1]` | `[20,8,12,10]` | `[8,8,7,9,9,7,7,7]` | 90 |
| Gator Skin | 12 | `[18,1,1,1]` | `[36,14,21,18]` | `[8,8,7,9,9,8,8,6]` | 180 |
| Centaur Hide | 20 | `[26,1,1,1]` | `[52,20,31,26]` | `[8,8,9,7,8,7,8,8]` | 360 |
| Dragon Skin | 20 | `[35,1,1,1]` | `[70,28,42,35]` | `[8,8,7,9,5,10,5,10]` | 540 |
| Fish Scales | 20 | `[8,8,7,7]` | `[9,9,8,4]` | `[8,8,8,8,8,8,8,6]` | 120 |
| Lizard Scales | 20 | `[16,17,14,14]` | `[19,19,16,8]` | `[7,9,8,8,7,8,8,9]` | 240 |
| Snake Scales | 20 | `[24,26,21,21]` | `[28,28,24,12]` | `[9,7,8,8,8,7,8,7]` | 360 |
| Dragon Scales | 14 | `[60,66,54,54]` | `[72,72,60,30]` | `[7,7,7,7,6,7,7,7]` | 3000 |
| Animal Bone | 20 | `[14,10,12,12]` | `[9,15,6,9]` | `[9,6,8,8,8,8,8,8]` | 60 |
| Ivory | 20 | `[28,21,24,24]` | `[18,30,12,18]` | `[7,6,7,7,8,6,7,7]` | 240 |
| Cursed Bone | 20 | `[43,32,36,36]` | `[27,45,18,27]` | `[9,5,9,7,9,7,9,7]` | 270 |
| Fossil | 20 | `[57,43,48,48]` | `[36,60,24,36]` | `[9,6,8,8,10,6,10,6]` | 540 |
| Topple Cotton | 10 | `[18,1,1,1]` | `[9,9,9,9]` | `[6,8,6,10,10,7,7,6]` | 30 |
| Sultan's Silk | 10 | `[28,1,1,1]` | `[14,14,14,14]` | `[6,8,6,10,10,7,7,6]` | 90 |
| Judd Hemp | 10 | `[38,1,1,1]` | `[19,19,19,19]` | `[10,6,6,10,10,7,7,6]` | 150 |
| Altena Felt | 10 | `[48,1,1,1]` | `[24,24,24,24]` | `[7,7,7,9,10,7,7,6]` | 300 |
| Jacobini Rock | 16 | `[15,11,22,24]` | `[15,13,18,24]` | `[7,8,10,7,7,8,9,8]` | 360 |
| Halley Rock | 16 | `[20,15,30,32]` | `[20,18,24,32]` | `[7,8,10,7,7,8,9,8]` | 600 |
| Ankh Rock | 16 | `[25,18,37,40]` | `[25,22,30,40]` | `[7,8,10,7,7,8,9,8]` | 660 |
| Vinek Rock | 16 | `[30,22,45,48]` | `[30,27,36,48]` | `[7,8,10,7,7,8,9,8]` | 1050 |
| Tuttle Rock | 16 | `[35,26,52,56]` | `[35,31,42,56]` | `[7,8,10,7,7,8,9,8]` | 1260 |
| Nemesis Rock | 16 | `[40,30,60,64]` | `[40,36,48,64]` | `[7,8,10,7,7,8,9,8]` | 1500 |
| Biella Rock | 16 | `[45,33,67,72]` | `[45,40,54,72]` | `[7,8,10,7,7,8,9,8]` | 1650 |
| Swifte Rock | 16 | `[50,37,75,80]` | `[50,45,60,80]` | `[7,8,10,7,7,8,9,8]` | 1800 |
| Adamantite | 20 | `[62,46,93,99]` | `[62,31,93,62]` | `[8,8,8,8,8,8,8,8]` | 3600 |
| Fullmetal | 20 | `[55,41,68,66]` | `[44,27,99,27]` | `[8,8,8,8,8,8,8,8]` | 3300 |
| Coral | 12 | `[18,21,14,12]` | `[23,9,32,9]` | `[9,6,7,7,9,7,9,5]` | 240 |
| TortoiseShell | 20 | `[26,31,20,18]` | `[33,13,46,13]` | `[8,8,9,7,9,8,9,7]` | 150 |
| Seashell | 14 | `[20,24,16,14]` | `[26,10,36,10]` | `[8,7,9,8,9,7,9,6]` | 90 |
| Emerald | 8 | `[2,2,2,2]` | `[1,1,1,50]` | `[8,8,8,8,8,8,8,8]` | 4500 |
| Pearl | 8 | `[2,2,2,2]` | `[1,1,1,50]` | `[8,8,8,8,8,8,8,8]` | 4500 |
| Lapis Lazuli | 8 | `[2,2,2,2]` | `[1,1,1,50]` | `[8,8,8,8,8,8,8,8]` | 4500 |

## 3. One item step

The simulator runs these stages for every tempering item:

1. Reset stat limits to `[-1,1]` and minimums to `-10`.
2. Empty `prehidden` and `leaving`, and set `sticky`.
3. Restore the selected material modifiers and resistances.
4. Select an active world card from existing cards.
5. Replace the current energy with the item's energy.
6. Apply the automatic material rule.
7. Apply the item's direct rule.
8. Move a pending card into the card queue.
9. Activate cards in leaving, third, second, first, hidden order.
10. Apply equipment-specific card combinations.
11. Spend remaining energy on queued element attempts.
12. Apply stat minimums and clamp current stats to their limits.

This order has three important consequences.

- A new world card cannot control the item that creates it.
- A new normal card starts hidden and usually waits until another pending card pushes it into a visible slot.
- Direct percentage changes apply before card percentage changes during the same item.

### 3.1 Automatic material rules

Wood queues one Dryad attempt before the item rule. If at least 8 energy remains, wood also creates a pending Dryad card.

An item can overwrite that pending Dryad card. The wood Dryad attempt still remains in the taint counter.

Aerolite starts with Salamander `4`. Before each item rule, aerolite decreases Salamander by one when the current energy is at least `4`.

The decrease refunds the cost of the removed Salamander level. This refund increases the energy available to the item rule.

## 4. Energy, elements, and taint

An increase from level `L` costs:

```text
element resistance * 2^L
```

The simulator increases an element only when the available energy covers the full cost. The maximum element level is `15`.

A decrease first removes one level. It then refunds `resistance * 2^new_level`.

Wisp and Shade decreases do not require minimum energy. Other decreases require at least `4` energy before the decrease.

The simulator resolves queued attempts in this order:

1. Dryad
2. Aura
3. Salamander
4. Gnome
5. Jinn
6. Undine

It removes every queued attempt, even when the attempt cannot buy a level.

All six taint counters return to zero at the end of a completed item step.

### 4.1 Normal world opposition

| Tainted element | Normal-world rule |
|---|---|
| Wisp | Try Wisp. If Wisp becomes greater than Shade, remove all Shade levels. |
| Shade | Try Shade only when Wisp is zero. If Wisp is greater, remove all Shade levels. |
| Dryad | Queue Dryad when Aura is zero or Wisp equals Shade. Otherwise, Wisp dominance can decrease Aura first. |
| Aura | Queue Aura when Dryad is zero or Wisp equals Shade. Otherwise, Shade dominance can decrease Dryad first. |
| Salamander | Only when Undine is zero. Decrease Gnome first, then queue Salamander. |
| Gnome | Only when Salamander is zero. Decrease Jinn first, then queue Gnome. |
| Jinn | Only when Gnome is zero. Decrease Undine first, then queue Jinn. |
| Undine | Only when Jinn is zero. Decrease Salamander first, then queue Undine. |

Wisp and Shade buy their levels during `taint`. The other six elements normally buy levels during stage 11.

### 4.2 World-card changes

`Ancient Moon` removes the normal opposition rules. It directly tries Wisp or Shade and queues each other tainted element.

`Mirrored World` reverses the opposition direction and changes the four-element cycle:

- Wisp opposes Shade when Shade is greater.
- Shade always tries to increase, then can remove Wisp.
- Dryad uses Shade dominance against Aura.
- Aura uses Wisp dominance against Dryad.
- Salamander requires Gnome zero and decreases Undine.
- Gnome requires Jinn zero and decreases Salamander.
- Jinn requires Undine zero and decreases Gnome.
- Undine requires Salamander zero and decreases Jinn.

Other world cards use the normal taint rules.

## 5. Stat mechanics

Stats use a fixed ladder. An increase or decrease moves one position on this ladder.

| Value | Increase | Decrease |
|---:|---:|---:|
| -10 | -5 | -10 |
| -5 | -3 | -10 |
| -3 | -1 | -5 |
| -1 | 0 | -3 |
| 0 | 1 | -1 |
| 1 | 2 | 0 |
| 2 | 3 | 1 |
| 3 | 4 | 2 |
| 4 | 5 | 3 |
| 5 | 7 | 4 |
| 7 | 9 | 5 |
| 9 | 10 | 7 |
| 10 | 12 | 9 |
| 12 | 15 | 10 |
| 15 | 20 | 12 |
| 20 | 20 | 15 |

An item or card can expand a lower or upper limit. Several effects combine by keeping the lowest lower limit and highest upper limit.

A minimum can pull a low stat upward before the final clamp. This pull only works from an allowed threshold.

| Minimum | Lowest value that can jump to it |
|---:|---:|
| 1 | 0 |
| 2 or 3 | -1 |
| 4 or 5 | -3 |
| 7, 9, or 10 | -5 |
| 12, 15, or 20 | -10 |

Because limits reset on every item, a stat can fall on a later step when no current card preserves its prior limit.

## 6. Material modifier functions

Items and cards use four percentage functions:

| Name in this guide | Simulator operation |
|---|---|
| `150%` | `min(trunc(value * 3 / 2), 255)` |
| `125%` | `min(trunc(value * 5 / 4), 255)` |
| `75%` | `trunc(value / 4) * 3` |
| `50%` | `trunc(value / 2)` |

The `75%` operation truncates before multiplication. For example, it changes `10` to `6`, not `7`.

These modifiers reset from the material at the start of the next item. A visible card can apply its modifier again on every later step.

## 7. Card queue and activation

The queue order is `hidden -> first -> second -> third`. A pending card enters `hidden` and pushes older cards toward `third`.

When all visible slots are full, the usual push removes `third`. The removed card enters `leaving` for one final activation.

Pixies are sticky in visible slots. A push skips the oldest contiguous pixies at the end of the queue.

`Garlicrown` and `Holy Water` clear `sticky` for their current steps. This lets the push remove a pixie normally.

Most normal cards do nothing in `hidden`. Most start their main effect in `first`, `second`, or `third`.

A hidden card does not move when an item creates no pending card. It can remain hidden across many item steps.

The simulator activates cards from oldest to newest. Later card effects can overwrite earlier special effects or exact immunity assignments.

### 7.1 Active world card

The simulator checks world cards in this priority order:

1. Third
2. Second
3. First
4. Hidden

The first world card found becomes active. Most hidden world cards remove themselves when another world card is active.

`Bed of Thorns` does not use the hidden-removal rule. It can remain present while another world card controls taint.

### 7.2 Common card effects

| Card group | Active effect in a visible slot |
|---|---|
| Wisp | Increase Charm, then taint Wisp. |
| Shade | Increase Spirit, then taint Shade. |
| Dryad | Increase HP, then taint Dryad. |
| Aura | Increase Luck, then taint Aura. |
| Salamander | Increase Power, then taint Salamander. |
| Gnome | Increase Defense, then taint Gnome. |
| Jinn | Increase Skill, then taint Jinn. |
| Undine | Increase Magic, then taint Undine. |
| Pixie of Rage | Decrease all stats, then increase Power. |
| Pixie of Jealousy | Decrease all stats, then increase Skill. |
| Pixie of Greed | Decrease all stats, then increase Defense. |
| Pixie of Laziness | Decrease all stats, then increase Magic. |
| Pixie of Gluttony | Decrease all stats, then increase HP. |
| Pixie of Lust | Decrease all stats, then increase Spirit. |
| Pixie of Pride | Decrease all stats, then increase Charm. |

Every pixie uses all-stat limits `[-1,3]`. Under Ragnarok, a pixie can transform into its matching evil god when energy is at least `8`.

| Card | Main visible-slot effect |
|---|---|
| Phoenix | Power and Skill limits `[-3,5]`, minimum `3`. Can give Auto Revive to a Ring or Pendant with Volcano. |
| Narwhal | Defense and Magic limits `[-3,5]`, minimum `3`. Can give Fast Revive to a Ring or Pendant with Spring. |
| Blacksmith God | Defense limits `[-5,10]`, minimum `10`. Gives Sledge Hammer to a Hammer. |
| Harvest Goddess | HP limits `[-5,10]`, minimum `10`, Petrify immunity. Gives Share Exp to a Ring. |
| Love Goddess | Spirit and Charm limits `[-3,9]`, minimum `7`. Gives Extra Lucre to a Pendant. |
| God of War | Power limits `[-5,10]`, minimum `10`. Gives Dragonslayer to an Axe. |
| Moon Goddess | Spirit limits `[-5,10]`, minimum `10`. Changes Sword or Bow plunges. |
| Mother of Gods | Magic, Spirit, Charm limits `[-3,5]`, minimum `5`. Replaces all Flail plunges. |
| Ocean God | Power and Skill limits `[-3,9]`, minimum `7`, Flameburst immunity. Gives Trident to a Spear. |
| Ruler of the Sky | Power and Magic limits `[-3,9]`, minimum `9`. Changes Spear or Staff plunges. |
| Sun God | Charm limits `[-5,10]`, minimum `10`. Changes Sword or Bow plunges. |
| Thunder God | Power, Skill, Defense limits `[-3,5]`, minimum `5`. Gives Mjolnir to a Hammer. |
| Wind God | Skill limits `[-5,10]`, minimum `10`. Improves Shoes and changes a Staff plunge. |
| Wisdom Goddess | Magic limits `[-5,10]`, minimum `10`. Gives Stare Immunity to a Shield. |
| Man of Valor | All limits `[-3,5]`. Increases Power and HP. Changes a Spear plunge. |
| Sage | All limits `[-3,5]`. Increases Magic and Defense. Changes a Bow plunge. |
| Wanderer | All limits `[-3,5]`. Increases Skill and Spirit. Changes an Axe plunge. |
| Raven | Magic and Charm limits `[-3,5]`, minimum `3`. |
| Wolf | Skill and HP limits `[-3,5]`, minimum `3`. |
| Enticed Nymph | No direct effect. It suppresses Dying Earth's all-stat decrease. |
| Dawn Nymph | In `second` or `third`, adds `192` energy when energy is at most `24`, then removes itself. It adds `192` when leaving. |
| Orchard Nymph | Gives Fast Revive to a Ring. |
| Valkyrie | Gives Move Regen to a Mantle. |
| Sacrificed Nymph | Gives Petrify immunity to a Pendant. It can retain a leaving evil god. |
| Forest Faerie | Increases Spirit and Charm. Changes a Bow plunge. |
| Housework Faerie | Increases Luck. Can change Mantle immunity or a Ring special. |
| Mountain Faerie | Increases Defense and HP. Changes a Hammer plunge. |
| Ocean Faerie | Increases Charm. Gives Confusion immunity to a Hat. |
| Shoes Faerie | Increases Skill. Can change Boots immunity or a Shoes special. |
| Cleric | Increases Spirit, or Magic, Spirit, Charm with Metropolis. Also changes material modifiers. |
| Clown | Expands all limits. Metropolis expands them further. Also changes material modifiers. |
| King | Increases Power. Metropolis expands its limits. Can change a Glove plunge. |
| Princess | Increases Defense. Metropolis expands its limits. |
| Sorcerer | Increases Magic and lowers Wisp, Dryad, Salamander, Gnome resistances. Tower strengthens the effect. |
| Witch | Increases Magic and lowers Shade, Aura, Jinn, Undine resistances. Tower strengthens the effect. |

Each evil god decreases all stats under `[-10,20]` limits. It also sets one stat minimum to `15`.

| Evil god | Minimum stat | Extra effect |
|---|---|---|
| Beast-Headed God | HP | Poison Blade for Knife |
| Fallen Angel | Charm | Chaotic Avenger for 2H Sword |
| God of Destruction | Power | Freeze immunity and Flame Tongue for Sword |
| Leviathan | Defense | Treefeller for 2H Axe |
| Lord of Flies | Skill | Sinister Blade for Knife |
| Wings of Darkness | Spirit | Golden Touch for Staff |
| Lunar Witch | Magic | Vampsword for Sword |

| Stage or world card | Main effect |
|---|---|
| Bed of Thorns | All limits `[-1,3]`, No Regen, and `150%` to all armor modifiers. |
| Metropolis | `125%` Magic defense, or `150%` and Confusion immunity on a Robe. |
| Spring | All limits `[-3,5]`. Gives Flameburst immunity to Robe and Sleep immunity to Pendant. |
| Tower | All limits `[-3,5]`. It also strengthens Sorcerer and Witch. |
| Volcano | Force `150%`, Tech `50%`. It adds equipment-specific effects. |
| Dying Earth | All limits `[-5,12]` and decrease all stats unless Enticed Nymph protects them. |
| Heaven's Scale | No Revive and normal taint opposition. |
| Ragnarok | Enables pixie transformations and a 2H Sword plunge. |
| Yggdrasil | Increases all stats under `[-5,10]`, or `[-3,9]` for Staff. |
| Ancient Moon | Changes taint rules as described above. |
| Mirrored World | Reverses taint rules as described above. |

### 7.3 Card price additions

The simulator starts a card-price accumulator at zero. It passes this accumulator through `hidden`, `first`, `second`, then `third`.

It adds the final card accumulator to the base equipment price. Empty card slots add zero.

| Cards | Addition per card |
|---|---:|
| Elemental spirits | 250 |
| Pixies | 150 |
| Faeries | 800 |
| Nymphs and nobles | 1,000 |
| Phoenix and Narwhal | 2,500 |
| Evil gods | 6,660 |
| Cleric / Clown | 500 / 250 |
| King / Princess | 1,500 |
| Raven / Sorcerer / Witch / Wolf | 300 |
| Bed of Thorns / Metropolis / Spring / Tower | 1,500 |
| Volcano | 1,300 |
| Ancient Moon / Mirrored World | 2,200 |
| Dying Earth / Heaven's Scale | 2,600 / 1,800 |
| Ragnarok / Yggdrasil | 10,000 / 3,000 |
| Blacksmith God | 2,800 |
| Harvest, Love, War, Moon, Ocean, Sun, Wind, Wisdom gods | 3,000 |
| Mother of Gods / Thunder God | 4,000 |
| Ruler of the Sky | 5,000 |

## 8. Item reference

The `Card` column gives the condition that creates a pending card. Direct effects and card tests run in each item's source order.

For example, coins taint an element before their energy test. Sun and Moon Crystal test their card conditions before they taint an element.

Other rows summarize both parts but do not imply an order. This distinction matters when a condition reads an element changed by the same item.

### 8.1 Coins, stones, crystals, and seeds

| Items | Energy | Direct effect | Card |
|---|---:|---|---|
| Wisp Gold / Wisp Silver | 64 / 48 | Taint Wisp | Wisp when energy remains at least 8 |
| Shade Gold / Shade Silver | 64 / 48 | Taint Shade | Shade when energy remains at least 8 |
| Dryad Gold / Dryad Silver | 64 / 48 | Taint Dryad | Dryad when energy remains at least 8 |
| Aura Gold / Aura Silver | 64 / 48 | Taint Aura | Aura when energy remains at least 8 |
| Salamander Gold / Salamander Silver | 64 / 48 | Taint Salamander | Salamander when energy remains at least 8 |
| Gnome Gold / Gnome Silver | 64 / 48 | Taint Gnome | Gnome when energy remains at least 8 |
| Jinn Gold / Jinn Silver | 64 / 48 | Taint Jinn | Jinn when energy remains at least 8 |
| Undine Gold / Undine Silver | 64 / 48 | Taint Undine | Undine when energy remains at least 8 |
| Fire Stone / Earth Stone / Wind Stone / Water Stone | 24 | Taint Salamander / Gnome / Jinn / Undine | Matching spirit when energy remains at least 8 |
| Sun Crystal | 48 | Taint Wisp | Sun God when Wisp >= 3, total elements >= 5, and energy remains at least 8 |
| Moon Crystal | 48 | Taint Shade | Moon Goddess when Shade >= 3 and total elements >= 5 |
| Glow Crystal | 96 | None | Dawn Nymph |
| Chaos Crystal | 24 | None | Ancient Moon when energy remains at least 16 |
| Round Seed / Oblong Seed / Crooked Seed | 16 | Taint Dryad | Dryad when energy remains at least 8 |
| Big Seed / Small Seed / Long Seed | 24 | Taint Dryad | Dryad when energy remains at least 8 |
| Flat Seed | 48 | Taint Dryad | Dryad when energy remains at least 8 |
| Spiny Seed | 48 | Taint Dryad | Yggdrasil when Dryad >= 5 and energy remains at least 8 |

### 8.2 Produce and meat

| Item | Energy | Direct effect | Card condition |
|---|---:|---|---|
| Bellgrapes | 64 | Magic limits `[-5,10]`, increase Magic | None |
| Diceberry | 16 | Increase Luck | Wind God when Jinn >= 3 and total >= 5 |
| Mangoelephant | 64 | HP limits `[-5,10]`, increase HP | None |
| Loquat-Shoes | 16 | Boots or Shoes physical defense `125%` | Shoes Faerie when energy remains at least 16 |
| Pear o'Heels | 32 | Boots or Shoes physical defense `125%` | Shoes Faerie when energy remains at least 16 |
| Squalphin | 16 | Taint Undine | Ocean God when Undine >= 3, total >= 5, and energy remains at least 8 |
| Citrisquid | 8 | Sharp `75%`, Heavy `125%`, Slash `75%`, Strike `125%` | None |
| Springanana | 16 | None | Heaven's Scale |
| Peach Puppy | 24 | Sharp `125%`, Heavy `75%` | Wolf |
| Apricat | 8 | Force `75%`, Tech `125%` | None |
| Applesocks | 64 | Skill limits `[-5,10]`, increase Skill | Orchard Nymph when total >= 5 and energy remains at least 16 |
| Whalamato | 32 | HP limits `[-5,10]`, minimum `10` | Narwhal when Gnome >= 3, Undine >= 3, and energy remains at least 8 |
| Pine o'Clock | 24 | Replace immunities with Sleep | Ragnarok when Sa, Gn, Ji, and Un are positive and energy remains at least 8 |
| Fishy Fruit | 32 | Magic limits `[-1,3]`, increase Magic, taint Undine | Spring, always |
| Boarmelon | 32 | Power limits `[-1,3]`, increase Power | None |
| Rhinoloupe | 32 | Sharp `125%`, replace immunities with Poison | None |
| Orcaplant | 24 | None | Ocean God when Undine >= 3 and total >= 5 |
| Garlicrown | 8 | Clear sticky, taint Aura | King |
| Honey Onion | 32 | Taint Dryad | Princess |
| Sweet Moai | 32 | Helm physical defense `125%`, or Hat physical defense `150%` | None |
| Spiny Carrot | 8 | Sharp `125%`, Heavy `75%`, taint Undine | None |
| Conchurnip | 16 | Defense limits `[-1,3]`, increase Defense | Ocean Faerie when energy remains at least 16 |
| Cornflower | 24 | Taint Wisp | None |
| Cabadillo | 8 | Hauberk physical defense `125%`, Magic defense `50%` | None |
| Needletuce | 24 | Sharp `125%`, Heavy `75%` | Bed of Thorns when Salamander is zero and Dryad is positive |
| Cherry Bombs | 16 | Ring all-stat limits `[-3,9]` | None |
| Masked Potato | 24 | Sharp `75%`, Heavy `125%` | None |
| Lilipods | 8 | Spirit limits `[-1,3]`, increase Spirit | Enticed Nymph |
| Rocket Papaya | 64 | Charm limits `[-5,10]`, increase Charm | Tower when Jinn is zero and Wisp is positive |
| Orangeopus | 64 | Defense limits `[-5,10]`, increase Defense | Leviathan when Salamander is zero and Gnome >= 5 |
| Bumpkin | 24 | Luck limits `[-1,3]`, minimum `3` | Clown |
| Heart Mint | 8 | Charm limits `[-1,3]`, increase Charm | Mother of Gods when Shade, Gnome, Undine >= 2 |
| Spade Basil | 16 | Sharp `125%` | Ruler of the Sky when Wisp >= 3 and total >= 6 |
| Dialaurel | 64 | None | Metropolis when Salamander is zero and Shade is positive |
| Gold Clover | 64 | Heavy `125%` | None |
| Mush-In-A-Box | 32 | Taint Shade | None |
| Toadstoolshed | 64 | Increase all stats, taint Shade | None |
| Any Meat | 16 | None | None |

The source marks the Pine o'Clock immunity rule as likely incomplete.

### 8.3 Fangs, claws, eyes, wings, and feathers

| Item | Energy | Direct effect | Card condition |
|---|---:|---|---|
| Sharp Claw | 24 | Sharp `150%`, Heavy `50%` | God of Destruction when Undine is zero and Salamander >= 5 |
| Poison Fang | 8 | Force `50%`, Tech `150%` | Beast-Headed God when Aura is zero and Dryad >= 5 |
| Giant's Horn | 32 | Sharp `50%`, Heavy `150%` | Leviathan when Salamander is zero and Gnome >= 5 |
| Pincer (`Scissors` internal key) | 16 | Force `150%`, Tech `50%` | None |
| Healing Claw | 24 | Add Poison immunity to Shield | Tower when Salamander is zero and Wisp is positive |
| Zombie Claw | 32 | Add Paralysis immunity to Pendant | None |
| Vampire Fang | 24 | Charm and Spirit limits `[-3,5]`, increase both | Lunar Witch when Jinn is zero and Undine >= 5 |
| Little Eye | 32 | Slash `125%` | Pixie of Pride |
| Sleepy Eye | 32 | Thrust `125%` | Pixie of Laziness |
| Silly Eye | 32 | Heavy `125%` | Pixie of Gluttony |
| Dangerous Eye | 32 | Strike `125%` | Pixie of Greed |
| Angry Eye | 32 | Force `125%` | Pixie of Rage |
| Blank Eye | 32 | Tech `125%` | Pixie of Jealousy |
| Wicked Eye | 48 | Sharp `125%` | None |
| Creepy Eye | 32 | Magic `125%` | Pixie of Lust |
| Angel Feather | 32 | Charm limits `[-3,5]`, increase Charm, taint Wisp | Fallen Angel when Shade is zero and Wisp >= 5 |
| Raven Feather | 24 | Spirit limits `[-3,5]`, increase Spirit, taint Shade | Raven |
| Clear Feather | 24 | Heavy `50%`, Tech `150%` | Lord of Flies when Gnome is zero and Jinn >= 5 |
| Moth Wing | 32 | Physical defense `75%`, Magic defense `150%` | Forest Faerie |
| Flaming Quill | 64 | Power limits `[-3,5]`, minimum `5` | Phoenix when Salamander >= 3 and Jinn >= 3 |
| White Feather | 32 | Skill limits `[-3,5]`, minimum `5` | Valkyrie when Wisp is positive and total >= 3 |

### 8.4 Other items

| Item | Energy | Direct effect | Card condition |
|---|---:|---|---|
| Aroma Oil | 24 | Hide material physical defense `150%` | Wisdom Goddess when total >= 6 |
| Dragon Blood | 64 | Increase all stats | God of War when Salamander >= 3 and total >= 5 |
| Acid | 48 | No effect in the current implementation | None |
| Holy Water | 16 | Clear sticky | Cleric when energy is greater than 8 |
| Ether | 8 | None | Blacksmith God when Aura and Gnome >= 3, otherwise Mountain Faerie |
| Mercury | 24 | None | Witch |
| Stinky Breath | 16 | Replace immunities with Poison and Confusion | Pixie of Lust |
| Ghost's Howl | 32 | None | Sacrificed Nymph |
| Dragon Breath | 24 | Force and Tech `125%` | Man of Valor when Wisp and Salamander are positive and total >= 3 |
| Damsel's Sigh | 16 | None | Love Goddess when Shade and Dryad >= 3 |
| Electricity | 32 | None | Thunder God when Wisp, Salamander, Jinn >= 3 |
| Moss | 32 | Add Darkness immunity to Helm | None |
| Ear of Wheat | 24 | None | Harvest Goddess when Dryad >= 3 and total >= 5 |
| Baked Roach | 24 | Add Poison immunity to Robe | None |
| Blackened Bat | 48 | Add Darkness immunity to Pendant | Wings of Darkness when Wisp is zero and Shade >= 5 |
| Sulfur | 24 | None | Sorcerer |
| Poison Powder | 8 | None | Pixie of Rage |
| Sleepy Powder | 8 | None | Pixie of Jealousy |
| Knockout Dust | 8 | None | Pixie of Gluttony |
| Rust | 8 | None | Pixie of Laziness |
| Grave Dirt | 32 | None | Dying Earth |
| Ash | 16 | None | Volcano |
| Hairball | 8 | None | Housework Faerie |
| Needle | 8 | None | Bed of Thorns when Salamander is zero and Dryad is positive |
| Mirror Piece | 16 | None | Mirrored World when total >= 3 |
| Wad of Wool | 16 | None | Wanderer when Shade and Dryad are positive and total >= 3 |
| Messy Scroll | 16 | None | Sage when Jinn and Undine are positive and total >= 3 |
| Greenball Bun | 8 | Increase HP | None |
| Tako Bug | 8 | Increase Charm | None |

## 9. Examples to try

Use the Step control after each item. Use Sub-step to observe the order from section 3.

### Example A: energy cost and delayed card activation

- Equipment: Sword
- Material: Menos Bronze
- Items: Wisp Gold, Wisp Gold, Wisp Gold

| Step | Expected important state |
|---:|---|
| Initial | Wisp 0, Charm 0, Attack 10, no cards |
| 1 | Wisp 1, energy 56, Wisp hidden, Charm 0 |
| 2 | Wisp 3, energy 16, Wisp hidden and first, Charm 1 |
| 3 | Wisp 4, energy 0, no new card, Charm remains 1 after clamping |

The third item first buys Wisp level 4 for `8 * 2^3 = 64`. No energy remains to create a card.

### Example B: wood acts before the selected item

- Equipment: Staff
- Material: Oak Wood
- Items: Fire Stone

At the material-code sub-step, wood queues Dryad and creates a pending Dryad card. Fire Stone then taints Salamander.

Fire Stone overwrites the pending card with Salamander. The Dryad taint still resolves during the element-increase sub-step.

### Example C: percentage truncation

- Equipment: Sword
- Material: Menos Bronze
- Items: Citrisquid

Menos Bronze starts with Sharp and Slash `10`. Citrisquid changes each `75%` value to `6`.

It changes Heavy and Strike from `10` to `12`. The next item restores all four values from the material before new effects.

### Example D: card position controls activation

- Equipment: Ring
- Material: Menos Bronze
- Items: Glow Crystal, Hairball, Poison Powder

Glow Crystal puts Dawn Nymph in `hidden`. Hairball creates Housework Faerie and pushes Dawn Nymph to `first`.

Poison Powder creates a pixie and pushes Dawn Nymph to `second`. Dawn Nymph has no effect in `first`.

Poison Powder starts with energy `8`. Dawn Nymph adds `192`, removes itself, and leaves final energy `200`.

This energy does not continue to a fourth item.

### Example E: immunity replacement versus addition

- Equipment: Helm
- Material: Menos Bronze
- Items: Moss, Pine o'Clock

Moss adds Darkness immunity. Pine o'Clock then replaces the immunity bitmask with Sleep.

The final equipment has Sleep immunity but no Darkness immunity.

## 10. Implementation notes

- Item value `0` is skipped.
- `Acid` calls no state-changing code.
- `Any Meat` calls no state-changing code.
- `Pine o'Clock` has a source comment that says its rule is likely incomplete.
- Equipment-specific card checks can remove Auto Revive from a Ring or Pendant when Phoenix is not in a valid visible position.
- A Bow gains Magical Shot when Witch, Raven, and Wolf are all visible, and none is hidden.
- Immunity storage is a bitmask. Some rules replace the bitmask, while rules with `OR` add one immunity.