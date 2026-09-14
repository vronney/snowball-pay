import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import NotificationPanel from '@/components/dashboard/NotificationPanel';
import { V2_TAB_LABELS } from '@/components/dashboard-v2/shell/navItems';

// V2Header's MOBILE_TARGETS lifts the bell to 44px on mobile through the
// selector `button[aria-label='Notifications']`. If this label changes, update
// that selector too, or the bell silently drops below the touch-target minimum.
// Static markup is enough here: the label is rendered, and the component's
// effects (window.matchMedia) never run.
describe('NotificationPanel trigger label (coupled to V2Header MOBILE_TARGETS)', () => {
  it('labels the bell button "Notifications"', () => {
    const html = renderToStaticMarkup(createElement(NotificationPanel, {
      notifications: [],
      onNavigate: vi.fn(),
      onMarkPaid: vi.fn(),
      tabLabels: V2_TAB_LABELS,
    }));
    expect(html).toMatch(/<button[^>]*aria-label="Notifications"/);
  });
});
