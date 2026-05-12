import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { ThemeProvider } from './themeProvider';
import { useUiStore } from './uiStore';

type MqListener = (e: { matches: boolean }) => void;

class FakeMediaQuery {
  matches: boolean;
  private listeners = new Set<MqListener>();
  constructor(matches: boolean) {
    this.matches = matches;
  }
  addEventListener(_type: 'change', cb: MqListener) {
    this.listeners.add(cb);
  }
  removeEventListener(_type: 'change', cb: MqListener) {
    this.listeners.delete(cb);
  }
  set(matches: boolean) {
    this.matches = matches;
    for (const cb of this.listeners) cb({ matches });
  }
}

let currentMq: FakeMediaQuery;

function installMatchMedia(initialDark: boolean) {
  currentMq = new FakeMediaQuery(initialDark);
  vi.stubGlobal('matchMedia', (_q: string) => currentMq);
}

beforeEach(() => {
  document.documentElement.classList.remove('dark');
  useUiStore.setState({ theme: 'system' });
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.classList.remove('dark');
});

describe('ThemeProvider', () => {
  it("theme='light' removes the .dark class", () => {
    installMatchMedia(true);
    useUiStore.setState({ theme: 'light' });
    render(<ThemeProvider />);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it("theme='dark' adds the .dark class regardless of OS preference", () => {
    installMatchMedia(false);
    useUiStore.setState({ theme: 'dark' });
    render(<ThemeProvider />);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it("theme='system' follows the current OS preference at mount", () => {
    installMatchMedia(true);
    useUiStore.setState({ theme: 'system' });
    render(<ThemeProvider />);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it("theme='system' reacts to OS preference changes live", () => {
    installMatchMedia(false);
    useUiStore.setState({ theme: 'system' });
    render(<ThemeProvider />);
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    act(() => {
      currentMq.set(true);
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('non-system themes do NOT react to OS preference changes', () => {
    installMatchMedia(false);
    useUiStore.setState({ theme: 'light' });
    render(<ThemeProvider />);

    act(() => {
      currentMq.set(true);
    });
    // theme is light \xe2\x80\x94 OS flip must be ignored
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('updating the store re-applies the theme', () => {
    installMatchMedia(false);
    useUiStore.setState({ theme: 'light' });
    render(<ThemeProvider />);
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    act(() => {
      useUiStore.setState({ theme: 'dark' });
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('renders children unchanged', () => {
    installMatchMedia(false);
    useUiStore.setState({ theme: 'light' });
    const { getByText } = render(
      <ThemeProvider>
        <span>inner</span>
      </ThemeProvider>,
    );
    expect(getByText('inner')).toBeTruthy();
  });
});
