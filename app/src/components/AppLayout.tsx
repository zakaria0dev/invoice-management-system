import { Outlet } from 'react-router-dom';
import AppSidebar from '@/components/AppSidebar';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from 'react-i18next';
import { Menu, Receipt } from 'lucide-react';

export default function AppLayout() {
  const { toggleSidebar, isDarkMode } = useAppStore();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <AppSidebar />
      <div className="pl-64">
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
