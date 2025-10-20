import { Link } from 'react-router-dom';

function LandingPage() {
  return (
    <div className="min-h-screen" style={{
      backgroundColor: '#f5f6f8',
      backgroundImage: `
        radial-gradient(circle at 25px 25px, rgba(99, 102, 241, 0.04) 2%, transparent 50%),
        radial-gradient(circle at 75px 75px, rgba(147, 51, 234, 0.04) 2%, transparent 50%)
      `,
      backgroundSize: '100px 100px'
    }}>
      {/* Navigation */}
      <nav className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
        <div className="max-w-6xl mx-auto px-5 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">
            Campayn
          </h1>
          <Link
            to="/app"
            className="bg-white text-indigo-600 px-6 py-2.5 rounded-xl font-semibold hover:bg-gray-100 hover:-translate-y-0.5 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            Launch App
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-5 pt-20 pb-16 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          Decentralized
          <br />
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Ad Campaigns
          </span>
        </h1>

        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
          Connect companies with influencers through blockchain-powered campaigns.
          Transparent, secure, and rewarding for everyone.
        </p>

        <Link
          to="/app"
          className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-indigo-600 hover:to-purple-700 hover:-translate-y-1 transition-all duration-300 shadow-xl hover:shadow-2xl"
        >
          Get Started
        </Link>
      </main>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-5 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white/60 backdrop-blur-sm p-8 rounded-2xl shadow-sm border border-gray-200/50">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl">🏢</span>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">For Companies</h3>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-center">
                <span className="text-green-500 font-bold mr-3">✓</span>
                Create campaigns with FLOW rewards
              </li>
              <li className="flex items-center">
                <span className="text-green-500 font-bold mr-3">✓</span>
                Set requirements and deadlines
              </li>
              <li className="flex items-center">
                <span className="text-green-500 font-bold mr-3">✓</span>
                Automatic winner selection
              </li>
            </ul>
          </div>

          <div className="bg-white/60 backdrop-blur-sm p-8 rounded-2xl shadow-sm border border-gray-200/50">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl">⭐</span>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">For Influencers</h3>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-center">
                <span className="text-green-500 font-bold mr-3">✓</span>
                Register for campaigns
              </li>
              <li className="flex items-center">
                <span className="text-green-500 font-bold mr-3">✓</span>
                Submit YouTube videos
              </li>
              <li className="flex items-center">
                <span className="text-green-500 font-bold mr-3">✓</span>
                Earn FLOW based on performance
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-500">
        <p>&copy; 2024 Campayn. Decentralized advertising platform.</p>
      </footer>
    </div>
  );
}

export default LandingPage;