import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { usePermissions } from "@/hooks/usePermissions";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import ClientsPage from "@/pages/ClientsPage";
import ProductsPage from "@/pages/ProductsPage";
import InvoicesPage from "@/pages/InvoicesPage";
import CreateInvoicePage from "@/pages/CreateInvoicePage";
import QuotesPage from "@/pages/QuotesPage";
import CreateQuotePage from "@/pages/CreateQuotePage";
import CreditNotesPage from "@/pages/CreditNotesPage";
import SettingsPage from "@/pages/SettingsPage";
import PaymentsPage from "@/pages/PaymentsPage";
import LoginPage from "@/pages/LoginPage";
import ClientDetailPage from "@/pages/ClientDetailPage";
import ProfilePage from "@/pages/ProfilePage";
import RefundsPage from "@/pages/RefundsPage";
import ActionLogsPage from "@/pages/ActionLogsPage";
import NotFound from "./pages/NotFound";
import { useAutoLogout } from "@/hooks/useAutoLogout";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isInitialized } = useAppStore();

  if (!isInitialized) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">Loading.....</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PermissionsGuard({
  children,
  permissionKey,
  requiredRole
}: {
  children: React.ReactNode;
  permissionKey?: keyof ReturnType<typeof usePermissions>;
  requiredRole?: string;
}) {
  const permissions = usePermissions();
  const { user } = useAppStore();

  if (requiredRole) {
    const role = typeof user?.role === 'string' ? user.role : (user?.role as any)?.name;
    if (role !== requiredRole) return <Navigate to="/" replace />;
  }

  if (permissionKey) {
    const checker = permissions[permissionKey];
    if (typeof checker === 'function' && !(checker as () => boolean)()) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}

const App = () => {
  const { checkAuth, isDarkMode } = useAppStore();
  useAutoLogout();

  useEffect(() => {
    checkAuth();
    // Apply theme on mount
    document.documentElement.classList.toggle('dark', isDarkMode);

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('shortcuts:new-invoice'));
      }
      if (e.ctrlKey && e.key === 's') {
        // Only if a form is likely open (simplified check)
        if (document.querySelector('form')) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('shortcuts:save-form'));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [checkAuth, isDarkMode]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/clients" element={<PermissionsGuard permissionKey="canViewClients"><ClientsPage /></PermissionsGuard>} />
              <Route path="/clients/:id" element={<PermissionsGuard permissionKey="canViewClients"><ClientDetailPage /></PermissionsGuard>} />
              <Route path="/products" element={<PermissionsGuard permissionKey="canViewProducts"><ProductsPage /></PermissionsGuard>} />
              <Route path="/invoices" element={<PermissionsGuard permissionKey="canViewInvoices"><InvoicesPage /></PermissionsGuard>} />
              <Route path="/invoices/creating" element={<PermissionsGuard permissionKey="canCreateInvoice"><CreateInvoicePage /></PermissionsGuard>} />
              <Route path="/quotes" element={<PermissionsGuard permissionKey="canViewQuotes"><QuotesPage /></PermissionsGuard>} />
              <Route path="/quotes/creating" element={<PermissionsGuard permissionKey="canCreateQuote"><CreateQuotePage /></PermissionsGuard>} />
              <Route path="/credit-notes" element={<PermissionsGuard permissionKey="canViewCreditNotes"><CreditNotesPage /></PermissionsGuard>} />
              <Route path="/settings" element={<PermissionsGuard requiredRole="ADMIN"><SettingsPage /></PermissionsGuard>} />
              <Route path="/payments" element={<PermissionsGuard permissionKey="canViewPayments"><PaymentsPage /></PermissionsGuard>} />
              <Route path="/refunds" element={<PermissionsGuard permissionKey="canViewRefunds"><RefundsPage /></PermissionsGuard>} />
              <Route path="/action-logs" element={<PermissionsGuard permissionKey="canViewAuditLogs"><ActionLogsPage /></PermissionsGuard>} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
