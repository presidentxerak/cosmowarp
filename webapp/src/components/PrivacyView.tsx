export default function PrivacyView() {
  return (
    <div className="space-y-4 pb-4">
      <div className="glass-panel p-5 sm:p-6">
        <h2 className="text-title-md font-bold opacity-100 font-title mb-1">Privacy Policy</h2>
        <p className="text-body-sm opacity-60 mb-4">How Strangrz protects your data</p>

        <div className="space-y-6 text-base opacity-70 leading-relaxed">
          <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="opacity-80">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <h3 className="text-base font-bold opacity-80">Privacy by Design</h3>
            </div>
            <p className="text-body-sm opacity-50">
              Strangrz is built with privacy as a core principle. We do not collect, store, or
              transmit personal data. All wallet data is stored locally on your device.
            </p>
          </div>

          <section>
            <h3 className="text-base font-bold opacity-90 mb-2">Data We Don't Collect</h3>
            <ul className="space-y-1.5 text-body-sm opacity-50">
              <li className="flex items-start gap-2">
                <span className="opacity-80 mt-0.5">{'\u2713'}</span>
                No personal identification information
              </li>
              <li className="flex items-start gap-2">
                <span className="opacity-80 mt-0.5">{'\u2713'}</span>
                No email addresses or phone numbers
              </li>
              <li className="flex items-start gap-2">
                <span className="opacity-80 mt-0.5">{'\u2713'}</span>
                No location data or IP tracking
              </li>
              <li className="flex items-start gap-2">
                <span className="opacity-80 mt-0.5">{'\u2713'}</span>
                No third-party analytics or cookies
              </li>
              <li className="flex items-start gap-2">
                <span className="opacity-80 mt-0.5">{'\u2713'}</span>
                No access to your wallet or private keys
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-bold opacity-80 mb-2">Encryption</h3>
            <div className="space-y-2 text-body-sm opacity-50">
              <p>
                All communications on Strangrz are encrypted. Direct messages use end-to-end
                encryption ensuring only the sender and recipient can read the content.
              </p>
              <p>
                Wallet credentials are encrypted using Ed25519 cryptographic signatures. Your
                private keys never leave your device and are never transmitted over the network.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-base font-bold opacity-80 mb-2">Anonymity</h3>
            <div className="space-y-2 text-body-sm opacity-50">
              <p>
                Strangrz uses pseudonymous identities through StrangrzID. Your identity on the
                network is represented by a cryptographic address, not by personal information.
              </p>
              <p>
                Posts on the Wall, Strangrz transactions, and all network activity are associated
                with your StrangrzID address, maintaining your anonymity.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-base font-bold opacity-90 mb-2">Local Storage</h3>
            <p className="text-body-sm opacity-50">
              Strangrz stores data in your browser's localStorage. This data never leaves your
              device unless you choose to export it. You can clear all data at any time through
              your browser settings or the Settings page.
            </p>
          </section>

          <div className="text-label opacity-50 pt-2 border-t border-current/10">
            Last updated: February 2026 &middot; Strangrz Foundation
          </div>
        </div>
      </div>
    </div>
  );
}
