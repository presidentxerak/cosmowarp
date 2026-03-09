export default function FondationView() {
  return (
    <div className="space-y-4 pb-4">
      <div className="glass-panel p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <img src={import.meta.env.BASE_URL + 'logo.svg'} alt="CosmoWarp" className="w-10 h-10 animate-float" />
          <div>
            <h2 className="text-title-md font-bold opacity-100 font-title">CosmoWarp Foundation</h2>
            <p className="text-body-sm opacity-40">Building the future of decentralized finance</p>
          </div>
        </div>

        <div className="space-y-4 text-base opacity-70 leading-relaxed">
          <p>
            The CosmoWarp Foundation is the non-profit organization behind the CosmoWarp ecosystem.
            Our mission is to develop and maintain an open, decentralized, and privacy-preserving
            financial and social network accessible to everyone.
          </p>

          <div className="glass-panel p-4">
            <h3 className="text-base font-bold opacity-80 mb-2">Mission</h3>
            <ul className="space-y-2 text-body-sm opacity-50">
              <li className="flex items-start gap-2">
                <span className="opacity-80 mt-0.5">{'\u25C8'}</span>
                Democratize access to decentralized finance tools
              </li>
              <li className="flex items-start gap-2">
                <span className="opacity-80 mt-0.5">{'\u25C8'}</span>
                Protect user privacy through end-to-end encryption
              </li>
              <li className="flex items-start gap-2">
                <span className="text-star-400 mt-0.5">{'\u25C8'}</span>
                Foster a community-driven ecosystem of digital art and creation
              </li>
              <li className="flex items-start gap-2">
                <span className="opacity-80 mt-0.5">{'\u25C8'}</span>
                Advance CosmoMesh DAG technology for scalable decentralization
              </li>
            </ul>
          </div>

          <div className="glass-panel p-4">
            <h3 className="text-base font-bold text-energy-300 mb-2">Core Values</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-body-sm font-medium opacity-90">Decentralization</p>
                <p className="text-[11px] opacity-40">No central authority, no single point of failure</p>
              </div>
              <div>
                <p className="text-body-sm font-medium opacity-90">Privacy</p>
                <p className="text-[11px] opacity-40">Your data belongs to you, always</p>
              </div>
              <div>
                <p className="text-body-sm font-medium opacity-90">Transparency</p>
                <p className="text-[11px] opacity-40">Open source, open governance</p>
              </div>
              <div>
                <p className="text-body-sm font-medium opacity-90">Innovation</p>
                <p className="text-[11px] opacity-40">Pushing the boundaries of DAG technology</p>
              </div>
            </div>
          </div>

          <div className="glass-panel p-4">
            <h3 className="text-base font-bold text-star-400 mb-2">Ecosystem</h3>
            <div className="space-y-2 text-body-sm opacity-50">
              <div className="flex items-center gap-2">
                <span className="opacity-80">{'\u03A9'}</span>
                <span><span className="opacity-90">Warps</span> - Native token with 69M fixed supply</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="opacity-80">{'\u2B22'}</span>
                <span><span className="opacity-90">Warts</span> - Digital art NFTs with royalties</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-star-400">{'\u25CE'}</span>
                <span><span className="opacity-90">Wall</span> - Decentralized social network</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="opacity-80">{'\u2B21'}</span>
                <span><span className="opacity-90">CosmoMesh</span> - 7-layer DAG consensus</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
