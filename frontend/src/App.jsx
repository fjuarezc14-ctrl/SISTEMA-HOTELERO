import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ShiftProvider } from './context/ShiftContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { ReceptionPage } from './pages/ReceptionPage';
import { ReservationsPage } from './pages/ReservationsPage';
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
  const { isAuthenticated } = useAuth();
  const [currentTab, setCurrentTab] = useState('reception');
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'reception':
        return <ReceptionPage />;
      case 'reservations':
        return <ReservationsPage />;
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
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar with Lima Clock & Shift Indicator */}
        <Navbar
          onOpenShiftModal={() => setIsOpenShiftModalOpen(true)}
          onCloseShiftModal={() => setIsCloseShiftModalOpen(true)}
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
        <MainLayout />
      </ShiftProvider>
    </AuthProvider>
  );
}
