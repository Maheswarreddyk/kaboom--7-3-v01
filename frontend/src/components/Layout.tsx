import { Outlet, useLocation } from 'react-router-dom';
import { Footer } from './Footer.js';
import { Navbar } from './Navbar.js';
import { ToastContainer } from './ToastContainer.js';
import { cn } from '../utils/index.js';

export function Layout() {
  const location = useLocation();
  const isChatPage = location.pathname === '/chat';

  return (
    <div className="min-h-screen flex flex-col">
      {!isChatPage && <Navbar />}
      <ToastContainer />
      <main className={cn('flex-1', !isChatPage && 'pt-16')}>
        <Outlet />
      </main>
      {!isChatPage && <Footer />}
    </div>
  );
}
