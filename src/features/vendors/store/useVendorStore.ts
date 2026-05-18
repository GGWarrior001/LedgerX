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
  ) => Promise<Vendor>;

  updateVendorSpending: (vendorName: string, amount: number) => Promise<void>;
  hydrate: (vendors: Vendor[], nextId: number) => Promise<void>;
  reset:   () => Promise<void>;
}

function canPersistEncryptedData(): boolean {
  return !storage.isEncryptionSetup() || storage.isUnlocked();
}

export const useVendorStore = create<VendorStoreState>((set, get) => ({
  vendors:      [],
  nextVendorId: 1,

  addVendor: async (ven) => {
    if (!canPersistEncryptedData()) return { ...ven, id: 0, initials: '', color: '', totalSpent: 0 } as Vendor;
    
    try {
      const freshState = get();
      const { nextVendorId, vendors } = freshState;
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
      
      // Atomically save both keys before updating state
      await storage.save('lx_vendors', newVendors);
      await storage.save('lx_ven_id', newId);
      
      // Only update state after persistence succeeds
      set({ vendors: newVendors, nextVendorId: newId });
      return newVendor;
    } catch (err) {
      console.error('[LedgerX] Failed to add vendor:', err);
      throw err;
    }
  },

  updateVendorSpending: async (vendorName, amount) => {
    if (!vendorName.trim()) return;
    if (!canPersistEncryptedData()) return;
    
    try {
      const freshState = get();
      const vendors = freshState.vendors.map(v => (
        v.name === vendorName ? { ...v, totalSpent: v.totalSpent + amount } : v
      ));
      
      // Await persistence before state update
      await storage.save('lx_vendors', vendors);
      set({ vendors });
    } catch (err) {
      console.error('[LedgerX] Failed to update vendor spending:', err);
      throw err;
    }
  },

  hydrate: async (vendors, nextId) => {
    try {
      await storage.save('lx_vendors', vendors);
      await storage.save('lx_ven_id', nextId);
      set({ vendors, nextVendorId: nextId });
    } catch (err) {
      console.error('[LedgerX] Failed to hydrate vendors:', err);
      throw err;
    }
  },

  reset: async () => {
    try {
      await storage.save('lx_vendors', []);
      await storage.save('lx_ven_id', 1);
      set({ vendors: [], nextVendorId: 1 });
    } catch (err) {
      console.error('[LedgerX] Failed to reset vendors:', err);
      throw err;
    }
  },
}));
