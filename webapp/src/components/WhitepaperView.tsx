import { useState } from 'react';
import Logo from './Logo';

type Section = 'overview' | 'how' | 'certificates' | 'tokenomics' | 'hierarchy' | 'security' | 'roadmap';

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: 'overview', label: 'Vue d’ensemble', icon: '⬡' },
  { id: 'how', label: 'Comment ça marche', icon: '◎' },
  { id: 'certificates', label: 'Certificats', icon: '⚿' },
  { id: 'tokenomics', label: 'Cosmorare (Ω)', icon: '⚛' },
  { id: 'hierarchy', label: 'Niveaux', icon: '★' },
  { id: 'security', label: 'Sécurité', icon: '⚡' },
  { id: 'roadmap', label: 'Feuille de route', icon: '☄' },
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
          <h1 className="text-title-lg sm:text-3xl font-bold opacity-100 mb-2 font-title">{'コスモラレ'}</h1>
          <p className="text-base sm:text-base opacity-50 mb-1">Cosmorare Protocole</p>
          <p className="text-body-sm opacity-40 max-w-md mx-auto">
            La plateforme de certification pour objets rares.
            Certifiez, échangez et collectionnez en toute confiance.
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
      <SectionTitle icon={'⬡'} title="Vue d’ensemble" subtitle="Cosmorare en quelques mots" />
      <P>
        <span className="opacity-80 font-bold">Cosmorare</span> est une <span className="opacity-80 font-bold">plateforme de certification pour objets rares</span>.
        Cartes Pokémon, sneakers, vinyles, montres, art numérique : chaque objet rare mérite un certificat
        d'authenticité infalsifiable. C'est exactement ce que Cosmorare propose.
      </P>

      <H3>Comment ça marche en 4 étapes</H3>
      <div className="space-y-3 mb-4">
        {[
          ['1', 'Créez votre portefeuille', 'Un mot de passe, une clé de récupération, et vous êtes prêt. Aucune donnée personnelle demandée.'],
          ['2', 'Certifiez vos objets rares', 'Uploadez une photo de votre objet. Cosmorare génère un certificat CRCERT infalsifiable avec empreinte numérique et signature cryptographique.'],
          ['3', 'Achetez et vendez', 'Parcourez la marketplace, achetez des Cosmorares certifiées ou mettez les vôtres en vente. Paiement par carte, PayPal ou en Cosmorare (Ω).'],
          ['4', 'Collectionnez en confiance', 'Chaque Cosmorare a un historique de propriété vérifiable. Le certificat est permanent et ne peut être falsifié.'],
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
          ['✓', 'Zéro frais', 'Certifier un objet, envoyer des Cosmorares, vérifier un certificat : tout est gratuit.'],
          ['✓', 'Infalsifiable', 'Les certificats CRCERT sont protégés par de la cryptographie (Ed25519 + SHA-256).'],
          ['✓', 'Paiement simple', 'Carte bancaire, PayPal, SEPA ou Cosmorare (Ω). Pas besoin d’exchange crypto.’],
          ['✓', 'Décentralisé', 'Vos données vous appartiennent. Pas d’intermédiaire, pas de banque.'],
          ['✓', 'Hors ligne', 'L’app fonctionne même sans internet grâce au mode PWA.'],
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
      <SectionTitle icon={'◎'} title="Comment ça marche" subtitle="Le Cosmorare Protocole expliqué simplement" />
      <P>
        Cosmorare repose sur un ensemble de technologies qui travaillent ensemble pour rendre
        la certification d'objets rares <span className="opacity-80">rapide, gratuite et sécurisée</span>.
        Voici comment chaque pièce s'emboîte.
      </P>

      <H3>Le réseau : CosmoMesh</H3>
      <P>
        Imaginez un filet où chaque nœud est connecté à plusieurs autres.
        C'est le <span className="opacity-80 font-bold">CosmoMesh</span> : au lieu d'empiler des blocs
        un par un (comme une blockchain classique), les transactions sont validées
        <span className="opacity-80"> en parallèle</span> sur 7 couches simultanées.
        Résultat : confirmation rapide et zéro frais.
      </P>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat label="Couches" value="7" />
        <Stat label="Frais" value="0 Ω" />
        <Stat label="Confirmation" value="~15s" />
      </div>

      <H3>Le stockage : CosmoCode</H3>
      <P>
        Chaque certificat contient une représentation visuelle de l'objet certifié.
        <span className="opacity-80 font-bold"> CosmoCode</span> compresse ces images
        via 7 couches de compression pour les stocker directement sur le réseau.
        Pas de serveur externe qui pourrait disparaître : votre certificat est permanent et autosuffisant.
      </P>

      <H3>L'exécution : CosmoChain</H3>
      <P>
        <span className="opacity-80 font-bold">CosmoChain</span> est le moteur d'exécution.
        7 shards (zones de traitement) fonctionnent en parallèle dans votre navigateur
        grâce aux Web Workers. Même sur un smartphone, les transactions se traitent
        en arrière-plan sans ralentir l'interface.
      </P>
      <div className="space-y-2 mb-4">
        {[
          ['GRID', 'Stockage des données'],
          ['HELIX', 'Transactions et transferts'],
          ['GLYPH', 'Images et certificats visuels'],
          ['COSMO', 'Identités et comptes'],
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

      <H3>En résumé</H3>
      <P>
        Quand vous certifiez un objet rare, voici ce qui se passe en coulisses :
      </P>
      <div className="p-4 rounded-none bg-current/5 mb-4 text-body-sm opacity-60 space-y-1">
        <p>1. Votre photo est compressée par <span className="font-bold">CosmoCode</span> (7 couches de compression)</p>
        <p>2. Un certificat CRCERT est généré avec empreinte SHA-256 + signature Ed25519</p>
        <p>3. Le tout est validé par le <span className="font-bold">CosmoMesh</span> (7 couches parallèles)</p>
        <p>4. Le certificat est stocké de façon permanente dans <span className="font-bold">CosmoChain</span></p>
        <p>5. Vous recevez un certificat vérifiable à tout moment par n'importe qui</p>
      </div>
    </div>
  );
}

// ─── Certificats CRCERT ─────────────────────────────────

function CertificatesSection() {
  return (
    <div>
      <SectionTitle icon={'⚿'} title="Certificats CRCERT" subtitle="Comment vos objets rares sont protégés" />
      <P>
        Chaque objet certifié sur Cosmorare reçoit un <span className="opacity-80 font-bold">CRCERT</span> (Certificat Cosmorare).
        C'est une preuve mathématique que cet objet est authentique et qu'il vous appartient.
      </P>

      <H3>Qu'est-ce qu'un CRCERT contient ?</H3>
      <div className="p-4 rounded-none bg-current/5 mb-4 font-mono text-body-sm opacity-60 space-y-1">
        <p>CRCERT = {'{'}</p>
        <p>  empreinte: SHA-256(photo de l'objet),</p>
        <p>  signature: Ed25519(votre clé privée),</p>
        <p>  horodatage: date et heure précises,</p>
        <p>  propriétaire: votre adresse publique,</p>
        <p>  visuel: image compressée de l'objet</p>
        <p>{'}'}</p>
      </div>

      <H3>En termes simples</H3>
      <div className="space-y-3 mb-4">
        {[
          ['\u{1F4F8}', 'Empreinte numérique', 'On prend une "empreinte digitale" de votre objet (SHA-256). Si quelqu’un modifie un seul pixel, l’empreinte change complètement. Impossible de tricher.'],
          ['✍', 'Signature du créateur', 'Vous signez le certificat avec votre clé privée (Ed25519). C’est comme une signature manuscrite, mais mathématiquement infalsifiable.'],
          ['\u{1F512}', 'Permanent et vérifiable', 'Le certificat est stocké définitivement sur le réseau. N’importe qui peut le vérifier instantanément, sans autorité centrale.'],
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

      <H3>Comment vérifier un certificat ?</H3>
      <P>
        Sur n'importe quelle Cosmorare, cliquez sur <span className="opacity-80 font-bold">"Vérifier"</span>.
        Le système recalcule l'empreinte de l'objet et la compare au certificat d'origine.
        Si tout correspond : <span className="opacity-80">✔ Authentique</span>.
        Si quelque chose a été modifié : ✘ le certificat est invalidé.
      </P>

      <H3>Rareté des Cosmorares</H3>
      <P>
        Chaque Cosmorare possède un niveau de rareté calculé automatiquement selon le type d'édition
        et la disponibilité :
      </P>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        {[
          ['✦', 'Legendary', 'Pièce unique'],
          ['★', 'Epic', '≤ 10 éditions'],
          ['◆', 'Rare', '≤ 50 éditions'],
          ['◈', 'Uncommon', '≤ 200 éditions'],
          ['◎', 'Common', 'Illimité'],
        ].map(([icon, label, desc]) => (
          <div key={label} className="text-center p-2 rounded-none bg-current/5">
            <p className="text-title-sm">{icon}</p>
            <p className="text-body-sm font-bold opacity-80">{label}</p>
            <p className="text-label opacity-40">{desc}</p>
          </div>
        ))}
      </div>
      <P>
        Bonus : les Cosmorares à durée limitée gagnent un niveau de rareté supplémentaire dans les
        dernières 24 heures avant l'expiration.
      </P>
    </div>
  );
}

// ─── Tokenomics ─────────────────────────────────────────

function TokenomicsSection() {
  return (
    <div>
      <SectionTitle icon={'⚛'} title="Le Cosmorare (Ω)" subtitle="La monnaie de l'écosystème Cosmorare" />
      <P>
        Le <span className="opacity-80 font-bold">Cosmorare (Ω)</span> est la monnaie native de Cosmorare.
        Son offre est fixée à <span className="opacity-80 font-bold">69 millions</span> d'unités pour toujours.
        Aucun Cosmorare supplémentaire ne sera jamais créé.
      </P>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <Stat label="Offre totale" value="69M Ω" />
        <Stat label="Minage" value="60%" />
        <Stat label="Fondation" value="20%" />
        <Stat label="Communauté" value="20%" />
      </div>

      <H3>Comment obtenir des Cosmorares ?</H3>
      <div className="space-y-2 mb-4">
        {[
          ['⛏', 'Miner', 'Exécutez des calculs dans l’app et gagnez des Cosmorares. Plus la difficulté est élevée, plus vous gagnez.'],
          ['\u{1F4B3}', 'Acheter', 'Achetez des Cosmorares directement par carte bancaire, PayPal ou SEPA. Pas besoin d’exchange crypto.'],
          ['\u{1F4B8}', 'Vendre des Cosmorares', 'Vendez vos objets rares certifiés sur la marketplace et recevez des Cosmorares.'],
          ['\u{1F381}', 'Airdrops', 'Des Cosmorares sont distribués gratuitement à la communauté active.'],
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

      <H3>Décroissance Résonante</H3>
      <P>
        Au lieu du "halving" brutal du Bitcoin (récompense divisée par 2 tous les 4 ans), Cosmorare
        utilise une courbe douce basée sur le <span className="opacity-80 font-bold">nombre d'or (φ = 1.618)</span>.
        Les premiers mineurs sont récompensés généreusement, mais la récompense ne s'effondre jamais
        brutalement. La transition est fluide et prévisible.
      </P>

      <H3>Zéro frais — toujours</H3>
      <P>
        Envoyer des Cosmorares, certifier un objet, vérifier un certificat : tout est gratuit.
        Le réseau se finance par la récompense de minage, pas par les frais des utilisateurs.
      </P>
    </div>
  );
}

// ─── Hiérarchie ─────────────────────────────────────────

function HierarchySection() {
  return (
    <div>
      <SectionTitle icon={'★'} title="Niveaux" subtitle="Plus vous utilisez Cosmorare, plus vous êtes récompensé" />
      <P>
        Cosmorare récompense l'engagement avec un système de <span className="opacity-80 font-bold">7 niveaux</span>.
        Plus vous certifiez, échangez et minez, plus vous montez et plus vos récompenses augmentent.
      </P>

      <div className="space-y-2 mb-4">
        {[
          ['Particle', '×1.0', 'Niveau de départ. Accès à toutes les fonctionnalités.'],
          ['Wave', '×1.2', '+20% sur les récompenses de minage.'],
          ['Star', '×1.5', 'Fonctionnalités avancées du Mur.'],
          ['Nebula', '×2.0', 'Double récompense sur les certifications.'],
          ['Galaxy', '×3.0', 'Droit de vote sur le protocole.'],
          ['Cosmos', '×5.0', 'Accès bêta et fonctionnalités expérimentales.'],
          ['Lumina', '×7.0', 'Multiplicateur maximal et gouvernance.'],
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
        La progression est basée sur votre activité réelle : certifications créées, transactions effectuées,
        participation au minage. Il n'est pas possible d'acheter un niveau — seule l'utilisation réelle compte.
      </P>

      <H3>Bonus de série</H3>
      <P>
        Utilisez Cosmorare plusieurs jours consécutifs et vos récompenses augmentent.
        Après 7 jours consécutifs, vous recevez un bonus spécial.
      </P>
    </div>
  );
}

// ─── Sécurité ───────────────────────────────────────────

function SecuritySection() {
  return (
    <div>
      <SectionTitle icon={'⚡'} title="Sécurité" subtitle="Vos données et certificats sont protégés" />
      <P>
        Certifier des objets rares exige un haut niveau de confiance.
        Voici comment Cosmorare protège vos données.
      </P>

      <div className="space-y-3 mb-4">
        {[
          ['\u{1F510}', 'Chiffrement de bout en bout', 'Vos messages sur le Mur sont chiffrés avec AES-GCM. Vos clés privées ne quittent jamais votre appareil. Même Cosmorare ne peut pas lire vos messages.'],
          ['✔', 'Certificats infalsifiables', 'Les CRCERT combinent SHA-256 (empreinte) et Ed25519 (signature). Modifier un seul octet invalide le certificat. La vérification est instantanée.'],
          ['\u{1F4F1}', 'Mode hors ligne (PWA)', 'L’app fonctionne sans internet. Consultez vos certificats et préparez des transactions hors ligne. Tout se synchronise automatiquement à la reconnexion.'],
          ['\u{1F4B3}', 'Paiement intégré', 'Achetez des Cosmorares par carte, PayPal, SEPA, Apple Pay ou Google Pay. Aucun exchange tiers nécessaire.'],
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

      <H3>Vos clés, vos règles</H3>
      <div className="space-y-2 mb-4">
        {[
          ['Clé privée', 'Jamais transmise. Stockée localement, chiffrée avec votre mot de passe.'],
          ['Clé publique', 'Votre identité sur le réseau. Partageable librement.'],
          ['Seed phrase', '12 mots pour récupérer votre compte. À conserver hors ligne.'],
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
      <SectionTitle icon={'☄'} title="Feuille de route" subtitle="Évolution prévue du Cosmorare Protocole" />
      <P>
        Cosmorare est un projet vivant qui évolue continuellement.
      </P>

      <div className="space-y-4 mb-4">
        {[
          ['Phase 1 — Genèse', 'T1 2026', [
            'Lancement du réseau CosmoMesh',
            'Premiers certificats CRCERT',
            'Application PWA avec mode hors ligne',
            'Passerelle de paiement fiat',
          ]],
          ['Phase 2 — Expansion', 'T2 2026', [
            'Ouverture de la marketplace Cosmorares',
            'Lancement du Mur (réseau social chiffré)',
            'Support de toutes catégories d’objets rares',
            'Intégration SEPA, Apple Pay et Google Pay',
          ]],
          ['Phase 3 — Maturité', 'T3-T4 2026', [
            'SDK développeur ouvert',
            'Gouvernance décentralisée',
            'Partenariats avec des maisons de vente aux enchères',
            'Application mobile native',
          ]],
          ['Phase 4 — Cosmos', '2027+', [
            'Interopérabilité avec d’autres protocoles',
            'Certification d’objets physiques via NFC et QR codes',
            'IA pour la détection de contrefaçons',
            'Écosystème d’applications tierces',
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
                  <span className="opacity-40 shrink-0">{'→'}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <H3>Rejoignez l'aventure</H3>
      <P>
        Que vous soyez collectionneur de cartes Pokémon, amateur de sneakers, passionné de vinyles
        ou fan d'art numérique, Cosmorare est fait pour vous.
        Chaque objet rare mérite un certificat infalsifiable.
      </P>
    </div>
  );
}
