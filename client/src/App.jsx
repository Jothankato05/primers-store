import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LoadingScreen from './components/LoadingScreen';

// Lazy-load all pages — Three.js only loads when Home is visited
const Home = lazy(() => import('./pages/Home'));
const Store = lazy(() => import('./pages/Store'));
const AppDetail = lazy(() => import('./pages/AppDetail'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DeveloperDashboard = lazy(() => import('./pages/DeveloperDashboard'));
const SubmitApp = lazy(() => import('./pages/SubmitApp'));
const EditApp = lazy(() => import('./pages/EditApp'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

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
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/store" element={<Store />} />
            <Route path="/store/:slug" element={<AppDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/dashboard" element={
              <PrivateRoute><Dashboard /></PrivateRoute>
            } />

            <Route path="/developer" element={
              <PrivateRoute roles={['developer', 'admin']}><DeveloperDashboard /></PrivateRoute>
            } />
            <Route path="/developer/submit" element={
              <PrivateRoute roles={['developer', 'admin']}><SubmitApp /></PrivateRoute>
            } />
            <Route path="/developer/edit/:id" element={
              <PrivateRoute roles={['developer', 'admin']}><EditApp /></PrivateRoute>
            } />

            <Route path="/admin" element={
              <PrivateRoute roles={['admin']}><AdminDashboard /></PrivateRoute>
            } />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
