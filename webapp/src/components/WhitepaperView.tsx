import { useState } from 'react';
import Logo from './Logo';

type Section = 'overview' | 'how' | 'certificates' | 'tokenomics' | 'hierarchy' | 'security' | 'roadmap';

const NAV: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: "Vue d\u2019ensemble", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" /></svg> },
  { id: 'how', label: 'Comment ça marche', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg> },
  { id: 'certificates', label: 'Certificats', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 12l2 2 4-4" /><path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" /></svg> },
  { id: 'tokenomics', label: 'Strangrz (Ω)', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v12M8 8.5l8 7M16 8.5l-8 7" /></svg> },
  { id: 'hierarchy', label: 'Niveaux', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg> },
  { id: 'security', label: 'Sécurité', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" /></svg> },
  { id: 'roadmap', label: 'Feuille de route', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> },
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
          <h1 className="text-title-lg sm:text-3xl font-bold opacity-100 mb-2 font-title">{'ストレンジャーズ'}</h1>
          <p className="text-base sm:text-base opacity-50 mb-1">Strangrz Protocole</p>
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

function SectionTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-title-lg opacity-60">{icon}</span>
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
      <SectionTitle icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" /></svg>} title={"Vue d\u2019ensemble"} subtitle="Strangrz en quelques mots" />
      <P>
        <span className="opacity-80 font-bold">Strangrz</span> est une <span className="opacity-80 font-bold">plateforme de certification pour objets rares</span>.
        Cartes Pokémon, sneakers, vinyles, montres, art numérique : chaque objet rare mérite un certificat
        d'authenticité infalsifiable. C'est exactement ce que Strangrz propose.
      </P>

      <H3>Comment ça marche en 4 étapes</H3>
      <div className="space-y-3 mb-4">
        {[
          ['1', 'Créez votre portefeuille', 'Un mot de passe, une clé de récupération, et vous êtes prêt. Aucune donnée personnelle demandée.'],
          ['2', 'Certifiez vos objets rares', 'Uploadez une photo de votre objet. Strangrz génère un certificat STCERT infalsifiable avec empreinte numérique et signature cryptographique.'],
          ['3', 'Achetez et vendez', 'Parcourez la marketplace, achetez des Strangrz certifiées ou mettez les vôtres en vente. Paiement par carte, PayPal ou en Strangrz (Ω).'],
          ['4', 'Collectionnez en confiance', 'Chaque Strangrz a un historique de propriété vérifiable. Le certificat est permanent et ne peut être falsifié.'],
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

      <H3>Pourquoi Strangrz ?</H3>
      <div className="space-y-2 mb-4">
        {[
          ['✓', 'Zéro frais', 'Certifier un objet, envoyer des Strangrz, vérifier un certificat : tout est gratuit.'],
          ['✓', 'Infalsifiable', 'Les certificats STCERT sont protégés par de la cryptographie (Ed25519 + SHA-256).'],
          ['✓', 'Paiement simple', "Carte bancaire, PayPal, SEPA ou Strangrz (Ω). Pas besoin d\u2019exchange crypto."],
          ['✓', 'Décentralisé', "Vos données vous appartiennent. Pas d\u2019intermédiaire, pas de banque."],
          ['✓', 'Hors ligne', "L\u2019app fonctionne même sans internet grâce au mode PWA."],
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
      <SectionTitle icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>} title="Comment ça marche" subtitle="Le Strangrz Protocole expliqué simplement" />
      <P>
        Strangrz repose sur un ensemble de technologies qui travaillent ensemble pour rendre
        la certification d'objets rares <span className="opacity-80">rapide, gratuite et sécurisée</span>.
        Voici comment chaque pièce s'emboîte.
      </P>

      <H3>Le réseau : StrangrzMesh</H3>
      <P>
        Imaginez un filet où chaque nœud est connecté à plusieurs autres.
        C'est le <span className="opacity-80 font-bold">StrangrzMesh</span> : au lieu d'empiler des blocs
        un par un (comme une blockchain classique), les transactions sont validées
        <span className="opacity-80"> en parallèle</span> sur 7 couches simultanées.
        Résultat : confirmation rapide et zéro frais.
      </P>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat label="Couches" value="7" />
        <Stat label="Frais" value="0 Ω" />
        <Stat label="Confirmation" value="~15s" />
      </div>

      <H3>Le stockage : StrangrzCode</H3>
      <P>
        Chaque certificat contient une représentation visuelle de l'objet certifié.
        <span className="opacity-80 font-bold"> StrangrzCode</span> compresse ces images
        via 7 couches de compression pour les stocker directement sur le réseau.
        Pas de serveur externe qui pourrait disparaître : votre certificat est permanent et autosuffisant.
      </P>

      <H3>L'exécution : StrangrzChain</H3>
      <P>
        <span className="opacity-80 font-bold">StrangrzChain</span> est le moteur d'exécution.
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
        <p>1. Votre photo est compressée par <span className="font-bold">StrangrzCode</span> (7 couches de compression)</p>
        <p>2. Un certificat STCERT est généré avec empreinte SHA-256 + signature Ed25519</p>
        <p>3. Le tout est validé par le <span className="font-bold">StrangrzMesh</span> (7 couches parallèles)</p>
        <p>4. Le certificat est stocké de façon permanente dans <span className="font-bold">StrangrzChain</span></p>
        <p>5. Vous recevez un certificat vérifiable à tout moment par n'importe qui</p>
      </div>
    </div>
  );
}

// ─── Certificats STCERT ─────────────────────────────────

function CertificatesSection() {
  return (
    <div>
      <SectionTitle icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 12l2 2 4-4" /><path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" /></svg>} title="Certificats STCERT" subtitle="Comment vos objets rares sont protégés" />
      <P>
        Chaque objet certifié sur Strangrz reçoit un <span className="opacity-80 font-bold">STCERT</span> (Certificat Strangrz).
        C'est une preuve mathématique que cet objet est authentique et qu'il vous appartient.
      </P>

      <H3>Qu'est-ce qu'un STCERT contient ?</H3>
      <div className="p-4 rounded-none bg-current/5 mb-4 font-mono text-body-sm opacity-60 space-y-1">
        <p>STCERT = {'{'}</p>
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
          [<svg key="fp" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/><path d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10S2 17.52 2 12z"/><path d="M12 6v2M12 16v2M6 12h2M16 12h2"/></svg>, 'Empreinte numérique', "On prend une \"empreinte digitale\" de votre objet (SHA-256). Si quelqu\u2019un modifie un seul pixel, l\u2019empreinte change compl\u00e8tement. Impossible de tricher."],
          [<svg key="sig" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>, 'Signature du créateur', "Vous signez le certificat avec votre cl\u00e9 priv\u00e9e (Ed25519). C\u2019est comme une signature manuscrite, mais math\u00e9matiquement infalsifiable."],
          [<svg key="lock" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, 'Permanent et vérifiable', "Le certificat est stock\u00e9 d\u00e9finitivement sur le r\u00e9seau. N\u2019importe qui peut le v\u00e9rifier instantan\u00e9ment, sans autorit\u00e9 centrale."],
        ].map(([icon, title, desc]) => (
          <div key={title as string} className="p-4 rounded-none bg-current/5 border border-current/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="opacity-60 shrink-0">{icon}</span>
              <span className="text-base font-bold opacity-80">{title as string}</span>
            </div>
            <p className="text-body-sm opacity-50 leading-relaxed">{desc as string}</p>
          </div>
        ))}
      </div>

      <H3>Comment vérifier un certificat ?</H3>
      <P>
        Sur n'importe quelle Strangrz, cliquez sur <span className="opacity-80 font-bold">"Vérifier"</span>.
        Le système recalcule l'empreinte de l'objet et la compare au certificat d'origine.
        Si tout correspond : <span className="opacity-80">✔ Authentique</span>.
        Si quelque chose a été modifié : ✘ le certificat est invalidé.
      </P>

      <H3>Rareté des Strangrz</H3>
      <P>
        Chaque Strangrz possède un niveau de rareté calculé automatiquement selon le type d'édition
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
        Bonus : les Strangrz à durée limitée gagnent un niveau de rareté supplémentaire dans les
        dernières 24 heures avant l'expiration.
      </P>
    </div>
  );
}

// ─── Tokenomics ─────────────────────────────────────────

function TokenomicsSection() {
  return (
    <div>
      <SectionTitle icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v12M8 8.5l8 7M16 8.5l-8 7" /></svg>} title="Le Strangrz (Ω)" subtitle="La monnaie de l'écosystème Strangrz" />
      <P>
        Le <span className="opacity-80 font-bold">Strangrz (Ω)</span> est la monnaie native de Strangrz.
        Son offre est fixée à <span className="opacity-80 font-bold">69 millions</span> d'unités pour toujours.
        Aucun Strangrz supplémentaire ne sera jamais créé.
      </P>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <Stat label="Offre totale" value="69M Ω" />
        <Stat label="Minage" value="60%" />
        <Stat label="Fondation" value="20%" />
        <Stat label="Communauté" value="20%" />
      </div>

      <H3>Comment obtenir des Strangrz ?</H3>
      <div className="space-y-2 mb-4">
        {[
          [<svg key="mine" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>, 'Miner', "Ex\u00e9cutez des calculs dans l\u2019app et gagnez des Strangrz. Plus la difficult\u00e9 est \u00e9lev\u00e9e, plus vous gagnez."],
          [<svg key="buy" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>, 'Acheter', "Achetez des Strangrz directement par carte bancaire, PayPal ou SEPA. Pas besoin d\u2019exchange crypto."],
          [<svg key="sell" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, 'Vendre des Strangrz', 'Vendez vos objets rares certifiés sur la marketplace et recevez des Strangrz.'],
          [<svg key="drop" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"/><polyline points="12 15 12 3"/><polyline points="8 7 12 3 16 7"/></svg>, 'Airdrops', 'Des Strangrz sont distribués gratuitement à la communauté active.'],
        ].map(([icon, title, desc]) => (
          <div key={title as string} className="flex gap-3 p-3 rounded-none bg-current/5">
            <span className="opacity-60 shrink-0 mt-0.5">{icon}</span>
            <div>
              <p className="text-body-sm font-bold opacity-80">{title as string}</p>
              <p className="text-label opacity-40">{desc as string}</p>
            </div>
          </div>
        ))}
      </div>

      <H3>Décroissance Résonante</H3>
      <P>
        Au lieu du "halving" brutal du Bitcoin (récompense divisée par 2 tous les 4 ans), Strangrz
        utilise une courbe douce basée sur le <span className="opacity-80 font-bold">nombre d'or (φ = 1.618)</span>.
        Les premiers mineurs sont récompensés généreusement, mais la récompense ne s'effondre jamais
        brutalement. La transition est fluide et prévisible.
      </P>

      <H3>Zéro frais — toujours</H3>
      <P>
        Envoyer des Strangrz, certifier un objet, vérifier un certificat : tout est gratuit.
        Le réseau se finance par la récompense de minage, pas par les frais des utilisateurs.
      </P>
    </div>
  );
}

// ─── Hiérarchie ─────────────────────────────────────────

function HierarchySection() {
  return (
    <div>
      <SectionTitle icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>} title="Niveaux" subtitle="Plus vous utilisez Strangrz, plus vous êtes récompensé" />
      <P>
        Strangrz récompense l'engagement avec un système de <span className="opacity-80 font-bold">7 niveaux</span>.
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
        Utilisez Strangrz plusieurs jours consécutifs et vos récompenses augmentent.
        Après 7 jours consécutifs, vous recevez un bonus spécial.
      </P>
    </div>
  );
}

// ─── Sécurité ───────────────────────────────────────────

function SecuritySection() {
  return (
    <div>
      <SectionTitle icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"/></svg>} title="Sécurité" subtitle="Vos données et certificats sont protégés" />
      <P>
        Certifier des objets rares exige un haut niveau de confiance.
        Voici comment Strangrz protège vos données.
      </P>

      <div className="space-y-3 mb-4">
        {[
          [<svg key="enc" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1"/></svg>, 'Chiffrement de bout en bout', 'Vos messages sur le Mur sont chiffrés avec AES-GCM. Vos clés privées ne quittent jamais votre appareil. Même Strangrz ne peut pas lire vos messages.'],
          [<svg key="cert" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 12l2 2 4-4"/><path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"/></svg>, 'Certificats infalsifiables', 'Les STCERT combinent SHA-256 (empreinte) et Ed25519 (signature). Modifier un seul octet invalide le certificat. La vérification est instantanée.'],
          [<svg key="pwa" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>, 'Mode hors ligne (PWA)', "L\u2019app fonctionne sans internet. Consultez vos certificats et pr\u00e9parez des transactions hors ligne. Tout se synchronise automatiquement \u00e0 la reconnexion."],
          [<svg key="pay" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>, 'Paiement intégré', 'Achetez des Strangrz par carte, PayPal, SEPA, Apple Pay ou Google Pay. Aucun exchange tiers nécessaire.'],
        ].map(([icon, title, desc]) => (
          <div key={title as string} className="p-4 rounded-none bg-current/5 border border-current/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="opacity-60 shrink-0">{icon}</span>
              <span className="text-base font-bold opacity-80">{title as string}</span>
            </div>
            <p className="text-body-sm opacity-50 leading-relaxed">{desc as string}</p>
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
      <SectionTitle icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>} title="Feuille de route" subtitle="Évolution prévue du Strangrz Protocole" />
      <P>
        Strangrz est un projet vivant qui évolue continuellement.
      </P>

      <div className="space-y-4 mb-4">
        {[
          ['Phase 1 — Genèse', 'T1 2026', [
            'Lancement du réseau StrangrzMesh',
            'Premiers certificats STCERT',
            'Application PWA avec mode hors ligne',
            'Passerelle de paiement fiat',
          ]],
          ['Phase 2 — Expansion', 'T2 2026', [
            'Ouverture de la marketplace Strangrz',
            'Lancement du Mur (réseau social chiffré)',
            "Support de toutes cat\u00e9gories d\u2019objets rares",
            'Intégration SEPA, Apple Pay et Google Pay',
          ]],
          ['Phase 3 — Maturité', 'T3-T4 2026', [
            'SDK développeur ouvert',
            'Gouvernance décentralisée',
            'Partenariats avec des maisons de vente aux enchères',
            'Application mobile native',
          ]],
          ['Phase 4 — Cosmos', '2027+', [
            "Interop\u00e9rabilit\u00e9 avec d\u2019autres protocoles",
            "Certification d\u2019objets physiques via NFC et QR codes",
            "IA pour la d\u00e9tection de contrefaçons",
            "\u00c9cosyst\u00e8me d\u2019applications tierces",
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
        ou fan d'art numérique, Strangrz est fait pour vous.
        Chaque objet rare mérite un certificat infalsifiable.
      </P>
    </div>
  );
}
