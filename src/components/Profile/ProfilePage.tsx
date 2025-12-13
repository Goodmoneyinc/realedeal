import { useState, useEffect } from 'react';
import { UserCircle, Mail, Phone, Building, FileText, Save, AlertCircle, CheckCircle, Briefcase, TrendingUp, DollarSign, Camera, Upload, CreditCard, ExternalLink } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [stripeLoading, setStripeLoading] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    company_name: '',
    phone: '',
    bio: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        company_name: profile.company_name || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
      });
      if (profile.avatar_url) {
        setAvatarPreview(profile.avatar_url);
      }
    }
  }, [profile]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Image size must be less than 2MB');
      return;
    }

    setAvatarFile(file);
    setError('');

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null;

    setUploading(true);
    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, avatarFile, {
        cacheControl: '3600',
        upsert: true
      });

    setUploading(false);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      let avatarUrl = profile?.avatar_url;

      if (avatarFile) {
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        }
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.full_name,
          company_name: formData.company_name,
          phone: formData.phone,
          bio: formData.bio,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;

      setSuccess(true);
      setAvatarFile(null);
      await refreshProfile();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'agent': return <Briefcase className="h-6 w-6" />;
      case 'investor': return <TrendingUp className="h-6 w-6" />;
      case 'lender': return <DollarSign className="h-6 w-6" />;
      default: return <UserCircle className="h-6 w-6" />;
    }
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'agent': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'investor': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'lender': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getRoleDescription = (role?: string) => {
    switch (role) {
      case 'agent': return 'You can post deals and manage property listings for investors and lenders to review.';
      case 'investor': return 'You can browse deals, express interest, and collaborate with agents and lenders.';
      case 'lender': return 'You can review deals, provide financing options, and work with agents and investors.';
      default: return '';
    }
  };

  const handleStripeConnect = async () => {
    setStripeLoading(true);
    setError('');

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect-onboard`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create Stripe Connect account');
      }

      window.location.href = result.url;
    } catch (err: any) {
      console.error('Stripe Connect error:', err);
      setError(err.message || 'Failed to connect to Stripe');
    } finally {
      setStripeLoading(false);
    }
  };

  const checkStripeStatus = async () => {
    if (!profile?.stripe_connect_account_id) return;

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-check-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            accountId: profile.stripe_connect_account_id,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        await refreshProfile();
      }
    } catch (err) {
      console.error('Stripe status check error:', err);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('stripe_connected') === 'true') {
      checkStripeStatus();
      window.history.replaceState({}, '', '/profile');
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile Settings</h1>
        <p className="text-gray-600">Manage your account information and preferences</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start space-x-4">
          <div className={`p-4 rounded-xl border-2 ${getRoleBadgeColor(profile?.role)}`}>
            {getRoleIcon(profile?.role)}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h2 className="text-xl font-bold text-gray-900">
                {profile?.role === 'agent' && 'Real Estate Agent'}
                {profile?.role === 'investor' && 'Real Estate Investor'}
                {profile?.role === 'lender' && 'Real Estate Lender'}
              </h2>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getRoleBadgeColor(profile?.role)}`}>
                {profile?.role?.toUpperCase()}
              </span>
            </div>
            <p className="text-gray-600 text-sm">
              {getRoleDescription(profile?.role)}
            </p>
          </div>
        </div>
      </div>

      {profile?.role === 'agent' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Payment Settings</h3>
                <p className="text-sm text-gray-600">Connect your Stripe account to receive payments</p>
              </div>
            </div>
          </div>

          {profile.stripe_charges_enabled ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-900 mb-1">Stripe Connected</p>
                  <p className="text-sm text-green-800">
                    Your account is connected and ready to accept payments. The platform will automatically collect a 0.5% fee on each transaction.
                  </p>
                </div>
              </div>
            </div>
          ) : profile.stripe_connect_account_id ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-900 mb-1">Setup Incomplete</p>
                  <p className="text-sm text-yellow-800 mb-3">
                    Complete your Stripe account setup to start accepting payments
                  </p>
                  <button
                    onClick={handleStripeConnect}
                    disabled={stripeLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {stripeLoading ? 'Loading...' : 'Complete Setup'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 mb-3">
                  Connect your Stripe account to receive payments from investors. The platform automatically deducts a 0.5% fee on each transaction.
                </p>
                <div className="flex items-start gap-2 text-xs text-blue-700 mb-3">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Secure payment processing</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-blue-700 mb-3">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Automatic 0.5% platform fee deduction</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-blue-700">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Direct deposits to your bank account</span>
                </div>
              </div>
              <button
                onClick={handleStripeConnect}
                disabled={stripeLoading}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
              >
                <CreditCard className="w-5 h-5" />
                {stripeLoading ? 'Connecting...' : 'Connect with Stripe'}
              </button>
            </div>
          )}
        </div>
      )}

      {success && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start">
          <CheckCircle className="h-5 w-5 text-emerald-600 mr-2 flex-shrink-0 mt-0.5" />
          <span className="text-emerald-800 text-sm">Profile updated successfully!</span>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
          <span className="text-red-800 text-sm">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Personal Information</h3>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Profile Picture</label>
            <div className="flex items-center gap-6">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 border-4 border-gray-300">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <UserCircle className="h-20 w-20 text-gray-400" />
                    </div>
                  )}
                </div>
                <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="h-8 w-8 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="flex-1">
                <label className="cursor-pointer">
                  <div className="flex items-center justify-center px-6 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-colors">
                    <Upload className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-700">
                      {avatarFile ? avatarFile.name : 'Choose a profile picture'}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-2">JPG, PNG or GIF (max 2MB)</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Full Name</label>
            <div className="relative">
              <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                placeholder="John Smith"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Company Name</label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                placeholder="Your Company LLC"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Bio</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={4}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none"
                placeholder="Tell others about yourself and your experience..."
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading || uploading}
              className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-5 w-5" />
              <span>
                {uploading ? 'Uploading...' : loading ? 'Saving...' : 'Save Changes'}
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
