import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Loader2, 
  Calendar,
  Clock,
  Radio,
  Zap,
  UserPlus,
  Shield,
  Terminal,
  Copy,
  Check,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, firebaseConfig } from '../services/firebase';
import { 
  subscribeToLicense, 
  updateServiceLicense, 
  ServiceLicense, 
  isLicenseExpired,
  getMillisFromTimestamp 
} from '../services/license.service';

interface SuperAdminLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SuperAdminLicenseModal: React.FC<SuperAdminLicenseModalProps> = ({ isOpen, onClose }) => {
  const { isSuperAdmin, currentUser } = useAuth();
  const [license, setLicense] = useState<ServiceLicense | null>(null);
  const [serverOffsetMs, setServerOffsetMs] = useState<number>(0);
  
  // Action states
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Custom date/time picker state
  const [customDateTime, setCustomDateTime] = useState<string>('');

  // Admin Creation State (Super Admin exclusive)
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminDesignation, setAdminDesignation] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminFormError, setAdminFormError] = useState<string | null>(null);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [createdAdminDirect, setCreatedAdminDirect] = useState<{ uid: string; email: string; name: string } | null>(null);
  const [generatedCommand, setGeneratedCommand] = useState<{ ps: string; bash: string } | null>(null);
  const [copiedType, setCopiedType] = useState<'ps' | 'bash' | 'cli' | null>(null);

  const handleCreateAdminDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminFormError(null);
    setCreatedAdminDirect(null);

    const trimmedName = adminName.trim();
    const trimmedEmail = adminEmail.trim().toLowerCase();
    const trimmedPassword = adminPassword.trim();
    const trimmedDesignation = adminDesignation.trim();
    const trimmedPhone = adminPhone.trim();

    if (!trimmedName) {
      setAdminFormError('Admin Name is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setAdminFormError('A valid Admin Email address is required.');
      return;
    }
    if (!trimmedPassword || trimmedPassword.length < 6) {
      setAdminFormError('Password must be at least 6 characters.');
      return;
    }

    setIsCreatingAdmin(true);
    try {
      const secondaryAppName = 'SecondaryAdminCreatorAppModal';
      const secondaryApp =
        getApps().find((a) => a.name === secondaryAppName) ||
        initializeApp(firebaseConfig, secondaryAppName);

      const secondaryAuth = getAuth(secondaryApp);
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        trimmedEmail,
        trimmedPassword
      );

      const newAdminUid = userCredential.user.uid;

      await updateProfile(userCredential.user, {
        displayName: trimmedName,
      });

      await signOut(secondaryAuth);

      await setDoc(doc(db, 'users', newAdminUid), {
        uid: newAdminUid,
        email: trimmedEmail,
        name: trimmedName,
        displayName: trimmedName,
        role: 'admin',
        designation: trimmedDesignation || '',
        businessName: trimmedDesignation || '',
        phone: trimmedPhone || '',
        blocked: false,
        isActive: true,
        commentCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setCreatedAdminDirect({
        uid: newAdminUid,
        email: trimmedEmail,
        name: trimmedName,
      });

      setAdminName('');
      setAdminEmail('');
      setAdminPassword('');
      setAdminDesignation('');
      setAdminPhone('');
    } catch (err: any) {
      console.error('Error creating admin:', err);
      if (err.code === 'auth/email-already-in-use') {
        setAdminFormError('An account with this email already exists.');
      } else if (err.code === 'auth/weak-password') {
        setAdminFormError('Password must be at least 6 characters.');
      } else {
        setAdminFormError(err.message || 'Failed to create normal admin account.');
      }
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const handleGenerateAdminProvisioning = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminFormError(null);

    const trimmedName = adminName.trim();
    const trimmedEmail = adminEmail.trim().toLowerCase();
    const trimmedPassword = adminPassword.trim();
    const trimmedDesignation = adminDesignation.trim();
    const trimmedPhone = adminPhone.trim();

    if (!trimmedName) {
      setAdminFormError('Admin Name is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setAdminFormError('A valid Admin Email address is required.');
      return;
    }
    if (!trimmedPassword || trimmedPassword.length < 6) {
      setAdminFormError('Password must be at least 6 characters.');
      return;
    }

    const escPs = (str: string) => str.replace(/`/g, '``').replace(/"/g, '`"').replace(/\$/g, '`$');
    const escBash = (str: string) => str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$');

    let psCmd = `$env:ADMIN_NAME="${escPs(trimmedName)}"; $env:ADMIN_EMAIL="${escPs(trimmedEmail)}"; $env:ADMIN_PASSWORD="${escPs(trimmedPassword)}";`;
    let bashCmd = `ADMIN_NAME="${escBash(trimmedName)}" ADMIN_EMAIL="${escBash(trimmedEmail)}" ADMIN_PASSWORD="${escBash(trimmedPassword)}"`;

    if (trimmedDesignation) {
      psCmd += ` $env:ADMIN_DESIGNATION="${escPs(trimmedDesignation)}"; $env:ADMIN_BUSINESS_NAME="${escPs(trimmedDesignation)}";`;
      bashCmd += ` ADMIN_DESIGNATION="${escBash(trimmedDesignation)}" ADMIN_BUSINESS_NAME="${escBash(trimmedDesignation)}"`;
    }
    if (trimmedPhone) {
      psCmd += ` $env:ADMIN_PHONE="${escPs(trimmedPhone)}";`;
      bashCmd += ` ADMIN_PHONE="${escBash(trimmedPhone)}"`;
    }

    psCmd += ` node scripts/createAdmin.mjs`;
    bashCmd += ` node scripts/createAdmin.mjs`;

    setGeneratedCommand({ ps: psCmd, bash: bashCmd });
  };

  const copyToClipboard = async (text: string, type: 'ps' | 'bash' | 'cli') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 3000);
    } catch {
      // Fallback
    }
  };

  // Subscribe to real-time license updates
  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = subscribeToLicense((status, offset) => {
      setLicense(status);
      setServerOffsetMs(offset);
      if (status?.expiresAt) {
        const d = new Date(getMillisFromTimestamp(status.expiresAt));
        // Format for datetime-local input: YYYY-MM-DDTHH:mm
        const pad = (n: number) => n.toString().padStart(2, '0');
        const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setCustomDateTime(formatted);
      }
    });
    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen || !isSuperAdmin) return null;

  const effectiveNow = Date.now() + serverOffsetMs;
  const isExpired = isLicenseExpired(license, effectiveNow);

  // Common wrapper for license update operations
  const executeUpdate = async (params: {
    enabled: boolean;
    expiresAt: Date | number;
    reason: string;
    successMsg: string;
  }) => {
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      await updateServiceLicense({
        enabled: params.enabled,
        expiresAt: params.expiresAt,
        adminEmail: currentUser?.email || 'Super Admin',
        reason: params.reason
      });
      setStatusMessage({ type: 'success', text: params.successMsg });
    } catch (err: any) {
      console.error('License update failed:', err);
      setStatusMessage({ 
        type: 'error', 
        text: err.message || 'Failed to update license configuration.' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Action 1: Extend expiration by N days
  const handleExtendDays = (days: number) => {
    const currentExpiryMillis = getMillisFromTimestamp(license?.expiresAt);
    const base = currentExpiryMillis > effectiveNow ? currentExpiryMillis : effectiveNow;
    const newExpiry = new Date(base + days * 24 * 60 * 60 * 1000);
    executeUpdate({
      enabled: true,
      expiresAt: newExpiry,
      reason: `Extended license by ${days} days`,
      successMsg: `License successfully extended by ${days} days.`
    });
  };

  // Action 2: Custom Date/Time Expiration (set, extend, or shorten)
  const handleSetCustomDateTime = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDateTime) return;
    const parsed = new Date(customDateTime);
    if (isNaN(parsed.getTime())) {
      setStatusMessage({ type: 'error', text: 'Invalid date/time selected.' });
      return;
    }
    const isPast = parsed.getTime() <= effectiveNow;
    executeUpdate({
      enabled: true,
      expiresAt: parsed,
      reason: `Custom expiration updated to ${parsed.toISOString()}`,
      successMsg: `Expiration updated to ${parsed.toLocaleString('en-IN')}.${isPast ? ' (Service is now locked)' : ''}`
    });
  };

  // Action 3: Immediately Lock Service
  const handleImmediateLock = () => {
    // Sets expiresAt to past time (now - 1 second) and enabled: true
    executeUpdate({
      enabled: true,
      expiresAt: new Date(effectiveNow - 1000),
      reason: 'Immediate manual lock engaged by Super Admin',
      successMsg: 'Immediate lock engaged. Service is now restricted.'
    });
  };

  // Action 4: Emergency Unlock (+24 Hours)
  const handleEmergencyUnlock = () => {
    executeUpdate({
      enabled: true,
      expiresAt: new Date(effectiveNow + 24 * 60 * 60 * 1000),
      reason: 'Emergency unlock: 24-hour temporary service extension',
      successMsg: 'Emergency unlock applied: Service extended for 24 hours.'
    });
  };

  // Action 5: Toggle License Limit (Enable vs Disable)
  const handleToggleLimit = (targetEnabled: boolean) => {
    const currentExpiry = license?.expiresAt 
      ? new Date(getMillisFromTimestamp(license.expiresAt)) 
      : new Date(effectiveNow + 365 * 24 * 60 * 60 * 1000);

    executeUpdate({
      enabled: targetEnabled,
      expiresAt: currentExpiry,
      reason: targetEnabled ? 'License limit enabled' : 'License limit disabled (unlimited mode)',
      successMsg: targetEnabled 
        ? 'License limit enabled. Expiration rule is now actively enforced.' 
        : 'License limit disabled. Portal is in unlimited mode.'
    });
  };

  const formattedExpiry = license?.expiresAt 
    ? new Date(getMillisFromTimestamp(license.expiresAt)).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : 'Not Set';

  return (
    <div className="fixed inset-0 z-[99990] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-xl bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] rounded-2xl p-6 shadow-2xl text-[#111827] dark:text-[#F9FAFB] max-h-[90vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-600 dark:text-purple-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-lg">System Security & License Management</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Super Admin Exclusive Authorization</p>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl text-xs mb-4 flex items-start gap-2.5 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Current License Status Card */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl mb-5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Service Access Status</span>
            <span className={`inline-flex items-center gap-1.5 font-semibold px-2.5 py-1 rounded-full border ${
              isExpired
                ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            }`}>
              <Radio className="w-3 h-3 animate-pulse" />
              {isExpired ? 'LOCKED / EXPIRED' : 'ACTIVE & UNLOCKED'}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800/80 pt-2">
            <span className="text-slate-600 dark:text-slate-400">License Limit Enforcement:</span>
            <span className={`font-semibold ${license?.enabled !== false ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {license?.enabled !== false ? 'ENABLED (Enforcing Expiration)' : 'DISABLED (Unlimited)'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">Configured Expiration:</span>
            <span className="font-mono text-slate-900 dark:text-slate-200">{formattedExpiry}</span>
          </div>

          {license?.updatedBy && (
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Last Updated By:</span>
              <span className="text-slate-800 dark:text-slate-300 font-mono">{license.updatedBy}</span>
            </div>
          )}
        </div>

        {/* Control Actions */}
        <div className="space-y-4">
          {/* Quick Extension Presets */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
              Quick Extend / Renew Expiration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '+7 Days', days: 7 },
                { label: '+30 Days', days: 30 },
                { label: '+90 Days', days: 90 },
                { label: '+1 Year', days: 365 },
              ].map((btn) => (
                <button
                  key={btn.days}
                  onClick={() => handleExtendDays(btn.days)}
                  disabled={isProcessing}
                  className="py-2 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-transparent text-xs font-medium rounded-lg transition-all text-center"
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date & Time Form */}
          <form onSubmit={handleSetCustomDateTime} className="p-3.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Set Exact Expiration Date & Time
            </label>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={customDateTime}
                onChange={(e) => setCustomDateTime(e.target.value)}
                className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={isProcessing}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-all"
              >
                Apply
              </button>
            </div>
          </form>

          {/* Emergency & State Toggle Actions */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {/* Emergency Unlock */}
              <button
                onClick={handleEmergencyUnlock}
                disabled={isProcessing}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Emergency Unlock (+24h)</span>
              </button>

              {/* Immediate Lock */}
              <button
                onClick={handleImmediateLock}
                disabled={isProcessing}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Immediately Lock Service</span>
              </button>
            </div>

            {/* Toggle limit enforcement */}
            <button
              onClick={() => handleToggleLimit(!license?.enabled)}
              disabled={isProcessing}
              className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-xl transition-all border border-slate-200 dark:border-slate-700/60 flex items-center justify-center gap-2"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span>
                {license?.enabled !== false 
                  ? 'Disable License Limit (Set to Unlimited Mode)' 
                  : 'Enable License Limit (Enforce Expiration)'}
              </span>
            </button>
          </div>

          {/* Administration Section */}
          <div className="pt-4 mt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Administration
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Provision Normal Admin accounts with role: "admin"
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateAdmin(!showCreateAdmin);
                  setGeneratedCommand(null);
                  setAdminFormError(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition-all shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{showCreateAdmin ? 'Hide Form' : '+ Create Admin Account'}</span>
              </button>
            </div>

            {showCreateAdmin && (
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 text-xs">
                <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-medium">
                  <Shield className="w-4 h-4 shrink-0" />
                  <span>Create Normal Administrator</span>
                </div>

                {adminFormError && (
                  <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{adminFormError}</span>
                  </div>
                )}

                <form onSubmit={handleGenerateAdminProvisioning} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Admin Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Full Name"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Admin Email *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="admin@example.com"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Admin Password * (min 6 characters)
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full px-3 py-2 pr-9 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Designation <span className="text-slate-400">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. GM (Elect) / Manager"
                        value={adminDesignation}
                        onChange={(e) => setAdminDesignation(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Phone <span className="text-slate-400">(Optional)</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. 9876543210"
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isCreatingAdmin}
                      className="flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition-all flex items-center justify-center gap-2 shadow-xs"
                    >
                      {isCreatingAdmin ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Creating Admin Account...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>Create Admin Account</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateAdminProvisioning}
                      className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-all"
                      title="Generate CLI Command"
                    >
                      CLI Tooling
                    </button>
                  </div>
                </form>

                {/* Direct Creation Success Message */}
                {createdAdminDirect && (
                  <div className="mt-3 p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Admin Account Created Successfully!</span>
                    </div>
                    <div className="p-2.5 bg-white/80 dark:bg-slate-900/80 rounded-lg space-y-1 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                      <div>Name: {createdAdminDirect.name}</div>
                      <div>Email: {createdAdminDirect.email}</div>
                      <div>UID: {createdAdminDirect.uid}</div>
                      <div>Role: <span className="text-purple-600 dark:text-purple-400 font-semibold">admin</span></div>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      The administrator can now log in directly with their email and password.
                    </p>
                  </div>
                )}

                {/* Generated Provisioning Details */}
                {generatedCommand && (
                  <div className="mt-3 p-3.5 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/40 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        Provisioning Parameters Ready
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        role: "admin" | superAdmin: false
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      Under the Firebase Spark security model, authoritative custom claims (<code>role: "admin"</code>) are signed by the Firebase Admin SDK using the trusted CLI tool without risking private key exposure in the web browser.
                    </p>

                    <div className="space-y-2">
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                          <span>PowerShell Command:</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(generatedCommand.ps, 'ps')}
                            className="flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:underline"
                          >
                            {copiedType === 'ps' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedType === 'ps' ? 'Copied!' : 'Copy'}</span>
                          </button>
                        </div>
                        <pre className="p-2.5 bg-slate-900 dark:bg-slate-950 border border-slate-700/60 text-slate-100 rounded-lg font-mono text-[11px] overflow-x-auto whitespace-pre-wrap break-all">
                          {generatedCommand.ps}
                        </pre>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                          <span>Bash / Linux / macOS Command:</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(generatedCommand.bash, 'bash')}
                            className="flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:underline"
                          >
                            {copiedType === 'bash' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedType === 'bash' ? 'Copied!' : 'Copy'}</span>
                          </button>
                        </div>
                        <pre className="p-2.5 bg-slate-900 dark:bg-slate-950 border border-slate-700/60 text-slate-100 rounded-lg font-mono text-[11px] overflow-x-auto whitespace-pre-wrap break-all">
                          {generatedCommand.bash}
                        </pre>
                      </div>

                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Or run interactively: <code className="font-mono text-purple-600 dark:text-purple-400">node scripts/createAdmin.mjs</code>
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard('node scripts/createAdmin.mjs', 'cli')}
                          className="flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400 hover:underline"
                        >
                          {copiedType === 'cli' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedType === 'cli' ? 'Copied' : 'Copy Interactive'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SuperAdminLicenseModal;
