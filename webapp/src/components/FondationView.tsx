import Logo from './Logo';

export default function FondationView() {
  return (
    <div className="space-y-4 pb-4">
      <div className="glass-panel p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <Logo className="w-10 h-10 animate-float" />
          <div>
            <h2 className="text-title-md font-bold opacity-100 font-title">Cosmorare Foundation</h2>
            <p className="text-body-sm opacity-40">Protocole de certification pour objets rares</p>
          </div>
        </div>

        <div className="space-y-4 text-base opacity-70 leading-relaxed">
          <p>
            La Cosmorare Foundation est l'organisation \u00e0 but non lucratif derri\u00e8re l'\u00e9cosyst\u00e8me Cosmorare.
            Notre mission : d\u00e9velopper et maintenir un protocole ouvert, d\u00e9centralis\u00e9 et respectueux de la vie priv\u00e9e
            pour la certification d'objets rares — num\u00e9riques ou physiques.
          </p>

          <div className="glass-panel p-4">
            <h3 className="text-base font-bold opacity-80 mb-2">Mission</h3>
            <ul className="space-y-2 text-body-sm opacity-50">
              <li className="flex items-start gap-2">
                <span className="opacity-80 mt-0.5">{'\u25C8'}</span>
                D\u00e9mocratiser l'acc\u00e8s \u00e0 la certification d'objets rares
              </li>
              <li className="flex items-start gap-2">
                <span className="opacity-80 mt-0.5">{'\u25C8'}</span>
                Prot\u00e9ger la propri\u00e9t\u00e9 et l'authenticit\u00e9 via la cryptographie
              </li>
              <li className="flex items-start gap-2">
                <span className="opacity-80 mt-0.5">{'\u25C8'}</span>
                Cr\u00e9er un \u00e9cosyst\u00e8me communautaire pour collectionneurs et cr\u00e9ateurs
              </li>
              <li className="flex items-start gap-2">
                <span className="opacity-80 mt-0.5">{'\u25C8'}</span>
                Faire fonctionner l'app en mode offline ET online, accessible partout
              </li>
            </ul>
          </div>

          <div className="glass-panel p-4">
            <h3 className="text-base font-bold opacity-90 mb-2">Valeurs fondamentales</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-body-sm font-medium opacity-90">D\u00e9centralisation</p>
                <p className="text-[11px] opacity-40">Aucune autorit\u00e9 centrale, aucun point unique de d\u00e9faillance</p>
              </div>
              <div>
                <p className="text-body-sm font-medium opacity-90">Vie priv\u00e9e</p>
                <p className="text-[11px] opacity-40">Vos donn\u00e9es vous appartiennent, toujours</p>
              </div>
              <div>
                <p className="text-body-sm font-medium opacity-90">Transparence</p>
                <p className="text-[11px] opacity-40">Code ouvert, gouvernance ouverte</p>
              </div>
              <div>
                <p className="text-body-sm font-medium opacity-90">Accessibilit\u00e9</p>
                <p className="text-[11px] opacity-40">Offline + Online, pour tous et partout</p>
              </div>
            </div>
          </div>

          <div className="glass-panel p-4">
            <h3 className="text-base font-bold opacity-80 mb-2">\u00c9cosyst\u00e8me</h3>
            <div className="space-y-2 text-body-sm opacity-50">
              <div className="flex items-center gap-2">
                <span className="opacity-80">{'\u03A9'}</span>
                <span><span className="opacity-90">Warps</span> - Token natif, supply fixe 69M</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="opacity-80">{'\u2726'}</span>
                <span><span className="opacity-90">CRCERT</span> - Certificats d'authenticit\u00e9 infalsifiables</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="opacity-80">{'\u2B22'}</span>
                <span><span className="opacity-90">Warts</span> - Objets rares certifi\u00e9s sur la place de march\u00e9</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="opacity-80">{'\u25CE'}</span>
                <span><span className="opacity-90">Mur</span> - R\u00e9seau social d\u00e9centralis\u00e9 et chiffr\u00e9</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="opacity-80">{'\u{1F4B3}'}</span>
                <span><span className="opacity-90">Paiement</span> - Carte, PayPal, SEPA int\u00e9gr\u00e9s</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="opacity-80">{'\u2B21'}</span>
                <span><span className="opacity-90">CosmoMesh</span> - R\u00e9seau DAG \u00e0 7 couches</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
