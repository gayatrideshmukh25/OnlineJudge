import { useState } from 'react';
import toast from 'react-hot-toast';
import { FiUser, FiLock, FiTrash2 } from 'react-icons/fi';
import useAuth from '../hooks/useAuth';
import userService from '../services/userService';
import Sidebar from '../components/Sidebar.jsx';
import './Profile.css';

export default function Profile() {
  const { user, setUser, logout } = useAuth();

  const [profileForm, setProfileForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const data = await userService.updateProfile(profileForm);
      setUser((u) => ({ ...u, ...(data.user ?? data) }));
      toast.success('Profile updated');
    } catch (err) {
      // handled globally
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setSavingPassword(true);
    try {
      await userService.changePassword(passwordForm);
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      // handled globally
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('This will permanently delete your account. Continue?')) return;
    try {
      await userService.deleteAccount();
      toast.success('Account deleted');
      await logout();
    } catch (err) {
      // handled globally
    }
  };

  return (
    <div className="container page-enter profile-page">
      <div className="dashboard-layout">
        <Sidebar />

        <div className="profile-content">
          <h1>Profile</h1>
          <p className="text-dim" style={{ marginBottom: 28 }}>
            Manage your account details and security settings.
          </p>

          <div className="card profile-card">
            <h3><FiUser /> Account Details</h3>
            <form onSubmit={handleProfileSubmit}>
              <div className="field">
                <label>Username</label>
                <input
                  className="input"
                  value={profileForm.username}
                  onChange={(e) => setProfileForm((f) => ({ ...f, username: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Email</label>
                <input
                  className="input"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <button className="btn btn-primary" disabled={savingProfile}>
                {savingProfile ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          </div>

          <div className="card profile-card">
            <h3><FiLock /> Change Password</h3>
            <form onSubmit={handlePasswordSubmit}>
              <div className="field">
                <label>Current Password</label>
                <input
                  className="input"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))
                  }
                />
              </div>
              <div className="field">
                <label>New Password</label>
                <input
                  className="input"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Confirm New Password</label>
                <input
                  className="input"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))
                  }
                />
              </div>
              <button className="btn btn-primary" disabled={savingPassword}>
                {savingPassword ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </div>

          <div className="card profile-card danger-zone">
            <h3><FiTrash2 /> Danger Zone</h3>
            <p className="text-dim">Deleting your account is permanent and cannot be undone.</p>
            <button className="btn btn-danger" onClick={handleDelete}>
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
