export default function PrivacyView() {
  return (
    <div className="space-y-4 pb-4">
      <div className="glass-panel p-5 sm:p-6">
        <h2 className="text-xl font-bold text-gray-100 font-title mb-1">Privacy Policy</h2>
        <p className="text-xs text-gray-500 mb-4">How CosmoWarp protects your data</p>

        <div className="space-y-6 text-sm text-gray-300 leading-relaxed">
          <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-warp-400">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <h3 className="text-sm font-bold text-warp-300">Privacy by Design</h3>
            </div>
            <p className="text-xs text-gray-400">
              CosmoWarp is built with privacy as a core principle. We do not collect, store, or
              transmit personal data. All wallet data is stored locally on your device.
            </p>
          </div>

          <section>
            <h3 className="text-sm font-bold text-energy-300 mb-2">Data We Don't Collect</h3>
            <ul className="space-y-1.5 text-xs text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">{'\u2713'}</span>
                No personal identification information
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">{'\u2713'}</span>
                No email addresses or phone numbers
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">{'\u2713'}</span>
                No location data or IP tracking
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">{'\u2713'}</span>
                No third-party analytics or cookies
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">{'\u2713'}</span>
                No access to your wallet or private keys
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-sm font-bold text-star-400 mb-2">Encryption</h3>
            <div className="space-y-2 text-xs text-gray-400">
              <p>
                All communications on CosmoWarp are encrypted. Direct messages use end-to-end
                encryption ensuring only the sender and recipient can read the content.
              </p>
              <p>
                Wallet credentials are encrypted using Ed25519 cryptographic signatures. Your
                private keys never leave your device and are never transmitted over the network.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-nebula-400 mb-2">Anonymity</h3>
            <div className="space-y-2 text-xs text-gray-400">
              <p>
                CosmoWarp uses pseudonymous identities through CosmoID. Your identity on the
                network is represented by a cryptographic address, not by personal information.
              </p>
              <p>
                Posts on the Wall, Warts transactions, and all network activity are associated
                with your CosmoID address, maintaining your anonymity.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-gray-200 mb-2">Local Storage</h3>
            <p className="text-xs text-gray-400">
              CosmoWarp stores data in your browser's localStorage. This data never leaves your
              device unless you choose to export it. You can clear all data at any time through
              your browser settings or the Settings page.
            </p>
          </section>

          <div className="text-[10px] text-gray-600 pt-2 border-t border-white/5">
            Last updated: February 2026 &middot; CosmoWarp Foundation
          </div>
        </div>
      </div>
    </div>
  );
}
