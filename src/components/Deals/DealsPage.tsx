import { useState, useEffect } from 'react';
import { Plus, Search, DollarSign, MapPin, TrendingUp, Edit, Trash2, Briefcase, Building2, AlertCircle, Images } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DealForm } from './DealForm';
import { ImageGallery } from './ImageGallery';

interface Deal {
  id: string;
  title: string;
  location: string;
  property_type: string;
  deal_type: string;
  status: string;
  arv: number;
  ask_price: number;
  estimated_profit: number;
  image_url: string | null;
}

export function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dealImages, setDealImages] = useState<Record<string, string[]>>({});
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const { user, profile } = useAuth();

  useEffect(() => {
    if (profile?.role === 'agent') {
      loadDeals();
    } else {
      setLoading(false);
    }
  }, [user, profile]);

  const loadDeals = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setDeals(data);
      await loadPropertyImages(data);
    }
    setLoading(false);
  };

  const loadPropertyImages = async (dealsData: Deal[]) => {
    const imagesMap: Record<string, string[]> = {};

    for (const deal of dealsData) {
      const { data } = await supabase
        .from('property_images')
        .select('image_url')
        .eq('deal_id', deal.id)
        .order('display_order', { ascending: true });

      if (data && data.length > 0) {
        imagesMap[deal.id] = data.map(img => img.image_url);
      }
    }

    setDealImages(imagesMap);
  };

  const openGallery = (dealId: string) => {
    const images = dealImages[dealId] || [];
    setGalleryImages(images);
    setShowGallery(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this deal?')) return;

    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', id);

    if (!error) {
      loadDeals();
    }
  };

  const handleEdit = (deal: Deal) => {
    setEditingDeal(deal);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingDeal(null);
    loadDeals();
  };

  const filteredDeals = deals.filter(deal => {
    const matchesSearch = deal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || deal.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deals</h1>
          <p className="text-gray-600 mt-1">Manage your real estate investment opportunities</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="mt-4 sm:mt-0 inline-flex items-center bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Deal
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search deals..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="lead">Lead</option>
            <option value="analyzing">Analyzing</option>
            <option value="under-contract">Under Contract</option>
            <option value="closed">Closed</option>
            <option value="dead">Dead</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent"></div>
          <p className="text-gray-600 mt-4">Loading deals...</p>
        </div>
      ) : filteredDeals.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No deals found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Get started by adding your first deal'}
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Deal
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDeals.map((deal) => {
            const images = dealImages[deal.id] || [];
            const hasImages = images.length > 0;
            const firstImage = hasImages ? images[0] : null;

            return (
              <div key={deal.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div
                  className="relative h-48 bg-gray-200 cursor-pointer"
                  onClick={() => hasImages && openGallery(deal.id)}
                >
                  {firstImage ? (
                    <img src={firstImage} alt={deal.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(deal.status)}`}>
                      {deal.status.replace('-', ' ').toUpperCase()}
                    </span>
                  </div>
                  {hasImages && images.length > 1 && (
                    <div className="absolute bottom-3 right-3 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                      <Images className="h-3 w-3" />
                      {images.length}
                    </div>
                  )}
                </div>

              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{deal.title}</h3>
                <div className="flex items-center text-gray-600 text-sm mb-4">
                  <MapPin className="h-4 w-4 mr-1" />
                  {deal.location}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">ARV:</span>
                    <span className="font-semibold text-gray-900">${deal.arv.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Ask Price:</span>
                    <span className="font-semibold text-gray-900">${deal.ask_price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                    <span className="text-gray-600">Est. Profit:</span>
                    <span className="font-bold text-emerald-600">${deal.estimated_profit.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(deal)}
                    className="flex-1 flex items-center justify-center bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(deal.id)}
                    className="flex items-center justify-center bg-red-50 text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {showForm && <DealForm deal={editingDeal} onClose={handleFormClose} />}
      {showGallery && <ImageGallery images={galleryImages} onClose={() => setShowGallery(false)} />}
    </div>
  );
}
