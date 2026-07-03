import { Link } from 'react-router-dom';

const footerLinks = {
  product: [
    { to: '/', label: 'Home' },
    { to: '/chat', label: 'Start Chat' },
    { to: '/about', label: 'About' },
    { to: '/faq', label: 'FAQ' },
  ],
  legal: [
    { to: '/privacy', label: 'Privacy Policy' },
    { to: '/terms', label: 'Terms of Service' },
    { to: '/contact', label: 'Contact' },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-edge mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-[max(3rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center">
                <span className="text-white font-bold text-sm">IT</span>
              </div>
              <span className="text-lg font-semibold text-content-primary">IndiaTV</span>
            </div>
            <p className="text-caption text-content-tertiary leading-relaxed max-w-xs">
              Anonymous video chat. No login required. Connect with people worldwide, instantly and safely.
            </p>
          </div>

          <div>
            <h3 className="text-caption font-semibold text-content-primary mb-4">Product</h3>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-caption text-content-tertiary hover:text-content-primary transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-caption font-semibold text-content-primary mb-4">Legal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-caption text-content-tertiary hover:text-content-primary transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-edge flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-micro text-content-tertiary">
            &copy; {new Date().getFullYear()} IndiaTV. All rights reserved.
          </p>
          <p className="text-micro text-content-tertiary">
            Users must be 18+ to use this service.
          </p>
        </div>
      </div>
    </footer>
  );
}
