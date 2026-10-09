import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../services/firebase';
import { uploadToImgBB } from '../services/imgbb.service';
import { updateUserProfilePhoto, changeCurrentUserPassword } from '../services/auth.service';
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Key,
  Camera,
  Trash2,
  Loader2
} from 'lucide-react';

const Profile = () => {
  const { currentUser, userRole, userName, userData } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Safely determine if the authenticated user has an email/password provider
  const isPasswordProvider =
    auth.currentUser?.providerData?.some(
      (provider) => provider?.providerId === 'password'
    ) ?? false;
  
  // Photo states
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoSuccessMsg, setPhotoSuccessMsg] = useState('');
  const [photoErrorMsg, setPhotoErrorMsg] = useState('');
  
  // Password states - strictly initialized to empty strings
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Visibility states (masked by default)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Clear all password values from memory when leaving the page or component unmounts
  useEffect(() => {
    return () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    };
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Client-side validations
    if (!currentPassword) {
      setErrorMsg('Please enter your current password.');
      return;
    }

    if (!newPassword) {
      setErrorMsg('Please enter a new password.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Password must meet the minimum password requirements.');
      return;
    }

    if (!confirmPassword) {
      setErrorMsg('Please confirm your new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMsg('New password must be different from your current password.');
      return;
    }

    if (!currentUser) {
      setErrorMsg('User not authenticated.');
      return;
    }

    setLoading(true);

    try {
      await changeCurrentUserPassword(currentPassword, newPassword);

      setSuccessMsg('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (error: any) {
      setErrorMsg(error.message || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input value so user can re-select the same file if needed
    e.target.value = '';

    setPhotoErrorMsg('');
    setPhotoSuccessMsg('');

    // Validate format
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setPhotoErrorMsg('Please select a valid image file (JPG, PNG, or WEBP).');
      return;
    }

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setPhotoErrorMsg('Profile photo must be smaller than 5 MB.');
      return;
    }

    if (!currentUser) {
      setPhotoErrorMsg('User not authenticated.');
      return;
    }

    setPhotoLoading(true);

    try {
      const publicUrl = await uploadToImgBB(file);
      await updateUserProfilePhoto(currentUser.uid, publicUrl);
      setPhotoSuccessMsg('Profile photo updated successfully.');
    } catch (error: any) {
      console.error('Profile photo upload error:', error);
      setPhotoErrorMsg(error.message || 'Unable to upload profile photo. Please try again.');
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!currentUser) return;
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return;

    setPhotoErrorMsg('');
    setPhotoSuccessMsg('');
    setPhotoLoading(true);

    try {
      await updateUserProfilePhoto(currentUser.uid, null);
      setPhotoSuccessMsg('Profile photo removed.');
    } catch (error: any) {
      console.error('Remove photo error:', error);
      setPhotoErrorMsg(error.message || 'Unable to remove profile photo. Please try again.');
    } finally {
      setPhotoLoading(false);
    }
  };

  // Only allow admin, chief_admin, and moderator users to view this
  if (userRole !== 'admin' && userRole !== 'chief_admin' && userRole !== 'moderator') {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 flex items-center justify-center">
        <div className="bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] rounded-2xl shadow-xs p-8 text-center max-w-md w-full">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#111827] dark:text-[#F9FAFB] mb-2">Access Denied</h2>
          <p className="text-[#4B5563] dark:text-[#9CA3AF] text-sm leading-relaxed">
            You do not have permission to access this page. Only authenticated administrators and moderators are permitted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-2">
            User Profile
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg">
            Manage your account settings and credentials
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* User Details Panel */}
          <div className="md:col-span-1">
            <div className="bg-white dark:bg-[#181B21] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                accept="image/jpeg,image/png,image/webp,image/jpg"
                className="hidden"
                disabled={photoLoading}
              />

              {/* Horizontal layout: [ Avatar ]  username & role */}
              <div className="flex items-center gap-4 mb-4">
                <div
                  onClick={() => !photoLoading && fileInputRef.current?.click()}
                  className="relative group cursor-pointer shrink-0"
                  title={userData?.profilePhotoUrl ? 'Click to change profile photo' : 'Click to add profile photo'}
                >
                  {userData?.profilePhotoUrl ? (
                    <img
                      src={userData.profilePhotoUrl}
                      alt={userName}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 shadow-xs group-hover:opacity-90 transition-opacity"
                    />
                  ) : (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                      <UserIcon className="w-7 h-7 sm:w-8 sm:h-8" />
                    </div>
                  )}

                  {/* Small camera badge icon */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white flex items-center justify-center shadow-md border-2 border-white dark:border-[#181B21] transition-transform group-hover:scale-110">
                    <Camera className="w-3 h-3" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
                    {userName}
                  </h2>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    userRole === 'chief_admin'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30'
                      : 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30'
                  }`}>
                    {userRole === 'chief_admin' ? 'Chief Admin' : userRole === 'admin' ? 'Admin' : userRole === 'moderator' ? 'Moderator' : userRole}
                  </span>
                </div>
              </div>

              {/* Photo Actions: Add / Change / Remove Photo */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoLoading}
                  className="px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {photoLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5" />
                      <span>{userData?.profilePhotoUrl ? 'Change Profile Photo' : 'Add Profile Photo'}</span>
                    </>
                  )}
                </button>

                {userData?.profilePhotoUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={photoLoading}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                    title="Remove Photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Photo</span>
                  </button>
                )}
              </div>

              {/* Photo Feedback Alerts */}
              <AnimatePresence>
                {photoErrorMsg && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-400 text-xs flex items-start gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{photoErrorMsg}</span>
                  </motion.div>
                )}

                {photoSuccessMsg && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400 text-xs flex items-start gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{photoSuccessMsg}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Metadata details */}
              <div className="w-full text-left space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                  <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Email Address</p>
                    <p className="text-sm font-semibold truncate text-slate-900 dark:text-white">{currentUser?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                  <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Access Role</p>
                    <p className="text-sm font-semibold capitalize text-slate-900 dark:text-white">{userRole} privileges</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Change Password Section */}
          <div className="md:col-span-2">
            <div className="bg-white dark:bg-[#181B21] p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Key className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Change Password</h2>
              </div>

              <AnimatePresence mode="wait">
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 mb-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-400 flex items-start gap-3 text-sm"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </motion.div>
                )}

                {successMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 mb-6 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400 flex items-start gap-3 text-sm"
                  >
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{successMsg}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {!isPasswordProvider ? (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-900/50 dark:text-blue-300 text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>Password changes are available for accounts using email and password authentication.</span>
                </div>
              ) : (
                <form onSubmit={handlePasswordChange} className="space-y-6">
                  {/* Current Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="current-password" className="text-sm font-medium text-slate-700 dark:text-slate-300 block">
                      Current Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        id="current-password"
                        name="current-password"
                        type={showCurrentPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        placeholder="Enter current password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title={showCurrentPassword ? 'Hide password' : 'Show password'}
                      >
                        {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="new-password" className="text-sm font-medium text-slate-700 dark:text-slate-300 block">
                      New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        id="new-password"
                        name="new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        placeholder="Minimum 6 characters"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title={showNewPassword ? 'Hide password' : 'Show password'}
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="confirm-new-password" className="text-sm font-medium text-slate-700 dark:text-slate-300 block">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        id="confirm-new-password"
                        name="confirm-new-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        placeholder="Repeat new password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      'Change Password'
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
