import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProfileModal from './ProfileModal';
import logoImg from '../logo.png';

const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  OWNER: 'Library Owner',
  READER: 'Reader',
  VOLUNTEER: 'Volunteer',
};

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard',  icon: '📊', roles: ['SUPER_ADMIN','OWNER','READER','VOLUNTEER'] },
  { to: '/libraries', label: 'Libraries',  icon: '🏛️', roles: ['SUPER_ADMIN','OWNER','READER','VOLUNTEER'] },
  { to: '/books',     label: 'Books',      icon: '📚', roles: ['SUPER_ADMIN','OWNER','READER','VOLUNTEER'] },
  { to: '/requests',  label: 'Requests',   icon: '📋', roles: ['SUPER_ADMIN','OWNER','READER','VOLUNTEER'] },
  { to: '/book-requests', label: 'Book Requests', icon: '📖', roles: ['SUPER_ADMIN','OWNER','READER','VOLUNTEER'], sidebarOnly: true },
  { to: '/approvals', label: 'Approvals',  icon: '✅', roles: ['SUPER_ADMIN'] },
  { to: '/users',     label: 'Users',      icon: '👥', roles: ['SUPER_ADMIN'] },
];

function isMobileDevice() {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.innerWidth <= 1024
  );
}

const PROFILE_MENU_ITEMS = [
  { key: 'profile',         label: 'Profile',         icon: '👤' },
  { key: 'book_request',    label: 'Wishlist',        icon: '📖' },
  { key: 'my_score',        label: 'My Score',        icon: '⭐' },
  { key: 'issue_register',  label: 'Issue Register',  icon: '📋', roles: ['SUPER_ADMIN', 'READER'] },
  { key: 'logout',          label: 'Logout',          icon: '⎋' },
];

export default function Layout() {
  const { user, logout, switchRole, userRoles } = useAuth();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === '1');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileDetailOpen, setProfileDetailOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(isMobileDevice());
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      localStorage.setItem('sidebarCollapsed', !prev ? '1' : '0');
      return !prev;
    });
  };

  const handleLogout = () => { logout(); navigate('/login'); };
  const visibleNav = NAV_ITEMS.filter(n => n.roles.includes(user?.role));
  const closeSidebar = () => setSidebarOpen(false);

  const handleRoleSwitch = async (role) => {
    if (role === user?.role || switching) return;
    setSwitching(true);
    try {
      await switchRole(role);
      navigate('/dashboard');
    } catch (e) {
      console.error('Role switch failed', e);
    } finally {
      setSwitching(false);
    }
  };

  const handleProfileMenuItem = (key) => {
    setProfileMenuOpen(false);
    if (key === 'logout') {
      handleLogout();
      return;
    }
    if (key === 'profile') {
      setProfileDetailOpen(true);
      return;
    }
    if (key === 'book_request') {
      navigate('/book-requests');
      return;
    }
    if (key === 'my_score') {
      navigate('/my-score');
      return;
    }
    if (key === 'issue_register') {
      navigate('/issue-register');
      return;
    }
  };

  const roleColors = { SUPER_ADMIN: '#FBBF24', OWNER: '#7DD3FC', READER: '#86EFAC', VOLUNTEER: '#FCA5A5' };
  const roleColor = roleColors[user?.role] || 'rgba(255,255,255,0.5)';

  return (
    <div className="app-shell">

      {/* Mobile top bar */}
      {isMobile && (
        <div className="mobile-topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
          <img src={logoImg} alt="Ba Book Corner" />
          <span className="mobile-logo">Ba Book Corner</span>
          <span className="mobile-role">{user?.role}</span>
        </div>
      )}

      {/* Sidebar overlay */}
      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} style={{ display: 'block' }} />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar${!isMobile && collapsed ? ' sidebar-collapsed' : ''}`}
        style={isMobile
          ? { transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)' }
          : { transform: 'translateX(0)' }
        }
      >
        <div className="sidebar-logo">
          <img src={logoImg} alt="Ba Book Corner logo" />
          {(!collapsed || isMobile) && (
            <div className="sidebar-logo-text">
              <h1>Ba Book Corner</h1>
              <span>Ba Foundation</span>
            </div>
          )}
          {isMobile && (
            <button className="sidebar-close" onClick={closeSidebar} style={{ display: 'flex' }}>✕</button>
          )}
          {!isMobile && (
            <button className="sidebar-collapse-btn" onClick={toggleCollapsed} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              {collapsed ? '»' : '«'}
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          {visibleNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => isActive ? 'active' : ''}
              onClick={closeSidebar}
              title={collapsed && !isMobile ? item.label : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              {(!collapsed || isMobile) && item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-user-inner">
            {(!collapsed || isMobile) && (
              <>
                <div className="name">{user?.full_name}</div>
                <div className="role" style={{ color: roleColor }}>{ROLE_LABELS[user?.role] || user?.role}</div>
              </>
            )}

            {/* Role switcher — only shown when user has multiple approved roles */}
            {(!collapsed || isMobile) && userRoles.length > 1 && (
              <div style={{ margin: '8px 0 4px' }}>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', marginBottom: 4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Switch Role
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {userRoles.map(role => (
                    <button
                      key={role}
                      disabled={switching}
                      onClick={() => handleRoleSwitch(role)}
                      style={{
                        background: role === user?.role ? roleColor : 'rgba(255,255,255,0.08)',
                        color: role === user?.role ? '#0F1F3D' : 'rgba(255,255,255,0.75)',
                        border: 'none',
                        borderRadius: 6,
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        fontWeight: role === user?.role ? 700 : 400,
                        cursor: role === user?.role ? 'default' : 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s',
                      }}
                    >
                      {role === user?.role ? '● ' : '○ '}
                      {ROLE_LABELS[role] || role}
                      {switching && role !== user?.role ? ' …' : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button className="logout-btn" onClick={handleLogout} title={collapsed && !isMobile ? 'Sign out' : undefined}>
              <span>⎋</span> {(!collapsed || isMobile) && 'Sign out'}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main
        className="main-content"
        style={isMobile
          ? { marginLeft: 0, paddingTop: '56px', paddingBottom: '64px' }
          : { marginLeft: collapsed ? '72px' : '256px' }
        }
      >
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      {isMobile && (
        <nav className="bottom-nav" style={{ display: 'flex' }}>
          {visibleNav.filter(item => !item.sidebarOnly).map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
            >
              <span className="bottom-nav-icon">{item.icon}</span>
              <span className="bottom-nav-label">{item.label}</span>
            </NavLink>
          ))}
          <button
            className={`bottom-nav-item${profileMenuOpen ? ' active' : ''}`}
            onClick={() => setProfileMenuOpen(prev => !prev)}
          >
            <span className="bottom-nav-icon">👤</span>
            <span className="bottom-nav-label">My Profile</span>
          </button>
        </nav>
      )}

      {/* Profile popup menu (mobile) */}
      {isMobile && profileMenuOpen && (
        <>
          <div className="profile-menu-overlay" onClick={() => setProfileMenuOpen(false)} />
          <div className="profile-menu">
            <div className="profile-menu-header">
              <div className="name">{user?.full_name}</div>
              <div className="role" style={{ color: roleColor }}>{ROLE_LABELS[user?.role] || user?.role}</div>
            </div>
            {/* Mobile role switcher */}
            {userRoles.length > 1 && (
              <div style={{ padding: '8px 16px 4px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Switch Role
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {userRoles.map(role => (
                    <button
                      key={role}
                      disabled={switching}
                      onClick={() => { setProfileMenuOpen(false); handleRoleSwitch(role); }}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 99,
                        border: `2px solid ${role === user?.role ? 'var(--primary)' : 'var(--border)'}`,
                        background: role === user?.role ? 'var(--primary)' : 'transparent',
                        color: role === user?.role ? '#fff' : 'var(--charcoal)',
                        fontSize: '0.78rem',
                        fontWeight: role === user?.role ? 700 : 400,
                        cursor: role === user?.role ? 'default' : 'pointer',
                      }}
                    >
                      {ROLE_LABELS[role] || role}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {PROFILE_MENU_ITEMS.filter(item => !item.roles || item.roles.includes(user?.role)).map(item => (
              <button
                key={item.key}
                className={`profile-menu-item${item.key === 'logout' ? ' danger' : ''}`}
                onClick={() => handleProfileMenuItem(item.key)}
              >
                <span className="profile-menu-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Profile detail / edit modal */}
      {profileDetailOpen && (
        <ProfileModal onClose={() => setProfileDetailOpen(false)} />
      )}
    </div>
  );
}