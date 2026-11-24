import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export default function AppLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setNavOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="app-shell">
      <Sidebar open={navOpen} onNavigate={() => setNavOpen(false)} />
      <div className={`sidebar-backdrop ${navOpen ? 'is-open' : ''}`} onClick={() => setNavOpen(false)} aria-hidden="true" />
      <div className="main">
        <Topbar onMenu={() => setNavOpen(true)} />
        <main className="content" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
