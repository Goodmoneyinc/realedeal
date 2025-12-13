import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Auth/Login';
import { Signup } from './components/Auth/Signup';
import { DashboardLayout } from './components/Layout/DashboardLayout';
import { DashboardPage } from './components/Dashboard/DashboardPage';
import { DealsPage } from './components/Deals/DealsPage';
import { ContactsPage } from './components/Contacts/ContactsPage';
import { ProfilePage } from './components/Profile/ProfilePage';
import { InvestorManagementPage } from './components/Investors/InvestorManagementPage';
import { InvestorDealsPage } from './components/Investors/InvestorDealsPage';
import { LenderReferralsPage } from './components/Lenders/LenderReferralsPage';
import { TransactionPipelinePage } from './components/Transactions/TransactionPipelinePage';

type ViewType = 'dashboard' | 'deals' | 'contacts' | 'profile' | 'investors' | 'investor-deals' | 'lender-referrals' | 'transactions';

function AppContent() {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent"></div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (authView === 'login') {
      return <Login onToggleView={() => setAuthView('signup')} />;
    } else {
      return <Signup onToggleView={() => setAuthView('login')} />;
    }
  }

  return (
    <DashboardLayout currentView={currentView} onNavigate={(view: any) => setCurrentView(view)}>
      {currentView === 'dashboard' && <DashboardPage />}
      {currentView === 'deals' && <DealsPage />}
      {currentView === 'contacts' && <ContactsPage />}
      {currentView === 'transactions' && <TransactionPipelinePage />}
      {currentView === 'investors' && <InvestorManagementPage />}
      {currentView === 'investor-deals' && <InvestorDealsPage />}
      {currentView === 'lender-referrals' && <LenderReferralsPage />}
      {currentView === 'profile' && <ProfilePage />}
    </DashboardLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
