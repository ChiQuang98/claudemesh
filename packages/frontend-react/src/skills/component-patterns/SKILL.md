---
name: component-patterns
description: React component design patterns and best practices. Use when designing components, structuring component hierarchy, or implementing reusable components.
allowed-tools: Read, Write, Edit
user-invocable: true
---

# React Component Patterns

## Overview
Essential patterns for building maintainable, reusable React components.

## Container/Presenter Pattern

### Separation of Concerns
```tsx
// Container: Handles data fetching and business logic
function UserProfileContainer({ userId }: { userId: string }) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId)
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return <UserProfilePresenter user={user} />;
}

// Presenter: Pure presentation component
function UserProfilePresenter({ user }: { user: User }) {
  return (
    <div className="user-profile">
      <Avatar src={user.avatar} name={user.name} />
      <h1>{user.name}</h1>
      <p>{user.bio}</p>
      <ContactInfo email={user.email} phone={user.phone} />
    </div>
  );
}
```

### Benefits
- Presenters are easy to test (no side effects)
- Containers handle complex logic
- Presenters can be reused with different data sources
- Better separation of concerns

## Compound Components Pattern

### Building Flexible APIs
```tsx
// Parent component manages shared state
interface TabsContextValue {
  activeTab: number;
  setActiveTab: (index: number) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

function Tabs({ children, defaultTab = 0 }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

function TabList({ children }: { children: React.ReactNode }) {
  return <div className="tab-list">{children}</div>;
}

function Tab({ index, children }: TabProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === index;

  return (
    <button
      className={`tab ${isActive ? 'active' : ''}`}
      onClick={() => setActiveTab(index)}
    >
      {children}
    </button>
  );
}

function TabPanels({ children }: { children: React.ReactNode }) {
  return <div className="tab-panels">{children}</div>;
}

function TabPanel({ index, children }: TabPanelProps) {
  const { activeTab } = useTabsContext();
  return activeTab === index ? <div className="tab-panel">{children}</div> : null;
}

// Usage
<Tabs>
  <TabList>
    <Tab index={0}>Profile</Tab>
    <Tab index={1}>Settings</Tab>
  </TabList>
  <TabPanels>
    <TabPanel index={0}>Profile content</TabPanel>
    <TabPanel index={1}>Settings content</TabPanel>
  </TabPanels>
</Tabs>
```

### Real-World Example: Select
```tsx
function Select({ children, value, onChange }: SelectProps) {
  return (
    <SelectContext.Provider value={{ value, onChange }}>
      <div className="select">{children}</div>
    </SelectContext.Provider>
  );
}

function SelectTrigger({ children }: { children: React.ReactNode }) {
  const { onChange } = useSelectContext();
  return (
    <button onClick={() => onChange(true)}>
      {children}
    </button>
  );
}

function SelectOptions({ children }: { children: React.ReactNode }) {
  const { value } = useSelectContext();
  return value ? <div className="options">{children}</div> : null;
}

function SelectOption({ value, children }: SelectOptionProps) {
  const { onChange } = useSelectContext();
  return (
    <div onClick={() => onChange(false)}>
      {children}
    </div>
  );
}
```

## Render Props Pattern

### Sharing State via Props
```tsx
function MouseTracker({ render }: { render: (position: { x: number; y: number }) => React.ReactNode }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  return (
    <div
      onMouseMove={(e) => setPosition({ x: e.clientX, y: e.clientY })}
    >
      {render(position)}
    </div>
  );
}

// Usage
<MouseTracker
  render={({ x, y }) => (
    <div>
      Mouse position: {x}, {y}
    </div>
  )}
/>

// Multiple render props
function DataProvider({
  renderData,
  renderLoading,
  renderError
}: DataProviderProps) {
  const { data, isLoading, error } = useData();

  if (isLoading) return renderLoading();
  if (error) return renderError(error);
  return renderData(data);
}
```

### As a Children Function
```tsx
function MouseTracker({ children }: { children: (position: Position) => React.ReactNode }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  return (
    <div onMouseMove={(e) => setPosition({ x: e.clientX, y: e.clientY })}>
      {children(position)}
    </div>
  );
}

// Usage
<MouseTracker>
  {({ x, y }) => <div>Position: {x}, {y}</div>}
</MouseTracker>
```

## Higher-Order Components (HOCs)

### Adding Logic to Components
```tsx
// HOC that adds loading state
function withLoading<P>(
  Component: React.ComponentType<P & { isLoading: boolean }>
) {
  return (props: P) => {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      // Simulate loading
      const timer = setTimeout(() => setIsLoading(false), 1000);
      return () => clearTimeout(timer);
    }, []);

    if (isLoading) return <LoadingSpinner />;
    return <Component {...props} isLoading={isLoading} />;
  };
}

// Usage
const UserProfileWithLoading = withLoading(UserProfile);
<UserProfileWithLoading userId={123} />
```

### Composing Multiple HOCs
```tsx
// Multiple HOCs
function withAuth<P>(Component: React.ComponentType<P>) {
  return (props: P) => {
    const { user, isAuthenticated } = useAuth();

    if (!isAuthenticated) return <LoginPage />;
    return <Component {...props} user={user} />;
  };
}

function withLogger<P>(Component: React.ComponentType<P>) {
  return (props: P) => {
    useEffect(() => {
      console.log('Component mounted');
      return () => console.log('Component unmounted');
    }, []);

    return <Component {...props} />;
  };
}

// Compose HOCs
const ProtectedUserProfile = withLogger(withAuth(UserProfile));
```

## Custom Hooks Pattern

### Extracting Reusable Logic
```tsx
// Custom hook for window size
function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

// Usage
function ResponsiveComponent() {
  const { width, height } = useWindowSize();

  return (
    <div>
      Window size: {width} x {height}
    </div>
  );
}
```

### Composable Custom Hooks
```tsx
function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check auth status...
  }, []);

  return { user, isLoading };
}

function useRequireAuth() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  return { user, isLoading };
}

// Usage
function ProtectedPage() {
  const { user, isLoading } = useRequireAuth();

  if (isLoading) return <Loading />;
  if (!user) return null;

  return <div>Welcome, {user.name}</div>;
}
```

## Control Props Pattern

### Controlled and Uncontrolled
```tsx
interface ToggleProps {
  on?: boolean;
  onChange?: (on: boolean) => void;
  defaultOn?: boolean;
}

function Toggle({ on: controlledOn, onChange, defaultOn = false }: ToggleProps) {
  const [internalOn, setInternalOn] = useState(defaultOn);

  const on = controlledOn !== undefined ? controlledOn : internalOn;
  const isControlled = controlledOn !== undefined;

  const handleChange = useCallback(
    (newOn: boolean) => {
      if (!isControlled) {
        setInternalOn(newOn);
      }
      onChange?.(newOn);
    },
    [isControlled, onChange]
  );

  return (
    <button onClick={() => handleChange(!on)}>
      {on ? 'ON' : 'OFF'}
    </button>
  );
}

// Controlled
function App() {
  const [isOn, setIsOn] = useState(false);
  return <Toggle on={isOn} onChange={setIsOn} />;
}

// Uncontrolled
function App() {
  return <Toggle defaultOn={false} onChange={(on) => console.log(on)} />;
}
```

## State Reducer Pattern

### Flexible State Management
```tsx
function useToggleReducer(
  initialState = false,
  { onChange }: { onChange?: (state: boolean) => void } = {}
) {
  return useCallback(
    (state: boolean, action: 'toggle' | 'on' | 'off') => {
      const newState =
        action === 'toggle' ? !state :
        action === 'on' ? true :
        false;

      onChange?.(newState);
      return newState;
    },
    [onChange]
  );
}

function Toggle({
  reducer = useToggleReducer,
  onChange
}: ToggleProps) {
  const [on, dispatch] = useReducer(reducer, false, () => false);

  useEffect(() => {
    onChange?.(on);
  }, [on, onChange]);

  return (
    <>
      <button onClick={() => dispatch('toggle')}>Toggle</button>
      <button onClick={() => dispatch('on')}>On</button>
      <button onClick={() => dispatch('off')}>Off</button>
      <div>State: {on ? 'ON' : 'OFF'}</div>
    </>
  );
}
```

## Provider Pattern

### Context-Based State Management
```tsx
interface Theme {
  colors: {
    primary: string;
    secondary: string;
  };
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>({
    colors: {
      primary: 'blue',
      secondary: 'gray'
    }
  });

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div style={{ backgroundColor: theme.colors.secondary }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

## Props Getters Pattern

### Flexible Props for Child Elements
```tsx
function useCheckbox() {
  const [checked, setChecked] = useState(false);

  const getCheckboxProps = useCallback(
    (props?: React.HTMLAttributes<HTMLInputElement>) => ({
      ...props,
      checked,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        setChecked(e.target.checked);
        props?.onChange?.(e);
      }
    }),
    [checked]
  );

  const getLabelProps = useCallback(
    (props?: React.HTMLAttributes<HTMLLabelElement>) => ({
      ...props,
      htmlFor: 'checkbox'
    }),
    []
  );

  return { checked, getCheckboxProps, getLabelProps };
}

// Usage
function Checkbox() {
  const { checked, getCheckboxProps, getLabelProps } = useCheckbox();

  return (
    <label {...getLabelProps()}>
      <input {...getCheckboxProps()} id="checkbox" />
      Check me
    </label>
  );
}
```

## Component Composition Patterns

### Slot Pattern
```tsx
interface CardProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

function Card({ header, footer, children }: CardProps) {
  return (
    <div className="card">
      {header && <div className="card-header">{header}</div>}
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}

// Usage
<Card
  header={<h2>Card Title</h2>}
  footer={<button>Action</button>}
>
  <p>Card content goes here</p>
</Card>
```

### Layout Components
```tsx
function Layout({ header, sidebar, main, footer }: LayoutProps) {
  return (
    <div className="layout">
      <header className="layout-header">{header}</header>
      <div className="layout-body">
        <aside className="layout-sidebar">{sidebar}</aside>
        <main className="layout-main">{main}</main>
      </div>
      <footer className="layout-footer">{footer}</footer>
    </div>
  );
}

// Usage
<Layout
  header={<Header />}
  sidebar={<Sidebar />}
  main={<Content />}
  footer={<Footer />}
/>
```

## Headless Component Pattern

### Logic Without UI
```tsx
// Headless component - no UI, just logic
function useDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => setIsOpen(prev => !prev), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current?.contains(event.target as Node) ||
        menuRef.current?.contains(event.target as Node)
      ) {
        return;
      }
      close();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, close]);

  return {
    isOpen,
    toggle,
    close,
    triggerRef,
    menuRef,
    getTriggerProps: useCallback(() => ({
      ref: triggerRef,
      onClick: toggle,
      'aria-expanded': isOpen
    }), [isOpen, toggle]),
    getMenuProps: useCallback(() => ({
      ref: menuRef,
      'aria-hidden': !isOpen
    }), [isOpen])
  };
}

// Usage with custom UI
function MyDropdown() {
  const { isOpen, toggle, close, getTriggerProps, getMenuProps } = useDropdown();

  return (
    <div className="dropdown">
      <button {...getTriggerProps()}>Menu</button>
      {isOpen && (
        <div {...getMenuProps()}>
          <ul>
            <li onClick={close}>Item 1</li>
            <li onClick={close}>Item 2</li>
          </ul>
        </div>
      )}
    </div>
  );
}
```

## Best Practices

### Component Design
- **Single Responsibility**: Each component should do one thing well
- **Composition over Inheritance**: Build complex UIs from simple components
- **Props Interface**: Define clear prop types with TypeScript
- **Default Props**: Provide sensible defaults
- **Controlled Components**: Prefer controlled components for form inputs

### Reusability
- **Configuration over Code**: Use props to configure behavior
- **Children Prop**: Use children for flexible composition
- **Render Props**: Share code between components with render props
- **Custom Hooks**: Extract reusable logic into hooks

### Performance
- **React.memo**: Prevent unnecessary re-renders
- **useMemo/useCallback**: Optimize expensive computations
- **Code Splitting**: Lazy load components when possible
- **Virtualization**: For long lists

### TypeScript
- **Define Prop Types**: Use interfaces for component props
- **Generic Components**: Create reusable generic components
- **Type Inference**: Let TypeScript infer types when possible
- **Discriminated Unions**: Use for variant props

## Common Mistakes to Avoid

1. **Large Components**: Break down into smaller components
2. **Prop Drilling**: Use context or composition instead
3. **Tight Coupling**: Keep components loosely coupled
4. **Business Logic in UI**: Extract to custom hooks
5. **Ignoring Accessibility**: Implement proper ARIA attributes
6. **Not Using Keys**: Always use keys in lists
7. **Over-Optimization**: Don't optimize prematurely
8. **Inline Functions**: Avoid creating new functions on every render
9. **Ignoring PropTypes**: Use TypeScript for type safety
10. **Mixing Concerns**: Keep presentational and container logic separate
