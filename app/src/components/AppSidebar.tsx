import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Globe,
  Sun,
  Moon,
  LogOut,
  ReceiptText
} from 'lucide-react';

const navSections = [
  {
    titleKey: 'common.sidebar.main',
    items: [
      { to: '/', labelKey: 'common.dashboard' },
    ]
  },
  {
    titleKey: 'common.sidebar.management',
    items: [
      { to: '/clients', labelKey: 'common.clients', permission: 'canViewClients' },
      { to: '/products', labelKey: 'common.products', permission: 'canViewProducts' },
    ]
  },
  {
    titleKey: 'common.sidebar.sales',
    items: [
      { to: '/quotes', labelKey: 'common.quotes', permission: 'canViewQuotes' },
      { to: '/invoices', labelKey: 'common.invoices', permission: 'canViewInvoices' },
    ]
  },
  {
    titleKey: 'common.sidebar.finance',
    items: [
      { to: '/payments', labelKey: 'common.payments', permission: 'canViewPayments' },
      { to: '/refunds', labelKey: 'common.refunds', permission: 'canViewRefunds' },
      { to: '/credit-notes', labelKey: 'credit_notes.title', permission: 'canViewCreditNotes' },
    ]
  },
  {
    titleKey: 'common.sidebar.system',
    items: [
      { to: '/action-logs', labelKey: 'common.action_logs', permission: 'canViewAuditLogs' },
      { to: '/settings', labelKey: 'common.settings', permission: 'canAccessSettings' },
    ]
  },
  {
    titleKey: 'common.sidebar.account',
    items: [
      { to: '/profile', labelKey: 'common.profile' },
    ]
  }
];

export default function AppSidebar() {
  const { isDarkMode, toggleDarkMode, logout, user } = useAppStore();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const permissions = usePermissions();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'fr' ? 'en' : 'fr';
    i18n.changeLanguage(newLang);
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar-background border-r border-sidebar-border transition-all duration-300">
      {/* Header - Integrated with new design */}
      <div className="px-6 py-8 flex-shrink-0">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-md shadow-primary/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-primary/30">
            <ReceiptText className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col -space-y-1">
            <span className="text-xl font-extrabold tracking-tight text-sidebar-foreground transition-colors">
              Invoice<span className="text-primary font-black">Z</span>
            </span>
            <span className="text-[9px] font-bold text-sidebar-muted tracking-[0.2em] uppercase">{t('common.enterprise')}</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-4 overflow-y-auto no-scrollbar">
        <ul className="sidebar-menu space-y-6">
          {navSections.map((section: any) => {
            return (
              <li key={section.titleKey} className="space-y-1">
                <h3 className="px-4 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sidebar-muted">
                  {t(section.titleKey)}
                </h3>
                <ul className="space-y-0.5">
                  {section.items.map((item: any) => {
                    const isActive = location.pathname === item.to;
                    const hasAccess = item.permission ? (permissions as any)[item.permission]() : true;

                    if (!hasAccess) {
                      return (
                        <li key={item.to}>
                          <div
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-semibold text-sidebar-muted opacity-50 cursor-not-allowed selection:bg-transparent"
                            )}
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-sidebar-muted scale-0" />
                            {t(item.labelKey)}
                          </div>
                        </li>
                      );
                    }

                    return (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          className={({ isActive }) =>
                            cn(
                              "group flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ease-in-out",
                              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                              isActive
                                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm shadow-primary/20"
                                : "text-sidebar-foreground/70"
                            )
                          }
                        >
                          <div className={cn(
                            "h-1.5 w-1.5 rounded-full transition-all duration-300",
                            isActive ? "bg-sidebar-primary-foreground scale-100" : "bg-sidebar-muted scale-0 group-hover:scale-100"
                          )} />
                          {t(item.labelKey)}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer - Aligned with shadecn tokens */}
      <div className="mt-auto border-t border-sidebar-border p-4 space-y-4">
        <div className="flex gap-2">
          <button
            onClick={toggleLanguage}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/30 px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200"
          >
            <Globe className="h-3.5 w-3.5" />
            {i18n.language === 'fr' ? 'EN' : 'FR'}
          </button>
          <button
            onClick={toggleDarkMode}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/30 px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200"
          >
            {isDarkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            {isDarkMode ? t('common.light') : t('common.dark')}
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-2.5 shadow-sm transition-all hover:bg-sidebar-accent">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-xs font-black shadow-inner">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-sidebar-foreground truncate">{user?.name || 'Account'}</p>
            {user?.role && (
              <p className="text-[10px] font-bold text-sidebar-muted uppercase tracking-widest truncate">
                {typeof user.role === 'string' ?
                  (user.role === 'ADMIN' ? t('common.administrator') :
                    user.role === 'ACCOUNTANT' ? t('common.accountant') :
                      user.role === 'USER' ? t('common.user_viewer') : user.role) :
                  ((user.role as any)?.name || 'USER')}
              </p>
            )}
          </div>
          <button
            onClick={logout}
            className="text-sidebar-muted hover:text-destructive transition-colors p-1.5 hover:bg-destructive/10 rounded-lg"
            title={t('common.logout')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
