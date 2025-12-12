import { ReactNode, useState } from 'react';
import { Building2, LayoutDashboard, Briefcase, Users, LogOut, Menu, X, UserCircle, DollarSign, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface DashboardLayoutProps {
  children: ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
}

export function DashboardLayout({ children, currentView, onNavigate }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, profile, signOut } = useAuth();

  const getNavigationForRole = (role?: string) => {
    const baseNav = [
      { name: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' },
    ];

    if (role === 'agent') {
      return [
        ...baseNav,
        { name: 'Deals', icon: Briefcase, view: 'deals' },
        { name: 'Contacts', icon: Users, view: 'contacts' },
        { name: 'My Investors', icon: Users, view: 'investors' },
        { name: 'Profile', icon: UserCircle, view: 'profile' },
      ];
    } else if (role === 'investor') {
      return [
        ...baseNav,
        { name: 'Available Deals', icon: DollarSign, view: 'investor-deals' },
        { name: 'Profile', icon: UserCircle, view: 'profile' },
      ];
    } else if (role === 'lender') {
      return [
        ...baseNav,
        { name: 'Referrals', icon: FileText, view: 'lender-referrals' },
        { name: 'Profile', icon: UserCircle, view: 'profile' },
      ];
    }

    return [
      ...baseNav,
      { name: 'Profile', icon: UserCircle, view: 'profile' },
    ];
  };

  const navigation = getNavigationForRole(profile?.role);

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'agent': return 'bg-blue-100 text-blue-700';
      case 'investor': return 'bg-emerald-100 text-emerald-700';
      case 'lender': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'agent': return 'Agent';
      case 'investor': return 'Investor';
      case 'lender': return 'Lender';
      default: return 'User';
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Building2 className="h-8 w-8 text-emerald-600" />
          <span className="text-xl font-bold text-gray-900">REALE DEALS</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-emerald-600" />
              <span className="text-xl font-bold text-gray-900">REALE DEALS</span>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.view;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    onNavigate(item.view);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-200">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-gray-900">
                  {profile?.full_name || 'User'}
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(profile?.role)}`}>
                  {getRoleLabel(profile?.role)}
                </span>
              </div>
              <div className="text-sm text-gray-600 truncate">{user?.email}</div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="md:pl-64 pt-16 md:pt-0">
        <main className="p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
