/**
 * vendorService – vendor business-logic service.
 */
import { useVendorStore }  from '../store/useVendorStore';
import { useAuthStore }    from '@/features/auth/store/useAuthStore';
import { pushCloudSnapshot } from '@/shared/services/cloudSnapshot';
import type { Vendor } from '@/lib/types';

export const vendorService = {
  addVendor(
    ven: Omit<Vendor, 'id' | 'initials' | 'color' | 'totalSpent'>,
  ): Vendor {
    const newVendor = useVendorStore.getState().addVendor(ven);

    const uid = useAuthStore.getState().user?.uid;
    if (uid) pushCloudSnapshot(uid);

    return newVendor;
  },
};
