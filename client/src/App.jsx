import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Store from './pages/Store';
import AppDetail from './pages/AppDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import DeveloperDashboard from './pages/DeveloperDashboard';
import SubmitApp from './pages/SubmitApp';
import EditApp from './pages/EditApp';
import AdminDashboard from './pages/AdminDashboard';
import LoadingScreen from './components/LoadingScreen';

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

export default function App() {
  const { loading } = useAuth();
  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/store" element={<Store />} />
          <Route path="/store/:slug" element={<AppDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* User Dashboard */}
          <Route path="/dashboard" element={
            <PrivateRoute><Dashboard /></PrivateRoute>
          } />

          {/* Developer Routes */}
          <Route path="/developer" element={
            <PrivateRoute roles={['developer', 'admin']}><DeveloperDashboard /></PrivateRoute>
          } />
          <Route path="/developer/submit" element={
            <PrivateRoute roles={['developer', 'admin']}><SubmitApp /></PrivateRoute>
          } />
          <Route path="/developer/edit/:id" element={
            <PrivateRoute roles={['developer', 'admin']}><EditApp /></PrivateRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin" element={
            <PrivateRoute roles={['admin']}><AdminDashboard /></PrivateRoute>
          } />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
