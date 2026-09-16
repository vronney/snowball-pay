// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DebtForm from '@/components/DebtForm';

function fillStep0(name = 'Test Card') {
  fireEvent.change(screen.getByPlaceholderText('e.g. Chase Visa, Student Loan'), { target: { value: name } });
  fireEvent.change(screen.getByDisplayValue('Select debt type…'), { target: { value: 'Credit Card' } });
  fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
}

function fillStep1() {
  fireEvent.change(screen.getByPlaceholderText('5000'), { target: { value: '1200' } });
  fireEvent.change(screen.getByPlaceholderText('19.99'), { target: { value: '24.99' } });
  fireEvent.change(screen.getByPlaceholderText('150'), { target: { value: '40' } });
  fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
}

describe('DebtForm (add mode)', () => {
  it("keeps the typed values when onSubmit resolves to false (CodeRabbit C6)", async () => {
    const onSubmit = vi.fn().mockResolvedValue(false);
    render(createElement(DebtForm, { onSubmit, onCancel: vi.fn(), isLoading: false }));

    fillStep0();
    fillStep1();
    fireEvent.click(screen.getByRole('button', { name: /Add Debt/ }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());

    // Step 2's "Add Debt" click doesn't navigate away — the form should
    // still be on step 2, so go back to step 0 to check the name survived.
    fireEvent.click(screen.getByRole('button', { name: /Back/ }));
    fireEvent.click(screen.getByRole('button', { name: /Back/ }));
    // The reset decision runs after the mocked promise resolves — re-query
    // rather than read once, so a pending React flush doesn't race the read.
    await waitFor(() => {
      expect((screen.getByPlaceholderText('e.g. Chase Visa, Student Loan') as HTMLInputElement).value).toBe('Test Card');
    });
  });

  it('resets the typed values when onSubmit succeeds', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(createElement(DebtForm, { onSubmit, onCancel: vi.fn(), isLoading: false }));

    fillStep0();
    fillStep1();
    fireEvent.click(screen.getByRole('button', { name: /Add Debt/ }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    // A successful submit resets formData but not the wizard's own step
    // state, so step 2 is still showing — go back to step 0 to check.
    fireEvent.click(screen.getByRole('button', { name: /Back/ }));
    fireEvent.click(screen.getByRole('button', { name: /Back/ }));
    await waitFor(() => {
      expect((screen.getByPlaceholderText('e.g. Chase Visa, Student Loan') as HTMLInputElement).value).toBe('');
    });
  });
});
