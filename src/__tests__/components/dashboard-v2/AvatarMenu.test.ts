// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { runLogoutClientCleanup } from '@/lib/logout-client';
import AvatarMenu from '@/components/dashboard-v2/shell/AvatarMenu';

vi.mock('next/image', async () => {
  const { createElement: h } = await import('react');
  return { default: (p: { src: string; alt: string }) => h('img', { src: p.src, alt: p.alt }) };
});
vi.mock('@/lib/logout-client', () => ({ LOGOUT_URL: '/auth/logout', runLogoutClientCleanup: vi.fn() }));

function renderMenu() {
  const onSelectTab = vi.fn();
  render(createElement(AvatarMenu, {
    user: { name: 'Test User', email: 't@example.com', picture: null }, initials: 'TE', onSelectTab,
  }));
  const trigger = screen.getByRole('button', { name: 'Account menu' });
  return { onSelectTab, trigger };
}

describe('AvatarMenu', () => {
  it('starts closed', () => {
    const { trigger } = renderMenu();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens with Income & Budget, Settings and Sign out, focusing the first', () => {
    const { trigger } = renderMenu();
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const items = screen.getAllByRole('menuitem');
    expect(items.map((i) => i.textContent)).toEqual(['Income & Budget', 'Settings', 'Sign out']);
    expect(document.activeElement).toBe(items[0]);
  });

  it('navigates, closes and returns focus to the trigger', () => {
    const { onSelectTab, trigger } = renderMenu();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Settings' }));
    expect(onSelectTab).toHaveBeenCalledWith('settings');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('moves focus with the arrow keys and closes on Escape', () => {
    const { trigger } = renderMenu();
    fireEvent.click(trigger);
    const menu = screen.getByRole('menu');
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Settings' }));
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Sign out' }));
    fireEvent.keyDown(menu, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on a press outside', () => {
    const { trigger } = renderMenu();
    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('signs out through the shared logout URL and cleanup', () => {
    const { trigger } = renderMenu();
    fireEvent.click(trigger);
    const signOut = screen.getByRole('menuitem', { name: 'Sign out' });
    expect(signOut.getAttribute('href')).toBe('/auth/logout');
    fireEvent.click(signOut);
    expect(runLogoutClientCleanup).toHaveBeenCalledTimes(1);
  });
});
