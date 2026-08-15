import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import MarketplaceHome from './pages/MarketplaceHome';
import Browse from './pages/Browse';
import Categories from './pages/Categories';
import DatasetDetail from './pages/DatasetDetail';
import PublisherProfile from './pages/PublisherProfile';
import Upload from './pages/Upload';
import DashboardLayout from './pages/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import Revenue from './pages/Revenue';
import Downloads from './pages/Downloads';
import Settings from './pages/Settings';
import OnChainActivity from './pages/OnChainActivity';
import Developers from './pages/Developers';
import DocsHome from './pages/docs/DocsHome';
import DocsLayout from './pages/docs/DocsLayout';
import ApiReference from './pages/ApiReference';
import SDKPage from './pages/SDKPage';
import SDKDetail from './pages/SDKDetail';
import CLI from './pages/CLI';
import GitHubPage from './pages/GitHub';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import BlogPostEditor from './pages/BlogPostEditor';
import ShelbyNetwork from './pages/Network';
import Status from './pages/Status';
import Forbidden from './pages/Forbidden';
import ServerError from './pages/ServerError';
import ShelbyUnavailable from './pages/ShelbyUnavailable';
import NotFound from './pages/NotFound';
import { AuthProvider } from './context/AuthContext';
import { WalletProvider } from './context/WalletContext';

export default function App() {
  return (
    <WalletProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              {/* ─── Home / Landing ────────────────────────────────────── */}
              <Route path="/" element={<Home />} />

              {/* ─── Marketplace ──────────────────────────────────────── */}
              <Route path="/marketplace" element={<MarketplaceHome />} />
              <Route path="/browse" element={<Browse />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/datasets/:id" element={<DatasetDetail />} />
              <Route path="/publishers/:address" element={<PublisherProfile />} />
              <Route path="/upload" element={<Upload />} />

              {/* ─── Dashboard ────────────────────────────────────────── */}
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<DashboardHome />} />
                <Route path="revenue" element={<Revenue />} />
                <Route path="downloads" element={<Downloads />} />
                <Route path="settings" element={<Settings />} />
                <Route path="on-chain" element={<OnChainActivity />} />
              </Route>

              {/* ─── Developers ───────────────────────────────────────── */}
              <Route path="/developers" element={<Developers />} />
              <Route path="/api" element={<ApiReference />} />
              <Route path="/sdk" element={<SDKPage />} />
              <Route path="/sdk/:lang" element={<SDKDetail />} />
              <Route path="/cli" element={<CLI />} />
              <Route path="/github" element={<GitHubPage />} />

              {/* ─── Docs ─────────────────────────────────────────────── */}
              <Route path="/docs" element={<DocsHome />} />
              <Route path="/docs" element={<DocsLayout />}>
                <Route path="getting-started/introduction" element={null} />
                <Route path="getting-started/quickstart" element={null} />
                <Route path="getting-started/authentication" element={null} />
                <Route path="getting-started/api-keys" element={null} />
                <Route path="datasets/overview" element={null} />
                <Route path="datasets/uploading" element={null} />
                <Route path="datasets/marketplace" element={null} />
                <Route path="datasets/verification" element={null} />
                <Route path="sdk/javascript" element={null} />
                <Route path="sdk/python" element={null} />
                <Route path="sdk/rust" element={null} />
                <Route path="sdk/go" element={null} />
                <Route path="api/rest" element={null} />
                <Route path="cli" element={null} />
                <Route path="resources/examples" element={null} />
                <Route path="resources/tutorials" element={null} />
                <Route path="resources/faq" element={null} />
                <Route path="resources/changelog" element={null} />
              </Route>

              {/* ─── Community ────────────────────────────────────────── */}
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/new" element={<BlogPostEditor />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/blog/:slug/edit" element={<BlogPostEditor />} />

              {/* ─── Network ──────────────────────────────────────────── */}
              <Route path="/network" element={<ShelbyNetwork />} />
              <Route path="/status" element={<Status />} />

              {/* ─── Errors ───────────────────────────────────────────── */}
              <Route path="/403" element={<Forbidden />} />
              <Route path="/500" element={<ServerError />} />
              <Route path="/503" element={<ShelbyUnavailable />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </WalletProvider>
  );
}
