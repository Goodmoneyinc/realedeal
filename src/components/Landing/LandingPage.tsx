import { Building2, Users, FileText, TrendingUp, Handshake, Zap } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
  onSignup: () => void;
}

export function LandingPage({ onLogin, onSignup }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-gray-50">
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-emerald-600" />
              <span className="text-xl font-bold text-gray-900">REAL'E DEAL</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={onLogin}
                className="text-gray-700 hover:text-emerald-600 font-medium transition-colors"
              >
                Login
              </button>
              <button
                onClick={onSignup}
                className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Manage Your Real Estate
              <span className="block text-emerald-600 mt-2">Business with Ease</span>
            </h1>
            <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              The complete CRM solution for real estate professionals. Manage deals, contacts,
              transactions, and documents all in one powerful platform.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={onSignup}
                className="bg-emerald-600 text-white px-8 py-4 rounded-lg hover:bg-emerald-700 transition-colors text-lg font-semibold shadow-lg hover:shadow-xl"
              >
                Start Free Trial
              </button>
              <button
                onClick={onLogin}
                className="bg-white text-gray-800 px-8 py-4 rounded-lg hover:bg-gray-50 transition-colors text-lg font-semibold border-2 border-gray-200"
              >
                Login to Your Account
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16">
              Everything You Need to Succeed
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Building2 className="h-8 w-8 text-emerald-600" />}
                title="Deal Management"
                description="Track properties, manage listings, and close deals faster with intuitive deal tracking and pipeline management."
              />
              <FeatureCard
                icon={<Users className="h-8 w-8 text-emerald-600" />}
                title="Contact Management"
                description="Keep all your contacts organized in one place. Track interactions and never miss a follow-up."
              />
              <FeatureCard
                icon={<TrendingUp className="h-8 w-8 text-emerald-600" />}
                title="Transaction Pipeline"
                description="Visualize your entire transaction workflow from lead to close with customizable pipeline stages."
              />
              <FeatureCard
                icon={<FileText className="h-8 w-8 text-emerald-600" />}
                title="Document Hub"
                description="Store, organize, and share documents securely. Integrate with DocuSign for seamless e-signatures."
              />
              <FeatureCard
                icon={<Handshake className="h-8 w-8 text-emerald-600" />}
                title="Investor Portal"
                description="Manage relationships with investors and lenders. Share deals and track referrals effortlessly."
              />
              <FeatureCard
                icon={<Zap className="h-8 w-8 text-emerald-600" />}
                title="AI Co-Pilot"
                description="Let AI help you draft emails, analyze deals, and streamline your workflow with intelligent automation."
              />
            </div>
          </div>
        </section>

        <section className="py-20 bg-gradient-to-br from-emerald-600 to-emerald-700">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Transform Your Business?
            </h2>
            <p className="text-xl text-emerald-50 mb-8">
              Join hundreds of real estate professionals who trust our platform
            </p>
            <button
              onClick={onSignup}
              className="bg-white text-emerald-600 px-8 py-4 rounded-lg hover:bg-gray-50 transition-colors text-lg font-semibold shadow-xl"
            >
              Get Started Today
            </button>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Building2 className="h-6 w-6 text-emerald-500" />
            <span className="text-lg font-semibold text-white">REAL'E DEAL</span>
          </div>
          <p className="text-sm text-gray-400">
            The complete solution for real estate professionals
          </p>
        </div>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-gradient-to-br from-white to-gray-50 p-8 rounded-xl border border-gray-100 hover:shadow-lg transition-shadow">
      <div className="bg-emerald-50 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}
