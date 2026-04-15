import { addVendor } from '@/features/vendors/services/vendorService';
import { useCloudSync } from '@/shared/hooks/useCloudSync';

interface Props { onClose: () => void; }

export default function VendorModal({ onClose }: Props) {
  const { pushSnapshot } = useCloudSync();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    addVendor(
      {
        name: fd.get('name') as string,
        city: fd.get('city') as string,
        email: fd.get('email') as string,
        phone: fd.get('phone') as string,
      },
      pushSnapshot,
    );
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box w-[440px]">
        <div className="flex items-center justify-between px-5 py-[18px] border-b border-border font-semibold text-sm">
          <span>Add Vendor</span>
          <button onClick={onClose} className="icon-btn !w-[26px] !h-[26px] !border-none cursor-pointer">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5">
          <div className="form-field"><label>Vendor Name</label><input type="text" name="name" placeholder="e.g. AWS India" required /></div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="form-field"><label>City</label><input type="text" name="city" placeholder="e.g. Mumbai" /></div>
            <div className="form-field"><label>Email</label><input type="email" name="email" placeholder="billing@vendor.com" /></div>
          </div>
          <div className="form-field"><label>Phone</label><input type="tel" name="phone" placeholder="+91 98765 43210" /></div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg text-[12.5px] font-medium bg-background border border-border cursor-pointer hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" className="px-3 py-2 rounded-lg text-[12.5px] font-medium bg-primary text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity">Add Vendor</button>
          </div>
        </form>
      </div>
    </div>
  );
}
