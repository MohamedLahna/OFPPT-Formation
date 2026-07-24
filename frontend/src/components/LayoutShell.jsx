import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function LayoutShell() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-shell">
        <Topbar />
        <main className="content-shell">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
