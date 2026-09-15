import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LockOverlay } from './components/LockOverlay';
import { subscribeToLicense, ServiceLicense } from './services/license.service';

const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() =>
  import('./pages/Login').then((module) => ({ default: module.Login }))
);
const FileComplaint = lazy(() => import('./pages/FileComplaint'));
const TrackComplaint = lazy(() =>
  import('./pages/TrackComplaint').then((module) => ({
    default: module.TrackComplaint,
  }))
);
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ModeratorDashboard = lazy(() => import('./pages/ModeratorDashboard'));
const Profile = lazy(() => import('./pages/Profile'));

function RouteFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center text-[#4B5563] dark:text-[#9CA3AF]">
      Loading...
    </div>
  );
}

function App() {
  const [license, setLicense] = useState<ServiceLicense | null>(null);
  const [serverOffsetMs, setServerOffsetMs] = useState<number>(0);

  useEffect(() => {
    const unsubscribe = subscribeToLicense((status, offset) => {
      setLicense(status);
      setServerOffsetMs(offset);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Clear chunk load failed flag on successful mount (giving chunks time to load)
    const timer = setTimeout(() => {
      try {
        sessionStorage.removeItem('chunk_load_failed');
      } catch (e) {
        // Ignore
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <LockOverlay license={license} serverOffsetMs={serverOffsetMs} />
          {/* Global Theme Wrapper */}
          <div className="min-h-screen bg-[#F5F7FF] dark:bg-[#0F1115] text-[#111827] dark:text-[#F9FAFB] font-body relative overflow-x-hidden transition-colors duration-150">
            <Navbar />

            {/* Main content wrapper */}
            <main className="relative z-0">
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/admin-login" element={<Login />} />
                  <Route path="/moderator-login" element={<Login />} />
                  <Route path="/file-complaint" element={<FileComplaint />} />
                  <Route path="/track-complaint" element={<TrackComplaint />} />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/moderator-dashboard"
                    element={
                      <ProtectedRoute requiredRole="moderator">
                        <ModeratorDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </main>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;