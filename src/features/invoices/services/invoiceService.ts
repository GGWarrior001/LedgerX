/**
 * Invoice service — orchestrates invoice operations between
 * the store, cloud sync, and notification refresh.
 */
import { useInvoiceStore } from '@/features/invoices/store/useInvoiceStore';
import { useAppStore } from '@/shared/stores/useAppStore';
import type { Invoice } from '@/shared/types';

export type AddInvoiceInput = Omit<Invoice, 'id' | 'number' | 'clientInitials' | 'clientColor'>;

export function addInvoice(
  input: AddInvoiceInput,
  callbacks?: { onCloudSync?: () => void; onPushEntry?: (inv: Invoice) => void },
): Invoice {
  const invoice = useInvoiceStore.getState().addInvoice(input);

  // Refresh notifications since invoice status may trigger overdue/pending alerts
  useAppStore.getState().refreshNotifications(useInvoiceStore.getState().invoices);

  callbacks?.onCloudSync?.();
  callbacks?.onPushEntry?.(invoice);
  return invoice;
}
