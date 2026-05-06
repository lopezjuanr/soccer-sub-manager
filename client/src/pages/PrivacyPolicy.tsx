// Privacy Policy page for Soccer Sub Manager
// Standalone page — linked from Google Play Store listing
// Design: dark background, lime green accents — matches app design language

export default function PrivacyPolicy() {
  const lastUpdated = "May 6, 2026";

  return (
    <div className="min-h-screen bg-[#111111] text-gray-200 font-sans">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#1a1a1a]">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#a3e635]/10 flex items-center justify-center">
            <span className="text-[#a3e635] text-lg">⚽</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-tight">Soccer Sub Manager</h1>
            <p className="text-gray-500 text-xs">Privacy Policy</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">

        {/* Intro */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Privacy Policy</h2>
          <p className="text-gray-400 text-sm">Last updated: {lastUpdated}</p>
        </div>

        <p className="text-gray-300 leading-relaxed">
          Soccer Sub Manager ("the App") is a youth soccer substitution and playing time tracking tool
          built for coaches. This Privacy Policy explains what information the App collects, how it is
          used, and your rights as a user.
        </p>

        {/* Section 1 */}
        <section className="space-y-3">
          <h3 className="text-[#a3e635] font-semibold text-lg">1. Information We Collect</h3>
          <p className="text-gray-300 leading-relaxed">
            <strong className="text-white">The App collects no personal information.</strong> All data
            you enter — including player names, game scores, and playing time records — is stored
            exclusively on your device using your browser's local storage. This data never leaves your
            device and is never transmitted to any server, third party, or external service.
          </p>
          <p className="text-gray-300 leading-relaxed">
            We do not collect names, email addresses, phone numbers, location data, device identifiers,
            or any other personally identifiable information.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h3 className="text-[#a3e635] font-semibold text-lg">2. How Your Data Is Stored</h3>
          <p className="text-gray-300 leading-relaxed">
            All App data is stored locally on your device in browser local storage. This includes your
            roster (player names), game settings, in-progress game state, and scores. You can clear
            this data at any time by clearing your browser's site data or uninstalling the App.
          </p>
          <p className="text-gray-300 leading-relaxed">
            No account creation is required to use the App. No login, registration, or authentication
            of any kind is needed.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h3 className="text-[#a3e635] font-semibold text-lg">3. Third-Party Services</h3>
          <p className="text-gray-300 leading-relaxed">
            The App does not integrate any third-party analytics, advertising networks, crash reporting
            services, or social media platforms. No data is shared with or sold to any third party.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h3 className="text-[#a3e635] font-semibold text-lg">4. Children's Privacy</h3>
          <p className="text-gray-300 leading-relaxed">
            The App is designed for use by coaches — adults who manage youth soccer teams. The App
            does not knowingly collect any information from children under the age of 13. Player names
            entered into the App are stored only on the coach's device and are never transmitted
            externally.
          </p>
          <p className="text-gray-300 leading-relaxed">
            The App complies with the Children's Online Privacy Protection Act (COPPA) and Google
            Play's Families Policy.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h3 className="text-[#a3e635] font-semibold text-lg">5. Internet Access</h3>
          <p className="text-gray-300 leading-relaxed">
            The App functions fully offline after the initial load. Internet access is only required
            to load the App for the first time. No network requests are made during gameplay. No data
            is sent or received once the App is loaded.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h3 className="text-[#a3e635] font-semibold text-lg">6. Changes to This Policy</h3>
          <p className="text-gray-300 leading-relaxed">
            If this Privacy Policy is updated, the revised version will be posted at this URL with an
            updated "Last updated" date. Continued use of the App after any changes constitutes
            acceptance of the updated policy.
          </p>
        </section>

        {/* Section 7 */}
        <section className="space-y-3">
          <h3 className="text-[#a3e635] font-semibold text-lg">7. Contact</h3>
          <p className="text-gray-300 leading-relaxed">
            If you have any questions about this Privacy Policy, please contact the developer at:
          </p>
          <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3">
            <p className="text-white font-medium">Soccer Sub Manager</p>
            <p className="text-gray-400 text-sm mt-0.5">Developer: lopezjuanr</p>
            <p className="text-gray-400 text-sm">
              GitHub:{" "}
              <a
                href="https://github.com/lopezjuanr/soccer-sub-manager"
                className="text-[#a3e635] hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                github.com/lopezjuanr/soccer-sub-manager
              </a>
            </p>
          </div>
        </section>

        {/* Summary box */}
        <div className="bg-[#a3e635]/5 border border-[#a3e635]/20 rounded-xl px-5 py-4 space-y-2">
          <p className="text-[#a3e635] font-semibold text-sm uppercase tracking-wide">Summary</p>
          <ul className="text-gray-300 text-sm space-y-1.5">
            <li className="flex items-start gap-2"><span className="text-[#a3e635] mt-0.5">✓</span> No personal data collected</li>
            <li className="flex items-start gap-2"><span className="text-[#a3e635] mt-0.5">✓</span> All data stored locally on your device only</li>
            <li className="flex items-start gap-2"><span className="text-[#a3e635] mt-0.5">✓</span> No accounts, no login, no registration</li>
            <li className="flex items-start gap-2"><span className="text-[#a3e635] mt-0.5">✓</span> No third-party analytics or advertising</li>
            <li className="flex items-start gap-2"><span className="text-[#a3e635] mt-0.5">✓</span> Works fully offline</li>
            <li className="flex items-start gap-2"><span className="text-[#a3e635] mt-0.5">✓</span> COPPA compliant</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 text-center">
          <p className="text-gray-600 text-xs">© {new Date().getFullYear()} Soccer Sub Manager. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
