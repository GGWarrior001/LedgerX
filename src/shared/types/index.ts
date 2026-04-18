export interface Invoice {
  id: number;
  number: string;
  clientName: string;
  clientInitials: string;
  clientColor: string;
  description: string;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  amount: number;
}

export interface Expense {
  id: number;
  description: string;
  category: string;
  vendor: string;
  date: string;
  receipt: 'attached' | 'pending';
  amount: number;
}

export interface Client {
  id: number;
  name: string;
  initials: string;
  color: string;
  city: string;
  email: string;
  phone: string;
  billed: number;
  outstanding: number;
  invoices: number;
}

export interface Vendor {
  id: number;
  name: string;
  initials: string;
  color: string;
  city: string;
  email: string;
  phone: string;
  totalSpent: number;
}

export interface Profile {
  name: string;
  role: string;
  city: string;
  businessName: string;
  fiscalYear: string;
  currency: string;
  dataChoice: string;
}

export interface Notification {
  id: number;
  title: string;
  sub: string;
  read: boolean;
  type: 'danger' | 'warning' | 'info';
}

export interface AppSettings {
  sessionTimeout: number; // minutes
  privacyMode: boolean;
  encryptionEnabled: boolean;
}

export type ViewId = 'dashboard' | 'invoices' | 'expenses' | 'clients' | 'vendors' | 'reports' | 'ledger' | 'settings';

/** Shape of the full cloud-synced data snapshot */
export interface CloudData {
  invoices: Invoice[];
  expenses: Expense[];
  clients: Client[];
  vendors: Vendor[];
  profile: Profile | null;
  nextInvId: number;
  nextExpId: number;
  nextClientId: number;
  nextVendorId: number;
}

/** Ledger entry stored in Firestore sub-collection */
export type EntryType = 'invoice' | 'expense';

export interface LedgerEntry {
  entryType: EntryType;
  data: Invoice | Expense;
}
