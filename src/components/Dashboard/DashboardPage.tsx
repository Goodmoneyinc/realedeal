import { useState, useEffect } from 'react';
import { Briefcase, Users, DollarSign, TrendingUp, MapPin, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Deal {
  id: string;
  title: string;
  location: string;
  status: string;
  estimated_profit: number;
  arv: number;
  ask_price: number;
  created_at: string;
}

interface Stats {
  totalDeals: number;
  totalContacts: number;
  activeDeals: number;
  totalProfit: number;
  avgProfit: number;
  closedDeals: number;
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalDeals: 0,
    totalContacts: 0,
    activeDeals: 0,
    totalProfit: 0,
    avgProfit: 0,
    closedDeals: 0,
  });
  const [recentDeals, setRecentDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    setLoading(true);

    const [dealsResponse, contactsResponse] = await Promise.all([
      supabase.from('deals').select('*').eq('user_id', user.id),
      supabase.from('contacts').select('id').eq('user_id', user.id),
    ]);

    if (dealsResponse.data) {
      const deals = dealsResponse.data;
      const activeDeals = deals.filter(d => ['lead', 'analyzing', 'under-contract'].includes(d.status));
      const closedDeals = deals.filter(d => d.status === 'closed');
      const totalProfit = closedDeals.reduce((sum, d) => sum + (d.estimated_profit || 0), 0);

      setStats({
        totalDeals: deals.length,
        totalContacts: contactsResponse.data?.length || 0,
        activeDeals: activeDeals.length,
        totalProfit,
        avgProfit: closedDeals.length > 0 ? totalProfit / closedDeals.length : 0,
        closedDeals: closedDeals.length,
      });

      setRecentDeals(deals.slice(0, 5));
    }

    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      lead: 'bg-blue-100 text-blue-800',
      analyzing: 'bg-yellow-100 text-yellow-800',
      'under-contract': 'bg-purple-100 text-purple-800',
      closed: 'bg-green-100 text-green-800',
      dead: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent"></div>
        <p className="text-gray-600 mt-4">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's your overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Briefcase className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{stats.totalDeals}</div>
          <div className="text-sm text-gray-600">Total Deals</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-emerald-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{stats.activeDeals}</div>
          <div className="text-sm text-gray-600">Active Deals</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{stats.totalContacts}</div>
          <div className="text-sm text-gray-600">Total Contacts</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            ${stats.totalProfit.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Total Profit (Closed)</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Pipeline Overview</h2>
          <div className="space-y-4">
            {[
              { status: 'lead', label: 'New Leads', count: recentDeals.filter(d => d.status === 'lead').length },
              { status: 'analyzing', label: 'Analyzing', count: recentDeals.filter(d => d.status === 'analyzing').length },
              { status: 'under-contract', label: 'Under Contract', count: recentDeals.filter(d => d.status === 'under-contract').length },
              { status: 'closed', label: 'Closed', count: stats.closedDeals },
            ].map((stage) => (
              <div key={stage.status} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    stage.status === 'lead' ? 'bg-blue-500' :
                    stage.status === 'analyzing' ? 'bg-yellow-500' :
                    stage.status === 'under-contract' ? 'bg-purple-500' :
                    'bg-green-500'
                  }`}></div>
                  <span className="font-medium text-gray-900">{stage.label}</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">{stage.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Performance</h2>
          <div className="space-y-6">
            <div>
              <div className="text-sm text-gray-600 mb-2">Closed Deals</div>
              <div className="text-3xl font-bold text-gray-900">{stats.closedDeals}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-2">Average Profit</div>
              <div className="text-3xl font-bold text-emerald-600">
                ${stats.avgProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-2">Success Rate</div>
              <div className="text-3xl font-bold text-gray-900">
                {stats.totalDeals > 0 ? Math.round((stats.closedDeals / stats.totalDeals) * 100) : 0}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Deals</h2>
        {recentDeals.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            No deals yet. Start by adding your first deal!
          </div>
        ) : (
          <div className="space-y-4">
            {recentDeals.map((deal) => (
              <div key={deal.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{deal.title}</h3>
                  <div className="flex items-center text-sm text-gray-600 space-x-4">
                    <span className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {deal.location}
                    </span>
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatDate(deal.created_at)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right mr-4">
                    <div className="text-sm text-gray-600">Est. Profit</div>
                    <div className="font-bold text-emerald-600">
                      ${deal.estimated_profit.toLocaleString()}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(deal.status)}`}>
                    {deal.status.replace('-', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
