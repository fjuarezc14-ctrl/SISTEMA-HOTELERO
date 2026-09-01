import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ShiftProvider } from './context/ShiftContext';
import { GlobalStoreProvider } from './context/GlobalStoreContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { ReceptionPage } from './pages/ReceptionPage';
import { ReservationsPage } from './pages/ReservationsPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { ShiftsPage } from './pages/ShiftsPage';
import { CashPage } from './pages/CashPage';
import { CustomersPage } from './pages/CustomersPage';
import { StorePage } from './pages/StorePage';
import { SettingsPage } from './pages/SettingsPage';
import { UsersPage } from './pages/UsersPage';
import { ReportsPage } from './pages/ReportsPage';
import { OpenShiftModal } from './components/OpenShiftModal';
import { CloseShiftModal } from './components/CloseShiftModal';

function MainLayout() {
  const { user, isAuthenticated } = useAuth();
  const [currentTab, setCurrentTab] = useState('reception');
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'reception':
        return <ReceptionPage />;
      case 'reservations':
        return <ReservationsPage />;
      case 'incidents':
        return <IncidentsPage />;
      case 'shifts':
        return (
          <ShiftsPage
            onOpenShiftModal={() => setIsOpenShiftModalOpen(true)}
            onCloseShiftModal={() => setIsCloseShiftModalOpen(true)}
          />
        );
      case 'cash':
        return <CashPage />;
      case 'customers':
        return <CustomersPage />;
      case 'store':
        return <StorePage />;
      case 'settings':
        return isAdmin ? <SettingsPage /> : <ReceptionPage />;
      case 'users':
        return isAdmin ? <UsersPage /> : <ReceptionPage />;
      case 'reports':
        return isAdmin ? <ReportsPage /> : <ReceptionPage />;
      default:
        return <ReceptionPage />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar with Lima Clock & Shift Indicator */}
        <Navbar
          onOpenShiftModal={() => setIsOpenShiftModalOpen(true)}
          onCloseShiftModal={() => setIsCloseShiftModalOpen(true)}
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
          <MainLayout />
        </GlobalStoreProvider>
      </ShiftProvider>
    </AuthProvider>
  );
}
