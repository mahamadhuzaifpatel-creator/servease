import { useServEase, ServEaseProvider } from './hooks/useServEaseStore';
import { AppShell } from './components/layout/AppShell';
import { ToastContainer } from './components/common/ToastContainer';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { BookingsPage } from './pages/BookingsPage';
import { QuotationsPage } from './pages/QuotationsPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ServiceHistoryPage } from './pages/ServiceHistoryPage';
import { SettingsPage } from './pages/SettingsPage';

function ServEaseRouter() {
  const { isAuthenticated, isLoading, dataset, activeRoute } = useServEase();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-[#E5E9F0] rounded-xl p-6 space-y-4">
          <div className="h-5 w-32 bg-[#EEF1F6] rounded animate-pulse" />
          <div className="h-4 w-full bg-[#F5F7FA] rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-[#F5F7FA] rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !dataset.provider.setupCompleted) {
    return <AuthPage />;
  }

  const renderPage = () => {
    switch (activeRoute) {
      case 'dashboard':
        return <DashboardPage />;
      case 'customers':
        return <CustomersPage />;
      case 'bookings':
        return <BookingsPage />;
      case 'quotations':
        return <QuotationsPage />;
      case 'payments':
        return <PaymentsPage />;
      case 'history':
        return <ServiceHistoryPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return <AppShell>{renderPage()}</AppShell>;
}

export default function App() {
  return (
    <ServEaseProvider>
      <ServEaseRouter />
      <ToastContainer />
    </ServEaseProvider>
  );
}
