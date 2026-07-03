import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext.js';
import { useToast } from '../contexts/ToastContext.js';
import { LoadingScreen } from '../components/LoadingScreen.js';

export function LandingPage() {
  const navigate = useNavigate();
  const { stats, isLoading, startSession } = useSession();
  const { showToast } = useToast();
  const [starting, setStarting] = useState(false);

  const handleStartChat = async () => {
    setStarting(true);
    try {
      await startSession();
      navigate('/chat');
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to start session');
    } finally {
      setStarting(false);
    }
  };

  if (starting) {
    return <LoadingScreen message="Setting up your session…" />;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col page-enter">
      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-4 py-16 sm:py-24">
        <div className="max-w-3xl mx-auto text-center">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-caption text-content-secondary mb-8 animate-slide-up opacity-0 stagger-1">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse-soft" />
            Anonymous · No login · Free
          </div>

          <h1 className="text-display-lg sm:text-[3.5rem] font-bold tracking-tight mb-6 animate-slide-up opacity-0 stagger-2">
            <span className="text-content-primary">Meet someone new,</span>
            <br />
            <span className="text-brand">every conversation</span>
          </h1>

          <p className="text-subheading text-content-secondary max-w-xl mx-auto mb-10 animate-slide-up opacity-0 stagger-3">
            IndiaTV connects you with people around the world through anonymous video chat.
            No accounts, no emails — just tap Start and begin.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up opacity-0 stagger-4">
            <button
              onClick={handleStartChat}
              disabled={isLoading}
              aria-label="Start chatting anonymously"
              className="btn-primary text-subheading px-10 py-4 gap-3"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Start Chat
            </button>
          </div>

          {/* Live stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto animate-slide-up opacity-0 stagger-5">
              {[
                { label: 'Online now', value: stats.onlineNow },
                { label: 'Active users', value: stats.activeUsers },
                { label: 'Waiting', value: stats.waitingUsers },
                { label: 'Matches today', value: stats.matchesToday },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="glass-card py-4 px-3 hover:bg-white/[0.07] transition-all duration-300"
                >
                  <p className="text-2xl font-semibold text-content-primary tabular-nums">{stat.value}</p>
                  <p className="text-micro text-content-tertiary mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-edge py-16 px-4">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-4">
          {[
            {
              icon: (
                <svg className="w-6 h-6 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              ),
              title: '100% Anonymous',
              desc: 'No login, no signup, no personal data. Your privacy comes first.',
            },
            {
              icon: (
                <svg className="w-6 h-6 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              ),
              title: 'Instant Matching',
              desc: 'Paired with someone new in seconds. Press Next anytime for a fresh conversation.',
            },
            {
              icon: (
                <svg className="w-6 h-6 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ),
              title: 'Safe & Reportable',
              desc: 'Report inappropriate behavior instantly. We take community safety seriously.',
            },
          ].map((feature) => (
            <div key={feature.title} className="glass-card text-center hover:bg-white/[0.06] transition-colors duration-300">
              <div className="w-12 h-12 rounded-xl bg-brand-muted flex items-center justify-center mx-auto mb-4">
                {feature.icon}
              </div>
              <h3 className="font-semibold text-content-primary mb-2">{feature.title}</h3>
              <p className="text-caption text-content-tertiary leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
