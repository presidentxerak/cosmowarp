export default function LegalsView() {
  return (
    <div className="space-y-4 pb-4">
      <div className="glass-panel p-5 sm:p-6">
        <h2 className="text-title-md font-bold opacity-100 font-title mb-4">Legal Information</h2>

        <div className="space-y-6 text-base opacity-70 leading-relaxed">
          <section>
            <h3 className="text-base font-bold opacity-80 mb-2">Terms of Service</h3>
            <div className="space-y-2 text-body-sm opacity-50">
              <p>
                By using Strangrz, you agree to these terms. Strangrz is a decentralized application
                that operates on the StrangrzMesh network. Users are responsible for maintaining the security
                of their wallets and private keys.
              </p>
              <p>
                Strangrz does not store personal data on centralized servers. All data is stored locally
                on your device and on the decentralized network. We do not have access to your wallet,
                transactions, or personal information.
              </p>
              <p>
                Les tokens Strangrz (⬣) et les actifs numériques sont des jetons cryptographiques expérimentaux. Their value
                is not guaranteed and may fluctuate. Strangrz Foundation makes no promises regarding
                the monetary value of these assets.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-base font-bold opacity-90 mb-2">Intellectual Property</h3>
            <div className="space-y-2 text-body-sm opacity-50">
              <p>
                The Strangrz software, StrangrzMesh protocol, and associated documentation are the
                intellectual property of the Strangrz Foundation. The platform is open source and
                available under the project's license terms.
              </p>
              <p>
                User-generated content (posts, Strangrz, messages) remains the property of their creators.
                By posting content on the Wall, you grant other users the right to view and interact
                with your content on the Strangrz network.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-base font-bold opacity-80 mb-2">Disclaimer</h3>
            <div className="space-y-2 text-body-sm opacity-50">
              <p>
                Strangrz is provided "as is" without warranty of any kind. The Strangrz Foundation
                is not responsible for any loss of funds, data, or digital assets that may occur
                through the use of this platform.
              </p>
              <p>
                Users should exercise caution when conducting transactions and ensure they have
                adequate backups of their wallet credentials. Lost private keys cannot be recovered.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-base font-bold opacity-80 mb-2">Jurisdiction</h3>
            <p className="text-body-sm opacity-50">
              Strangrz operates as a decentralized application. Users are responsible for complying
              with the laws and regulations of their jurisdiction regarding the use of cryptocurrency
              and decentralized applications.
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
