import { Invoice, Expense, Client, Vendor } from './types';

export const COLORS = ['#6366F1','#EC4899','#10B981','#F97316','#8B5CF6','#14B8A6','#F59E0B','#3B82F6','#EF4444','#0EA5E9'];

export function rnd<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

export function getInitials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
}

export function fmt(n: number): string { return n.toLocaleString('en-IN'); }

export function fmtDate(s: string): string {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function currentFY(fyPref: string): string {
  const now = new Date(); const yr = now.getFullYear(); const mo = now.getMonth() + 1;
  if (fyPref === 'Apr-Mar') return mo >= 4 ? `${yr}-${(yr+1).toString().slice(2)}` : `${yr-1}-${yr.toString().slice(2)}`;
  if (fyPref === 'Jul-Jun') return mo >= 7 ? `${yr}-${(yr+1).toString().slice(2)}` : `${yr-1}-${yr.toString().slice(2)}`;
  if (fyPref === 'Oct-Sep') return mo >= 10 ? `${yr}-${(yr+1).toString().slice(2)}` : `${yr-1}-${yr.toString().slice(2)}`;
  return yr.toString();
}

export function getGreeting(name: string): string {
  const h = new Date().getHours();
  const time = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${time}${name ? ', ' + name : ''} ✦`;
}

export const DEFAULT_INVOICES: Invoice[] = [
  {id:1,number:'INV-2025-0089',clientName:'TechMate Solutions',clientInitials:'TM',clientColor:'#6366F1',description:'Web Platform Development',issueDate:'2025-03-28',dueDate:'2025-04-27',status:'paid',amount:125000},
  {id:2,number:'INV-2025-0088',clientName:'NeoSpark Agency',clientInitials:'NS',clientColor:'#EC4899',description:'Brand Identity Design',issueDate:'2025-03-25',dueDate:'2025-04-24',status:'sent',amount:87500},
  {id:3,number:'INV-2025-0087',clientName:'DesignX Studio',clientInitials:'DX',clientColor:'#10B981',description:'UI/UX Consulting',issueDate:'2025-03-19',dueDate:'2025-03-18',status:'overdue',amount:60000},
  {id:4,number:'INV-2025-0086',clientName:'BluePrint Corp',clientInitials:'BP',clientColor:'#F97316',description:'Mobile App Development',issueDate:'2025-03-15',dueDate:'2025-04-14',status:'draft',amount:240000},
  {id:5,number:'INV-2025-0085',clientName:'Zephyr Labs',clientInitials:'ZL',clientColor:'#8B5CF6',description:'API Integration Services',issueDate:'2025-03-10',dueDate:'2025-04-09',status:'paid',amount:180000},
  {id:6,number:'INV-2025-0084',clientName:'Vanguard Tech',clientInitials:'VG',clientColor:'#14B8A6',description:'Cloud Migration Project',issueDate:'2025-03-05',dueDate:'2025-04-04',status:'sent',amount:95000},
];

export const DEFAULT_EXPENSES: Expense[] = [
  {id:1,description:'EC2 & S3 Hosting (March)',category:'Cloud & Hosting',vendor:'Amazon Web Services',date:'2025-03-22',receipt:'attached',amount:118400},
  {id:2,description:'Monthly Salaries (Mar)',category:'Payroll & HR',vendor:'Internal',date:'2025-03-01',receipt:'attached',amount:390000},
  {id:3,description:'Office Rent — Koramangala',category:'Office & Rent',vendor:'Prestige Properties',date:'2025-03-05',receipt:'pending',amount:85000},
  {id:4,description:'Slack Teams Plan',category:'Software & SaaS',vendor:'Salesforce Inc.',date:'2025-03-15',receipt:'attached',amount:4200},
  {id:5,description:'Google Ads Campaign',category:'Marketing & Ads',vendor:'Google India',date:'2025-03-20',receipt:'attached',amount:62600},
  {id:6,description:'Team Offsite Travel',category:'Travel & Meals',vendor:'MakeMyTrip',date:'2025-03-12',receipt:'pending',amount:42800},
];

export const DEFAULT_CLIENTS: Client[] = [
  {id:1,name:'TechMate Solutions',initials:'TM',color:'#6366F1',city:'Bangalore',email:'contact@techmate.io',phone:'+91 98765 43210',billed:840000,outstanding:0,invoices:12},
  {id:2,name:'NeoSpark Agency',initials:'NS',color:'#EC4899',city:'Mumbai',email:'hello@neospark.in',phone:'+91 87654 32109',billed:525000,outstanding:87500,invoices:7},
  {id:3,name:'DesignX Studio',initials:'DX',color:'#10B981',city:'Delhi',email:'info@designx.co',phone:'+91 76543 21098',billed:360000,outstanding:60000,invoices:6},
];

export const DEFAULT_VENDORS: Vendor[] = [
  {id:1,name:'Amazon Web Services',initials:'AW',color:'#F59E0B',city:'Bangalore',email:'aws-billing@amazon.com',phone:'+91 1800 419 0503',totalSpent:184200},
  {id:2,name:'Prestige Properties',initials:'PP',color:'#10B981',city:'Bangalore',email:'leasing@prestige.co.in',phone:'+91 80 2222 3333',totalSpent:85000},
  {id:3,name:'Salesforce Inc.',initials:'SI',color:'#8B5CF6',city:'Mumbai',email:'billing@salesforce.com',phone:'+91 1800 123 4567',totalSpent:38600},
  {id:4,name:'Google India',initials:'GI',color:'#3B82F6',city:'Hyderabad',email:'ads@google.com',phone:'+91 1800 419 0516',totalSpent:62600},
];

export const EXPENSE_CATEGORIES = [
  { name: 'Cloud & Hosting', emoji: '☁️' },
  { name: 'Payroll & HR', emoji: '👥' },
  { name: 'Software & SaaS', emoji: '📦' },
  { name: 'Office & Rent', emoji: '🏢' },
  { name: 'Travel & Meals', emoji: '✈️' },
  { name: 'Marketing & Ads', emoji: '📣' },
];

export const CURRENCY_OPTIONS = [
  { value: '₹', label: '₹ Indian Rupee (INR)' },
  { value: '$', label: '$ US Dollar (USD)' },
  { value: '€', label: '€ Euro (EUR)' },
  { value: '£', label: '£ British Pound (GBP)' },
  { value: '¥', label: '¥ Japanese Yen (JPY)' },
  { value: 'A$', label: 'A$ Australian Dollar (AUD)' },
];

export const FY_OPTIONS = [
  { value: 'Apr-Mar', label: 'April – March (India default)' },
  { value: 'Jan-Dec', label: 'January – December' },
  { value: 'Jul-Jun', label: 'July – June' },
  { value: 'Oct-Sep', label: 'October – September' },
];
