/**
 * useVendorStore – Zustand store for the Vendors domain.
 */
import { create } from 'zustand';
import { StorageLockedError, storage } from '@/lib/storage';
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

  updateVendorSpending: (vendorName: string, amount: number) => void;
  hydrate: (vendors: Vendor[], nextId: number) => void;
  reset:   () => void;
}

function loadStored<T>(key: string, defaultValue: T): T {
  try {
    return storage.load<T>(key, defaultValue);
  } catch (err) {
    if (err instanceof StorageLockedError) return defaultValue;
    throw err;
  }
}

export const useVendorStore = create<VendorStoreState>((set, get) => ({
  vendors:      loadStored<Vendor[]>('lx_vendors', []),
  nextVendorId: loadStored<number>('lx_ven_id', 1),

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

  updateVendorSpending: (vendorName, amount) => {
    if (!vendorName.trim()) return;
    set(s => {
      const vendors = s.vendors.map(v => (
        v.name === vendorName ? { ...v, totalSpent: v.totalSpent + amount } : v
      ));
      storage.save('lx_vendors', vendors);
      return { vendors };
    });
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
