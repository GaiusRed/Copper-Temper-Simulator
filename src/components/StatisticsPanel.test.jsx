import { render, screen } from '@testing-library/preact'
import { expect, it } from 'vitest'
import { createCompiledFixtures } from '../test/catalogFixtures'
import { createInitialState } from '../engine/simulate'
import { StatisticsPanel } from './StatisticsPanel'

it('groups CopperTemper values into compact statistics sections', () => {
  const { catalogMaps, recipe } = createCompiledFixtures()
  render(<StatisticsPanel state={createInitialState({ catalogMaps, recipe })} catalogMaps={catalogMaps} />)

  expect(screen.getByLabelText('Deity levels')).toBeVisible()
  expect(screen.getByLabelText('Deity resistances')).toBeVisible()
  for (const label of ['OA', 'DO', 'BI', 'SP', 'AC', 'JU', 'CH', 'MA']) {
    expect(screen.getByText(label)).toBeVisible()
  }
  expect(screen.getByText('Cards')).toBeVisible()
  expect(screen.getByText('Traits')).toBeVisible()
})

it('lays out the card queue from hidden through leaving', () => {
  const { catalogMaps, recipe } = createCompiledFixtures()
  const state = createInitialState({ catalogMaps, recipe })
  const { container } = render(<StatisticsPanel state={{ ...state, cards: { hidden: 'coppertemper:test_card', first: 'coppertemper:test_card', second: 'coppertemper:test_card', third: 'coppertemper:test_card', leaving: 'coppertemper:test_card' } }} catalogMaps={catalogMaps} />)

  expect([...container.querySelector('.card-summary').children].map((entry) => entry.className)).toEqual([
    'card-entry card-hidden', 'card-entry card-first', 'card-queue-spacer', 'card-entry card-second', 'card-entry card-leaving', 'card-entry card-third',
  ])
})

it('shows only the attributes that apply to the selected equipment', () => {
  const { catalogMaps, recipe } = createCompiledFixtures()
  const view = render(<StatisticsPanel state={createInitialState({ catalogMaps, recipe })} catalogMaps={catalogMaps} />)

  expect(view.container).toHaveTextContent('Attack Damage')
  expect(view.container).toHaveTextContent('Mining Speed')
  expect(view.container).not.toHaveTextContent('Armor Toughness')
})

it('uses deity short names from the catalog', () => {
  const { catalogMaps, recipe } = createCompiledFixtures()
  catalogMaps.deities.get('coppertemper:oak').shortName = 'OAK'

  const view = render(<StatisticsPanel state={createInitialState({ catalogMaps, recipe })} catalogMaps={catalogMaps} />)
  const labels = [...view.container.querySelectorAll('.deity-heading span')].map((element) => element.textContent)

  expect(labels).toContain('OAK')
  expect(labels).not.toContain('OA')
})