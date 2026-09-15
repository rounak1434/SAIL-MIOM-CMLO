import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { loginUser, logoutUser } from '../services/auth.service';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);
  const { currentUser, userRole, isBlocked } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const isModeratorLogin = location.pathname === '/moderator-login';

  useEffect(() => {
    if (currentUser && userRole) {
      if (isBlocked) {
        setError('Your account has been blocked. Please contact an administrator.');
        logoutUser();
        return;
      }
      if (userRole === 'admin') {
        navigate('/dashboard', { replace: true });
      } else if (userRole === 'moderator') {
        navigate('/moderator-dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [currentUser, userRole, isBlocked, navigate]);

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    setTimeout(() => {
      setSuccess(
        'Password reset request noted. Please contact your SAIL-MIOM system administrator.'
      );
      setEmail('');
      setLoading(false);
    }, 600);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please fill all fields');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await loginUser(email, password);
      const userRoleFromDB = result.role.role;
      
      if (isModeratorLogin) {
        if (userRoleFromDB !== 'moderator') {
          setError('Access denied. Moderator credentials required.');
          setLoading(false);
          await logoutUser();
          return;
        }
      } else {
        if (userRoleFromDB !== 'admin') {
          setError('Access denied. Admin credentials required.');
          setLoading(false);
          await logoutUser();
          return;
        }
      }
      
      if (userRoleFromDB === 'admin') {
        navigate('/dashboard', { replace: true });
      } else if (userRoleFromDB === 'moderator') {
        navigate('/moderator-dashboard', { replace: true });
      } else {
        setError('Access denied. No dashboard access.');
        await logoutUser();
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid email or password');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-24">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] rounded-3xl p-8 sm:p-10 shadow-sm relative">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] dark:text-blue-400 flex items-center justify-center">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] dark:text-[#F9FAFB] tracking-tight mb-2 font-headline">
              {isForgotMode
                ? 'Reset Password'
                : isModeratorLogin
                ? 'Moderator Login'
                : 'Admin Login'}
            </h1>
            <p className="text-sm text-[#4B5563] dark:text-[#9CA3AF]">
              {isForgotMode
                ? 'Enter your registered email to request a reset'
                : 'Sign in to access your electrical management dashboard'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-rose-700 dark:text-rose-300">{error}</p>
            </motion.div>
          )}

          {/* Success Message */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300">{success}</p>
            </motion.div>
          )}

          {/* Form */}
          {!isForgotMode ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#374151] dark:text-[#D1D5DB] mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#111318] text-[#111827] dark:text-[#F9FAFB] placeholder:text-[#9CA3AF] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-all"
                    placeholder="name@sail.in"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-medium text-[#374151] dark:text-[#D1D5DB]">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotMode(true);
                      setError('');
                      setSuccess('');
                    }}
                    className="text-xs text-[#2563EB] hover:underline font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#111318] text-[#111827] dark:text-[#F9FAFB] placeholder:text-[#9CA3AF] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-all"
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151] dark:hover:text-[#D1D5DB]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <span>Sign In to Portal</span>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#374151] dark:text-[#D1D5DB] mb-1.5">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#111318] text-[#111827] dark:text-[#F9FAFB] placeholder:text-[#9CA3AF] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-all"
                    placeholder="name@sail.in"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending Request...</span>
                  </>
                ) : (
                  <span>Request Reset</span>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotMode(false);
                    setError('');
                    setSuccess('');
                  }}
                  className="text-xs text-[#2563EB] hover:underline font-medium"
                >
                  Return to Sign In
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-1.5 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
            <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
            <span>SAIL-MIOM • Electrical &amp; Maintenance Administration Portal</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
