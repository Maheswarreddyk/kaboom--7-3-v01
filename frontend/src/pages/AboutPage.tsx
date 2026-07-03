export function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 page-enter">
      <h1 className="text-display text-content-primary mb-3">About IndiaTV</h1>
      <p className="text-caption text-content-tertiary mb-10 leading-relaxed">
        Anonymous video chat, built for real human connection.
      </p>

      <div className="space-y-4 text-content-secondary leading-relaxed">
        <p className="text-body">
          IndiaTV connects people from around the world in real time — no accounts, no profiles,
          just genuine conversations. We built it with privacy, speed, and comfort at the center.
        </p>

        <div className="glass-card space-y-4">
          <h2 className="text-subheading text-content-primary">How it works</h2>
          <ol className="list-decimal list-inside space-y-2 text-caption text-content-secondary">
            <li>Tap &quot;Start Chat&quot; — no account needed.</li>
            <li>Allow camera and microphone access when prompted.</li>
            <li>Get matched with someone online right away.</li>
            <li>Chat via video. Press Next anytime for someone new.</li>
            <li>Report inappropriate behavior using the Report button.</li>
          </ol>
        </div>

        <div className="glass-card space-y-4">
          <h2 className="text-subheading text-content-primary">Technology</h2>
          <p className="text-caption text-content-secondary leading-relaxed">
            WebRTC for peer-to-peer video, Supabase Realtime for live matching, and PostgreSQL
            for session management. All connections are encrypted end-to-end between peers.
          </p>
        </div>

        <div className="glass-card space-y-4">
          <h2 className="text-subheading text-content-primary">Community guidelines</h2>
          <ul className="list-disc list-inside space-y-2 text-caption text-content-secondary">
            <li>Be respectful to other users.</li>
            <li>Do not share personal information.</li>
            <li>No nudity, harassment, or illegal content.</li>
            <li>Report violations immediately.</li>
            <li>Users must be 18 years or older.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
