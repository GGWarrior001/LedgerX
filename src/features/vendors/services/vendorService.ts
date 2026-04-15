/**
 * Vendor service — orchestrates vendor operations between
 * the store and cloud sync.
 */
import { useVendorStore } from '@/features/vendors/store/useVendorStore';
import type { Vendor } from '@/shared/types';

export type AddVendorInput = Omit<Vendor, 'id' | 'initials' | 'color' | 'totalSpent'>;

export function addVendor(
  input: AddVendorInput,
  onCloudSync?: () => void,
): Vendor {
  const vendor = useVendorStore.getState().addVendor(input);
  onCloudSync?.();
  return vendor;
}
