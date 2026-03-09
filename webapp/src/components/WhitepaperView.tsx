import { useState } from 'react';
import Logo from './Logo';

type Section = 'overview' | 'how' | 'certificates' | 'tokenomics' | 'hierarchy' | 'security' | 'roadmap';

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: 'overview', label: 'Vue d\u2019ensemble', icon: '\u2B21' },
  { id: 'how', label: 'Comment \u00e7a marche', icon: '\u25CE' },
  { id: 'certificates', label: 'Certificats', icon: '\u26BF' },
  { id: 'tokenomics', label: 'Warp (\u03A9)', icon: '\u269B' },
  { id: 'hierarchy', label: 'Niveaux', icon: '\u2605' },
  { id: 'security', label: 'S\u00e9curit\u00e9', icon: '\u26A1' },
  { id: 'roadmap', label: 'Feuille de route', icon: '\u2604' },
];

export default function WhitepaperView() {
  const [section, setSection] = useState<Section>('overview');

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="glass-panel p-6 sm:p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          background: 'radial-gradient(circle at 30% 30%, #a855f7 0%, transparent 50%), radial-gradient(circle at 70% 70%, #06b6d4 0%, transparent 50%)',
        }} />
        <div className="relative">
          <div className="flex justify-center mb-4">
            <Logo className="w-16 sm:w-20 h-16 sm:h-20 animate-float" />
          </div>
          <h1 className="text-title-lg sm:text-3xl font-bold opacity-100 mb-2 font-title">{'\u30B3\u30B9\u30E2\u30E9\u30EC'}</h1>
          <p className="text-base sm:text-base opacity-50 mb-1">Cosmorare Protocole</p>
          <p className="text-body-sm opacity-40 max-w-md mx-auto">
            La plateforme de certification pour objets rares.
            Certifiez, \u00e9changez et collectionnez en toute confiance.
          </p>
        </div>
      </div>

      {/* Section Nav */}
      <div className="glass-panel p-2">
        <div className="grid grid-cols-4 gap-1 sm:flex sm:gap-1 sm:overflow-x-auto">
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => setSection(n.id)}
              className={`flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 px-1.5 sm:px-3 py-2 sm:py-1.5 rounded-none text-label sm:text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer ${
                section === n.id
                  ? 'bg-current/10 opacity-80'
                  : 'opacity-40 hover:opacity-70 hover:bg-current/5'
              }`}
            >
              <span className="text-base sm:text-[11px] leading-none">{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div className="glass-panel p-5 sm:p-6">
        {section === 'overview' && <OverviewSection />}
        {section === 'how' && <HowItWorksSection />}
        {section === 'certificates' && <CertificatesSection />}
        {section === 'tokenomics' && <TokenomicsSection />}
        {section === 'hierarchy' && <HierarchySection />}
        {section === 'security' && <SecuritySection />}
        {section === 'roadmap' && <RoadmapSection />}
      </div>
    </div>
  );
}

// ─── Composants utilitaires ─────────────────────────────

function SectionTitle({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-title-lg">{icon}</span>
        <h2 className="text-title-md font-bold opacity-100 font-title">{title}</h2>
      </div>
      <p className="text-body-sm opacity-40">{subtitle}</p>
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-base opacity-70 leading-relaxed mb-4">{children}</p>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-bold opacity-80 mb-2 mt-5">{children}</h3>;
}

function Stat({ label, value, color = 'opacity-80' }: { label: string; value: string; color?: string }) {
  return (
    <div className="glass-panel p-3 text-center bg-current/5">
      <p className={`text-title-sm sm:text-title-md font-bold ${color}`}>{value}</p>
      <p className="text-label opacity-40">{label}</p>
    </div>
  );
}

// ─── Vue d'ensemble ─────────────────────────────────────

function OverviewSection() {
  return (
    <div>
      <SectionTitle icon={'\u2B21'} title="Vue d\u2019ensemble" subtitle="Cosmorare en quelques mots" />
      <P>
        <span className="opacity-80 font-bold">Cosmorare</span> est une <span className="opacity-80 font-bold">plateforme de certification pour objets rares</span>.
        Cartes Pok\u00e9mon, sneakers, vinyles, montres, art num\u00e9rique : chaque objet rare m\u00e9rite un certificat
        d'authenticit\u00e9 infalsifiable. C'est exactement ce que Cosmorare propose.
      </P>

      <H3>Comment \u00e7a marche en 4 \u00e9tapes</H3>
      <div className="space-y-3 mb-4">
        {[
          ['1', 'Cr\u00e9ez votre portefeuille', 'Un mot de passe, une cl\u00e9 de r\u00e9cup\u00e9ration, et vous \u00eates pr\u00eat. Aucune donn\u00e9e personnelle demand\u00e9e.'],
          ['2', 'Certifiez vos objets rares', 'Uploadez une photo de votre objet. Cosmorare g\u00e9n\u00e8re un certificat CRCERT infalsifiable avec empreinte num\u00e9rique et signature cryptographique.'],
          ['3', 'Achetez et vendez', 'Parcourez la marketplace, achetez des Cosmorares certifi\u00e9es ou mettez les v\u00f4tres en vente. Paiement par carte, PayPal ou en Warp (\u03A9).'],
          ['4', 'Collectionnez en confiance', 'Chaque Cosmorare a un historique de propri\u00e9t\u00e9 v\u00e9rifiable. Le certificat est permanent et ne peut \u00eatre falsifi\u00e9.'],
        ].map(([num, title, desc]) => (
          <div key={num} className="flex gap-3 p-3 rounded-none bg-current/5">
            <span className="text-title-md opacity-80 shrink-0 w-8 text-center font-bold">{num}</span>
            <div>
              <p className="text-body-sm font-bold opacity-90">{title}</p>
              <p className="text-label opacity-40">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <H3>Pourquoi Cosmorare ?</H3>
      <div className="space-y-2 mb-4">
        {[
          ['\u2713', 'Z\u00e9ro frais', 'Certifier un objet, envoyer des Warps, v\u00e9rifier un certificat : tout est gratuit.'],
          ['\u2713', 'Infalsifiable', 'Les certificats CRCERT sont prot\u00e9g\u00e9s par de la cryptographie (Ed25519 + SHA-256).'],
          ['\u2713', 'Paiement simple', 'Carte bancaire, PayPal, SEPA ou Warp (\u03A9). Pas besoin d\u2019exchange crypto.'],
          ['\u2713', 'D\u00e9centralis\u00e9', 'Vos donn\u00e9es vous appartiennent. Pas d\u2019interm\u00e9diaire, pas de banque.'],
          ['\u2713', 'Hors ligne', 'L\u2019app fonctionne m\u00eame sans internet gr\u00e2ce au mode PWA.'],
        ].map(([icon, title, desc]) => (
          <div key={title} className="flex gap-3 p-2 rounded-none bg-current/5">
            <span className="text-body-sm opacity-80 shrink-0">{icon}</span>
            <div>
              <p className="text-body-sm font-bold opacity-80">{title}</p>
              <p className="text-label opacity-40">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Comment ça marche ──────────────────────────────────

function HowItWorksSection() {
  return (
    <div>
      <SectionTitle icon={'\u25CE'} title="Comment \u00e7a marche" subtitle="Le Cosmorare Protocole expliqu\u00e9 simplement" />
      <P>
        Cosmorare repose sur un ensemble de technologies qui travaillent ensemble pour rendre
        la certification d'objets rares <span className="opacity-80">rapide, gratuite et s\u00e9curis\u00e9e</span>.
        Voici comment chaque pi\u00e8ce s'embo\u00eete.
      </P>

      <H3>Le r\u00e9seau : CosmoMesh</H3>
      <P>
        Imaginez un filet o\u00f9 chaque n\u0153ud est connect\u00e9 \u00e0 plusieurs autres.
        C'est le <span className="opacity-80 font-bold">CosmoMesh</span> : au lieu d'empiler des blocs
        un par un (comme une blockchain classique), les transactions sont valid\u00e9es
        <span className="opacity-80"> en parall\u00e8le</span> sur 7 couches simultan\u00e9es.
        R\u00e9sultat : confirmation rapide et z\u00e9ro frais.
      </P>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat label="Couches" value="7" />
        <Stat label="Frais" value="0 \u03A9" />
        <Stat label="Confirmation" value="~15s" />
      </div>

      <H3>Le stockage : CosmoCode</H3>
      <P>
        Chaque certificat contient une repr\u00e9sentation visuelle de l'objet certifi\u00e9.
        <span className="opacity-80 font-bold"> CosmoCode</span> compresse ces images
        via 7 couches de compression pour les stocker directement sur le r\u00e9seau.
        Pas de serveur externe qui pourrait dispara\u00eetre : votre certificat est permanent et autosuffisant.
      </P>

      <H3>L'ex\u00e9cution : CosmoChain</H3>
      <P>
        <span className="opacity-80 font-bold">CosmoChain</span> est le moteur d'ex\u00e9cution.
        7 shards (zones de traitement) fonctionnent en parall\u00e8le dans votre navigateur
        gr\u00e2ce aux Web Workers. M\u00eame sur un smartphone, les transactions se traitent
        en arri\u00e8re-plan sans ralentir l'interface.
      </P>
      <div className="space-y-2 mb-4">
        {[
          ['GRID', 'Stockage des donn\u00e9es'],
          ['HELIX', 'Transactions et transferts'],
          ['GLYPH', 'Images et certificats visuels'],
          ['COSMO', 'Identit\u00e9s et comptes'],
          ['CHRONOS', 'Horodatage'],
          ['NEXUS', 'Communication entre shards'],
          ['LUMINA', 'Validation finale'],
        ].map(([name, desc]) => (
          <div key={name} className="flex gap-3 p-2 rounded-none bg-current/5">
            <code className="text-body-sm opacity-60 bg-current/5 px-1 py-0.5 rounded-none font-mono shrink-0 w-20 text-center">{name}</code>
            <p className="text-body-sm opacity-50">{desc}</p>
          </div>
        ))}
      </div>

      <H3>En r\u00e9sum\u00e9</H3>
      <P>
        Quand vous certifiez un objet rare, voici ce qui se passe en coulisses :
      </P>
      <div className="p-4 rounded-none bg-current/5 mb-4 text-body-sm opacity-60 space-y-1">
        <p>1. Votre photo est compress\u00e9e par <span className="font-bold">CosmoCode</span> (7 couches de compression)</p>
        <p>2. Un certificat CRCERT est g\u00e9n\u00e9r\u00e9 avec empreinte SHA-256 + signature Ed25519</p>
        <p>3. Le tout est valid\u00e9 par le <span className="font-bold">CosmoMesh</span> (7 couches parall\u00e8les)</p>
        <p>4. Le certificat est stock\u00e9 de fa\u00e7on permanente dans <span className="font-bold">CosmoChain</span></p>
        <p>5. Vous recevez un certificat v\u00e9rifiable \u00e0 tout moment par n'importe qui</p>
      </div>
    </div>
  );
}

// ─── Certificats CRCERT ─────────────────────────────────

function CertificatesSection() {
  return (
    <div>
      <SectionTitle icon={'\u26BF'} title="Certificats CRCERT" subtitle="Comment vos objets rares sont prot\u00e9g\u00e9s" />
      <P>
        Chaque objet certifi\u00e9 sur Cosmorare re\u00e7oit un <span className="opacity-80 font-bold">CRCERT</span> (Certificat Cosmorare).
        C'est une preuve math\u00e9matique que cet objet est authentique et qu'il vous appartient.
      </P>

      <H3>Qu'est-ce qu'un CRCERT contient ?</H3>
      <div className="p-4 rounded-none bg-current/5 mb-4 font-mono text-body-sm opacity-60 space-y-1">
        <p>CRCERT = {'{'}</p>
        <p>&nbsp;&nbsp;empreinte: SHA-256(photo de l'objet),</p>
        <p>&nbsp;&nbsp;signature: Ed25519(votre cl\u00e9 priv\u00e9e),</p>
        <p>&nbsp;&nbsp;horodatage: date et heure pr\u00e9cises,</p>
        <p>&nbsp;&nbsp;propri\u00e9taire: votre adresse publique,</p>
        <p>&nbsp;&nbsp;visuel: image compress\u00e9e de l'objet</p>
        <p>{'}'}</p>
      </div>

      <H3>En termes simples</H3>
      <div className="space-y-3 mb-4">
        {[
          ['\u{1F4F8}', 'Empreinte num\u00e9rique', 'On prend une "empreinte digitale" de votre objet (SHA-256). Si quelqu\u2019un modifie un seul pixel, l\u2019empreinte change compl\u00e8tement. Impossible de tricher.'],
          ['\u270D', 'Signature du cr\u00e9ateur', 'Vous signez le certificat avec votre cl\u00e9 priv\u00e9e (Ed25519). C\u2019est comme une signature manuscrite, mais math\u00e9matiquement infalsifiable.'],
          ['\u{1F512}', 'Permanent et v\u00e9rifiable', 'Le certificat est stock\u00e9 d\u00e9finitivement sur le r\u00e9seau. N\u2019importe qui peut le v\u00e9rifier instantan\u00e9ment, sans autorit\u00e9 centrale.'],
        ].map(([icon, title, desc]) => (
          <div key={title} className="p-4 rounded-none bg-current/5 border border-current/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-title-sm">{icon}</span>
              <span className="text-base font-bold opacity-80">{title}</span>
            </div>
            <p className="text-body-sm opacity-50 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <H3>Comment v\u00e9rifier un certificat ?</H3>
      <P>
        Sur n'importe quelle Cosmorare, cliquez sur <span className="opacity-80 font-bold">"V\u00e9rifier"</span>.
        Le syst\u00e8me recalcule l'empreinte de l'objet et la compare au certificat d'origine.
        Si tout correspond : <span className="opacity-80">\u2714 Authentique</span>.
        Si quelque chose a \u00e9t\u00e9 modifi\u00e9 : \u2718 le certificat est invalid\u00e9.
      </P>

      <H3>Raret\u00e9 des Cosmorares</H3>
      <P>
        Chaque Cosmorare poss\u00e8de un niveau de raret\u00e9 calcul\u00e9 automatiquement selon le type d'\u00e9dition
        et la disponibilit\u00e9 :
      </P>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        {[
          ['\u2726', 'Legendary', 'Pi\u00e8ce unique'],
          ['\u2605', 'Epic', '\u2264 10 \u00e9ditions'],
          ['\u25C6', 'Rare', '\u2264 50 \u00e9ditions'],
          ['\u25C8', 'Uncommon', '\u2264 200 \u00e9ditions'],
          ['\u25CE', 'Common', 'Illimit\u00e9'],
        ].map(([icon, label, desc]) => (
          <div key={label} className="text-center p-2 rounded-none bg-current/5">
            <p className="text-title-sm">{icon}</p>
            <p className="text-body-sm font-bold opacity-80">{label}</p>
            <p className="text-label opacity-40">{desc}</p>
          </div>
        ))}
      </div>
      <P>
        Bonus : les Cosmorares \u00e0 dur\u00e9e limit\u00e9e gagnent un niveau de raret\u00e9 suppl\u00e9mentaire dans les
        derni\u00e8res 24 heures avant l'expiration.
      </P>
    </div>
  );
}

// ─── Tokenomics ─────────────────────────────────────────

function TokenomicsSection() {
  return (
    <div>
      <SectionTitle icon={'\u269B'} title="Le Warp (\u03A9)" subtitle="La monnaie de l'\u00e9cosyst\u00e8me Cosmorare" />
      <P>
        Le <span className="opacity-80 font-bold">Warp (\u03A9)</span> est la monnaie native de Cosmorare.
        Son offre est fix\u00e9e \u00e0 <span className="opacity-80 font-bold">69 millions</span> d'unit\u00e9s pour toujours.
        Aucun Warp suppl\u00e9mentaire ne sera jamais cr\u00e9\u00e9.
      </P>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <Stat label="Offre totale" value="69M \u03A9" />
        <Stat label="Minage" value="60%" />
        <Stat label="Fondation" value="20%" />
        <Stat label="Communaut\u00e9" value="20%" />
      </div>

      <H3>Comment obtenir des Warps ?</H3>
      <div className="space-y-2 mb-4">
        {[
          ['\u26CF', 'Miner', 'Ex\u00e9cutez des calculs dans l\u2019app et gagnez des Warps. Plus la difficult\u00e9 est \u00e9lev\u00e9e, plus vous gagnez.'],
          ['\u{1F4B3}', 'Acheter', 'Achetez des Warps directement par carte bancaire, PayPal ou SEPA. Pas besoin d\u2019exchange crypto.'],
          ['\u{1F4B8}', 'Vendre des Cosmorares', 'Vendez vos objets rares certifi\u00e9s sur la marketplace et recevez des Warps.'],
          ['\u{1F381}', 'Airdrops', 'Des Warps sont distribu\u00e9s gratuitement \u00e0 la communaut\u00e9 active.'],
        ].map(([icon, title, desc]) => (
          <div key={title} className="flex gap-3 p-3 rounded-none bg-current/5">
            <span className="text-title-sm shrink-0">{icon}</span>
            <div>
              <p className="text-body-sm font-bold opacity-80">{title}</p>
              <p className="text-label opacity-40">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <H3>D\u00e9croissance R\u00e9sonante</H3>
      <P>
        Au lieu du "halving" brutal du Bitcoin (r\u00e9compense divis\u00e9e par 2 tous les 4 ans), Cosmorare
        utilise une courbe douce bas\u00e9e sur le <span className="opacity-80 font-bold">nombre d'or (\u03c6 = 1.618)</span>.
        Les premiers mineurs sont r\u00e9compens\u00e9s g\u00e9n\u00e9reusement, mais la r\u00e9compense ne s'effondre jamais
        brutalement. La transition est fluide et pr\u00e9visible.
      </P>

      <H3>Z\u00e9ro frais \u2014 toujours</H3>
      <P>
        Envoyer des Warps, certifier un objet, v\u00e9rifier un certificat : tout est gratuit.
        Le r\u00e9seau se finance par la r\u00e9compense de minage, pas par les frais des utilisateurs.
      </P>
    </div>
  );
}

// ─── Hiérarchie ─────────────────────────────────────────

function HierarchySection() {
  return (
    <div>
      <SectionTitle icon={'\u2605'} title="Niveaux" subtitle="Plus vous utilisez Cosmorare, plus vous \u00eates r\u00e9compens\u00e9" />
      <P>
        Cosmorare r\u00e9compense l'engagement avec un syst\u00e8me de <span className="opacity-80 font-bold">7 niveaux</span>.
        Plus vous certifiez, \u00e9changez et minez, plus vous montez et plus vos r\u00e9compenses augmentent.
      </P>

      <div className="space-y-2 mb-4">
        {[
          ['Particle', '\u00d71.0', 'Niveau de d\u00e9part. Acc\u00e8s \u00e0 toutes les fonctionnalit\u00e9s.'],
          ['Wave', '\u00d71.2', '+20% sur les r\u00e9compenses de minage.'],
          ['Star', '\u00d71.5', 'Fonctionnalit\u00e9s avanc\u00e9es du Mur.'],
          ['Nebula', '\u00d72.0', 'Double r\u00e9compense sur les certifications.'],
          ['Galaxy', '\u00d73.0', 'Droit de vote sur le protocole.'],
          ['Cosmos', '\u00d75.0', 'Acc\u00e8s b\u00eata et fonctionnalit\u00e9s exp\u00e9rimentales.'],
          ['Lumina', '\u00d77.0', 'Multiplicateur maximal et gouvernance.'],
        ].map(([name, mult, desc]) => (
          <div key={name} className="flex gap-3 p-3 rounded-none bg-current/5">
            <div className="shrink-0 w-16 text-center">
              <p className="text-body-sm font-bold opacity-80">{name}</p>
              <p className="text-label opacity-60">{mult}</p>
            </div>
            <p className="text-body-sm opacity-50">{desc}</p>
          </div>
        ))}
      </div>

      <H3>Comment monter ?</H3>
      <P>
        La progression est bas\u00e9e sur votre activit\u00e9 r\u00e9elle : certifications cr\u00e9\u00e9es, transactions effectu\u00e9es,
        participation au minage. Il n'est pas possible d'acheter un niveau \u2014 seule l'utilisation r\u00e9elle compte.
      </P>

      <H3>Bonus de s\u00e9rie</H3>
      <P>
        Utilisez Cosmorare plusieurs jours cons\u00e9cutifs et vos r\u00e9compenses augmentent.
        Apr\u00e8s 7 jours cons\u00e9cutifs, vous recevez un bonus sp\u00e9cial.
      </P>
    </div>
  );
}

// ─── Sécurité ───────────────────────────────────────────

function SecuritySection() {
  return (
    <div>
      <SectionTitle icon={'\u26A1'} title="S\u00e9curit\u00e9" subtitle="Vos donn\u00e9es et certificats sont prot\u00e9g\u00e9s" />
      <P>
        Certifier des objets rares exige un haut niveau de confiance.
        Voici comment Cosmorare prot\u00e8ge vos donn\u00e9es.
      </P>

      <div className="space-y-3 mb-4">
        {[
          ['\u{1F510}', 'Chiffrement de bout en bout', 'Vos messages sur le Mur sont chiffr\u00e9s avec AES-GCM. Vos cl\u00e9s priv\u00e9es ne quittent jamais votre appareil. M\u00eame Cosmorare ne peut pas lire vos messages.'],
          ['\u2714', 'Certificats infalsifiables', 'Les CRCERT combinent SHA-256 (empreinte) et Ed25519 (signature). Modifier un seul octet invalide le certificat. La v\u00e9rification est instantan\u00e9e.'],
          ['\u{1F4F1}', 'Mode hors ligne (PWA)', 'L\u2019app fonctionne sans internet. Consultez vos certificats et pr\u00e9parez des transactions hors ligne. Tout se synchronise automatiquement \u00e0 la reconnexion.'],
          ['\u{1F4B3}', 'Paiement int\u00e9gr\u00e9', 'Achetez des Warps par carte, PayPal, SEPA, Apple Pay ou Google Pay. Aucun exchange tiers n\u00e9cessaire.'],
        ].map(([icon, title, desc]) => (
          <div key={title} className="p-4 rounded-none bg-current/5 border border-current/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-title-sm">{icon}</span>
              <span className="text-base font-bold opacity-80">{title}</span>
            </div>
            <p className="text-body-sm opacity-50 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <H3>Vos cl\u00e9s, vos r\u00e8gles</H3>
      <div className="space-y-2 mb-4">
        {[
          ['Cl\u00e9 priv\u00e9e', 'Jamais transmise. Stock\u00e9e localement, chiffr\u00e9e avec votre mot de passe.'],
          ['Cl\u00e9 publique', 'Votre identit\u00e9 sur le r\u00e9seau. Partageable librement.'],
          ['Seed phrase', '12 mots pour r\u00e9cup\u00e9rer votre compte. \u00c0 conserver hors ligne.'],
        ].map(([title, desc]) => (
          <div key={title} className="flex gap-3 p-3 rounded-none bg-current/5">
            <div>
              <p className="text-body-sm font-bold opacity-80">{title}</p>
              <p className="text-label opacity-40">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Feuille de route ───────────────────────────────────

function RoadmapSection() {
  return (
    <div>
      <SectionTitle icon={'\u2604'} title="Feuille de route" subtitle="\u00c9volution pr\u00e9vue du Cosmorare Protocole" />
      <P>
        Cosmorare est un projet vivant qui \u00e9volue continuellement.
      </P>

      <div className="space-y-4 mb-4">
        {[
          ['Phase 1 \u2014 Gen\u00e8se', 'T1 2026', [
            'Lancement du r\u00e9seau CosmoMesh',
            'Premiers certificats CRCERT',
            'Application PWA avec mode hors ligne',
            'Passerelle de paiement fiat',
          ]],
          ['Phase 2 \u2014 Expansion', 'T2 2026', [
            'Ouverture de la marketplace Cosmorares',
            'Lancement du Mur (r\u00e9seau social chiffr\u00e9)',
            'Support de toutes cat\u00e9gories d\u2019objets rares',
            'Int\u00e9gration SEPA, Apple Pay et Google Pay',
          ]],
          ['Phase 3 \u2014 Maturit\u00e9', 'T3-T4 2026', [
            'SDK d\u00e9veloppeur ouvert',
            'Gouvernance d\u00e9centralis\u00e9e',
            'Partenariats avec des maisons de vente aux ench\u00e8res',
            'Application mobile native',
          ]],
          ['Phase 4 \u2014 Cosmos', '2027+', [
            'Interop\u00e9rabilit\u00e9 avec d\u2019autres protocoles',
            'Certification d\u2019objets physiques via NFC et QR codes',
            'IA pour la d\u00e9tection de contrefa\u00e7ons',
            '\u00c9cosyst\u00e8me d\u2019applications tierces',
          ]],
        ].map(([phase, date, items]) => (
          <div key={phase as string} className="p-4 rounded-none bg-current/5 border border-current/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-base font-bold opacity-80">{phase as string}</span>
              <span className="text-label opacity-40">{date as string}</span>
            </div>
            <ul className="space-y-1">
              {(items as string[]).map(item => (
                <li key={item} className="text-body-sm opacity-50 flex gap-2">
                  <span className="opacity-40 shrink-0">{'\u2192'}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <H3>Rejoignez l'aventure</H3>
      <P>
        Que vous soyez collectionneur de cartes Pok\u00e9mon, amateur de sneakers, passionn\u00e9 de vinyles
        ou fan d'art num\u00e9rique, Cosmorare est fait pour vous.
        Chaque objet rare m\u00e9rite un certificat infalsifiable.
      </P>
    </div>
  );
}
