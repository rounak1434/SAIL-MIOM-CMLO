import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, 
  Unlock, 
  KeyRound, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Loader2,
  LogOut,
  Calendar,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { signInWithEmailAndPassword, signOut, getIdTokenResult } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  ServiceLicense, 
  isLicenseExpired, 
  updateServiceLicense, 
  getMillisFromTimestamp 
} from '../services/license.service';

interface LockOverlayProps {
  license: ServiceLicense | null;
  serverOffsetMs?: number;
}

export const LockOverlay: React.FC<LockOverlayProps> = ({ license, serverOffsetMs = 0 }) => {
  const { isSuperAdmin, currentUser } = useAuth();
  
  // State tracking whether the license is expired right now
  const [isExpired, setIsExpired] = useState<boolean>(() => {
    return isLicenseExpired(license, Date.now() + serverOffsetMs);
  });

  // Discreet modal trigger states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const clickTimestamps = useRef<number[]>([]);
  
  // Super Admin login form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // License management action states inside modal
  const [actionProcessing, setActionProcessing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Custom extension state
  const [extendDays, setExtendDays] = useState<number>(30);

  // =========================================================================
  // REAL-TIME AUTOMATIC EXPIRATION TIMER (Zero Polling)
  // Calculates exact delay until expiresAt and schedules a single precision timer.
  // =========================================================================
  useEffect(() => {
    const checkState = () => {
      const now = Date.now() + serverOffsetMs;
      const expired = isLicenseExpired(license, now);
      setIsExpired(expired);
      return { now, expired };
    };

    const { now, expired } = checkState();

    // If license is enabled and not yet expired, calculate exact milliseconds until expiration
    if (license?.enabled && license?.expiresAt && !expired) {
      const expireMillis = getMillisFromTimestamp(license.expiresAt);
      const delay = expireMillis - now;

      if (delay > 0 && delay <= 2147483647) { // within 32-bit setTimeout limit (~24.8 days)
        const timerId = setTimeout(() => {
          setIsExpired(true);
        }, delay + 50); // slight buffer to ensure currentTime >= expiresAt

        return () => clearTimeout(timerId);
      }
    }
  }, [license, serverOffsetMs]);

  // Keyboard shortcut listener (Ctrl + Shift + L)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
        e.preventDefault();
        setIsModalOpen(prev => !prev);
        setAuthError(null);
        setActionSuccess(null);
        setActionError(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // If license is not expired, or user is already verified as Super Admin, do not render lock overlay
  if (!isExpired || isSuperAdmin) {
    return null;
  }

  // Handle discreet click interaction: 5 clicks within 3 seconds on the lock icon
  const handleEmblemClick = () => {
    const now = Date.now();
    const recentClicks = [...clickTimestamps.current, now].filter(t => now - t <= 3000);
    clickTimestamps.current = recentClicks;

    if (recentClicks.length >= 5) {
      clickTimestamps.current = [];
      setIsModalOpen(true);
      setAuthError(null);
      setActionSuccess(null);
      setActionError(null);
    }
  };

  // Handle Super Admin authentication with STRICT custom claim verification
  const handleSuperAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // Force refresh token to obtain authoritative custom claims
      const tokenResult = await getIdTokenResult(user, true);
      const hasSuperAdminClaim = tokenResult.claims.superAdmin === true;

      if (!hasSuperAdminClaim) {
        // Normal admin, moderator, or normal user: immediately sign out and deny access
        await signOut(auth);
        setAuthError('Access Denied: Account does not possess Super Admin authorization.');
        setIsAuthenticating(false);
        return;
      }

      // Verified: AuthContext will pick up isSuperAdmin = true via onAuthStateChanged
      setEmail('');
      setPassword('');
      setAuthError(null);
    } catch (err: any) {
      console.error('Super Admin authentication failed:', err);
      if (
        err.code === 'auth/invalid-credential' || 
        err.code === 'auth/wrong-password' || 
        err.code === 'auth/user-not-found'
      ) {
        setAuthError('Invalid email or password.');
      } else {
        setAuthError(err.message || 'Authentication failed.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Action: Emergency Unlock (Extends license by 24 hours)
  const handleEmergencyUnlock = async () => {
    setActionProcessing(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await updateServiceLicense({
        enabled: true,
        expiresAt: newExpiry,
        adminEmail: currentUser?.email || 'Super Admin',
        reason: 'Emergency unlock: 24-hour temporary service extension'
      });
      setActionSuccess('Emergency unlock granted. Service extended by 24 hours.');
      setTimeout(() => {
        setIsModalOpen(false);
      }, 1500);
    } catch (err: any) {
      setActionError(err.message || 'Failed to perform emergency unlock.');
    } finally {
      setActionProcessing(false);
    }
  };

  // Action: Extend license by N days
  const handleExtendLicense = async (days: number) => {
    setActionProcessing(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const currentExpiryMillis = getMillisFromTimestamp(license?.expiresAt);
      const baseTime = currentExpiryMillis > Date.now() ? currentExpiryMillis : Date.now();
      const newExpiry = new Date(baseTime + days * 24 * 60 * 60 * 1000);

      await updateServiceLicense({
        enabled: true,
        expiresAt: newExpiry,
        adminEmail: currentUser?.email || 'Super Admin',
        reason: `License extended by ${days} days`
      });
      setActionSuccess(`License successfully extended by ${days} days.`);
      setTimeout(() => {
        setIsModalOpen(false);
      }, 1500);
    } catch (err: any) {
      setActionError(err.message || 'Failed to extend license.');
    } finally {
      setActionProcessing(false);
    }
  };

  // Action: Disable license limit (Unlimited service)
  const handleDisableLimit = async () => {
    setActionProcessing(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      await updateServiceLicense({
        enabled: false,
        expiresAt: license?.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        adminEmail: currentUser?.email || 'Super Admin',
        reason: 'License limit disabled: Unlimited service mode'
      });
      setActionSuccess('License limit disabled. Service is now permanently active.');
      setTimeout(() => {
        setIsModalOpen(false);
      }, 1500);
    } catch (err: any) {
      setActionError(err.message || 'Failed to disable license limit.');
    } finally {
      setActionProcessing(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setIsModalOpen(false);
  };

  const formattedExpiry = license?.expiresAt 
    ? new Date(getMillisFromTimestamp(license.expiresAt)).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : 'Not Set';

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#F5F7FF] dark:bg-[#0F1115] text-[#111827] dark:text-[#F9FAFB] select-none p-6">
      {/* Central Lock Panel */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative max-w-lg w-full bg-white dark:bg-[#181B21] border border-rose-200 dark:border-rose-900/50 rounded-2xl p-8 shadow-xl text-center"
      >
        {/* Subtle Lock Icon - Discreet Click Target (5 clicks in 3 seconds) */}
        <div 
          onClick={handleEmblemClick}
          className="mx-auto w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center mb-6 cursor-default transition-all duration-200 active:scale-95"
          role="button"
          aria-label="Status Icon"
        >
          <Lock className="w-8 h-8 text-rose-600 dark:text-rose-400" />
        </div>

        {/* Required Mandatory Text - EXACT string */}
        <h1 className="text-xl font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB] mb-3">
          Please renew the firebase subscription to unlock the service
        </h1>

        <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF] max-w-md mx-auto">
          Access to complaint management, tracking, and administrative services is temporarily restricted until the license subscription is renewed.
        </p>
      </motion.div>

      {/* Discreet Super Admin Authentication & License Control Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] rounded-2xl p-6 shadow-2xl text-[#111827] dark:text-[#F9FAFB]"
            >
              {/* Close Button */}
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 text-[#6B7280] hover:text-[#111827] dark:text-[#9CA3AF] dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-[#1E232B] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-600 dark:text-amber-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#111827] dark:text-[#F9FAFB]">Super Admin Control</h3>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">License Management &amp; Emergency Access</p>
                </div>
              </div>

              {/* Branch based on whether already authenticated as Super Admin */}
              {isSuperAdmin ? (
                <div className="space-y-4">
                  {/* Status Card */}
                  <div className="p-3.5 bg-slate-50 dark:bg-[#111318] border border-[#E5E7EB] dark:border-[#2B313B] rounded-xl text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[#6B7280] dark:text-[#9CA3AF]">License Limit:</span>
                      <span className="font-semibold text-rose-600 dark:text-rose-400">EXPIRED</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#6B7280] dark:text-[#9CA3AF]">Expired At:</span>
                      <span className="font-mono text-[#111827] dark:text-[#F9FAFB]">{formattedExpiry}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-[#E5E7EB] dark:border-[#2B313B] pt-1.5 mt-1.5">
                      <span className="text-[#6B7280] dark:text-[#9CA3AF]">Authenticated:</span>
                      <span className="text-[#374151] dark:text-[#D1D5DB] font-mono">{currentUser?.email}</span>
                    </div>
                  </div>

                  {actionSuccess && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{actionSuccess}</span>
                    </div>
                  )}

                  {actionError && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{actionError}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2.5">
                    {/* Emergency Unlock */}
                    <button
                      onClick={handleEmergencyUnlock}
                      disabled={actionProcessing}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
                    >
                      {actionProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                      <span>Emergency Unlock (+24 Hours)</span>
                    </button>

                    {/* Extend License Options */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleExtendLicense(30)}
                        disabled={actionProcessing}
                        className="py-2 px-3 bg-slate-50 dark:bg-[#1E232B] hover:bg-slate-100 dark:hover:bg-[#252B35] border border-[#E5E7EB] dark:border-[#2B313B] disabled:opacity-50 text-[#374151] dark:text-[#D1D5DB] text-xs font-medium rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Calendar className="w-3.5 h-3.5 text-[#2563EB]" />
                        <span>Extend 30 Days</span>
                      </button>
                      <button
                        onClick={() => handleExtendLicense(365)}
                        disabled={actionProcessing}
                        className="py-2 px-3 bg-slate-50 dark:bg-[#1E232B] hover:bg-slate-100 dark:hover:bg-[#252B35] border border-[#E5E7EB] dark:border-[#2B313B] disabled:opacity-50 text-[#374151] dark:text-[#D1D5DB] text-xs font-medium rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span>Extend 1 Year</span>
                      </button>
                    </div>

                    {/* Disable limit */}
                    <button
                      onClick={handleDisableLimit}
                      disabled={actionProcessing}
                      className="w-full py-2 px-3 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-medium rounded-xl transition-all border border-amber-200 dark:border-amber-800/60 shadow-xs"
                    >
                      Disable License Limit (Unlimited Mode)
                    </button>

                    {/* Sign Out */}
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#4B5563] dark:text-[#9CA3AF] text-xs rounded-xl transition-all"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Super Admin Authentication Form */
                <form onSubmit={handleSuperAdminLogin} className="space-y-3.5">
                  {authError && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-[#374151] dark:text-[#D1D5DB] mb-1">
                      Super Admin Email
                    </label>
                    <input 
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@sail-miom.in"
                      className="w-full px-3 py-2 bg-white dark:bg-[#111318] border border-[#D1D5DB] dark:border-[#374151] rounded-xl text-xs text-[#111827] dark:text-[#F9FAFB] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#374151] dark:text-[#D1D5DB] mb-1">
                      Password
                    </label>
                    <input 
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2 bg-white dark:bg-[#111318] border border-[#D1D5DB] dark:border-[#374151] rounded-xl text-xs text-[#111827] dark:text-[#F9FAFB] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isAuthenticating}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-all mt-1"
                  >
                    {isAuthenticating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Custom Claim...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Authenticate Super Admin</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LockOverlay;
