import { useInvoiceStore } from '@/features/invoices/store/useInvoiceStore';
import { useExpenseStore } from '@/features/expenses/store/useExpenseStore';
import { useClientStore } from '@/features/clients/store/useClientStore';
import { useVendorStore } from '@/features/vendors/store/useVendorStore';
import { useAppStore } from '@/shared/stores/useAppStore';
import { saveCloudData, type CloudData } from '@/shared/services/firestoreService';

export function buildCloudSnapshot(): CloudData {
  const { invoices, nextInvId } = useInvoiceStore.getState();
  const { expenses, nextExpId } = useExpenseStore.getState();
  const { clients, nextClientId } = useClientStore.getState();
  const { vendors, nextVendorId } = useVendorStore.getState();
  const { profile } = useAppStore.getState();

  return {
    invoices,
    expenses,
    clients,
    vendors,
    profile,
    nextInvId,
    nextExpId,
    nextClientId,
    nextVendorId,
  };
}

export function pushCloudSnapshot(uid: string): void {
  saveCloudData(uid, buildCloudSnapshot()).catch(() => {});
}
