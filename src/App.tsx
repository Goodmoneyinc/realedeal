import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LandingPage } from './components/Landing/LandingPage';
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
import { DocumentHubPage } from './components/Documents/DocumentHubPage';
import VendorManagementPage from './components/Vendors/VendorManagementPage';
import ClientPortalPage from './components/ClientPortal/ClientPortalPage';
import CoPilotPage from './components/CoPilot/CoPilotPage';

type ViewType = 'dashboard' | 'deals' | 'contacts' | 'profile' | 'investors' | 'investor-deals' | 'lender-referrals' | 'transactions' | 'documents' | 'vendors' | 'client-portal' | 'copilot';

function AppContent() {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState<'landing' | 'login' | 'signup'>('landing');
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
    if (authView === 'landing') {
      return (
        <LandingPage
          onLogin={() => setAuthView('login')}
          onSignup={() => setAuthView('signup')}
        />
      );
    } else if (authView === 'login') {
      return (
        <Login
          onToggleView={() => setAuthView('signup')}
          onBack={() => setAuthView('landing')}
        />
      );
    } else {
      return (
        <Signup
          onToggleView={() => setAuthView('login')}
          onBack={() => setAuthView('landing')}
        />
      );
    }
  }

  return (
    <DashboardLayout currentView={currentView} onNavigate={(view: any) => setCurrentView(view)}>
      {currentView === 'dashboard' && <DashboardPage />}
      {currentView === 'deals' && <DealsPage />}
      {currentView === 'contacts' && <ContactsPage />}
      {currentView === 'transactions' && <TransactionPipelinePage />}
      {currentView === 'documents' && <DocumentHubPage />}
      {currentView === 'vendors' && <VendorManagementPage />}
      {currentView === 'copilot' && <CoPilotPage />}
      {currentView === 'client-portal' && <ClientPortalPage />}
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
