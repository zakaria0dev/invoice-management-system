export interface Client {
  id: string | number;
  name: string;         // companyName / Raison sociale
  email: string;
  phone?: string;
  address?: string;
  ice?: string;
  creditBalance?: number;
  createdAt?: string;
}

export interface InvoiceItem {
  id?: string | number;
  description: string;
  quantity: number;
  price: number;
  tax: number;
}

export interface Invoice {
  id: string | number;
  number: string;
  date: string;
  dueDate: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'CREDITED' | 'SETTLED_WITH_RETURNS';
  total: number;
  notes?: string;
  clientId: string | number;
  client: Client;
  items: InvoiceItem[];
  currency: string;
  terms?: string;
  legalMentions?: string;
  remindersEnabled: boolean;
  signature?: string;
  isCancelled: boolean;
  payments?: any[];
  creditNotes?: CreditNote[];
  refunds?: any[];
}

export interface Quote {
  id: string | number;
  number: string;
  date: string;
  validUntil: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED' | 'VALIDATED' | 'REFUSED' | 'CANCELLED';
  total: number;
  notes?: string;
  clientId: string | number;
  client: Client;
  items: InvoiceItem[];
  currency: string;
  signature?: string;
  signatureDate?: string;
  signatureIp?: string;
  linkedInvoiceId?: string | number;
}

export interface CreditNote {
  id: string | number;
  number: string;
  date: string;
  status: 'DRAFT' | 'ISSUED' | 'APPLIED' | 'PARTIALLY_APPLIED' | 'REFUNDED';
  type?: 'ITEM' | 'PARTIAL' | 'FULL';
  taxAmount?: number;
  resolution?: 'Reduce_Balance' | 'Refund' | 'Customer_Credit' | 'Partially_Applied' | 'To_Be_Decided';
  total: number;
  notes?: string;
  clientId: string | number;
  client: Client;
  invoiceId?: string | number;
  invoice?: Invoice;
  items: InvoiceItem[];
  userId?: string | number;
  user?: { name?: string; email?: string; role?: string };
}

export interface CompanySettings {
  id: string | number;
  name: string;
  logo?: string;
  logoUrl?: string | null;
  address?: string;
  email?: string;
  phone?: string;
  iban?: string;
  tvaNumber?: string;
  defaultTVARate?: number;
  currency: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  defaultTerms?: string;
  defaultNotes?: string;
  legalMentions?: string;
  pdfTheme: string;
}

export interface Payment {
  id: string | number;
  invoiceId?: string | number;
  invoiceNumber?: string;
  clientName?: string;
  invoiceStatus?: string;
  amount: number;
  method: string;
  date: string;
  note?: string;
  creditNoteId?: string | number;
  creditNote?: CreditNote;
  isRefund?: boolean;
  refundId?: string | number;
  invoice?: Invoice;
  userId?: string | number;
  user?: { name?: string; email?: string; role?: string };
}

export interface ProductHistory {
  id: string | number;
  productId: string | number;
  productName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STOCK_ADJUST';
  changes?: any;
  userId?: string | number;
  createdAt: string;
}

export interface User {
  id: string | number;
  email: string;
  name?: string;
  avatarUrl?: string | null;
  role: 'ADMIN' | 'ACCOUNTANT' | 'USER';
  roleId?: string | number;
  permissions?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string | number;
  name: string;
  description?: string;
  priceHT: number | string;
  tva: number | string;
  unit?: string;
  category?: string;
  stock?: number;
  minStock?: number;
  imageUrl?: string;
  createdAt?: string;
}

export interface StockMovement {
  id: string | number;
  productId: string | number;
  quantity: number;
  type: 'MANUAL' | 'INVOICE' | 'REFUND' | 'DELETE' | 'CANCEL' | 'EDIT' | 'CREDIT_NOTE' | 'QUOTE_CREATE' | 'QUOTE_DELETE' | 'QUOTE_CANCEL' | 'QUOTE_EDIT';
  note?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityId?: string;
  entityType?: string;
  entityLabel?: string;
  details?: any;
  userId?: string;
  user?: User;
  ipAddress?: string;
  createdAt: string;
}
