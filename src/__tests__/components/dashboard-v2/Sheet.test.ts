// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Sheet, { type SheetProps } from '@/components/dashboard-v2/sheets/Sheet';

function renderSheet(overrides: Partial<SheetProps> = {}) {
  const onClose = vi.fn();
  const props: SheetProps = {
    title: 'Add due dates',
    description: 'Pick a day.',
    onClose,
    footer: createElement('button', { type: 'button' }, 'Save'),
    children: createElement('input', { 'aria-label': 'Day' }),
    ...overrides,
  };
  const view = render(createElement(Sheet, props));
  const rerender = (next: Partial<SheetProps>) => view.rerender(createElement(Sheet, { ...props, ...next }));
  return { ...view, onClose, rerender };
}

describe('Sheet', () => {
  it('renders a labelled, described modal dialog portaled to <body>', () => {
    renderSheet();
    const dialog = screen.getByRole('dialog', { name: 'Add due dates' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const describedBy = dialog.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(describedBy)?.textContent).toBe('Pick a day.');
    expect(dialog.parentElement?.parentElement).toBe(document.body);
  });

  it('moves focus to the title and gives it back on close', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const { unmount } = renderSheet();
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Add due dates' }));
    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('closes on Escape, the close button and the backdrop, but not on a click inside', () => {
    const { onClose } = renderSheet();
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.mouseDown(dialog);
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.mouseDown(dialog.parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('ignores every close while busy', () => {
    const { onClose } = renderSheet({ busy: true });
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement as HTMLElement);
    expect((screen.getByRole('button', { name: 'Close' }) as HTMLButtonElement).disabled).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps Tab inside the dialog', () => {
    renderSheet();
    const close = screen.getByRole('button', { name: 'Close' });
    const save = screen.getByRole('button', { name: 'Save' });
    save.focus();
    fireEvent.keyDown(save, { key: 'Tab' });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(save);
  });
});
