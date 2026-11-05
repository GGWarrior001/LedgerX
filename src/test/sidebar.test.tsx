import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar from '@/components/layout/Sidebar';

const { setActiveView } = vi.hoisted(() => ({
  setActiveView: vi.fn(),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => true,
}));

vi.mock('@/contexts/AppContext', () => ({
  useApp: () => ({
    activeView: 'dashboard',
    setActiveView,
    dark: false,
    toggleTheme: vi.fn(),
    profile: null,
    invoices: [],
  }),
}));

function MobileSidebarHarness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open menu
      </button>
      <Sidebar open={open} onOpenChange={setOpen} />
    </>
  );
}

describe('mobile sidebar', () => {
  beforeEach(() => {
    setActiveView.mockClear();
  });

  it('opens from the controlled trigger and closes through the drawer controls', async () => {
    render(<MobileSidebarHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    const overlay = document.querySelector('[data-state="open"].fixed.inset-0');
    expect(overlay).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('selects a navigation item and closes the drawer', async () => {
    render(<MobileSidebarHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(await screen.findByText('Reports'));

    expect(setActiveView).toHaveBeenCalledWith('reports');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
