import { render, screen } from '@testing-library/preact'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('shows the static default ManaForge-style layout', () => {
    render(<App />)

    expect(screen.getByRole('banner')).toHaveTextContent('CopperTemper')
    expect(screen.getByRole('heading', { name: 'Ingredients' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Recipe' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Statistics' })).toBeVisible()
    expect(screen.getByLabelText('Recipe steps')).toBeEmptyDOMElement()
    expect(screen.getByLabelText('Statistics panel')).toBeVisible()
    expect(screen.getAllByLabelText('Empty statistic value')).toHaveLength(45)
    expect(screen.queryByRole('heading', { name: 'Forge' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Explanations' })).not.toBeInTheDocument()
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()

    const buttons = screen.getAllByRole('button')
    expect(buttons).not.toHaveLength(0)
    buttons.forEach((button) => {
      expect(button).toBeDisabled()
    })
  })
})