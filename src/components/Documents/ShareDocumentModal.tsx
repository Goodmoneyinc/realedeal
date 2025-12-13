import { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ShareDocumentModalProps {
  document: {
    id: string;
    title: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
}

interface Share {
  id: string;
  shared_with: string;
  full_name: string;
  permission: string;
  created_at: string;
}

export function ShareDocumentModal({ document, onClose, onSuccess }: ShareDocumentModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [existingShares, setExistingShares] = useState<Share[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [permission, setPermission] = useState('view');

  useEffect(() => {
    fetchUsers();
    fetchExistingShares();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, full_name, role')
      .neq('id', user?.id)
      .order('full_name');

    if (data) {
      setUsers(data);
    }
  };

  const fetchExistingShares = async () => {
    const { data } = await supabase
      .from('document_shares')
      .select(`
        id,
        shared_with,
        permission,
        created_at,
        user_profiles!document_shares_shared_with_fkey(full_name)
      `)
      .eq('document_id', document.id);

    if (data) {
      const shares = data.map(share => ({
        id: share.id,
        shared_with: share.shared_with,
        full_name: (share.user_profiles as any)?.full_name || 'Unknown',
        permission: share.permission,
        created_at: share.created_at
      }));
      setExistingShares(shares);
    }
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      setError('Please select a user');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error: shareError } = await supabase
        .from('document_shares')
        .insert({
          document_id: document.id,
          shared_with: selectedUser,
          shared_by: user?.id,
          permission: permission
        });

      if (shareError) throw shareError;

      await supabase.from('document_activity').insert({
        document_id: document.id,
        user_id: user?.id,
        action: 'shared',
        details: `Shared with user (${permission} access)`
      });

      setSuccess('Document shared successfully!');
      setSelectedUser('');
      fetchExistingShares();
    } catch (err: any) {
      setError(err.message || 'Failed to share document');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    if (!confirm('Remove access for this user?')) return;

    const { error } = await supabase
      .from('document_shares')
      .delete()
      .eq('id', shareId);

    if (!error) {
      fetchExistingShares();
    }
  };

  const availableUsers = users.filter(
    u => !existingShares.find(s => s.shared_with === u.id)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Share Document</h2>
            <p className="text-sm text-gray-600 mt-1">{document.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-800">{success}</p>
            </div>
          )}

          <form onSubmit={handleShare} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Share with User
              </label>
              <div className="flex space-x-3">
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                >
                  <option value="">Select a user...</option>
                  {availableUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.role})
                    </option>
                  ))}
                </select>

                <select
                  value={permission}
                  onChange={(e) => setPermission(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                >
                  <option value="view">View Only</option>
                  <option value="edit">Can Edit</option>
                </select>

                <button
                  type="submit"
                  disabled={loading || !selectedUser}
                  className="px-4 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  <UserPlus className="h-5 w-5" />
                  <span>Share</span>
                </button>
              </div>
            </div>
          </form>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Shared With ({existingShares.length})
            </h3>

            {existingShares.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No one has access to this document yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {existingShares.map(share => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between bg-gray-50 rounded-lg p-4"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{share.full_name}</p>
                      <p className="text-sm text-gray-600 capitalize">
                        {share.permission} access • Shared {new Date(share.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveShare(share.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
