import { Client, Invoice, Quote, Payment } from '@/types';

export const mockClients: Client[] = [
  { id: '1', name: 'Sarah Johnson', email: 'sarah@techcorp.com', phone: '+1 555-0101', company: 'TechCorp Inc.', address: '123 Silicon Ave, San Francisco, CA', createdAt: '2025-01-15' },
  { id: '2', name: 'Michael Chen', email: 'michael@designlab.io', phone: '+1 555-0102', company: 'DesignLab', address: '456 Creative Blvd, New York, NY', createdAt: '2025-02-03' },
  { id: '3', name: 'Emma Williams', email: 'emma@greenco.com', phone: '+1 555-0103', company: 'GreenCo Solutions', address: '789 Eco Drive, Portland, OR', createdAt: '2025-02-20' },
  { id: '4', name: 'James Rodriguez', email: 'james@buildright.com', phone: '+1 555-0104', company: 'BuildRight LLC', address: '321 Construction Way, Austin, TX', createdAt: '2025-03-01' },
  { id: '5', name: 'Olivia Brown', email: 'olivia@mediapro.com', phone: '+1 555-0105', company: 'MediaPro Agency', address: '654 Broadcast St, Los Angeles, CA', createdAt: '2025-03-10' },
];

export const mockInvoices: Invoice[] = [
  { id: '1', number: 'INV-001', clientId: '1', client: mockClients[0], items: [{ description: 'Web Development', quantity: 40, price: 150, tax: 20 }, { description: 'UI/UX Design', quantity: 20, price: 120, tax: 20 }], total: 9240, status: 'PAID', date: '2025-12-01', dueDate: '2025-12-31', currency: 'MAD', remindersEnabled: true },
  { id: '2', number: 'INV-002', clientId: '2', client: mockClients[1], items: [{ description: 'Brand Strategy', quantity: 1, price: 5000, tax: 20 }], total: 6000, status: 'SENT', date: '2026-01-15', dueDate: '2026-02-14', currency: 'MAD', remindersEnabled: true },
  { id: '3', number: 'INV-003', clientId: '3', client: mockClients[2], items: [{ description: 'SEO Optimization', quantity: 1, price: 3000, tax: 20 }, { description: 'Content Writing', quantity: 10, price: 200, tax: 20 }], total: 6000, status: 'OVERDUE', date: '2025-11-01', dueDate: '2025-12-01', currency: 'MAD', remindersEnabled: true },
  { id: '4', number: 'INV-004', clientId: '4', client: mockClients[3], items: [{ description: 'Mobile App Development', quantity: 1, price: 15000, tax: 20 }], total: 18000, status: 'DRAFT', date: '2026-02-20', dueDate: '2026-03-20', currency: 'MAD', remindersEnabled: true },
  { id: '5', number: 'INV-005', clientId: '5', client: mockClients[4], items: [{ description: 'Video Production', quantity: 3, price: 2500, tax: 20 }], total: 9000, status: 'PAID', date: '2026-01-05', dueDate: '2026-02-05', currency: 'MAD', remindersEnabled: true },
  { id: '6', number: 'INV-006', clientId: '1', client: mockClients[0], items: [{ description: 'Maintenance & Support', quantity: 1, price: 2000, tax: 20 }], total: 2400, status: 'SENT', date: '2026-02-01', dueDate: '2026-03-01', currency: 'MAD', remindersEnabled: true },
];

export const mockQuotes: Quote[] = [
  { id: '1', number: 'QT-001', clientId: '1', client: mockClients[0], items: [{ description: 'E-commerce Platform', quantity: 1, price: 25000, tax: 20 }], total: 30000, status: 'SENT', date: '2026-02-15', validUntil: '2026-03-15', currency: 'MAD' },
  { id: '2', number: 'QT-002', clientId: '3', client: mockClients[2], items: [{ description: 'Marketing Campaign', quantity: 1, price: 8000, tax: 20 }], total: 9600, status: 'ACCEPTED', date: '2026-01-20', validUntil: '2026-02-20', currency: 'MAD' },
  { id: '3', number: 'QT-003', clientId: '5', client: mockClients[4], items: [{ description: 'Social Media Management', quantity: 6, price: 1500, tax: 20 }], total: 10800, status: 'DRAFT', date: '2026-02-28', validUntil: '2026-03-28', currency: 'MAD' },
];

export const mockPayments: Payment[] = [
  { id: '1', invoiceId: '1', invoiceNumber: 'INV-001', clientName: 'TechCorp Inc.', amount: 9240, method: 'BANK_TRANSFER', date: '2025-12-28' },
  { id: '2', invoiceId: '5', invoiceNumber: 'INV-005', clientName: 'MediaPro Agency', amount: 8250, method: 'OTHER', date: '2026-02-01' },
  { id: '3', invoiceId: '2', invoiceNumber: 'INV-002', clientName: 'DesignLab', amount: 2750, method: 'BANK_TRANSFER', date: '2026-02-10' },
  { id: '4', invoiceId: '3', invoiceNumber: 'INV-003', clientName: 'GreenCo Solutions', amount: 5500, method: 'CHECK', date: '2026-01-15' },
];

export const revenueData = [
  { month: 'Sep', revenue: 12400 },
  { month: 'Oct', revenue: 18200 },
  { month: 'Nov', revenue: 14800 },
  { month: 'Dec', revenue: 22100 },
  { month: 'Jan', revenue: 19500 },
  { month: 'Feb', revenue: 26300 },
];
