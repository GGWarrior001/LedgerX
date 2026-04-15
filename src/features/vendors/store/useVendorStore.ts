/**
 * Vendor store — manages vendor CRUD and persistence.
 */
import { create } from 'zustand';
import type { Vendor } from '@/shared/types';
import { storage } from '@/shared/services/storageService';
import { getInitials } from '@/shared/utils/format';
import { VENDOR_COLORS } from '@/shared/utils/constants';

interface VendorState {
  vendors: Vendor[];
  nextVendorId: number;
}

interface VendorActions {
  hydrate: () => void;
  addVendor: (ven: Omit<Vendor, 'id' | 'initials' | 'color' | 'totalSpent'>) => Vendor;
  setVendors: (vendors: Vendor[], nextId?: number) => void;
  reset: () => void;
  persist: () => void;
}

export const useVendorStore = create<VendorState & VendorActions>()((set, get) => ({
  vendors: [],
  nextVendorId: 1,

  hydrate: () => {
    set({
      vendors: storage.load<Vendor[]>('lx_vendors', []),
      nextVendorId: storage.load('lx_ven_id', 1),
    });
  },

  addVendor: (ven) => {
    const { nextVendorId: id, vendors } = get();
    const newVendor: Vendor = {
      ...ven,
      id,
      initials: getInitials(ven.name),
      color: VENDOR_COLORS[id % VENDOR_COLORS.length],
      totalSpent: 0,
    };

    set({ vendors: [...vendors, newVendor], nextVendorId: id + 1 });
    get().persist();
    return newVendor;
  },

  setVendors: (vendors, nextId) => {
    set(s => ({
      vendors,
      nextVendorId: nextId ?? s.nextVendorId,
    }));
    get().persist();
  },

  reset: () => {
    set({ vendors: [], nextVendorId: 1 });
    get().persist();
  },

  persist: () => {
    const { vendors, nextVendorId } = get();
    storage.save('lx_vendors', vendors);
    storage.save('lx_ven_id', nextVendorId);
  },
}));
