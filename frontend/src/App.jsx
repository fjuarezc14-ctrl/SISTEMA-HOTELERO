import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { canAccessModule, ASSIGNABLE_MODULES } from './utils/modules';
import { ShiftProvider } from './context/ShiftContext';
import { GlobalStoreProvider } from './context/GlobalStoreContext';
import { ReceiptProvider } from './context/ReceiptContext';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { LoginPage } from './pages/auth/LoginPage';
import { ReceptionPage } from './pages/operations/ReceptionPage';
import { ReservationsPage } from './pages/operations/ReservationsPage';
import { IncidentsPage } from './pages/operations/IncidentsPage';
import { CashPage } from './pages/sales/CashPage';
import { CustomersPage } from './pages/operations/CustomersPage';
import { StorePage } from './pages/sales/StorePage';
import { TextilesPage } from './pages/operations/TextilesPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { UsersPage } from './pages/admin/UsersPage';
import { ReportsPage } from './pages/admin/ReportsPage';
import { OpenShiftModal } from './components/shifts/OpenShiftModal';
import { CloseShiftModal } from './components/shifts/CloseShiftModal';

function MainLayout() {
  const { user, isAuthenticated } = useAuth();
  const [currentTab, setCurrentTab] = useState('reception');
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);


  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Si el módulo actual no está permitido, ir al primero disponible
  const firstAllowed = ASSIGNABLE_MODULES.find((m) => canAccessModule(user, m.id))?.id;
  const activeTab = canAccessModule(user, currentTab) ? currentTab : firstAllowed;

  const renderContent = () => {
    if (!activeTab) {
      return (
        <div className="p-8 bg-amber-50 border border-amber-200 rounded-3xl text-center text-sm text-amber-800 font-semibold">
          Tu usuario no tiene módulos asignados. Contacta al administrador.
        </div>
      );
    }
    switch (activeTab) {
      case 'reception':
        return <ReceptionPage />;
      case 'reservations':
        return <ReservationsPage />;
      case 'incidents':
        return <IncidentsPage />;
      case 'cash':
        return (
          <CashPage
            onOpenShiftModal={() => setIsOpenShiftModalOpen(true)}
            onCloseShiftModal={() => setIsCloseShiftModalOpen(true)}
          />
        );
      case 'customers':
        return <CustomersPage />;
      case 'store':
        return <StorePage />;
      case 'textiles':
        return <TextilesPage />;
      case 'settings':
        return <SettingsPage />;
      case 'users':
        return <UsersPage />;
      case 'reports':
        return <ReportsPage />;
      default:
        return <ReceptionPage />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={activeTab}
        setCurrentTab={setCurrentTab}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar with Lima Clock & Shift Indicator */}
        <Navbar
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">{renderContent()}</main>
      </div>

      {/* Global Shift Modals */}
      <OpenShiftModal
        isOpen={isOpenShiftModalOpen}
        onClose={() => setIsOpenShiftModalOpen(false)}
      />
      <CloseShiftModal
        isOpen={isCloseShiftModalOpen}
        onClose={() => setIsCloseShiftModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ShiftProvider>
        <GlobalStoreProvider>
          <ReceiptProvider>
            <MainLayout />
          </ReceiptProvider>
        </GlobalStoreProvider>
      </ShiftProvider>
    </AuthProvider>
  );
}
