/**
 * vendorService – vendor business-logic service.
 */
import { useVendorStore }  from '../store/useVendorStore';
import { useAuthStore }    from '@/features/auth/store/useAuthStore';
import { pushCloudSnapshot } from '@/shared/services/cloudSnapshot';
import type { Vendor } from '@/lib/types';

export const vendorService = {
  async addVendor(
    ven: Omit<Vendor, 'id' | 'initials' | 'color' | 'totalSpent'>,
  ): Promise<Vendor> {
    try {
      const newVendor = await useVendorStore.getState().addVendor(ven);

      const uid = useAuthStore.getState().user?.uid;
      if (uid) pushCloudSnapshot(uid);

      return newVendor;
    } catch (err) {
      console.error('[LedgerX] Failed to add vendor:', err);
      throw err;
    }
  },
};
