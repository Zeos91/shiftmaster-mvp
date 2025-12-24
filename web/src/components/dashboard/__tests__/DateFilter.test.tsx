import { render, screen, fireEvent } from '@testing-library/react'
import DateFilter from '@/components/dashboard/DateFilter'

describe('DateFilter', () => {
  it('renders date inputs and apply button', () => {
    const onApply = jest.fn()
    render(<DateFilter onApply={onApply} />)
    
    expect(screen.getByLabelText(/from:/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/to:/i)).toBeInTheDocument()
    expect(screen.getByText('Apply Filter')).toBeInTheDocument()
    expect(screen.getByText('Reset')).toBeInTheDocument()
  })

  it('calls onApply with correct dates when apply button is clicked', () => {
    const onApply = jest.fn()
    render(<DateFilter onApply={onApply} />)
    
    const applyButton = screen.getByText('Apply Filter')
    fireEvent.click(applyButton)
    
    expect(onApply).toHaveBeenCalled()
    expect(onApply).toHaveBeenCalledWith(
      expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
      expect.stringMatching(/\d{4}-\d{2}-\d{2}/)
    )
  })

  it('updates date values when inputs change', () => {
    const onApply = jest.fn()
    render(<DateFilter onApply={onApply} />)
    
    const fromInput = screen.getByLabelText(/from:/i) as HTMLInputElement
    const toInput = screen.getByLabelText(/to:/i) as HTMLInputElement
    
    fireEvent.change(fromInput, { target: { value: '2025-01-01' } })
    fireEvent.change(toInput, { target: { value: '2025-01-31' } })
    
    expect(fromInput.value).toBe('2025-01-01')
    expect(toInput.value).toBe('2025-01-31')
  })

  it('resets to default dates when reset button is clicked', () => {
    const onApply = jest.fn()
    render(<DateFilter onApply={onApply} />)
    
    const fromInput = screen.getByLabelText(/from:/i) as HTMLInputElement
    const resetButton = screen.getByText('Reset')
    
    fireEvent.change(fromInput, { target: { value: '2024-01-01' } })
    fireEvent.click(resetButton)
    
    expect(onApply).toHaveBeenCalled()
    // Should reset to last 30 days
    const today = new Date().toISOString().split('T')[0]
    expect(onApply).toHaveBeenCalledWith(
      expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
      today
    )
  })
})
