'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface PlaidLinkModalProps {
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
}

/**
 * PlaidLinkModal is a minimal wrapper.
 * The actual Plaid Link modal is rendered by react-plaid-link library.
 * This component manages the backdrop (portaled to body to escape the
 * header's backdrop-filter stacking context) and close via Escape key.
 */
export default function PlaidLinkModal({
  isOpen,
  isLoading,
  onClose,
}: PlaidLinkModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[998]"
      onClick={onClose}
      aria-hidden="true"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}
    />,
    document.body
  );
}
