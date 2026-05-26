import { create } from 'zustand';
import { Client, Invoice, Quote, Payment, User, Product, CreditNote, CompanySettings } from '@/types';
import api from '@/lib/api';

interface AppState {
  user: User | null;
  clients: Client[];
  products: Product[];
  invoices: Invoice[];
  quotes: Quote[];
  creditNotes: CreditNote[];
  payments: Payment[];
  users: User[];
  refunds: any[];
  settings: CompanySettings | null;
  isDarkMode: boolean;
  sidebarOpen: boolean;
  isLoading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  dashboardStats: {
    totalRevenue: number;
    pendingAmount: number;
    totalInvoices: number;
    overdueInvoices: number;
    totalClients: number;
    statusDistribution: Record<string, number>;
    revenueGrowth: string;
    cashFlow: Array<{ name: string; income: number; expense: number; sortDate: number }>;
    topClients?: Array<{ clientId: string; name: string; _sum: { total: number } }>;
    topProducts?: Array<{ productId: string; name: string; _count: { _all: number } }>;
  } | null;
  isInitialized: boolean;

  // Auth
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;

  // Data Fetching
  fetchDashboardData: () => Promise<void>;
  fetchClients: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  fetchInvoices: () => Promise<void>;
  fetchQuotes: () => Promise<void>;
  fetchCreditNotes: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  fetchUsers: () => Promise<void>;
  fetchPayments: () => Promise<void>;
  fetchRefunds: () => Promise<void>;

  // Theme
  toggleDarkMode: () => void;
  toggleSidebar: () => void;

  // Clients
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => Promise<void>;
  updateClient: (id: string | number, client: Partial<Client>) => Promise<void>;
  deleteClient: (id: string | number) => Promise<void>;
  bulkDeleteClients: (ids: string[]) => Promise<void>;
  exportClients: (format: 'csv' | 'excel') => Promise<void>;
  importClients: (file: File) => Promise<{ imported: number; errors: any[] }>;
  getImportTemplate: () => Promise<void>;

  // Products
  addProduct: (product: any) => Promise<any>;
  updateProduct: (id: string | number, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string | number) => Promise<void>;
  adjustProductStock: (id: string | number, quantity: number, type?: 'MANUAL' | 'INVOICE', note?: string) => Promise<void>;
  getProductHistory: (id: string | number) => Promise<any[]>;
  uploadProductImage: (id: string | number, file: File) => Promise<void>;

  // Invoices
  addInvoice: (invoice: any) => Promise<void>;
  updateInvoice: (id: string | number, data: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string | number) => Promise<void>;
  sendInvoiceEmail: (id: string | number) => Promise<void>;
  downloadInvoicePDF: (id: string | number, number: string) => Promise<void>;
  exportInvoices: (format: 'csv' | 'excel', params?: { ids?: string[], startDate?: string, endDate?: string, status?: string }) => Promise<void>;
  bulkUpdateInvoicesStatus: (ids: string[], status: string) => Promise<void>;
  bulkDeleteInvoices: (ids: string[]) => Promise<void>;
  refundInvoice: (id: string | number, reason?: string, items?: any[], refundToCreditBalance?: boolean) => Promise<void>;

  // Quotes
  addQuote: (quote: any) => Promise<void>;
  updateQuote: (id: string | number, data: Partial<Quote>) => Promise<void>;
  deleteQuote: (id: string | number) => Promise<void>;
  rejectQuote: (id: string | number) => Promise<void>;
  convertQuoteToInvoice: (quoteId: string | number) => Promise<void>;
  submitQuoteSignature: (id: string | number, signature: string) => Promise<void>;
  sendQuoteEmail: (id: string | number) => Promise<void>;
  downloadQuotePDF: (id: string | number, number: string) => Promise<void>;
  exportQuotes: (format: 'csv' | 'excel', params?: { ids?: string[], startDate?: string, endDate?: string, status?: string }) => Promise<void>;
  bulkDeleteQuotes: (ids: string[]) => Promise<void>;

  // Payments
  addPayment: (payment: { invoiceId?: string | number; creditNoteId?: string | number; amount: number; method: string; date?: string; note?: string }) => Promise<void>;

  // Credit Notes
  createCreditNote: (invoiceId: string | number, data?: any) => Promise<void>;
  deleteCreditNote: (id: string | number) => Promise<void>;
  downloadCreditNotePDF: (id: string | number, number: string) => Promise<void>;
  sendCreditNoteEmail: (id: string | number) => Promise<void>;
  applyCreditNoteToLedger: (id: string | number) => Promise<void>;
  refundCreditNote: (id: string | number) => Promise<void>;

  // Settings
  updateSettings: (data: Partial<CompanySettings>) => Promise<void>;

  // Users
  addUser: (data: any) => Promise<void>;
  updateUser: (id: string | number, data: any) => Promise<void>;
  deleteUser: (id: string | number) => Promise<void>;
  verifyPassword: (password: string) => Promise<boolean>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateProfile: (data: { name?: string; email?: string }) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  downloadRefundPDF: (id: string | number) => Promise<void>;
  sendRefundEmail: (id: string | number) => Promise<void>;
  optimisticUpdateInvoice: (id: string | number, data: Partial<Invoice>) => void;
  can: (permission: string) => boolean;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  clients: [],
  products: [],
  invoices: [],
  quotes: [],
  creditNotes: [],
  payments: [],
  refunds: [],
  users: [],
  settings: null,
  isDarkMode: localStorage.getItem('theme') === 'dark',
  sidebarOpen: false,
  isLoading: false,
  error: null,
  isInitialized: false,
  dashboardStats: null,

  setError: (error) => set({ error }),

  can: (permission: string) => {
    const { user } = get();
    if (!user) return false;
    const role = typeof user.role === 'string' ? user.role : (user.role as any)?.name;
    if (role?.toUpperCase() === 'ADMIN') return true;
    const userPermissions = user.permissions || [];
    return userPermissions.includes(permission);
  },

  login: async (email, password) => {
    try {
      set({ isLoading: true });
      const response = await api.post('/auth/login', { email, password });
      const { token, data } = response.data;
      localStorage.setItem('token', token);
      set({ user: data.user, isLoading: false });
      return true;
    } catch (error: any) {
      console.error('Login Error:', error.response?.data || error.message);
      set({ isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, clients: [], invoices: [], quotes: [], payments: [], users: [] });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isInitialized: true });
      return;
    }
    try {
      const response = await api.get('/auth/me');
      set({ user: response.data.data.user, isInitialized: true });
    } catch (error) {
      get().logout();
      set({ isInitialized: true });
      window.location.href = '/login';
    }
  },

  fetchDashboardData: async () => {
    if (!get().can('reports.view')) return;
    try {
      set({ error: null });
      const response = await api.get('/dashboard/stats');
      set({ dashboardStats: response.data.data });
    } catch (error: any) {
      if (error.response?.status === 403) {
        set({ dashboardStats: null, isLoading: false });
        return;
      }
      console.error('Failed to fetch dashboard data:', error);
      set({ error: 'Failed to load dashboard data. Please try again.' });
    }
  },

  fetchClients: async () => {
    if (!get().can('clients.view')) return;
    try {
      set({ isLoading: true, error: null });
      const response = await api.get('/clients');
      set({ clients: response.data.data.clients, isLoading: false });
    } catch (error: any) {
      if (error.response?.status === 403) {
        set({ clients: [], isLoading: false });
        return;
      }
      console.error('Failed to fetch clients:', error);
      set({ error: 'Failed to load clients.', isLoading: false });
    }
  },

  fetchProducts: async () => {
    if (!get().can('products.view')) return;
    try {
      set({ isLoading: true, error: null });
      const response = await api.get('/products');
      set({ products: response.data.data.products, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch products:', error);
      set({ error: 'Failed to load products.', isLoading: false });
    }
  },

  fetchInvoices: async () => {
    if (!get().can('invoices.view')) return;
    try {
      set({ isLoading: true, error: null });
      const response = await api.get('/invoices');
      set({ invoices: response.data.data.invoices, isLoading: false });
    } catch (error: any) {
      if (error.response?.status === 403) {
        set({ isLoading: false });
        return;
      }
      console.error('Failed to fetch invoices:', error);
      set({ error: 'Failed to load invoices.', isLoading: false });
    }
  },

  fetchQuotes: async () => {
    if (!get().can('quotes.view')) return;
    try {
      set({ isLoading: true, error: null });
      const response = await api.get('/quotes');
      set({ quotes: response.data.data.quotes, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
      set({ error: 'Failed to load quotes.', isLoading: false });
    }
  },

  fetchCreditNotes: async () => {
    if (!get().can('creditnotes.view')) return;
    try {
      set({ isLoading: true, error: null });
      const response = await api.get('/credit-notes');
      set({ creditNotes: response.data.data.creditNotes, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch credit notes:', error);
      set({ error: 'Failed to load credit notes.', isLoading: false });
    }
  },

  fetchSettings: async () => {
    if (!get().can('settings.view')) return;

    try {
      set({ isLoading: true, error: null });
      const response = await api.get('/settings');
      if (response.data?.data?.settings) {
        set({ settings: response.data.data.settings, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        set({ settings: null, isLoading: false });
        return;
      }
      console.error('Failed to fetch settings:', error);
      set({ error: 'Failed to load settings.', isLoading: false });
    }
  },

  fetchUsers: async () => {
    if (!get().can('users.view')) return;
    try {
      set({ isLoading: true, error: null });
      const response = await api.get('/users');
      set({ users: response.data.data.users, isLoading: false });
    } catch (error: any) {
      if (error.response?.status === 403) {
        set({ users: [], isLoading: false });
        return;
      }
      console.error('Failed to fetch users:', error);
      set({ error: 'Failed to load users.', isLoading: false });
    }
  },

  fetchPayments: async () => {
    if (!get().can('payments.view')) return;
    try {
      set({ isLoading: true, error: null });
      const response = await api.get('/payments');
      set({ payments: response.data.data.payments, isLoading: false });
    } catch (error: any) {
      if (error.response?.status === 403) {
        set({ payments: [], isLoading: false });
        return;
      }
      console.error('Failed to fetch payments:', error);
      set({ error: 'Failed to load payments.', isLoading: false });
    }
  },

  fetchRefunds: async () => {
    if (!get().can('payments.view')) return;
    try {
      set({ isLoading: true, error: null });
      const response = await api.get('/invoices/refunds/all');
      set({ refunds: response.data.data.refunds, isLoading: false });
    } catch (error: any) {
      if (error.response?.status === 403) {
        set({ refunds: [], isLoading: false });
        return;
      }
      console.error('Failed to fetch refunds:', error);
      set({ error: 'Failed to load refunds.', isLoading: false });
    }
  },

  toggleDarkMode: () => {
    set((state) => {
      const newMode = !state.isDarkMode;
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', newMode);
      return { isDarkMode: newMode };
    });
  },

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  addClient: async (client) => {
    await api.post('/clients', client);
    await get().fetchClients();
  },

  updateClient: async (id, data) => {
    // API is expecting a PUT based on backend routes, but changing to put to match or leaving patch if server supports it.
    await api.put(`/clients/${id}`, data);
    await get().fetchClients();
  },

  deleteClient: async (id) => {
    await api.delete(`/clients/${id}`);
    await get().fetchClients();
  },

  bulkDeleteClients: async (ids) => {
    await Promise.all(ids.map(id => api.delete(`/clients/${id}`)));
    await get().fetchClients();
  },

  exportClients: async (format) => {
    const response = await api.get(`/clients/export?format=${format}`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `clients.${format === 'csv' ? 'csv' : 'xlsx'}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  importClients: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/clients/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    await get().fetchClients();
    return response.data.data;
  },

  getImportTemplate: async () => {
    const response = await api.get('/clients/template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'clients_template.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  addProduct: async (product) => {
    const response = await api.post('/products', product);
    await get().fetchProducts();
    return response.data?.data?.product?.id;
  },

  updateProduct: async (id, data) => {
    await api.put(`/products/${id}`, data);
    await get().fetchProducts();
  },

  deleteProduct: async (id) => {
    await api.delete(`/products/${id}`);
    await get().fetchProducts();
  },

  adjustProductStock: async (id, quantity, type = 'MANUAL', note) => {
    await api.post(`/products/${id}/adjust-stock`, { quantity, type, note });
    await get().fetchProducts();
  },

  getProductHistory: async (id) => {
    const response = await api.get(`/products/${id}/history`);
    return response.data.data.history;
  },

  uploadProductImage: async (id, file) => {
    const formData = new FormData();
    formData.append('image', file);
    await api.post(`/products/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    await get().fetchProducts();
  },

  addInvoice: async (invoice) => {
    await api.post('/invoices', invoice);
    await get().fetchInvoices();
    await get().fetchClients();
  },

  updateInvoice: async (id, data) => {
    await api.patch(`/invoices/${id}`, data);
    await get().fetchInvoices();
    await get().fetchClients();
  },

  deleteInvoice: async (id) => {
    await api.delete(`/invoices/${id}`);
    await get().fetchInvoices();
  },

  bulkUpdateInvoicesStatus: async (ids, status) => {
    try {
      set({ isLoading: true });
      await api.patch('/invoices/bulk-status', { ids, status });
      await get().fetchInvoices();
      await get().fetchClients();
      set({ isLoading: false });
    } catch (error) {
      console.error('Bulk update error:', error);
      set({ error: 'Failed to update invoices status.', isLoading: false });
      throw error;
    }
  },

  bulkDeleteInvoices: async (ids) => {
    try {
      set({ isLoading: true });
      await api.post('/invoices/bulk-delete', { ids });
      await get().fetchInvoices();
      set({ isLoading: false });
    } catch (error) {
      console.error('Bulk delete error:', error);
      set({ error: 'Failed to delete invoices.', isLoading: false });
      throw error;
    }
  },

  refundInvoice: async (id, reason, items, refundToCreditBalance) => {
    await api.post(`/invoices/${id}/refund`, { reason, items, refundToCreditBalance });
    await get().fetchInvoices();
    await get().fetchDashboardData();
    await get().fetchProducts();
    await get().fetchPayments();
    if (get().fetchRefunds) await get().fetchRefunds();
    await get().fetchClients(); // Fetch clients to update credit balance
  },

  sendInvoiceEmail: async (id) => {
    await api.post(`/invoices/${id}/send`);
  },

  downloadInvoicePDF: async (id, number) => {
    const response = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `invoice-${number}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  exportInvoices: async (format, params) => {
    const query = new URLSearchParams({ format });
    if (params?.ids) query.append('ids', params.ids.join(','));
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.status) query.append('status', params.status);

    const response = await api.get(`/exports/invoices?${query.toString()}`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `invoices.${format === 'csv' ? 'csv' : 'xlsx'}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  addQuote: async (quote) => {
    await api.post('/quotes', quote);
    await get().fetchQuotes();
  },

  updateQuote: async (id, data) => {
    await api.patch(`/quotes/${id}`, data);
    await get().fetchQuotes();
  },

  deleteQuote: async (id) => {
    await api.delete(`/quotes/${id}`);
    await get().fetchQuotes();
  },

  rejectQuote: async (id) => {
    await api.post(`/quotes/${id}/reject`);
    await get().fetchQuotes();
  },

  bulkDeleteQuotes: async (ids) => {
    await Promise.all(ids.map(id => api.delete(`/quotes/${id}`)));
    await get().fetchQuotes();
  },

  convertQuoteToInvoice: async (quoteId) => {
    await api.post(`/quotes/${quoteId}/convert`);
    await get().fetchQuotes();
    await get().fetchInvoices();
  },

  sendQuoteEmail: async (id) => {
    await api.post(`/quotes/${id}/send`);
  },

  submitQuoteSignature: async (id, signature) => {
    await api.post(`/quotes/${id}/signature`, { signature });
    await get().fetchQuotes();
  },

  downloadQuotePDF: async (id, number) => {
    const response = await api.get(`/quotes/${id}/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `quote-${number}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  exportQuotes: async (format, params) => {
    const query = new URLSearchParams({ format });
    if (params?.ids) query.append('ids', params.ids.join(','));
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.status) query.append('status', params.status);

    const response = await api.get(`/exports/quotes?${query.toString()}`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `quotes.${format === 'csv' ? 'csv' : 'xlsx'}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  addPayment: async (payment) => {
    await api.post('/payments', payment);
    await get().fetchPayments();
    if (payment.invoiceId) await get().fetchInvoices();
    if (payment.creditNoteId) await get().fetchCreditNotes();
    await get().fetchDashboardData();
  },

  createCreditNote: async (invoiceId, data) => {
    await api.post(`/invoices/${invoiceId}/credit-note`, data || {});
    await get().fetchCreditNotes();
    await get().fetchInvoices();
  },

  deleteCreditNote: async (id) => {
    try {
      set({ isLoading: true });
      await api.delete(`/credit-notes/${id}`);
      await get().fetchCreditNotes();
      set({ isLoading: false });
    } catch (error: any) {
      console.error('Delete credit note error:', error);
      set({ error: error.response?.data?.message || 'Failed to delete credit note.', isLoading: false });
      throw error;
    }
  },

  downloadCreditNotePDF: async (id, number) => {
    const response = await api.get(`/credit-notes/${id}/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `creditnote-${number}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  sendCreditNoteEmail: async (id) => {
    await api.post(`/credit-notes/${id}/send`);
  },

  applyCreditNoteToLedger: async (id) => {
    await api.post(`/credit-notes/${id}/apply-ledger`);
    await get().fetchCreditNotes();
    await get().fetchClients();
  },

  refundCreditNote: async (id) => {
    await api.post(`/credit-notes/${id}/refund`);
    await get().fetchCreditNotes();
  },

  updateSettings: async (data) => {
    await api.put('/settings', data);
    await get().fetchSettings();
  },

  addUser: async (data) => {
    await api.post('/users', data);
    await get().fetchUsers();
  },

  updateUser: async (id, data) => {
    await api.put(`/users/${id}`, data);
    await get().fetchUsers();
  },

  deleteUser: async (id) => {
    await api.delete(`/users/${id}`);
    await get().fetchUsers();
  },

  verifyPassword: async (password) => {
    try {
      await api.post('/auth/verify-password', { password });
      return true;
    } catch (error) {
      return false;
    }
  },

  updatePassword: async (currentPassword, newPassword) => {
    await api.post('/auth/update-password', { currentPassword, newPassword });
  },

  updateProfile: async (data) => {
    const response = await api.put('/auth/update-profile', data);
    set((state) => ({
      user: state.user ? { ...state.user, ...response.data.data.user } : response.data.data.user
    }));
  },

  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post('/auth/update-avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    set((state) => ({
      user: state.user ? { ...state.user, ...response.data.data.user } : response.data.data.user
    }));
  },

  downloadRefundPDF: async (id) => {
    const response = await api.get(`/invoices/refunds/${id}/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `refund-${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  sendRefundEmail: async (id) => {
    await api.post(`/invoices/refunds/${id}/send`);
  },

  optimisticUpdateInvoice: (id, data) => {
    set((state) => ({
      invoices: state.invoices.map((inv) =>
        inv.id.toString() === id.toString() ? { ...inv, ...data } : inv
      ),
    }));
  },
}));
