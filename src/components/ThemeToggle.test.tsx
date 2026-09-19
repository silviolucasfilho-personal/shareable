import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from './ThemeToggle';
import { ThemeProvider } from '@/lib/theme-context';

describe('ThemeToggle component and ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('renders theme toggle button with accessible label', async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = await screen.findByRole('button', { name: /current theme/i });
    expect(button).toBeInTheDocument();
  });

  it('opens dropdown menu with Light, Dark, and System options', async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = await screen.findByRole('button', { name: /current theme/i });
    fireEvent.click(button);

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /light/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /dark/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /system/i })).toBeInTheDocument();
  });

  it('switches to dark mode when Dark is clicked', async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = await screen.findByRole('button', { name: /current theme/i });
    fireEvent.click(button);

    const darkOption = screen.getByRole('menuitem', { name: /dark/i });
    fireEvent.click(darkOption);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('shareable-theme')).toBe('dark');
  });

  it('switches to light mode when Light is clicked', async () => {
    localStorage.setItem('shareable-theme', 'dark');

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = await screen.findByRole('button', { name: /current theme/i });
    fireEvent.click(button);

    const lightOption = screen.getByRole('menuitem', { name: /light/i });
    fireEvent.click(lightOption);

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('shareable-theme')).toBe('light');
  });

  it('closes dropdown when clicking outside', async () => {
    render(
      <ThemeProvider>
        <div>
          <span data-testid="outside">Outside</span>
          <ThemeToggle />
        </div>
      </ThemeProvider>
    );

    const button = await screen.findByRole('button', { name: /current theme/i });
    fireEvent.click(button);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
