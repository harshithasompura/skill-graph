import { render, screen, fireEvent, act } from '@testing-library/react'
import SearchBar from '@/components/SearchBar'

jest.useFakeTimers()

describe('SearchBar', () => {
  test('renders input with placeholder', () => {
    render(<SearchBar value="" onChange={() => {}} placeholder="Search skills..." />)
    expect(screen.getByPlaceholderText('Search skills...')).toBeInTheDocument()
  })

  test('calls onChange after 300ms debounce', () => {
    const onChange = jest.fn()
    render(<SearchBar value="" onChange={onChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'LangGraph' } })
    expect(onChange).not.toHaveBeenCalled()
    act(() => jest.advanceTimersByTime(300))
    expect(onChange).toHaveBeenCalledWith('LangGraph')
  })

  test('does not fire before debounce window closes', () => {
    const onChange = jest.fn()
    render(<SearchBar value="" onChange={onChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'La' } })
    act(() => jest.advanceTimersByTime(100))
    expect(onChange).not.toHaveBeenCalled()
  })
})
