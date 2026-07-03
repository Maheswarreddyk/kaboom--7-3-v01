const faqs = [
  {
    question: 'Do I need to create an account?',
    answer: 'No. IndiaTV is completely anonymous. Tap Start Chat, allow camera and microphone access, and you are connected instantly.',
  },
  {
    question: 'Is my video recorded or stored?',
    answer: 'No. Video and audio are transmitted directly between users via WebRTC. IndiaTV never records or stores your conversations.',
  },
  {
    question: 'How do I skip to the next person?',
    answer: 'Tap the Next button during a chat. Your current match ends and you are automatically placed back in the matching queue.',
  },
  {
    question: 'What should I do if someone behaves inappropriately?',
    answer: 'Use the Report button immediately. Select a reason and optionally add notes. Reports are stored for moderation review.',
  },
  {
    question: 'Why is my camera or microphone not working?',
    answer: 'Make sure you granted browser permissions. Check that no other app is using your camera. Try refreshing the page.',
  },
  {
    question: 'Can I use IndiaTV on my phone?',
    answer: 'Yes. IndiaTV is fully responsive and works on modern mobile browsers including Chrome and Safari on iOS and Android.',
  },
  {
    question: 'Is IndiaTV free?',
    answer: 'Yes, IndiaTV is free to use. There are no subscriptions or hidden fees.',
  },
  {
    question: 'Who can use IndiaTV?',
    answer: 'You must be 18 years or older. By using the service, you confirm you meet this age requirement.',
  },
];

export function FaqPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 page-enter">
      <h1 className="text-display text-content-primary mb-2">FAQ</h1>
      <p className="text-caption text-content-tertiary mb-10">Everything you need to know about using IndiaTV.</p>

      <div className="space-y-3">
        {faqs.map((faq) => (
          <details key={faq.question} className="glass-card group">
            <summary className="text-subheading text-content-primary cursor-pointer list-none flex items-center justify-between gap-4 py-1">
              {faq.question}
              <svg
                className="w-4 h-4 text-content-tertiary group-open:rotate-180 transition-transform duration-200 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <p className="mt-4 text-caption text-content-secondary leading-relaxed pb-1">{faq.answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
