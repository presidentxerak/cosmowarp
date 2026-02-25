export default function LegalsView() {
  return (
    <div className="space-y-4 pb-4">
      <div className="glass-panel p-5 sm:p-6">
        <h2 className="text-xl font-bold text-gray-100 font-title mb-4">Legal Information</h2>

        <div className="space-y-6 text-sm text-gray-300 leading-relaxed">
          <section>
            <h3 className="text-sm font-bold text-warp-300 mb-2">Terms of Service</h3>
            <div className="space-y-2 text-xs text-gray-400">
              <p>
                By using CosmoWarp, you agree to these terms. CosmoWarp is a decentralized application
                that operates on the CosmoMesh network. Users are responsible for maintaining the security
                of their wallets and private keys.
              </p>
              <p>
                CosmoWarp does not store personal data on centralized servers. All data is stored locally
                on your device and on the decentralized network. We do not have access to your wallet,
                transactions, or personal information.
              </p>
              <p>
                Warps tokens and Warts digital assets are experimental cryptographic tokens. Their value
                is not guaranteed and may fluctuate. CosmoWarp Foundation makes no promises regarding
                the monetary value of these assets.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-energy-300 mb-2">Intellectual Property</h3>
            <div className="space-y-2 text-xs text-gray-400">
              <p>
                The CosmoWarp software, CosmoMesh protocol, and associated documentation are the
                intellectual property of the CosmoWarp Foundation. The platform is open source and
                available under the project's license terms.
              </p>
              <p>
                User-generated content (posts, Warts, messages) remains the property of their creators.
                By posting content on the Wall, you grant other users the right to view and interact
                with your content on the CosmoWarp network.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-star-400 mb-2">Disclaimer</h3>
            <div className="space-y-2 text-xs text-gray-400">
              <p>
                CosmoWarp is provided "as is" without warranty of any kind. The CosmoWarp Foundation
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
            <h3 className="text-sm font-bold text-nebula-400 mb-2">Jurisdiction</h3>
            <p className="text-xs text-gray-400">
              CosmoWarp operates as a decentralized application. Users are responsible for complying
              with the laws and regulations of their jurisdiction regarding the use of cryptocurrency
              and decentralized applications.
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
