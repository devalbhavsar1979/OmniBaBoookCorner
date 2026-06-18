import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoImg from '../logo.png';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard',  icon: '📊', roles: ['SUPER_ADMIN','OWNER','READER','VOLUNTEER'] },
  { to: '/libraries', label: 'Libraries',  icon: '🏛️', roles: ['SUPER_ADMIN','OWNER','READER','VOLUNTEER'] },
  { to: '/books',     label: 'Books',      icon: '📚', roles: ['SUPER_ADMIN','OWNER','READER','VOLUNTEER'] },
  { to: '/requests',  label: 'Requests',   icon: '📋', roles: ['SUPER_ADMIN','OWNER','READER','VOLUNTEER'] },
];

function isMobileDevice() {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.innerWidth <= 1024
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === '1');

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
                <div className="role" style={{ color: roleColor }}>{user?.role}</div>
              </>
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
          {visibleNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
            >
              <span className="bottom-nav-icon">{item.icon}</span>
              <span className="bottom-nav-label">{item.label}</span>
            </NavLink>
          ))}
          <button className="bottom-nav-item" onClick={handleLogout}>
            <span className="bottom-nav-icon">⎋</span>
            <span className="bottom-nav-label">Logout</span>
          </button>
        </nav>
      )}
    </div>
  );
}