/**
 * Sample component tests to demonstrate testing patterns
 * 
 * These tests serve as examples and templates for testing React components
 * in the EPSM application.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// Example 1: Simple component rendering test
describe('Component Rendering', () => {
  it('should render a simple button component', () => {
    const ButtonComponent = ({ children }: { children: React.ReactNode }) => (
      <button>{children}</button>
    )
    
    render(<ButtonComponent>Click Me</ButtonComponent>)
    expect(screen.getByText('Click Me')).toBeInTheDocument()
  })
})

// Example 2: Component with props
describe('Component Props', () => {
  it('should render component with different props', () => {
    const Greeting = ({ name }: { name: string }) => <div>Hello, {name}!</div>
    
    const { rerender } = render(<Greeting name="Alice" />)
    expect(screen.getByText('Hello, Alice!')).toBeInTheDocument()
    
    rerender(<Greeting name="Bob" />)
    expect(screen.getByText('Hello, Bob!')).toBeInTheDocument()
  })
})

// Example 3: Component with user interaction
describe('User Interactions', () => {
  it('should handle button clicks', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()
    
    const ClickableButton = ({ onClick }: { onClick: () => void }) => (
      <button onClick={onClick}>Click Me</button>
    )
    
    render(<ClickableButton onClick={handleClick} />)
    
    await user.click(screen.getByText('Click Me'))
    expect(handleClick).toHaveBeenCalledOnce()
  })
  
  it('should handle text input', async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()
    
    const TextInput = ({ onChange }: { onChange: (value: string) => void }) => (
      <input
        type="text"
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter text"
      />
    )
    
    render(<TextInput onChange={handleChange} />)
    
    const input = screen.getByPlaceholderText('Enter text')
    await user.type(input, 'Hello')
    
    expect(handleChange).toHaveBeenCalled()
  })
})

// Example 4: Async component with loading state
describe('Async Components', () => {
  it('should show loading state then data', async () => {
    const AsyncComponent = () => {
      const [loading, setLoading] = React.useState(true)
      const [data, setData] = React.useState<string | null>(null)
      
      React.useEffect(() => {
        setTimeout(() => {
          setData('Loaded Data')
          setLoading(false)
        }, 100)
      }, [])
      
      if (loading) return <div>Loading...</div>
      return <div>{data}</div>
    }
    
    render(<AsyncComponent />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('Loaded Data')).toBeInTheDocument()
    })
  })
})

// Example 5: Component with conditional rendering
describe('Conditional Rendering', () => {
  it('should render different content based on conditions', () => {
    const ConditionalComponent = ({ isLoggedIn }: { isLoggedIn: boolean }) => (
      <div>
        {isLoggedIn ? (
          <button>Logout</button>
        ) : (
          <button>Login</button>
        )}
      </div>
    )
    
    const { rerender } = render(<ConditionalComponent isLoggedIn={false} />)
    expect(screen.getByText('Login')).toBeInTheDocument()
    
    rerender(<ConditionalComponent isLoggedIn={true} />)
    expect(screen.getByText('Logout')).toBeInTheDocument()
  })
})

// Example 6: Component with lists
describe('List Rendering', () => {
  it('should render a list of items', () => {
    const items = ['Item 1', 'Item 2', 'Item 3']
    
    const ListComponent = ({ items }: { items: string[] }) => (
      <ul>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    )
    
    render(<ListComponent items={items} />)
    
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
    expect(screen.getByText('Item 3')).toBeInTheDocument()
  })
})

// Example 7: Component with error boundary
describe('Error Handling', () => {
  it('should handle errors gracefully', () => {
    const ErrorComponent = ({ shouldError }: { shouldError: boolean }) => {
      if (shouldError) {
        throw new Error('Test error')
      }
      return <div>No Error</div>
    }
    
    // Suppress console.error for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    expect(() => render(<ErrorComponent shouldError={true} />)).toThrow('Test error')
    
    spy.mockRestore()
  })
})

// Example 8: Component with Material-UI
describe('Material-UI Components', () => {
  it('should render Material-UI button', () => {
    // Import actual MUI components when testing real components
    const MuiButton = ({ children }: { children: React.ReactNode }) => (
      <button className="MuiButton-root">{children}</button>
    )
    
    render(<MuiButton>MUI Button</MuiButton>)
    expect(screen.getByText('MUI Button')).toBeInTheDocument()
  })
})
