/**
 * useVendorStore – Zustand store for the Vendors domain.
 */
import { create } from 'zustand';
import { storage } from '@/lib/storage';
import { getInitials } from '@/lib/constants';
import type { Vendor } from '@/lib/types';

const COLORS = [
  '#F59E0B','#10B981','#8B5CF6',
  '#3B82F6','#EC4899','#6366F1',
];

interface VendorStoreState {
  vendors:      Vendor[];
  nextVendorId: number;

  addVendor: (
    ven: Omit<Vendor, 'id' | 'initials' | 'color' | 'totalSpent'>
  ) => Vendor;

  hydrate: (vendors: Vendor[], nextId: number) => void;
  reset:   () => void;
}

export const useVendorStore = create<VendorStoreState>((set, get) => ({
  vendors:      storage.load<Vendor[]>('lx_vendors', []),
  nextVendorId: storage.load<number>('lx_ven_id', 1),

  addVendor: (ven) => {
    const { nextVendorId, vendors } = get();
    const id = nextVendorId;
    const newVendor: Vendor = {
      ...ven,
      id,
      initials:   getInitials(ven.name),
      color:      COLORS[id % COLORS.length],
      totalSpent: 0,
    };
    const newVendors = [...vendors, newVendor];
    const newId = id + 1;
    set({ vendors: newVendors, nextVendorId: newId });
    storage.save('lx_vendors', newVendors);
    storage.save('lx_ven_id', newId);
    return newVendor;
  },

  hydrate: (vendors, nextId) => {
    set({ vendors, nextVendorId: nextId });
    storage.save('lx_vendors', vendors);
    storage.save('lx_ven_id', nextId);
  },

  reset: () => {
    set({ vendors: [], nextVendorId: 1 });
    storage.save('lx_vendors', []);
    storage.save('lx_ven_id', 1);
  },
}));
