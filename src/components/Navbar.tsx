import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { logoutUser } from '../services/auth.service';
import { db } from '../services/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { Menu, X, Bell, User, LogOut, LayoutDashboard, Sun, Moon } from 'lucide-react';
import sailLogo from '../image/1-12.png';

interface Notification {
  id: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: any;
}

// Normalize either an ISO string or a Firestore Timestamp to epoch millis.
const getNotificationTime = (createdAt: any): number => {
  if (!createdAt) return 0;
  if (typeof createdAt?.toDate === 'function') return createdAt.toDate().getTime();
  if (typeof createdAt?.seconds === 'number') return createdAt.seconds * 1000;
  const t = new Date(createdAt).getTime();
  return isNaN(t) ? 0 : t;
};

export const Navbar = () => {
  const { currentUser, userRole, userName, userData, isSuperAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Refs for dropdown containers
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }

      if (
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close dropdowns on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowProfileMenu(false);
        setShowNotifications(false);
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Real-time Firestore notifications subscription
  useEffect(() => {
    if (!currentUser?.email) {
      setNotifications([]);
      return;
    }

    const notifRef = collection(db, 'notifications');
    const q = query(
      notifRef,
      where('userEmail', '==', currentUser.email),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifList: Notification[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          message: docSnap.data().message,
          type: docSnap.data().type,
          read: docSnap.data().read === true,
          createdAt: docSnap.data().createdAt,
        }));
        setNotifications(notifList);
      },
      (error) => {
        console.warn('Notifications listener error:', error);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.email]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = async () => {
    await logoutUser();
    navigate('/');
    setShowProfileMenu(false);
    setMobileMenuOpen(false);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const docRef = doc(db, 'notifications', notificationId);
      await updateDoc(docRef, {
        read: true,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications
        .filter((n) => !n.read)
        .forEach((n) => {
          const docRef = doc(db, 'notifications', n.id);
          batch.update(docRef, { read: true, updatedAt: serverTimestamp() });
        });
      await batch.commit();
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-200 border-b ${
        scrolled
          ? 'bg-white/95 dark:bg-[#111318]/95 backdrop-blur-md border-[#E5E7EB] dark:border-[#2B313B] shadow-sm'
          : 'bg-white dark:bg-[#111318] border-[#E5E7EB] dark:border-[#2B313B]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center z-50 group">
            <img
              src={sailLogo}
              alt="SAIL Logo"
              style={{ height: '46px', width: 'auto', marginRight: '10px' }}
            />
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-extrabold text-[#111827] dark:text-[#F9FAFB] tracking-tight whitespace-nowrap flex items-center leading-none font-headline">
                SAIL-MIOM
              </span>
              <span className="text-[10px] sm:text-xs text-[#4B5563] dark:text-[#9CA3AF] font-medium tracking-wide whitespace-nowrap mt-1">
                Electrical Maintenance System
              </span>
            </div>
          </Link>

          {/* Center Navigation - Desktop */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            <Link
              to="/"
              className={`text-sm lg:text-base font-medium transition-colors relative py-1 ${
                isActive('/')
                  ? 'text-[#2563EB] font-semibold'
                  : 'text-[#374151] dark:text-[#D1D5DB] hover:text-[#2563EB] dark:hover:text-white'
              }`}
            >
              Home
              {isActive('/') && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#2563EB] rounded-full"></span>
              )}
            </Link>

            <Link
              to="/file-complaint"
              className={`text-sm lg:text-base font-medium transition-colors relative py-1 ${
                isActive('/file-complaint')
                  ? 'text-[#2563EB] font-semibold'
                  : 'text-[#374151] dark:text-[#D1D5DB] hover:text-[#2563EB] dark:hover:text-white'
              }`}
            >
              File Complaint
              {isActive('/file-complaint') && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#2563EB] rounded-full"></span>
              )}
            </Link>

            <Link
              to="/track-complaint"
              className={`text-sm lg:text-base font-medium transition-colors relative py-1 ${
                isActive('/track-complaint')
                  ? 'text-[#2563EB] font-semibold'
                  : 'text-[#374151] dark:text-[#D1D5DB] hover:text-[#2563EB] dark:hover:text-white'
              }`}
            >
              Track Complaint
              {isActive('/track-complaint') && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#2563EB] rounded-full"></span>
              )}
            </Link>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1E232B] transition-colors border border-transparent hover:border-[#E5E7EB] dark:hover:border-[#2B313B]"
              aria-label="Toggle theme"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5 text-amber-400" />
              )}
            </button>

            {!currentUser ? (
              <>
                {/* Desktop Login Buttons */}
                <div className="hidden md:flex items-center gap-2 lg:gap-3">
                  <Link to="/admin-login">
                    <button className="px-3.5 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#2B313B] bg-white dark:bg-[#181B21] text-[#111827] dark:text-[#F9FAFB] hover:bg-slate-50 dark:hover:bg-[#20252E] font-medium text-sm whitespace-nowrap transition-colors shadow-xs">
                      Admin Login
                    </button>
                  </Link>
                  <Link to="/moderator-login">
                    <button className="px-3.5 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium text-sm whitespace-nowrap transition-colors shadow-xs">
                      Moderator Login
                    </button>
                  </Link>
                </div>

                {/* Mobile Hamburger */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 rounded-lg border border-[#E5E7EB] dark:border-[#2B313B] text-[#111827] dark:text-[#F9FAFB] hover:bg-slate-100 dark:hover:bg-[#1E232B] transition-colors"
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </>
            ) : (
              <>
                {/* Logged In User - Desktop */}
                <div className="hidden md:flex items-center gap-2 sm:gap-3">
                  {(userRole === 'admin' || userRole === 'chief_admin' || userRole === 'moderator') && (
                    <Link to={userRole === 'admin' || userRole === 'chief_admin' ? '/dashboard' : '/moderator-dashboard'}>
                      <button className="px-3.5 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium text-sm whitespace-nowrap flex items-center gap-2 shadow-xs transition-colors">
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </button>
                    </Link>
                  )}

                  {/* Notifications */}
                  <div className="relative" ref={notificationDropdownRef}>
                    <button
                      onClick={() => {
                        setShowNotifications(!showNotifications);
                        setShowProfileMenu(false);
                      }}
                      className="relative p-2 rounded-lg border border-[#E5E7EB] dark:border-[#2B313B] bg-white dark:bg-[#181B21] text-[#374151] dark:text-[#D1D5DB] hover:text-[#111827] dark:hover:text-white transition-colors"
                      title="Notifications"
                    >
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full text-xs font-bold flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </button>

                    <AnimatePresence>
                      {showNotifications && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.98 }}
                          className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] rounded-xl shadow-xl overflow-hidden z-50"
                        >
                          <div className="p-4 border-b border-[#E5E7EB] dark:border-[#2B313B] flex items-center justify-between">
                            <h3 className="font-semibold text-[#111827] dark:text-[#F9FAFB]">
                              Notifications
                            </h3>
                            {unreadCount > 0 && (
                              <button
                                onClick={markAllAsRead}
                                className="text-xs font-medium text-[#2563EB] hover:underline"
                              >
                                Mark all read
                              </button>
                            )}
                          </div>
                          <div className="max-h-80 overflow-y-auto divide-y divide-[#E5E7EB] dark:divide-[#2B313B]">
                            {notifications.length === 0 ? (
                              <div className="p-8 text-center text-[#6B7280] dark:text-[#9CA3AF] text-sm">
                                No notifications yet
                              </div>
                            ) : (
                              notifications.map((notification) => (
                                <div
                                  key={notification.id}
                                  onClick={() => markAsRead(notification.id)}
                                  className={`p-3.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                                    !notification.read
                                      ? 'bg-blue-50/70 dark:bg-blue-950/30'
                                      : ''
                                  }`}
                                >
                                  <p className="text-sm font-medium text-[#111827] dark:text-[#F9FAFB] mb-1">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                                    {getNotificationTime(notification.createdAt)
                                      ? new Date(
                                          getNotificationTime(notification.createdAt)
                                        ).toLocaleString()
                                      : ''}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Profile */}
                  <div className="relative" ref={profileDropdownRef}>
                    <button
                      onClick={() => {
                        setShowProfileMenu(!showProfileMenu);
                        setShowNotifications(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#2B313B] bg-white dark:bg-[#181B21] text-[#111827] dark:text-[#F9FAFB] hover:bg-slate-50 dark:hover:bg-[#20252E] transition-colors"
                    >
                      <User className="w-4 h-4 text-[#4B5563] dark:text-[#9CA3AF]" />
                      <span className="text-sm font-medium hidden lg:block">
                        {userName || currentUser?.email?.split('@')[0] || 'User'}
                      </span>
                    </button>

                    <AnimatePresence>
                      {showProfileMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.98 }}
                          className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] rounded-xl shadow-xl overflow-hidden z-50"
                        >
                          <div className="p-3.5 border-b border-[#E5E7EB] dark:border-[#2B313B] bg-slate-50/60 dark:bg-slate-900/40">
                            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Signed in as</p>
                            <p className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB] truncate mt-0.5">
                              {userName || currentUser?.email}
                            </p>
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                              isSuperAdmin
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                                : userRole === 'chief_admin'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                                : 'bg-blue-100 text-[#2563EB] dark:bg-blue-900/50 dark:text-blue-300'
                            }`}>
                              {isSuperAdmin ? 'Super Admin' : userRole === 'chief_admin' ? 'Chief Admin' : userRole === 'admin' ? 'Admin' : userRole === 'moderator' ? 'Moderator' : userRole}
                            </span>
                          </div>

                          <div className="p-1">
                            {(userRole === 'admin' || userRole === 'chief_admin' || userRole === 'moderator') && (
                              <Link
                                to="/profile"
                                onClick={() => setShowProfileMenu(false)}
                                className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-[#222733] transition-colors flex items-center gap-2 rounded text-sm text-[#1F2937] dark:text-[#F3F4F6]"
                              >
                                <User className="w-4 h-4 text-[#6B7280]" />
                                <span>My Profile</span>
                              </Link>
                            )}
                            <button
                              onClick={handleLogout}
                              className="w-full px-3 py-2 text-left hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 transition-colors flex items-center gap-2 rounded text-sm text-[#DC2626]"
                            >
                              <LogOut className="w-4 h-4" />
                              <span>Logout</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Standalone Circular Profile Photo */}
                  <Link
                    to="/profile"
                    title="View Profile"
                    className="shrink-0 flex items-center justify-center rounded-full transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40"
                  >
                    {userData?.profilePhotoUrl ? (
                      <img
                        src={userData.profilePhotoUrl}
                        alt={userName || 'Profile'}
                        className="w-[42px] h-[42px] rounded-full object-cover border-2 border-[#E5E7EB] dark:border-[#2B313B] shadow-xs hover:border-[#2563EB] dark:hover:border-[#2563EB] transition-colors"
                      />
                    ) : (
                      <div className="w-[42px] h-[42px] rounded-full bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xs hover:border-[#2563EB] dark:hover:border-[#2563EB] transition-colors">
                        <User className="w-5 h-5" />
                      </div>
                    )}
                  </Link>
                </div>

                {/* Mobile Standalone Avatar */}
                <Link
                  to="/profile"
                  title="View Profile"
                  className="md:hidden shrink-0 flex items-center justify-center rounded-full transition-transform active:scale-95 focus:outline-none"
                >
                  {userData?.profilePhotoUrl ? (
                    <img
                      src={userData.profilePhotoUrl}
                      alt={userName || 'Profile'}
                      className="w-8 h-8 rounded-full object-cover border border-[#E5E7EB] dark:border-[#2B313B] shadow-xs"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </Link>

                {/* Mobile Hamburger for Logged In */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 rounded-lg border border-[#E5E7EB] dark:border-[#2B313B] text-[#111827] dark:text-[#F9FAFB] hover:bg-slate-100 dark:hover:bg-[#1E232B] transition-colors"
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white dark:bg-[#111318] border-t border-[#E5E7EB] dark:border-[#2B313B] shadow-lg"
          >
            <div className="px-4 py-4 space-y-2">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-2.5 rounded-lg font-medium text-sm ${
                  isActive('/')
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] font-semibold'
                    : 'text-[#1F2937] dark:text-[#E5E7EB] hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Home
              </Link>
              <Link
                to="/file-complaint"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-2.5 rounded-lg font-medium text-sm ${
                  isActive('/file-complaint')
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] font-semibold'
                    : 'text-[#1F2937] dark:text-[#E5E7EB] hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                File Complaint
              </Link>
              <Link
                to="/track-complaint"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-2.5 rounded-lg font-medium text-sm ${
                  isActive('/track-complaint')
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] font-semibold'
                    : 'text-[#1F2937] dark:text-[#E5E7EB] hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Track Complaint
              </Link>

              {!currentUser ? (
                <div className="pt-2 border-t border-[#E5E7EB] dark:border-[#2B313B] space-y-2">
                  <Link
                    to="/admin-login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#2B313B] text-[#111827] dark:text-[#F9FAFB] font-medium text-sm text-center hover:bg-slate-50 dark:hover:bg-[#1E232B]"
                  >
                    Admin Login
                  </Link>
                  <Link
                    to="/moderator-login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium text-sm text-center"
                  >
                    Moderator Login
                  </Link>
                </div>
              ) : (
                <div className="pt-2 border-t border-[#E5E7EB] dark:border-[#2B313B] space-y-2">
                  {(userRole === 'admin' || userRole === 'chief_admin' || userRole === 'moderator') && (
                    <Link
                      to={userRole === 'admin' || userRole === 'chief_admin' ? '/dashboard' : '/moderator-dashboard'}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium text-sm flex items-center gap-2"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                  )}
                  <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#181B21] rounded-lg border border-[#E5E7EB] dark:border-[#2B313B]">
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Signed in as</p>
                    <p className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
                      {userName || currentUser?.email}
                    </p>
                    <p className={`text-xs mt-0.5 font-medium ${
                      isSuperAdmin ? 'text-amber-600 dark:text-amber-400 font-semibold' : userRole === 'chief_admin' ? 'text-purple-600 dark:text-purple-400' : 'text-[#2563EB]'
                    }`}>
                      {isSuperAdmin ? 'Super Admin' : userRole === 'chief_admin' ? 'Chief Admin' : userRole === 'admin' ? 'Admin' : userRole === 'moderator' ? 'Moderator' : userRole}
                    </p>
                  </div>
                  {(userRole === 'admin' || userRole === 'chief_admin' || userRole === 'moderator') && (
                    <Link
                      to="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#2B313B] text-slate-700 dark:text-slate-300 font-medium text-sm text-center hover:bg-slate-50 dark:hover:bg-[#1E232B]"
                    >
                      My Profile
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#2B313B] text-red-600 font-medium text-sm flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};