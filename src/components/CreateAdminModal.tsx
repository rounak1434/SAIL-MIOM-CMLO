import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  Eye,
  EyeOff,
  Building2,
  Briefcase,
  Phone,
  Mail,
  Lock,
  User,
  ShieldCheck,
  Shield
} from 'lucide-react';
import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, firebaseConfig } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { AppRole, formatRoleDisplayName } from '../services/auth.service';

interface CreateAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (account: { uid: string; email: string; name: string; role: AppRole }) => void;
  initialRole?: 'admin' | 'chief_admin' | 'moderator';
}

export const CreateAdminModal: React.FC<CreateAdminModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialRole = 'admin',
}) => {
  const { isSuperAdmin, isChiefAdmin } = useAuth();

  const [selectedRole, setSelectedRole] = useState<'admin' | 'chief_admin' | 'moderator'>(initialRole);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [designation, setDesignation] = useState('');
  const [phone, setPhone] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdAccount, setCreatedAccount] = useState<{
    uid: string;
    email: string;
    name: string;
    role: AppRole;
  } | null>(null);

  // Accessible to Chief Admin and Super Admin
  if (!isOpen || (!isSuperAdmin && !isChiefAdmin)) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setCreatedAccount(null);

    const cleanName = userName.trim();
    const cleanEmail = userEmail.trim().toLowerCase();
    const cleanPassword = userPassword.trim();
    const cleanDesignation = designation.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setErrorMessage('Full Name is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorMessage('A valid email address is required.');
      return;
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setIsProcessing(true);

    // Create Firebase Auth user using isolated secondary Firebase app
    // This protects the active session from being signed out
    const secondaryAppName = `SecondaryCreatorApp_${Date.now()}`;
    const secondaryApp =
      getApps().find((a) => a.name === secondaryAppName) ||
      initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        cleanEmail,
        cleanPassword
      );

      const newUid = userCredential.user.uid;

      // Set display name in Auth profile
      await updateProfile(userCredential.user, {
        displayName: cleanName,
      });

      // Immediately sign out of secondary auth session
      await signOut(secondaryAuth);

      // Create Firestore profile document in 'users/{uid}'
      await setDoc(doc(db, 'users', newUid), {
        uid: newUid,
        email: cleanEmail,
        name: cleanName,
        displayName: cleanName,
        role: selectedRole,
        designation: cleanDesignation || '',
        businessName:
          cleanDesignation ||
          (selectedRole === 'moderator' ? 'Electrical Department' : ''),
        phone: cleanPhone || '',
        blocked: false,
        isActive: true,
        commentCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const successData = {
        uid: newUid,
        email: cleanEmail,
        name: cleanName,
        role: selectedRole as AppRole,
      };

      setCreatedAccount(successData);
      if (onSuccess) onSuccess(successData);

      // Reset form fields
      setUserName('');
      setUserEmail('');
      setUserPassword('');
      setDesignation('');
      setPhone('');
    } catch (err: any) {
      console.error('Failed to create account:', err);
      if (err.code === 'auth/email-already-in-use') {
        setErrorMessage('An account with this email address already exists in Firebase Authentication.');
      } else if (err.code === 'auth/weak-password') {
        setErrorMessage('Password is too weak. Please use at least 6 characters.');
      } else {
        setErrorMessage(err.message || 'Failed to create account.');
      }
    } finally {
      setIsProcessing(false);
      try {
        await deleteApp(secondaryApp);
      } catch {
        // Ignore secondary app teardown error
      }
    }
  };

  const handleReset = () => {
    setCreatedAccount(null);
    setErrorMessage(null);
  };

  const roleDisplayName = formatRoleDisplayName(selectedRole);

  return (
    <div className="fixed inset-0 z-[99995] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-lg bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] rounded-2xl p-6 shadow-2xl text-[#111827] dark:text-[#F9FAFB] max-h-[90vh] overflow-y-auto"
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
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
              Create Account
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chief Admin &amp; Super Admin Privileged Access • Assign Role: Admin, Chief Admin, or Moderator
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 mb-4 rounded-xl text-xs bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Card */}
        {createdAccount ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>{formatRoleDisplayName(createdAccount.role)} Account Created Successfully!</span>
            </div>

            <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-lg space-y-1.5 font-mono text-[11px] text-slate-800 dark:text-slate-200">
              <div><span className="text-slate-500 font-sans">Name:</span> {createdAccount.name}</div>
              <div><span className="text-slate-500 font-sans">Email:</span> {createdAccount.email}</div>
              <div><span className="text-slate-500 font-sans">UID:</span> {createdAccount.uid}</div>
              <div>
                <span className="text-slate-500 font-sans">Assigned Role:</span>{' '}
                <span className="text-purple-600 dark:text-purple-400 font-semibold uppercase">{createdAccount.role}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              The new account has been created. The user can now log in immediately with their credentials.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition-all"
              >
                + Create Another Account
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-all"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Create Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3 text-xs">
              {/* Role Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Account Role *
                </label>
                <div className="relative">
                  <Shield className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-purple-600 dark:text-purple-400" />
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as 'admin' | 'chief_admin' | 'moderator')}
                    disabled={isProcessing}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 font-medium"
                  >
                    <option value="admin">Admin (Full Operational Management)</option>
                    <option value="chief_admin">Chief Admin (Full Admin + Privileged Account Creation)</option>
                    <option value="moderator">Moderator (Maintenance Staff / Technician)</option>
                  </select>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {selectedRole === 'chief_admin' && 'Chief Admins can perform all Admin operations and create Admin, Chief Admin, and Moderator accounts.'}
                  {selectedRole === 'admin' && 'Admins manage complaints, assign technicians, and monitor statistics.'}
                  {selectedRole === 'moderator' && 'Moderators manage assigned complaints and update complaint status.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    disabled={isProcessing}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="user@sail.kiom"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    disabled={isProcessing}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Password * (min 6 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    disabled={isProcessing}
                    className="w-full pl-9 pr-10 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Designation / Department <span className="text-slate-400">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. GM (Elect) / Electrical Dept"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      disabled={isProcessing}
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number <span className="text-slate-400">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={isProcessing}
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating {roleDisplayName} Account...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create {roleDisplayName} Account</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default CreateAdminModal;
