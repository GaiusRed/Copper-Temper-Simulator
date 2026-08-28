import { expect, it } from 'vitest'
import { attemptDeity, getDeityBonus, resolveDeityQueue } from './deities'

const levels = { oak: 0, dark_oak: 0, birch: 0, spruce: 0, acacia: 0, jungle: 0, cherry: 0, mangrove: 0 }
const state = ({ energy = 0, ...values } = {}) => ({ energy, deityLevels: { ...levels, ...values } })

it('spends resistance times two to the current level', () => {
  const result = attemptDeity({ state: state({ energy: 24, oak: 1 }), role: 'oak', mode: 'normal', resistance: 8 })
  expect(result.state).toMatchObject({ energy: 8, deityLevels: { oak: 2 } })
})

it('lets Oak remove Dark Oak levels', () => {
  const result = attemptDeity({ state: state({ energy: 32, oak: 2, dark_oak: 2 }), role: 'oak', mode: 'normal', resistance: 8 })
  expect(result.state.deityLevels).toMatchObject({ oak: 3, dark_oak: 0 })
})

it('sums each deity half-level separately', () => {
  expect(getDeityBonus({ ...levels, oak: 1, dark_oak: 1, birch: 2, spruce: 3 })).toBe(2)
})

it('blocks Dark Oak while Oak is present', () => {
  const result = attemptDeity({ state: state({ energy: 8, oak: 1 }), role: 'dark_oak', mode: 'normal', resistance: 8 })
  expect(result.state).toMatchObject({ energy: 8, deityLevels: { dark_oak: 0 } })
})

it('reduces Jungle before it increases Acacia', () => {
  const result = attemptDeity({ state: state({ energy: 16, jungle: 1 }), role: 'acacia', mode: 'normal', resistance: 8 })
  expect(result.state.deityLevels).toMatchObject({ acacia: 1, jungle: 0 })
})

it('uses independent mode without Oak and Dark Oak opposition', () => {
  const result = attemptDeity({ state: state({ energy: 8, oak: 1 }), role: 'dark_oak', mode: 'independent', resistance: 8 })
  expect(result.state).toMatchObject({ energy: 0, deityLevels: { oak: 1, dark_oak: 1 } })
})

it('uses Dark Oak support when Spruce opposes Birch in normal mode', () => {
  const result = attemptDeity({
    state: state({ energy: 32, dark_oak: 1, birch: 1 }),
    role: 'spruce',
    mode: 'normal',
    resistance: 8,
    resistances: { birch: 8 },
  })

  expect(result.state.deityLevels).toMatchObject({ birch: 0, spruce: 1 })
})

it('uses Oak support when Spruce opposes Birch in mirrored mode', () => {
  const result = attemptDeity({
    state: state({ energy: 32, oak: 1, birch: 1 }),
    role: 'spruce',
    mode: 'mirrored',
    resistance: 8,
    resistances: { birch: 8 },
  })

  expect(result.state.deityLevels).toMatchObject({ birch: 0, spruce: 1 })
})

it('does not apply Birch and Spruce opposition in independent mode', () => {
  const result = attemptDeity({
    state: state({ energy: 32, oak: 1, birch: 1 }),
    role: 'spruce',
    mode: 'independent',
    resistance: 8,
    resistances: { birch: 8 },
  })

  expect(result.state.deityLevels).toMatchObject({ birch: 1, spruce: 1 })
})

it('mirrors Oak and Dark Oak opposition', () => {
  const result = attemptDeity({ state: state({ energy: 32, oak: 2, dark_oak: 2 }), role: 'dark_oak', mode: 'mirrored', resistance: 8 })
  expect(result.state.deityLevels).toMatchObject({ oak: 0, dark_oak: 3 })
})

it('resolves queued deities in their fixed order', () => {
  const result = resolveDeityQueue({
    state: state({ energy: 32 }),
    queue: ['spruce', 'birch'],
    mode: 'independent',
    resistances: { birch: 8, spruce: 8 },
  })
  expect(result.state.deityLevels).toMatchObject({ birch: 1, spruce: 1 })
})

it('does not spend energy at the level cap and records the reason', () => {
  const result = attemptDeity({ state: state({ energy: 128, oak: 15 }), role: 'oak', mode: 'normal', resistance: 8 })
  expect(result.state.energy).toBe(128)
  expect(result.events).toMatchObject([{ reason: 'level_cap' }])
})

it('applies each deity mode at all required level boundaries', () => {
  const roles = Object.keys(levels)
  const modes = ['normal', 'independent', 'mirrored']
  const energy = 1_000_000

  for (const mode of modes) {
    for (const role of roles) {
      for (const level of [0, 1, 14]) {
        const result = attemptDeity({ state: state({ energy, [role]: level }), role, mode, resistance: 8 })
        expect(result.state.deityLevels[role], `${mode} ${role} at ${level}`).toBe(level + 1)
        expect(result.state.energy, `${mode} ${role} energy at ${level}`).toBe(energy - 8 * 2 ** level)
        expect(result.events[0].reason, `${mode} ${role} reason at ${level}`).toBeUndefined()
      }
      const capped = attemptDeity({ state: state({ energy, [role]: 15 }), role, mode, resistance: 8 })
      expect(capped.state.deityLevels[role], `${mode} ${role} cap`).toBe(15)
      expect(capped.state.energy, `${mode} ${role} cap energy`).toBe(energy)
      expect(capped.events[0].reason, `${mode} ${role} cap reason`).toBe('level_cap')
    }
  }
})