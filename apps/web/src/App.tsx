import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import DatasetDetail from './pages/DatasetDetail';
import PublisherProfile from './pages/PublisherProfile';
import Upload from './pages/Upload';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Forbidden from './pages/Forbidden';
import ServerError from './pages/ServerError';
import ShelbyUnavailable from './pages/ShelbyUnavailable';
import NotFound from './pages/NotFound';
import { WalletProvider } from './context/WalletContext';

export default function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/datasets/:id" element={<DatasetDetail />} />
            <Route path="/publishers/:address" element={<PublisherProfile />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/403" element={<Forbidden />} />
            <Route path="/500" element={<ServerError />} />
            <Route path="/503" element={<ShelbyUnavailable />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </WalletProvider>
  );
}
