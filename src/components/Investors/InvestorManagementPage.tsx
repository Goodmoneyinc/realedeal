import { useState, useEffect } from 'react';
import { UserPlus, Users, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Investor {
  id: string;
  full_name: string;
  company_name?: string;
  phone?: string;
}

interface Assignment {
  id: string;
  investor_id: string;
  created_at: string;
  investor: Investor;
}

export function InvestorManagementPage() {
  const { user, profile } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [availableInvestors, setAvailableInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (profile?.role === 'agent') {
      loadAssignments();
      loadAvailableInvestors();
    } else {
      setLoading(false);
    }
  }, [user, profile]);

  const loadAssignments = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('agent_investor_assignments')
      .select(`
        id,
        investor_id,
        created_at,
        investor:user_profiles!investor_id(id, full_name, company_name, phone)
      `)
      .eq('agent_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        investor: Array.isArray(item.investor) ? item.investor[0] : item.investor
      }));
      setAssignments(transformedData);
    }
    setLoading(false);
  };

  const loadAvailableInvestors = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, company_name, phone')
      .eq('role', 'investor')
      .order('full_name');

    if (!error && data) {
      setAvailableInvestors(data);
    }
  };

  const handleAddInvestor = async (investorId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('agent_investor_assignments')
      .insert([{ agent_id: user.id, investor_id: investorId }]);

    if (error) {
      setError(error.message);
    } else {
      setShowAddModal(false);
      loadAssignments();
    }
  };

  const handleRemoveInvestor = async (assignmentId: string) => {
    const { error } = await supabase
      .from('agent_investor_assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) {
      setError(error.message);
    } else {
      loadAssignments();
    }
  };

  const assignedInvestorIds = new Set(assignments.map(a => a.investor_id));
  const unassignedInvestors = availableInvestors.filter(inv => !assignedInvestorIds.has(inv.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (profile?.role !== 'agent') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">This feature is only available to agents.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Investors</h1>
          <p className="text-gray-600 mt-2">Manage your investor network</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <UserPlus className="h-5 w-5" />
          Add Investor
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
          <span className="text-red-800 text-sm">{error}</span>
        </div>
      )}

      {assignments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No investors assigned</h3>
          <p className="text-gray-600 mb-6">Start building your investor network</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <UserPlus className="h-5 w-5" />
            Add Your First Investor
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {assignment.investor.full_name}
                </h3>
                {assignment.investor.company_name && (
                  <p className="text-gray-600 text-sm mt-1">{assignment.investor.company_name}</p>
                )}
                {assignment.investor.phone && (
                  <p className="text-gray-500 text-sm mt-1">{assignment.investor.phone}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Added {new Date(assignment.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleRemoveInvestor(assignment.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove investor"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Add Investor</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {unassignedInvestors.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">All available investors are already assigned to you.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {unassignedInvestors.map((investor) => (
                    <div
                      key={investor.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-emerald-300 transition-colors"
                    >
                      <div>
                        <h3 className="font-semibold text-gray-900">{investor.full_name}</h3>
                        {investor.company_name && (
                          <p className="text-sm text-gray-600">{investor.company_name}</p>
                        )}
                        {investor.phone && (
                          <p className="text-sm text-gray-500">{investor.phone}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleAddInvestor(investor.id)}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
