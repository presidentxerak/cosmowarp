import { useState } from 'react';
import Logo from './Logo';

type Section = 'overview' | 'foundation' | 'cosmomesh' | 'cosmochain' | 'cosmocode' | 'cosmohash' | 'cosmolingua' | 'tokenomics' | 'hierarchy' | 'security' | 'roadmap';

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: 'overview', label: 'Vue d\u2019ensemble', icon: '\u2B21' },
  { id: 'foundation', label: 'Fondation', icon: '\u2600' },
  { id: 'cosmomesh', label: 'CosmoMesh', icon: '\u25CE' },
  { id: 'cosmochain', label: 'CosmoChain', icon: '\u26D3' },
  { id: 'cosmocode', label: 'CosmoCode', icon: '\u25B7' },
  { id: 'cosmohash', label: 'CosmoHash', icon: '\u26BF' },
  { id: 'cosmolingua', label: 'CosmoLingua', icon: '\u223F' },
  { id: 'tokenomics', label: 'Tokenomics', icon: '\u269B' },
  { id: 'hierarchy', label: 'Hi\u00e9rarchie', icon: '\u2605' },
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
          <p className="text-base sm:text-base opacity-50 mb-1">White Paper v3.0</p>
          <p className="text-body-sm opacity-40 max-w-md mx-auto">
            Protocole de certification pour objets rares. Certificats cryptographiques infalsifiables (CRCERT),
            7 shards parall\u00e8les, z\u00e9ro frais, compression SVG fractale. Ni blockchain. Ni token classique. Un maillage vivant.
          </p>
        </div>
      </div>

      {/* Section Nav */}
      <div className="glass-panel p-2">
        <div className="grid grid-cols-5 gap-1 sm:flex sm:gap-1 sm:overflow-x-auto">
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
        {section === 'foundation' && <FoundationSection />}
        {section === 'cosmomesh' && <CosmoMeshSection />}
        {section === 'cosmochain' && <CosmoChainSection />}
        {section === 'cosmocode' && <CosmoCodeSection />}
        {section === 'cosmohash' && <CosmoHashSection />}
        {section === 'cosmolingua' && <CosmoLinguaSection />}
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

function Code({ children }: { children: React.ReactNode }) {
  return <code className="text-body-sm opacity-60 bg-current/5 px-1 py-0.5 rounded-none font-mono">{children}</code>;
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
      <SectionTitle icon={'\u2B21'} title="Vue d\u2019ensemble" subtitle="Qu\u2019est-ce que Cosmorare et pourquoi existe-t-il ?" />
      <P>
        <span className="opacity-80 font-bold">Cosmorare</span> est un <span className="opacity-80 font-bold">protocole de certification pour objets rares</span>.
        Cartes Pok\u00e9mon, sneakers, vinyles, montres, art num\u00e9rique : chaque objet rare m\u00e9rite un certificat
        d'authenticit\u00e9 infalsifiable. C'est exactement ce que Cosmorare propose, gr\u00e2ce \u00e0 des certificats
        cryptographiques appel\u00e9s <span className="opacity-80 font-bold">CRCERT</span>.
      </P>
      <P>
        Contrairement aux blockchains classiques qui cha\u00eenent des blocs de mani\u00e8re lin\u00e9aire, Cosmorare
        utilise un <span className="opacity-80">graphe acyclique orient\u00e9 (DAG)</span> avec 7 couches de validation
        parall\u00e8les, permettant un d\u00e9bit massif sans le goulot d'\u00e9tranglement de la confirmation s\u00e9quentielle.
      </P>
      <P>
        L\u00e0 o\u00f9 les syst\u00e8mes fiat d\u00e9pendent d'interm\u00e9diaires centralis\u00e9s (banques, processeurs de paiement),
        Cosmorare fonctionne comme un <span className="opacity-80">maillage pair-\u00e0-pair</span> o\u00f9 chaque
        transaction valide deux transactions pr\u00e9c\u00e9dentes, cr\u00e9ant un r\u00e9seau de confiance auto-renfor\u00e7ant.
      </P>

      <H3>Innovations cl\u00e9s</H3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {[
          ['\u25CE', 'CosmoMesh', 'R\u00e9seau DAG \u00e0 7 couches de validation parall\u00e8les'],
          ['\u26D3', 'CosmoChain', '7 shards parall\u00e8les, 0 frais, stockage SVG on-chain'],
          ['\u25B7', 'CosmoCode', 'Moteur de compression SVG \u00e0 7 couches fractales'],
          ['\u26BF', 'CosmoHash', 'Stack cryptographique Ed25519 + SHA-256 + AES-GCM'],
          ['\u223F', 'CosmoLingua', 'Langage CosmoASM avec instructions ex\u00e9cutables'],
          ['\u269B', 'D\u00e9croissance R\u00e9sonante', 'Courbe de minage au ratio d\u2019or (remplace le halving)'],
          ['\u2605', 'Hi\u00e9rarchie', 'Syst\u00e8me \u00e0 7 niveaux avec multiplicateurs de r\u00e9compenses'],
        ].map(([icon, title, desc]) => (
          <div key={title} className="flex gap-3 p-3 rounded-none bg-current/5">
            <span className="text-title-md opacity-80 shrink-0">{icon}</span>
            <div>
              <p className="text-body-sm font-bold opacity-90">{title}</p>
              <p className="text-label opacity-40">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <H3>Pourquoi Cosmorare ?</H3>
      <div className="overflow-x-auto">
        <table className="w-full text-body-sm">
          <thead>
            <tr className="border-b border-current/10">
              <th className="py-2 text-left opacity-40">Fonctionnalit\u00e9</th>
              <th className="py-2 text-center opacity-40">Fiat</th>
              <th className="py-2 text-center opacity-40">Blockchain</th>
              <th className="py-2 text-center opacity-80">Cosmorare</th>
            </tr>
          </thead>
          <tbody className="opacity-50">
            {[
              ['Rapidit\u00e9', '\u2713', '\u2717', '\u2B21'],
              ['D\u00e9centralis\u00e9', '\u2717', '\u2713', '\u2B21'],
              ['Validation parall\u00e8le', '\u2717', '\u2717', '\u2B21'],
              ['Pas de gaspillage \u00e9nerg\u00e9tique', '\u2717', '\u2717', '\u2B21'],
              ['Z\u00e9ro frais', '\u2713', '\u2717', '\u2B21'],
              ['Stockage on-chain complet', '\u2717', '\u2717', '\u2B21'],
              ['Certification d\u2019objets rares', '\u2717', '\u2717', '\u2B21'],
              ['Pair-\u00e0-pair natif', '\u2717', '\u2713', '\u2B21'],
              ['Distribution \u00e9quitable', '\u2717', '\u2717', '\u2B21'],
            ].map(([feat, fiat, block, cosmo]) => (
              <tr key={feat} className="border-b border-gray-800/30">
                <td className="py-1.5 opacity-70">{feat}</td>
                <td className="py-1.5 text-center">{fiat}</td>
                <td className="py-1.5 text-center">{block}</td>
                <td className="py-1.5 text-center opacity-80">{cosmo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Fondation ──────────────────────────────────────────

function FoundationSection() {
  return (
    <div>
      <SectionTitle icon={'\u2600'} title="Fondation Cosmorare" subtitle="L\u2019organisation derri\u00e8re le protocole" />
      <P>
        La <span className="opacity-60 font-bold">Fondation Cosmorare</span> est la gardienne du protocole,
        de l'\u00e9cosyst\u00e8me et de la communaut\u00e9. Sa mission est de construire un syst\u00e8me de certification
        qui sert l'humanit\u00e9 au-del\u00e0 des limitations des syst\u00e8mes fiat et des cryptomonnaies classiques.
      </P>

      <H3>Mission</H3>
      <P>
        Cr\u00e9er un syst\u00e8me universel de certification d'objets rares qui soit \u00e9quitable, transparent,
        programmable et accessible \u00e0 tous. Cosmorare permet la certification et l'\u00e9change d'art num\u00e9rique,
        de biens physiques (cartes Pok\u00e9mon, sneakers, vinyles, montres), de services et de toute forme de
        valeur entre les \u00eatres humains.
      </P>

      <H3>L'\u00c9cosyst\u00e8me</H3>
      <div className="space-y-3 mb-4">
        {[
          ['\u25CE', 'CosmoMesh', 'Le tissu transactionnel. Un DAG \u00e0 7 couches de validation fractales qui traite les transactions en parall\u00e8le, avec un r\u00e8glement quasi instantan\u00e9.', 'opacity-80'],
          ['\u25B7', 'CosmoCode', 'Le moteur de compression. 7 couches fractales (Delta, Dictionary, Run-Length, Fractal Nesting, Frequency, Quantize, Filters) pour un stockage SVG ultra-compact.', 'opacity-80'],
          ['\u26BF', 'CosmoHash', 'La fondation cryptographique. Signatures Ed25519, hachage SHA-256 et chiffrement AES-GCM forment l\u2019\u00e9pine dorsale de la s\u00e9curit\u00e9.', 'opacity-80'],
          ['\u223F', 'CosmoLingua', 'Le langage symbolique. Lettres grecques (\u03A9, \u03c6, \u03c8), symboles cosmiques et nommage fractal cr\u00e9ent une identit\u00e9 culturelle unique.', 'opacity-80'],
          ['\u269B', 'CosmoVault', 'Le moteur tokenomique. G\u00e8re l\u2019offre fixe de 69M de Warps (\u03A9), la courbe de D\u00e9croissance R\u00e9sonante, les airdrops et les r\u00e9compenses.', 'opacity-80'],
          ['\u2B21', 'CRCERT', 'Le certificat d\u2019authenticit\u00e9. Empreinte SHA-256 + signature Ed25519 = preuve irr\u00e9futable de l\u2019authenticit\u00e9 d\u2019un objet rare.', 'opacity-80'],
        ].map(([icon, title, desc, color]) => (
          <div key={title} className="p-4 rounded-none bg-current/5 border border-current/5">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-title-sm ${color}`}>{icon}</span>
              <span className={`text-base font-bold ${color}`}>{title}</span>
            </div>
            <p className="text-body-sm opacity-50 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <H3>Valeurs</H3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {['Transparence', '\u00c9quit\u00e9', 'Innovation', 'Communaut\u00e9', 'S\u00e9curit\u00e9', 'Libert\u00e9'].map(v => (
          <div key={v} className="text-center p-2 rounded-none bg-current/5">
            <p className="text-body-sm opacity-80 font-bold">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CosmoMesh ──────────────────────────────────────────

function CosmoMeshSection() {
  return (
    <div>
      <SectionTitle icon={'\u25CE'} title="CosmoMesh" subtitle="R\u00e9seau DAG \u00e0 7 couches de validation parall\u00e8les" />
      <P>
        Imaginez un filet de p\u00eache g\u00e9ant o\u00f9 chaque n\u0153ud est connect\u00e9 \u00e0 plusieurs autres.
        C'est le principe du <span className="opacity-80 font-bold">CosmoMesh</span> : un graphe acyclique
        orient\u00e9 (DAG) o\u00f9 chaque transaction valide deux transactions pr\u00e9c\u00e9dentes, cr\u00e9ant un maillage
        auto-renfor\u00e7ant.
      </P>
      <P>
        Contrairement \u00e0 une blockchain o\u00f9 les blocs s'empilent un par un, le CosmoMesh permet la
        validation <span className="opacity-80">en parall\u00e8le</span> sur 7 couches fractales simultan\u00e9es.
        R\u00e9sultat : un d\u00e9bit massif et un r\u00e8glement quasi instantan\u00e9.
      </P>

      <H3>Les 7 couches fractales</H3>
      <P>
        Chaque transaction traverse 7 niveaux de validation, chacun ajoutant une couche de confiance.
        Pensez \u00e0 7 filets superpos\u00e9s : m\u00eame si un n\u0153ud est d\u00e9faillant, les 6 autres couches garantissent
        l'int\u00e9grit\u00e9 du r\u00e9seau.
      </P>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <Stat label="Couches" value="7" />
        <Stat label="Latence" value="~15s" />
        <Stat label="Frais" value="0 \u03A9" />
        <Stat label="Beacon Block" value="~15s" />
      </div>

      <H3>Beacon Block</H3>
      <P>
        Toutes les ~15 secondes, un <span className="opacity-80 font-bold">Beacon Block</span> ancre
        l'\u00e9tat global du r\u00e9seau. C'est comme une photo instantan\u00e9e de l'ensemble du maillage,
        permettant \u00e0 chaque n\u0153ud de v\u00e9rifier la coh\u00e9rence de l'\u00e9tat global sans avoir besoin
        de tout recalculer.
      </P>

      <H3>Validation par r\u00e9f\u00e9rence crois\u00e9e</H3>
      <P>
        Chaque nouvelle transaction doit r\u00e9f\u00e9rencer au moins 2 transactions pr\u00e9c\u00e9dentes (appel\u00e9es
        "parents"). Ce m\u00e9canisme cr\u00e9e un tissu de confiance o\u00f9 chaque \u00e9l\u00e9ment renforce les autres.
        Plus le maillage grandit, plus il devient r\u00e9silient.
      </P>
    </div>
  );
}

// ─── CosmoChain ─────────────────────────────────────────

function CosmoChainSection() {
  return (
    <div>
      <SectionTitle icon={'\u26D3'} title="CosmoChain" subtitle="7 shards parall\u00e8les dans des Web Workers" />
      <P>
        Le <span className="opacity-80 font-bold">CosmoChain</span> est le moteur d'ex\u00e9cution de Cosmorare.
        Imaginez 7 autoroutes parall\u00e8les au lieu d'une seule route : chaque shard traite des transactions
        ind\u00e9pendamment, multipliant le d\u00e9bit par 7.
      </P>

      <H3>Les 7 shards</H3>
      <P>
        Chaque shard a un r\u00f4le sp\u00e9cifique et fonctionne dans son propre Web Worker, garantissant
        une ex\u00e9cution parall\u00e8le sans bloquer l'interface utilisateur.
      </P>
      <div className="space-y-2 mb-4">
        {[
          ['GRID', 'Stockage et indexation des donn\u00e9es structur\u00e9es'],
          ['HELIX', 'Traitement des transactions et des transferts de Warps'],
          ['GLYPH', 'Stockage et compression SVG on-chain (via CosmoCode)'],
          ['COSMO', 'Gestion des identit\u00e9s, des comptes et des hi\u00e9rarchies'],
          ['CHRONOS', 'Horodatage et ordonnancement temporel des \u00e9v\u00e9nements'],
          ['NEXUS', 'Communication inter-shards et routage des messages'],
          ['LUMINA', 'Validation finale et ancrage dans le Beacon Block'],
        ].map(([name, desc]) => (
          <div key={name} className="flex gap-3 p-3 rounded-none bg-current/5">
            <Code>{name}</Code>
            <p className="text-body-sm opacity-50">{desc}</p>
          </div>
        ))}
      </div>

      <H3>Z\u00e9ro frais, toujours</H3>
      <P>
        Cosmorare ne facture <span className="opacity-80 font-bold">aucun frais de transaction</span>.
        Pas de "gas", pas de frais cach\u00e9s. Envoyer un Warp (\u03A9) ou certifier un objet rare co\u00fbte
        toujours <span className="opacity-80 font-bold">0 \u03A9</span>. La validation est assur\u00e9e par le
        m\u00e9canisme de r\u00e9f\u00e9rence crois\u00e9e du CosmoMesh.
      </P>

      <H3>Web Workers : la parall\u00e9lisation dans le navigateur</H3>
      <P>
        Les 7 shards s'ex\u00e9cutent dans des Web Workers, des processus parall\u00e8les du navigateur.
        Cela signifie que m\u00eame sur un smartphone, Cosmorare peut traiter des transactions en arri\u00e8re-plan
        sans ralentir l'interface. C'est comme avoir 7 processeurs d\u00e9di\u00e9s dans votre navigateur.
      </P>
    </div>
  );
}

// ─── CosmoCode ──────────────────────────────────────────

function CosmoCodeSection() {
  return (
    <div>
      <SectionTitle icon={'\u25B7'} title="CosmoCode" subtitle="Moteur de compression SVG \u00e0 7 couches fractales" />
      <P>
        <span className="opacity-80 font-bold">CosmoCode</span> est le moteur de compression qui permet
        de stocker des images SVG directement sur la cha\u00eene. Pourquoi le SVG ? Parce que c'est le format
        id\u00e9al pour les certificats visuels : vectoriel, scalable et compressible.
      </P>

      <H3>Les 7 couches de compression</H3>
      <P>
        Chaque SVG passe par 7 \u00e9tapes de compression, chacune r\u00e9duisant la taille. Le r\u00e9sultat :
        des ratios de compression de 5x \u00e0 30x pour les donn\u00e9es structur\u00e9es.
      </P>
      <div className="space-y-2 mb-4">
        {[
          ['1. Delta', 'Encode les diff\u00e9rences entre valeurs cons\u00e9cutives au lieu des valeurs absolues'],
          ['2. Dictionary', 'Remplace les cha\u00eenes r\u00e9p\u00e9t\u00e9es par des r\u00e9f\u00e9rences courtes vers un dictionnaire'],
          ['3. Run-Length', 'Compresse les s\u00e9quences de valeurs identiques (ex: "aaaa" \u2192 "4a")'],
          ['4. Fractal Nesting', 'D\u00e9tecte les motifs r\u00e9cursifs et les encode comme des fractales'],
          ['5. Frequency', 'Attribue des codes courts aux symboles fr\u00e9quents (comme le code Huffman)'],
          ['6. Quantize', 'R\u00e9duit la pr\u00e9cision des nombres flottants au minimum n\u00e9cessaire'],
          ['7. Filters', 'Applique des filtres pr\u00e9dictifs pour maximiser la compressibilit\u00e9'],
        ].map(([name, desc]) => (
          <div key={name} className="flex gap-3 p-3 rounded-none bg-current/5">
            <div>
              <p className="text-body-sm font-bold opacity-80">{name}</p>
              <p className="text-label opacity-40">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <H3>Pourquoi c'est important pour les objets rares ?</H3>
      <P>
        Chaque certificat CRCERT contient une repr\u00e9sentation visuelle de l'objet certifi\u00e9.
        Gr\u00e2ce \u00e0 CosmoCode, cette image est stock\u00e9e directement on-chain, pas sur un serveur externe
        qui pourrait dispara\u00eetre. Votre certificat est permanent et autosuffisant.
      </P>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        <Stat label="Couches" value="7" />
        <Stat label="Ratio min" value="5x" />
        <Stat label="Ratio max" value="30x" />
      </div>
    </div>
  );
}

// ─── CosmoHash ──────────────────────────────────────────

function CosmoHashSection() {
  return (
    <div>
      <SectionTitle icon={'\u26BF'} title="CosmoHash" subtitle="Stack cryptographique de confiance" />
      <P>
        La s\u00e9curit\u00e9 de Cosmorare repose sur trois piliers cryptographiques reconnus mondialement.
        Ensemble, ils forment le <span className="opacity-80 font-bold">CosmoHash</span>, la colonne
        vert\u00e9brale de la confiance dans le protocole.
      </P>

      <H3>Les 3 piliers</H3>
      <div className="space-y-3 mb-4">
        {[
          ['\u270D', 'Ed25519 \u2014 Signatures num\u00e9riques', 'Chaque utilisateur poss\u00e8de une paire de cl\u00e9s (publique + priv\u00e9e). Signer un certificat revient \u00e0 apposer une signature num\u00e9rique infalsifiable. Ed25519 est utilis\u00e9 par Signal, SSH, et des milliers de protocoles s\u00e9curis\u00e9s.'],
          ['#\uFE0F\u20E3', 'SHA-256 \u2014 Empreinte num\u00e9rique', 'Chaque objet certifi\u00e9 re\u00e7oit une empreinte unique de 256 bits. Modifier un seul pixel de l\u2019image change compl\u00e8tement l\u2019empreinte. C\u2019est comme une empreinte digitale pour les donn\u00e9es num\u00e9riques.'],
          ['\u{1F510}', 'AES-GCM \u2014 Chiffrement authentifi\u00e9', 'Les messages priv\u00e9s sur le Mur (r\u00e9seau social) sont chiffr\u00e9s de bout en bout. M\u00eame Cosmorare ne peut pas lire vos messages. AES-GCM garantit \u00e0 la fois la confidentialit\u00e9 et l\u2019int\u00e9grit\u00e9.'],
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

      <H3>Le certificat CRCERT</H3>
      <P>
        Un <span className="opacity-80 font-bold">CRCERT</span> (Certificat Cosmorare) combine ces trois technologies :
      </P>
      <div className="p-4 rounded-none bg-current/5 mb-4 font-mono text-body-sm opacity-60 space-y-1">
        <p>CRCERT = {'{'}</p>
        <p>&nbsp;&nbsp;empreinte: SHA-256(donn\u00e9es_objet),</p>
        <p>&nbsp;&nbsp;signature: Ed25519.sign(empreinte, cl\u00e9_priv\u00e9e),</p>
        <p>&nbsp;&nbsp;horodatage: timestamp_beacon_block,</p>
        <p>&nbsp;&nbsp;propri\u00e9taire: cl\u00e9_publique_Ed25519,</p>
        <p>&nbsp;&nbsp;visuel: CosmoCode.compress(svg_objet)</p>
        <p>{'}'}</p>
      </div>
      <P>
        En termes simples : on prend une photo num\u00e9rique de votre objet rare, on calcule son empreinte
        unique, on la signe avec votre cl\u00e9 priv\u00e9e, et on stocke le tout de mani\u00e8re permanente sur le r\u00e9seau.
        Personne ne peut falsifier ce certificat.
      </P>
    </div>
  );
}

// ─── CosmoLingua ────────────────────────────────────────

function CosmoLinguaSection() {
  return (
    <div>
      <SectionTitle icon={'\u223F'} title="CosmoLingua" subtitle="Langage CosmoASM avec instructions ex\u00e9cutables" />
      <P>
        <span className="opacity-80 font-bold">CosmoLingua</span> est le langage natif de Cosmorare.
        Il s'inspire de l'assembleur mais avec une esth\u00e9tique cosmique : lettres grecques, symboles
        fractals et instructions minimalistes.
      </P>

      <H3>CosmoASM : le jeu d'instructions</H3>
      <P>
        CosmoASM est un langage d'assemblage con\u00e7u pour la machine virtuelle CosmoVM.
        Il est volontairement minimaliste : peu d'instructions, mais chacune est puissante et composable.
      </P>
      <div className="space-y-2 mb-4">
        {[
          ['PUSH \u03A9', 'Empile une valeur sur la pile d\u2019ex\u00e9cution'],
          ['TRANSFER', 'Transf\u00e8re des Warps d\u2019un compte \u00e0 un autre'],
          ['CERTIFY', 'Cr\u00e9e un certificat CRCERT pour un objet rare'],
          ['VERIFY', 'V\u00e9rifie la validit\u00e9 d\u2019un certificat CRCERT'],
          ['HASH', 'Calcule l\u2019empreinte SHA-256 d\u2019une donn\u00e9e'],
          ['SIGN', 'Signe une donn\u00e9e avec la cl\u00e9 priv\u00e9e Ed25519'],
          ['COMPRESS', 'Compresse un SVG via les 7 couches CosmoCode'],
          ['BEACON', 'Ancre une transaction dans le prochain Beacon Block'],
        ].map(([inst, desc]) => (
          <div key={inst} className="flex gap-3 p-2 rounded-none bg-current/5">
            <Code>{inst}</Code>
            <p className="text-body-sm opacity-50">{desc}</p>
          </div>
        ))}
      </div>

      <H3>Preuve de calcul (Proof of Computation)</H3>
      <P>
        Le minage sur Cosmorare fonctionne par <span className="opacity-80">preuve de calcul</span> :
        au lieu de gaspiller de l'\u00e9nergie \u00e0 r\u00e9soudre des puzzles arbitraires (comme le Bitcoin),
        les mineurs ex\u00e9cutent du code CosmoASM utile. Chaque calcul valid\u00e9 contribue au fonctionnement
        du r\u00e9seau et r\u00e9compense le mineur en Warps (\u03A9).
      </P>

      <H3>Identit\u00e9 symbolique</H3>
      <P>
        CosmoLingua donne \u00e0 Cosmorare une identit\u00e9 culturelle unique. Les symboles grecs (\u03A9 pour Warp,
        \u03c6 pour le ratio d'or, \u03c8 pour la fonction d'onde) ne sont pas d\u00e9coratifs : ils ont une
        signification math\u00e9matique pr\u00e9cise dans le protocole.
      </P>
    </div>
  );
}

// ─── Tokenomics ─────────────────────────────────────────

function TokenomicsSection() {
  return (
    <div>
      <SectionTitle icon={'\u269B'} title="Tokenomics" subtitle="Le Warp (\u03A9) : token natif \u00e0 offre fixe" />
      <P>
        Le <span className="opacity-80 font-bold">Warp (\u03A9)</span> est le token natif de Cosmorare.
        Son offre est fix\u00e9e \u00e0 <span className="opacity-80 font-bold">69 millions</span> d'unit\u00e9s,
        pour toujours. Aucun Warp suppl\u00e9mentaire ne sera jamais cr\u00e9\u00e9.
      </P>

      <H3>Distribution</H3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <Stat label="Offre totale" value="69M \u03A9" />
        <Stat label="Minage" value="60%" />
        <Stat label="Fondation" value="20%" />
        <Stat label="Communaut\u00e9" value="20%" />
      </div>

      <H3>D\u00e9croissance R\u00e9sonante</H3>
      <P>
        Au lieu du "halving" brutal du Bitcoin (r\u00e9compense divis\u00e9e par 2 tous les 4 ans), Cosmorare
        utilise une <span className="opacity-80 font-bold">D\u00e9croissance R\u00e9sonante</span> bas\u00e9e sur le
        nombre d'or (\u03c6 = 1.618). La r\u00e9compense diminue de mani\u00e8re douce et harmonieuse, suivant
        une courbe naturelle inspir\u00e9e des spirales de la nature (coquillages, tournesols, galaxies).
      </P>
      <P>
        Concr\u00e8tement, cela signifie que les premiers mineurs sont r\u00e9compens\u00e9s g\u00e9n\u00e9reusement, mais que
        la r\u00e9compense ne s'effondre jamais brutalement. La transition est fluide et pr\u00e9visible.
      </P>

      <H3>Z\u00e9ro frais \u2014 Toujours</H3>
      <P>
        Envoyer des Warps, certifier un objet, v\u00e9rifier un certificat : tout est gratuit, toujours.
        Les frais de transaction sont de <span className="opacity-80 font-bold">0 \u03A9</span>.
        Le r\u00e9seau se finance par la r\u00e9compense de minage, pas par les frais des utilisateurs.
      </P>

      <H3>Cas d'usage du Warp (\u03A9)</H3>
      <div className="space-y-2 mb-4">
        {[
          ['\u2B21', 'Certification', 'Payer pour ancrer un CRCERT dans le r\u00e9seau (co\u00fbt : 0 \u03A9)'],
          ['\u{1F4B8}', 'Transactions', 'Envoyer et recevoir des Warps entre utilisateurs'],
          ['\u{1F3AA}', 'Marketplace (Warts)', 'Acheter et vendre des objets rares certifi\u00e9s'],
          ['\u{1F5E3}', 'Mur', 'Acc\u00e9der au r\u00e9seau social d\u00e9centralis\u00e9 chiffr\u00e9'],
          ['\u2605', 'Hi\u00e9rarchie', 'Monter dans les niveaux pour d\u00e9bloquer des multiplicateurs'],
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
    </div>
  );
}

// ─── Hi\u00e9rarchie ──────────────────────────────────────────

function HierarchySection() {
  return (
    <div>
      <SectionTitle icon={'\u2605'} title="Hi\u00e9rarchie" subtitle="7 niveaux avec multiplicateurs de r\u00e9compenses" />
      <P>
        Cosmorare r\u00e9compense l'engagement avec un syst\u00e8me de <span className="opacity-80 font-bold">7 niveaux</span>.
        Plus vous utilisez la plateforme (certifications, \u00e9changes, participation au minage), plus vous
        montez dans la hi\u00e9rarchie, et plus vos r\u00e9compenses sont amplifi\u00e9es.
      </P>

      <H3>Les 7 niveaux</H3>
      <div className="space-y-2 mb-4">
        {[
          ['Particle', '\u00d71.0', 'Niveau de d\u00e9part. Acc\u00e8s complet \u00e0 toutes les fonctionnalit\u00e9s de base.'],
          ['Wave', '\u00d71.2', 'Premi\u00e8res certifications. Bonus de 20% sur les r\u00e9compenses de minage.'],
          ['Star', '\u00d71.5', 'Utilisateur actif. Acc\u00e8s aux fonctionnalit\u00e9s avanc\u00e9es du Mur.'],
          ['Nebula', '\u00d72.0', 'Certifieur reconnu. Double r\u00e9compense sur les certifications.'],
          ['Galaxy', '\u00d73.0', 'Expert. Droit de vote sur les \u00e9volutions du protocole.'],
          ['Cosmos', '\u00d75.0', '\u00c9lite. Acc\u00e8s au programme b\u00eata et aux fonctionnalit\u00e9s exp\u00e9rimentales.'],
          ['Lumina', '\u00d77.0', 'Gardien du r\u00e9seau. Multiplicateur maximal et privil\u00e8ges de gouvernance.'],
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
        La progression est bas\u00e9e sur l'activit\u00e9 r\u00e9elle : nombre de certifications cr\u00e9\u00e9es, transactions
        effectu\u00e9es, participation au minage, contributions \u00e0 la communaut\u00e9. Il n'est pas possible d'acheter
        un niveau sup\u00e9rieur. Seule l'utilisation r\u00e9elle de la plateforme compte.
      </P>

      <H3>R\u00e9compenses de s\u00e9rie (Streak)</H3>
      <P>
        Utilisez Cosmorare plusieurs jours cons\u00e9cutifs et vos r\u00e9compenses augmentent. Apr\u00e8s 7 jours
        cons\u00e9cutifs, vous recevez un bonus sp\u00e9cial. Ce syst\u00e8me encourage l'utilisation r\u00e9guli\u00e8re
        sans p\u00e9naliser les absences.
      </P>
    </div>
  );
}

// ─── S\u00e9curit\u00e9 ────────────────────────────────────────────

function SecuritySection() {
  return (
    <div>
      <SectionTitle icon={'\u26A1'} title="S\u00e9curit\u00e9" subtitle="Protection multicouche du protocole" />
      <P>
        La s\u00e9curit\u00e9 est au c\u0153ur de Cosmorare. Certifier des objets rares exige un niveau de confiance
        \u00e9lev\u00e9. Voici comment le protocole prot\u00e8ge vos donn\u00e9es et vos certificats.
      </P>

      <H3>Chiffrement de bout en bout</H3>
      <P>
        Toutes les communications sur le <span className="opacity-80 font-bold">Mur</span> (r\u00e9seau social
        d\u00e9centralis\u00e9) sont chiffr\u00e9es avec AES-GCM. Vos cl\u00e9s priv\u00e9es ne quittent jamais votre appareil.
        M\u00eame les administrateurs de Cosmorare ne peuvent pas lire vos messages.
      </P>

      <H3>Infalsifiabilit\u00e9 des certificats</H3>
      <P>
        Un certificat CRCERT est math\u00e9matiquement infalsifiable gr\u00e2ce \u00e0 la combinaison de SHA-256
        (empreinte) et Ed25519 (signature). Modifier un seul octet invalide le certificat.
        V\u00e9rifier un certificat est instantan\u00e9 et ne n\u00e9cessite aucune autorit\u00e9 centrale.
      </P>

      <H3>Mode hors ligne (PWA)</H3>
      <P>
        Cosmorare fonctionne comme une <span className="opacity-80 font-bold">Progressive Web App (PWA)</span> avec
        un Service Worker. Vous pouvez consulter vos certificats, v\u00e9rifier des objets et pr\u00e9parer des
        transactions m\u00eame <span className="opacity-80">sans connexion internet</span>. Les transactions
        sont synchronis\u00e9es automatiquement d\u00e8s que la connexion revient.
      </P>

      <H3>Paiement int\u00e9gr\u00e9</H3>
      <P>
        La passerelle de paiement fiat est int\u00e9gr\u00e9e directement dans l'application. Vous pouvez
        acheter des Warps (\u03A9) par carte bancaire, PayPal, SEPA, Apple Pay ou Google Pay.
        Aucun \u00e9change tiers n\u00e9cessaire.
      </P>

      <H3>Protection des cl\u00e9s</H3>
      <div className="space-y-2 mb-4">
        {[
          ['Cl\u00e9 priv\u00e9e', 'Jamais transmise. Stock\u00e9e localement, chiffr\u00e9e avec votre mot de passe.'],
          ['Cl\u00e9 publique', 'Votre identit\u00e9 sur le r\u00e9seau. Partageable librement.'],
          ['Seed phrase', '12 mots pour r\u00e9cup\u00e9rer votre compte. \u00c0 conserver hors ligne.'],
          ['Biom\u00e9trie', 'D\u00e9verrouillage par empreinte digitale ou reconnaissance faciale (optionnel).'],
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
      <SectionTitle icon={'\u2604'} title="Feuille de route" subtitle="\u00c9volution pr\u00e9vue du protocole Cosmorare" />
      <P>
        Cosmorare est un projet vivant qui \u00e9volue continuellement. Voici les grandes \u00e9tapes de
        d\u00e9veloppement pr\u00e9vues.
      </P>

      <div className="space-y-4 mb-4">
        {[
          ['Phase 1 \u2014 Gen\u00e8se', 'T1 2026', [
            'Lancement du r\u00e9seau CosmoMesh avec les 7 shards',
            'Premiers certificats CRCERT pour cartes Pok\u00e9mon et sneakers',
            'Application PWA avec mode hors ligne',
            'Passerelle de paiement fiat (carte, PayPal)',
          ]],
          ['Phase 2 \u2014 Expansion', 'T2 2026', [
            'Ouverture de la marketplace Warts (objets rares certifi\u00e9s)',
            'Lancement du Mur (r\u00e9seau social d\u00e9centralis\u00e9 chiffr\u00e9)',
            'Support des vinyles, montres et art num\u00e9rique',
            'Int\u00e9gration SEPA, Apple Pay et Google Pay',
          ]],
          ['Phase 3 \u2014 Maturit\u00e9', 'T3-T4 2026', [
            'SDK d\u00e9veloppeur ouvert (CosmoSDK)',
            'Gouvernance d\u00e9centralis\u00e9e (votes par les niveaux Galaxy+)',
            'Partenariats avec des maisons de vente aux ench\u00e8res',
            'Application mobile native (iOS et Android)',
          ]],
          ['Phase 4 \u2014 Cosmos', '2027+', [
            'Interop\u00e9rabilit\u00e9 avec d\u2019autres protocoles de certification',
            'Certification d\u2019objets physiques via NFC et QR codes',
            'Intelligence artificielle pour la d\u00e9tection de contrefa\u00e7ons',
            '\u00c9cosyst\u00e8me d\u2019applications tierces sur CosmoASM',
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
        Cosmorare est plus qu'un protocole : c'est une communaut\u00e9 de passionn\u00e9s d'objets rares qui
        croient en la transparence et l'authenticit\u00e9. Que vous soyez collectionneur de cartes Pok\u00e9mon,
        amateur de sneakers, passionn\u00e9 de vinyles ou fan d'art num\u00e9rique, Cosmorare est fait pour vous.
      </P>
      <P>
        Chaque objet rare m\u00e9rite un certificat infalsifiable. Chaque collectionneur m\u00e9rite la tranquillit\u00e9
        d'esprit. C'est la promesse de Cosmorare.
      </P>
    </div>
  );
}
