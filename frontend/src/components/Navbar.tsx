import { Link, useLocation } from 'react-router-dom';
import { cn } from '../utils/index.js';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/faq', label: 'FAQ' },
  { to: '/contact', label: 'Contact' },
];

export function Navbar() {
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-edge pt-[env(safe-area-inset-top)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link to="/" className="flex items-center gap-2.5 group shrink-0 focus-visible:rounded-xl">
            <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center shadow-soft-sm group-hover:shadow-glow-brand transition-shadow duration-300">
              <span className="text-white font-bold text-sm tracking-tight">IT</span>
            </div>
            <span className="text-lg font-semibold text-content-primary tracking-tight">
              IndiaTV
            </span>
          </Link>

          <div className="flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  'hidden sm:inline-flex px-3 py-2 rounded-lg text-caption font-medium transition-all duration-200',
                  location.pathname === link.to
                    ? 'text-content-primary bg-white/10'
                    : 'text-content-secondary hover:text-content-primary hover:bg-white/5'
                )}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/chat"
              className="btn-primary text-caption px-4 py-2 min-h-[40px] ml-1 shrink-0"
            >
              Start Chat
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
