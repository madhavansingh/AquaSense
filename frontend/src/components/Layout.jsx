import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Activity, Settings, LogOut,
  Clock, FileText, User, ShieldCheck, ToggleLeft, ToggleRight,
  Maximize, Minimize, Zap, Fish, BarChart2, Layers, ClipboardList,
} from 'lucide-react';
import { useState } from 'react';
import { useSystem } from '../context/SystemContext';
import { useAuth } from '../context/AuthContext';
import ChatAssistant from './ChatAssistant';
import './Layout.css';

const Layout = () => {
  const {
    systemActive, isLiveMode, latestScan,
    isOperatorMode, setIsOperatorMode,
    systemConfidence,
  } = useSystem();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [avatarError,  setAvatarError]  = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const confColor = systemConfidence >= 0.95
    ? 'var(--status-pass-text)'
    : systemConfidence >= 0.85
      ? 'var(--status-warn-text)'
      : 'var(--status-fail-text)';

  const navCls = ({ isActive }) => `nav-item${isActive ? ' active' : ''}`;
  const name    = user?.name || user?.email?.split('@')[0] || 'User';
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="layout-container">

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        {/* Brand */}
        <div className="sidebar-header">
          <div className="sidebar-logo-icon" style={{ background: 'linear-gradient(135deg,#2563eb,#0ea5e9)', color:'#fff' }}>
            <Fish size={18} />
          </div>
          <div className="sidebar-brand">
            <h2>AquaSense</h2>
            <span>AI Fish Health</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-section">
            <span className="nav-section-label">Main</span>
            {!isOperatorMode && (
              <NavLink to="/dashboard" className={navCls}>
                <LayoutDashboard size={16} />
                Dashboard
              </NavLink>
            )}
            <NavLink to="/inspect" className={navCls}>
              <Fish size={16} />
              Fish Scan
            </NavLink>
            <NavLink to="/batch-scan" className={navCls}>
              <Layers size={16} />
              Batch Scan
            </NavLink>
            <NavLink to="/treatment" className={navCls}>
              <ClipboardList size={16} style={{ color: 'inherit' }}/>
              Treatment Plan
            </NavLink>
            {!isOperatorMode && (
              <NavLink to="/analytics" className={navCls}>
                <BarChart2 size={16} />
                Analytics
              </NavLink>
            )}
            {!isOperatorMode && (
              <NavLink to="/reports" className={navCls}>
                <FileText size={16} />
                Reports
              </NavLink>
            )}
          </div>

          <div className="nav-section mt-auto">
            <span className="nav-section-label">Account</span>
            <NavLink to="/profile"  className={navCls}>
              <User size={16} />
              Profile
            </NavLink>
            <NavLink to="/settings" className={navCls}>
              <Settings size={16} />
              Settings
            </NavLink>
          </div>

          <div className="nav-section">
            <span className="nav-section-label">System</span>
            <button
              className="nav-item"
              onClick={() => setIsOperatorMode(!isOperatorMode)}
              title="Switch between Operator and Admin mode"
            >
              {isOperatorMode
                ? <ToggleRight size={16} style={{ color: 'var(--color-primary)' }}/>
                : <ToggleLeft  size={16} />
              }
              <span>{isOperatorMode ? 'Operator Mode' : 'Admin Mode'}</span>
            </button>
          </div>
        </nav>

        {/* Sidebar logout */}
        <div className="sidebar-footer">
          <button className="nav-item danger" onClick={handleLogout}>
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">

        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            {/* System active pill */}
            <div className={`system-pill ${systemActive ? 'active' : ''}`}>
              <span className={`status-dot ${systemActive ? 'active' : ''}`}/>
              {systemActive ? 'System Active' : 'Inactive'}
            </div>

            {/* Live monitoring pill */}
            {isLiveMode && (
              <div className="system-pill live">
                <Zap size={10}/>
                Live
              </div>
            )}

            {/* Confidence */}
            <div className="topbar-stat">
              <ShieldCheck size={13}/>
              <span>AI Confidence: <strong style={{ color: confColor }}>
                {(systemConfidence * 100).toFixed(1)}%
              </strong></span>
            </div>

            {/* Last scan */}
            {latestScan && (
              <div className="topbar-stat">
                <Clock size={13}/>
                <span>Last Scan: <strong>{latestScan.timestamp}</strong></span>
              </div>
            )}
          </div>

          <div className="topbar-right">
            {/* Fullscreen */}
            <button className="topbar-icon-btn" onClick={toggleFullscreen} title="Presentation mode">
              {isFullscreen ? <Minimize size={15}/> : <Maximize size={15}/>}
            </button>

            {/* User pill */}
            <div className="user-pill" onClick={() => navigate('/profile')} role="button">
              {user?.picture && !avatarError ? (
                <img
                  src={user.picture}
                  alt={name}
                  className="user-avatar-img"
                  onError={() => setAvatarError(true)}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="user-avatar">{initials}</div>
              )}
              <span className="user-name">{name}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="content-area">
          <Outlet />
        </div>
      </main>

      {/* Floating chat assistant */}
      <ChatAssistant />
    </div>
  );
};

export default Layout;
