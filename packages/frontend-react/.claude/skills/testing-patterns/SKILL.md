---
name: testing-patterns
description: React and Next.js testing patterns and best practices. Use when writing tests, setting up testing infrastructure, or implementing test strategies.
allowed-tools: Read, Write, Edit
user-invocable: true
---

# React Testing Patterns

## Overview
Comprehensive testing strategies for React and Next.js applications.

## Testing Pyramid

```
        /\
       /E2E\          - Few tests, slow, expensive
      /------\
     /  Integration \  - Medium number
    /--------------\
   /    Unit Tests    \ - Most tests, fast, cheap
  /--------------------\
```

## Unit Testing with React Testing Library

### Component Testing
```tsx
// Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);

    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Testing User Interactions
```tsx
// Counter.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Counter } from './Counter';

describe('Counter', () => {
  it('increments count when increment button is clicked', async () => {
    const user = userEvent.setup();
    render(<Counter />);

    const incrementButton = screen.getByRole('button', { name: /increment/i });
    const countDisplay = screen.getByTestId('count');

    expect(countDisplay).toHaveTextContent('0');

    await user.click(incrementButton);

    expect(countDisplay).toHaveTextContent('1');
  });

  it('decrements count when decrement button is clicked', async () => {
    const user = userEvent.setup();
    render(<Counter initialValue={5} />);

    const decrementButton = screen.getByRole('button', { name: /decrement/i });
    const countDisplay = screen.getByTestId('count');

    await user.click(decrementButton);

    expect(countDisplay).toHaveTextContent('4');
  });
});
```

### Testing Forms
```tsx
// LoginForm.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(<LoginForm onSubmit={handleSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123'
    });
  });

  it('displays validation errors for invalid email', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
  });
});
```

### Testing Async Components
```tsx
// UserProfile.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { UserProfile } from './UserProfile';
import { fetchUser } from '@/api/users';

vi.mock('@/api/users');

describe('UserProfile', () => {
  it('shows loading state initially', () => {
    vi.mocked(fetchUser).mockImplementation(() => new Promise(() => {}));

    render(<UserProfile userId="1" />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('displays user data after loading', async () => {
    const mockUser = { id: '1', name: 'John Doe', email: 'john@example.com' };
    vi.mocked(fetchUser).mockResolvedValue(mockUser);

    render(<UserProfile userId="1" />);

    await waitFor(() => {
      expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    });
    expect(screen.getByText(mockUser.email)).toBeInTheDocument();
  });

  it('displays error message on fetch failure', async () => {
    vi.mocked(fetchUser).mockRejectedValue(new Error('Failed to fetch'));

    render(<UserProfile userId="1" />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

## Testing Custom Hooks

### with @testing-library/react-hooks
```tsx
// useCounter.test.ts
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('initializes with default value', () => {
    const { result } = renderHook(() => useCounter());

    expect(result.current.count).toBe(0);
  });

  it('initializes with custom value', () => {
    const { result } = renderHook(() => useCounter(5));

    expect(result.current.count).toBe(5);
  });

  it('increments count', () => {
    const { result } = renderHook(() => useCounter());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it('decrements count', () => {
    const { result } = renderHook(() => useCounter(5));

    act(() => {
      result.current.decrement();
    });

    expect(result.current.count).toBe(4);
  });
});
```

### Async Hooks Testing
```tsx
// useFetch.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useFetch } from './useFetch';

vi.mock('@/api/fetch');

describe('useFetch', () => {
  it('fetches data successfully', async () => {
    const mockData = { id: 1, name: 'Test' };
    vi.mocked(fetch).mockResolvedValue(mockData);

    const { result } = renderHook(() => useFetch('/api/test'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('handles fetch errors', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Fetch failed'));

    const { result } = renderHook(() => useFetch('/api/test'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });
});
```

## Integration Testing

### Testing Component Interactions
```tsx
// TodoApp.integration.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TodoApp } from './TodoApp';
import { saveTodo } from '@/api/todos';

vi.mock('@/api/todos');

describe('TodoApp Integration', () => {
  it('adds new todo and displays in list', async () => {
    const user = userEvent.setup();
    vi.mocked(saveTodo).mockResolvedValue({ id: '1', text: 'New todo', completed: false });

    render(<TodoApp />);

    const input = screen.getByPlaceholderText(/add a todo/i);
    const addButton = screen.getByRole('button', { name: /add/i });

    await user.type(input, 'New todo');
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('New todo')).toBeInTheDocument();
    });
  });

  it('toggles todo completion', async () => {
    const user = userEvent.setup();
    render(<TodoApp initialTodos={[{ id: '1', text: 'Test', completed: false }]} />);

    const checkbox = screen.getByRole('checkbox');

    await user.click(checkbox);

    await waitFor(() => {
      expect(checkbox).toBeChecked();
    });
  });
});
```

### Testing with Context
```tsx
// ThemeProvider.test.tsx
import { render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';

describe('ThemeProvider', () => {
  it('provides theme to children', () => {
    function TestComponent() {
      const { theme } = useTheme();
      return <div>{theme}</div>;
    }

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByText('light')).toBeInTheDocument();
  });

  it('toggles theme', async () => {
    function TestComponent() {
      const { theme, toggleTheme } = useTheme();
      return (
        <div>
          <span>{theme}</span>
          <button onClick={toggleTheme}>Toggle</button>
        </div>
      );
    }

    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('dark')).toBeInTheDocument();
  });
});
```

## Testing Next.js Specific Features

### Testing Server Components
```tsx
// Use e2e testing for Server Components
// e2e/blog.spec.ts (Playwright)
import { test, expect } from '@playwright/test';

test('blog page displays posts', async ({ page }) => {
  await page.goto('/blog');

  await expect(page.locator('h1')).toContainText('Blog');
  await expect(page.locator('article')).toHaveCountGreaterThan(0);
});

test('can navigate to blog post', async ({ page }) => {
  await page.goto('/blog');
  await page.click('article:first-child a');

  await expect(page).toHaveURL(/\/blog\/[\w-]+/);
  await expect(page.locator('article h1')).toBeVisible();
});
```

### Testing Server Actions
```tsx
// app/actions/__tests__/createPost.test.ts
import { createPost } from '../createPost';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

vi.mock('@/lib/prisma');
vi.mock('next/cache');

describe('createPost Server Action', () => {
  it('creates post and revalidates', async () => {
    const mockPost = { id: '1', title: 'Test', slug: 'test' };
    vi.mocked(prisma.post.create).mockResolvedValue(mockPost);

    const formData = new FormData();
    formData.set('title', 'Test');
    formData.set('content', 'Content');

    const result = await createPost(formData);

    expect(prisma.post.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Test',
        content: 'Content'
      })
    });
    expect(revalidatePath).toHaveBeenCalled();
  });
});
```

### Testing API Routes
```tsx
// app/api/posts/route.test.ts
import { POST } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma');

describe('/api/posts POST', () => {
  it('creates new post', async () => {
    const mockPost = { id: '1', title: 'Test', content: 'Content' };
    vi.mocked(prisma.post.create).mockResolvedValue(mockPost);

    const request = new NextRequest('http://localhost/api/posts', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test', content: 'Content' })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toEqual(mockPost);
  });

  it('returns 400 for invalid data', async () => {
    const request = new NextRequest('http://localhost/api/posts', {
      method: 'POST',
      body: JSON.stringify({ title: '' })
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });
});
```

## End-to-End Testing with Playwright

### Page Object Model
```tsx
// pages/LoginPage.ts
import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async fillForm(email: string, password: string) {
    await this.page.fill('[name="email"]', email);
    await this.page.fill('[name="password"]', password);
  }

  async submit() {
    await this.page.click('button[type="submit"]');
  }

  async assertErrorMessage(message: string) {
    await expect(this.page.locator('.error')).toContainText(message);
  }
}
```

### E2E Test Example
```tsx
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test.describe('Authentication', () => {
  test('logs in with valid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.fillForm('user@example.com', 'password123');
    await loginPage.submit();

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Welcome');
  });

  test('displays error for invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.fillForm('user@example.com', 'wrongpassword');
    await loginPage.submit();

    await loginPage.assertErrorMessage('Invalid credentials');
    await expect(page).toHaveURL('/login');
  });
});
```

### Visual Regression Testing
```tsx
// e2e/visual.spec.ts
import { test, expect } from '@playwright/test';

test('homepage matches snapshot', async ({ page }) => {
  await page.goto('/');

  // Full page screenshot
  await expect(page).toHaveScreenshot('homepage.png');

  // Element screenshot
  const hero = page.locator('.hero');
  await expect(hero).toHaveScreenshot('hero.png');
});

test('blog post matches snapshot', async ({ page }) => {
  await page.goto('/blog/my-post');

  // Wait for images to load
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveScreenshot('blog-post.png', {
    fullPage: true
  });
});
```

## Mocking and Stubbing

### Mocking API Calls
```tsx
// vi.mock for Vitest
import { vi } from 'vitest';
import { fetchUsers } from '@/api/users';

vi.mock('@/api/users', () => ({
  fetchUsers: vi.fn()
}));

describe('UserList', () => {
  it('displays users', async () => {
    const mockUsers = [
      { id: '1', name: 'John' },
      { id: '2', name: 'Jane' }
    ];

    vi.mocked(fetchUsers).mockResolvedValue(mockUsers);

    render(<UserList />);

    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.getByText('Jane')).toBeInTheDocument();
    });
  });
});
```

### Mocking React Query
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: Infinity
      }
    }
  });
}

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}
```

### MSW (Mock Service Worker)
```tsx
// mocks/handlers.ts
import { rest } from 'msw';
import { setupServer } from 'msw/node';

export const server = setupServer(
  rest.get('/api/users', (req, res, ctx) => {
    return res(
      ctx.json([
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' }
      ])
    );
  }),

  rest.post('/api/users', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({ id: '3', name: 'New User' })
    );
  })
);

// setupTests.ts
import { server } from './mocks/handlers';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Test Configuration

### Vitest Configuration
```tsx
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/'
      ]
    }
  }
});
```

### Jest Configuration
```tsx
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['@swc/jest', {
      jsc: {
        transform: {
          react: {
            runtime: 'automatic'
          }
        }
      }
    }]
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/test/**'
  ]
};
```

## Best Practices

### ✅ DO:
- Test user behavior, not implementation
- Use testing-library queries (getByRole, getByLabelText)
- Write tests that are easy to understand
- Test the happy path and error cases
- Mock external dependencies
- Keep tests isolated and independent
- Use descriptive test names
- Follow the AAA pattern (Arrange, Act, Assert)
- Test accessibility with getByRole
- Keep test data simple and realistic

### ❌ DON'T:
- Test implementation details (state, hooks directly)
- Over-use snapshot testing
- Test third-party libraries
- Write flaky tests (timeouts, race conditions)
- Test CSS directly
- Ignore test warnings
- Create overly complex test setup
- Skip testing error cases
- Use test ids excessively
- Forget to clean up mocks/effects

## Common Patterns

### Custom Render Function
```tsx
// test/utils.tsx
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const AllProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

### Test Data Builders
```tsx
// test/builders.ts
export const buildUser = (overrides = {}) => ({
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  ...overrides
});

export const buildPost = (overrides = {}) => ({
  id: '1',
  title: 'Test Post',
  content: 'Test content',
  ...overrides
});
```

## Testing Checklist

### Unit Tests:
- [ ] Component renders correctly
- [ ] User interactions work as expected
- [ ] State changes are reflected
- [ ] Edge cases are handled
- [ ] Error states are displayed

### Integration Tests:
- [ ] Components work together
- [ ] Data flows correctly
- [ ] Form submissions work
- [ ] Navigation works
- [ ] Context providers work

### E2E Tests:
- [ ] Critical user journeys
- [ ] Authentication flow
- [ ] Checkout process
- [ ] Form submissions
- [ ] Page transitions
