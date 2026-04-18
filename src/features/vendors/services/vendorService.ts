/**
 * vendorService – vendor business-logic service.
 */
import { useVendorStore }  from '../store/useVendorStore';
import { useInvoiceStore } from '@/features/invoices/store/useInvoiceStore';
import { useExpenseStore } from '@/features/expenses/store/useExpenseStore';
import { useClientStore }  from '@/features/clients/store/useClientStore';
import { useAppStore }     from '@/shared/stores/useAppStore';
import { useAuthStore }    from '@/features/auth/store/useAuthStore';
import { saveCloudData }   from '@/shared/services/firestoreService';
import type { Vendor } from '@/lib/types';

function pushCloudSnapshot(uid: string): void {
  const { invoices, nextInvId }   = useInvoiceStore.getState();
  const { expenses, nextExpId }   = useExpenseStore.getState();
  const { clients, nextClientId } = useClientStore.getState();
  const { vendors, nextVendorId } = useVendorStore.getState();
  const { profile }               = useAppStore.getState();
  saveCloudData(uid, {
    invoices, expenses, clients, vendors, profile,
    nextInvId, nextExpId, nextClientId, nextVendorId,
  }).catch(() => {});
}

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
