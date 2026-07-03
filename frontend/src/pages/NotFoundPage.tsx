import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 page-enter">
      <div className="text-center max-w-md">
        <p className="text-display-lg font-bold text-brand mb-2 tabular-nums">404</p>
        <h1 className="text-heading text-content-primary mb-3">Page not found</h1>
        <p className="text-caption text-content-tertiary mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link to="/" className="btn-primary">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
