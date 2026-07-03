import { Link } from 'react-router-dom';

export function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 page-enter">
      <h1 className="text-display text-content-primary mb-3">Terms of Service</h1>

      <div className="space-y-4 text-content-secondary leading-relaxed">
        <p className="text-micro text-content-tertiary">Last updated: June 2026</p>

        <section className="glass-card space-y-3">
          <h2 className="text-subheading text-content-primary">Acceptance of Terms</h2>
          <p>
            By accessing or using IndiaTV, you agree to be bound by these Terms of Service. If you do not
            agree, do not use the service.
          </p>
        </section>

        <section className="glass-card space-y-3">
          <h2 className="text-subheading text-content-primary">Eligibility</h2>
          <p>
            You must be at least 18 years old to use IndiaTV. By using the service, you represent and
            warrant that you meet this age requirement.
          </p>
        </section>

        <section className="glass-card space-y-3">
          <h2 className="text-subheading text-content-primary">Acceptable Use</h2>
          <ul className="list-disc list-inside space-y-2 text-caption text-content-secondary">
            <li>Be respectful to other users at all times</li>
            <li>Do not share personal information with strangers</li>
            <li>No nudity, sexual content, or illegal activity</li>
            <li>No harassment, hate speech, or threats</li>
            <li>No spam, advertising, or solicitation</li>
            <li>Report violations using the in-app Report feature</li>
          </ul>
        </section>

        <section className="glass-card space-y-3">
          <h2 className="text-subheading text-content-primary">Service Availability</h2>
          <p>
            IndiaTV is provided &quot;as is&quot; without warranties of any kind. We do not guarantee
            uninterrupted access, matching availability, or connection quality. Service may be modified
            or discontinued at any time.
          </p>
        </section>

        <section className="glass-card space-y-3">
          <h2 className="text-subheading text-content-primary">Limitation of Liability</h2>
          <p>
            IndiaTV is not responsible for user conduct, content shared between users, or any damages
            arising from use of the service. You use IndiaTV at your own risk.
          </p>
        </section>

        <section className="glass-card space-y-3">
          <h2 className="text-subheading text-content-primary">Termination</h2>
          <p>
            We reserve the right to restrict or terminate access for users who violate these terms or
            engage in harmful behavior, without prior notice.
          </p>
        </section>

        <section className="glass-card space-y-3">
          <h2 className="text-subheading text-content-primary">Contact</h2>
          <p>
            Questions about these terms? Visit our{' '}
            <Link to="/contact" className="text-accent-light hover:underline">
              Contact page
            </Link>{' '}
            or email legal@indiatv.app.
          </p>
        </section>
      </div>
    </div>
  );
}
