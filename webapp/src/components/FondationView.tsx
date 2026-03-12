import Logo from './Logo';

export default function FondationView() {
  return (
    <div className="space-y-4 pb-4">
      <div className="glass-panel p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <Logo className="w-10 h-10 animate-float" />
          <div>
            <h2 className="text-title-md font-bold opacity-100 font-title">Strangrz Foundation</h2>
            <p className="text-body-sm opacity-40">Protocole multi-chaîne de certification pour objets rares</p>
          </div>
        </div>

        <div className="space-y-4 text-base opacity-70 leading-relaxed">
          <p>
            La Strangrz Foundation est l'organisation à but non lucratif derrière l'écosystème Strangrz.
            Notre mission : développer et maintenir un protocole multi-chaîne ouvert, décentralisé et respectueux de la vie privée
            pour la certification d'objets rares — numériques ou physiques — via les standards CW-721 (Strangrz) et ERC-721 (Ethereum).
          </p>

          <div className="glass-panel p-4">
            <h3 className="text-base font-bold opacity-80 mb-2">Mission</h3>
            <ul className="space-y-2 text-body-sm opacity-50">
              <li className="flex items-start gap-2">
                <span className="opacity-80 mt-0.5">{'◈'}</span>
                Démocratiser l'accès à la certification d'objets rares
              </li>
              <li className="flex items-start gap-2">
                <span className="opacity-80 mt-0.5">{'◈'}</span>
                Protéger la propriété et l'authenticité via la cryptographie
              </li>
              <li className="flex items-start gap-2">
                <span className="opacity-80 mt-0.5">{'◈'}</span>
                Créer un écosystème communautaire pour collectionneurs et créateurs
              </li>
              <li className="flex items-start gap-2">
                <span className="opacity-80 mt-0.5">{'◈'}</span>
                Faire fonctionner l'app en mode offline ET online, accessible partout
              </li>
            </ul>
          </div>

          <div className="glass-panel p-4">
            <h3 className="text-base font-bold opacity-90 mb-2">Valeurs fondamentales</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-body-sm font-medium opacity-90">Décentralisation</p>
                <p className="text-[11px] opacity-40">Aucune autorité centrale, aucun point unique de défaillance</p>
              </div>
              <div>
                <p className="text-body-sm font-medium opacity-90">Vie privée</p>
                <p className="text-[11px] opacity-40">Vos données vous appartiennent, toujours</p>
              </div>
              <div>
                <p className="text-body-sm font-medium opacity-90">Transparence</p>
                <p className="text-[11px] opacity-40">Code ouvert, gouvernance ouverte</p>
              </div>
              <div>
                <p className="text-body-sm font-medium opacity-90">Accessibilité</p>
                <p className="text-[11px] opacity-40">Offline + Online, pour tous et partout</p>
              </div>
            </div>
          </div>

          <div className="glass-panel p-4">
            <h3 className="text-base font-bold opacity-80 mb-2">Écosystème</h3>
            <div className="space-y-2 text-body-sm opacity-50">
              <div className="flex items-center gap-2">
                <span className="opacity-80">{'⬣'}</span>
                <span><span className="opacity-90">Strangrz</span> - Token natif, supply fixe 69M</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="opacity-80">{'✦'}</span>
                <span><span className="opacity-90">STCERT</span> - Certificats d'authenticité infalsifiables (CW-721 + ERC-721)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="opacity-80">{'⬢'}</span>
                <span><span className="opacity-90">Strangrz</span> - Objets rares certifiés sur la place de marché</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="opacity-80">{'◎'}</span>
                <span><span className="opacity-90">Mur</span> - Réseau social décentralisé et chiffré</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="opacity-80">{'\u{1F4B3}'}</span>
                <span><span className="opacity-90">Paiement</span> - Carte, PayPal, SEPA intégrés</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="opacity-80">{'⬡'}</span>
                <span><span className="opacity-90">StrangrzMesh</span> - Réseau DAG à 7 couches</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
