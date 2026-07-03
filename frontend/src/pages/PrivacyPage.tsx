export function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 page-enter">
      <h1 className="text-display text-content-primary mb-3">Privacy Policy</h1>

      <div className="space-y-4 text-content-secondary leading-relaxed">
        <p className="text-micro text-content-tertiary">Last updated: June 2026</p>

        <section className="glass-card space-y-3">
          <h2 className="text-subheading text-content-primary">Anonymous by Design</h2>
          <p>
            IndiaTV does not require registration, email addresses, phone numbers, or any form of
            authentication. We do not collect names, passwords, or personally identifiable
            information during normal use.
          </p>
        </section>

        <section className="glass-card space-y-3">
          <h2 className="text-subheading text-content-primary">Data We Collect</h2>
          <ul className="list-disc list-inside space-y-2 text-caption text-content-secondary">
            <li>Anonymous session identifiers (UUID tokens)</li>
            <li>Browser and device type (for compatibility)</li>
            <li>Connection logs (matching events, disconnects)</li>
            <li>Reports submitted by users (for moderation)</li>
            <li>Optional feedback ratings</li>
          </ul>
        </section>

        <section className="glass-card space-y-3">
          <h2 className="text-subheading text-content-primary">Video & Audio</h2>
          <p>
            Video and audio streams are transmitted directly between users via WebRTC
            peer-to-peer connections. IndiaTV servers do not record, store, or monitor your
            video or audio content.
          </p>
        </section>

        <section className="glass-card space-y-3">
          <h2 className="text-subheading text-content-primary">Cookies & Storage</h2>
          <p>
            We use browser localStorage to maintain your anonymous session token between page
            refreshes. No tracking cookies or third-party analytics are used.
          </p>
        </section>

        <section className="glass-card space-y-3">
          <h2 className="text-subheading text-content-primary">Reports & Safety</h2>
          <p>
            When you submit a report, we store the report reason, optional notes, and session
            identifiers involved. This data is used solely for moderation and safety purposes.
          </p>
        </section>

        <section className="glass-card space-y-3">
          <h2 className="text-subheading text-content-primary">Data Retention</h2>
          <p>
            Session data and connection logs are retained for a limited period for operational and
            safety purposes, then automatically purged. Report data may be retained longer for
            moderation review.
          </p>
        </section>

        <section className="glass-card space-y-3">
          <h2 className="text-subheading text-content-primary">Contact</h2>
          <p>
            For privacy-related inquiries, please contact us at privacy@indiatv.app.
          </p>
        </section>
      </div>
    </div>
  );
}
