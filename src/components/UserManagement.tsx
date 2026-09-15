import React, { useState, useEffect } from 'react';
import { getBlockedUsers, toggleUserBlock, getAllModerators, toggleModeratorStatus } from '../services/moderator.service';
import { sendUserPasswordReset, updateUserData } from '../services/admin.service';
import { Info, Mail } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name?: string;
  displayName?: string;
  phone?: string;
  role?: string;
  blocked?: boolean;
  isActive?: boolean;
  commentCount?: number;
}

const UserManagement: React.FC = () => {
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'deactivated' | 'blocked'>('all');
  
  // Modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [editForm, setEditForm] = useState({ name: '', displayName: '', email: '', phone: '' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Load blocked users
      const blocked = await getBlockedUsers();
      setBlockedUsers(blocked.map(u => ({
        id: u.id || '',
        email: u.email,
        name: u.name,
        displayName: u.businessName || u.name,
        phone: u.phone,
        role: u.role,
        blocked: true,
        isActive: u.isActive !== false
      })));

      // Load all moderators
      const moderators = await getAllModerators();
      setAllUsers(moderators.map(m => ({
        id: m.id || '',
        email: m.email,
        name: m.name,
        displayName: m.businessName || m.name,
        phone: m.phone,
        role: m.role,
        blocked: m.blocked === true,
        isActive: m.isActive !== false
      })));
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlock = async (uid: string, currentlyBlocked: boolean) => {
    try {
      setActionLoading(true);
      await toggleUserBlock(uid, !currentlyBlocked);
      await loadUsers();
      alert(`User ${!currentlyBlocked ? 'blocked' : 'unblocked'} successfully`);
    } catch (error) {
      console.error('Error toggling block:', error);
      alert('Failed to update user block status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (uid: string, currentlyActive: boolean) => {
    try {
      setActionLoading(true);
      await toggleModeratorStatus(uid, !currentlyActive);
      await loadUsers();
      alert(`User ${!currentlyActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling active status:', error);
      alert('Failed to update user active status');
    } finally {
      setActionLoading(false);
    }
  };

  // Open password reset modal
  const handleChangePassword = (user: User) => {
    setSelectedUser(user);
    setShowPasswordModal(true);
  };

  // Dispatch password reset email
  const handleSendPasswordResetEmail = async () => {
    if (!selectedUser?.email) return;
    
    try {
      setActionLoading(true);
      const res = await sendUserPasswordReset(selectedUser.email);
      alert(res.message || `Password reset email sent to ${selectedUser.email}`);
      setShowPasswordModal(false);
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Error sending password reset:', error);
      alert(`Failed to send password reset: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Open edit modal
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || '',
      displayName: user.displayName || '',
      email: user.email || '',
      phone: user.phone || ''
    });
    setShowEditModal(true);
  };

  // Submit edit
  const handleSubmitEdit = async () => {
    if (!selectedUser) return;
    
    try {
      setActionLoading(true);
      await updateUserData(selectedUser.id, {
        name: editForm.name,
        // The "Business Name" field is stored in `businessName` for moderators
        // (which the list reads). Keep displayName in sync for other consumers.
        businessName: editForm.displayName,
        displayName: editForm.displayName,
        email: editForm.email,
        phone: editForm.phone
      });
      alert('User updated successfully');
      setShowEditModal(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      alert(`Failed to update user: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-slate-600 dark:text-slate-400">Loading users...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">User Management</h2>

      {/* Admin Information Note */}
      <div className="mb-6 p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200">
        <Info className="w-4 h-4 text-[#2563EB] dark:text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Account Management Notice: </span>
          <span>To restrict an account, use <strong>Block</strong> or <strong>Deactivate</strong>. To permanently remove a Firebase Authentication account, use the trusted administrator CLI. Web deletion is disabled on the Spark plan.</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'all'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          All Moderators ({allUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('deactivated')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'deactivated'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          Deactivated ({allUsers.filter(u => u.isActive === false).length})
        </button>
        <button
          onClick={() => setActiveTab('blocked')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'blocked'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          Blocked Users ({blockedUsers.length})
        </button>
      </div>

      {/* Deactivated Users List */}
      {activeTab === 'deactivated' && (
        <div className="space-y-4">
          {allUsers.filter(u => u.isActive === false).length === 0 ? (
            <div className="bg-white dark:bg-[#181B21] border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center">
              <p className="text-slate-500 dark:text-slate-400">No deactivated moderators</p>
            </div>
          ) : (
            allUsers.filter(u => u.isActive === false).map((user) => (
              <div key={user.id} className="bg-white dark:bg-[#181B21] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {user.displayName || user.name || 'Unnamed User'}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{user.email}</p>
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-500">
                      <span>Role: <strong className="text-slate-700 dark:text-slate-300 capitalize">{user.role}</strong></span>
                      <span className="text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900">DEACTIVATED</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(user.id, false)}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 dark:text-emerald-400 dark:border-emerald-500/30 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                      disabled={actionLoading}
                    >
                      Reactivate Moderator
                    </button>
                    <button
                      onClick={() => handleEditUser(user)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 dark:text-blue-400 dark:border-blue-500/30 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                      disabled={actionLoading}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* All Users List */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {allUsers.map((user) => (
            <div key={user.id} className="bg-white dark:bg-[#181B21] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {user.displayName || user.name || 'Unnamed User'}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{user.email}</p>
                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-500">
                    <span>Role: <strong className="text-slate-700 dark:text-slate-300 capitalize">{user.role}</strong></span>
                    <span>Comments: {user.commentCount || 0}/5</span>
                    {user.blocked && (
                      <span className="text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900">BLOCKED</span>
                    )}
                    {user.isActive === false && (
                      <span className="text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900">DEACTIVATED</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleEditUser(user)}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 dark:text-blue-400 dark:border-blue-500/30 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    disabled={actionLoading}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleChangePassword(user)}
                    className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-500/20 dark:hover:bg-purple-500/30 dark:text-purple-400 dark:border-purple-500/30 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    disabled={actionLoading}
                  >
                    Reset Password
                  </button>
                  <button
                    onClick={() => handleToggleBlock(user.id, user.blocked || false)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      user.blocked
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 dark:text-emerald-400 dark:border-emerald-500/30'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 dark:text-rose-400 dark:border-rose-500/30'
                    }`}
                    disabled={actionLoading}
                  >
                    {user.blocked ? 'Unblock' : 'Block'}
                  </button>
                  <button
                    onClick={() => handleToggleActive(user.id, user.isActive !== false)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      user.isActive === false
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 dark:text-emerald-400 dark:border-emerald-500/30'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 dark:text-amber-400 dark:border-amber-500/30'
                    }`}
                    disabled={actionLoading}
                  >
                    {user.isActive === false ? 'Activate' : 'Deactivate'}
                  </button>
                  <span
                    className="text-[11px] text-slate-400 dark:text-slate-500 italic ml-1 select-none"
                    title="Permanent account deletion is available via administrator CLI"
                  >
                    CLI deletion only
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Reset Password Modal */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#181B21] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Reset Password
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Send a secure password reset link to:
              <br />
              <strong className="text-slate-900 dark:text-white">{selectedUser.email}</strong>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 bg-slate-50 dark:bg-[#12151B] p-3 rounded-xl border border-slate-200 dark:border-slate-800 leading-relaxed">
              On the Firebase Spark plan, password resets are processed via official Firebase Authentication emails. The user will receive instructions to safely set a new password.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={handleSendPasswordResetEmail}
                disabled={actionLoading}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 text-sm"
              >
                {actionLoading ? 'Sending...' : 'Send Reset Email'}
              </button>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors text-sm"
                disabled={actionLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#181B21] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Edit User: <span className="text-blue-600 dark:text-blue-400">{selectedUser.email}</span>
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Full name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Department / Section
                </label>
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="e.g. Electrical Department"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Email address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSubmitEdit}
                disabled={actionLoading}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors"
                disabled={actionLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
