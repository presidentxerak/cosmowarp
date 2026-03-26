export default function PrivacyView() {
  return (
    <div className="space-y-4 pb-4">
      <div className="glass-panel p-5 sm:p-6">
        <h2 className="text-title-md font-bold opacity-100 font-title mb-1">Politique de confidentialité</h2>
        <p className="text-base opacity-60 mb-4">Comment Strangrz protège vos données</p>

        <div className="space-y-6 text-base opacity-70 leading-relaxed">
          <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="opacity-80">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <h3 className="text-base font-bold opacity-80">Privacy by Design</h3>
            </div>
            <p className="text-base opacity-60">
              Strangrz est conçu avec la confidentialité comme principe fondamental. Nous ne collectons,
              ne stockons et ne transmettons aucune donnée personnelle. Toutes les données du wallet sont
              stockées localement sur votre appareil.
            </p>
          </div>

          <section>
            <h3 className="text-base font-bold opacity-90 mb-2">Données que nous ne collectons pas</h3>
            <ul className="space-y-1.5 text-base opacity-60">
              <li className="flex items-start gap-2">
                <span className="opacity-80 mt-0.5">{'\u2713'}</span>
                Aucune donnée d'identification personnelle
              </li>
              <li className="flex items-start gap-2">
                <span className="opacity-80 mt-0.5">{'\u2713'}</span>
                Aucune adresse email ou numéro de téléphone
              </li>
              <li className="flex items-start gap-2">
                <span className="opacity-80 mt-0.5">{'\u2713'}</span>
                Aucun suivi de localisation ou d'adresse IP
              </li>
              <li className="flex items-start gap-2">
                <span className="opacity-80 mt-0.5">{'\u2713'}</span>
                Aucun cookie tiers ni analytique
              </li>
              <li className="flex items-start gap-2">
                <span className="opacity-80 mt-0.5">{'\u2713'}</span>
                Aucun accès à votre wallet ou vos clés privées
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-bold opacity-80 mb-2">Chiffrement</h3>
            <div className="space-y-2 text-base opacity-60">
              <p>
                Toutes les communications sur Strangrz sont chiffrées. Les messages directs utilisent le
                chiffrement de bout en bout (AES-256-GCM), garantissant que seuls l'expéditeur et le destinataire
                peuvent lire le contenu.
              </p>
              <p>
                Les identifiants du wallet sont chiffrés à l'aide de signatures cryptographiques Ed25519.
                Vos clés privées ne quittent jamais votre appareil et ne sont jamais transmises sur le réseau.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-base font-bold opacity-80 mb-2">Pseudonymat</h3>
            <div className="space-y-2 text-base opacity-60">
              <p>
                Strangrz utilise des identités pseudonymisées via StrangrzID. Votre identité sur le réseau est
                représentée par une adresse cryptographique, pas par des informations personnelles.
              </p>
              <p>
                Les publications sur le Mur, les transactions et toute l'activité réseau sont associées à votre
                adresse StrangrzID, préservant votre anonymat.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-base font-bold opacity-90 mb-2">Stockage local</h3>
            <p className="text-base opacity-60">
              Strangrz stocke les données dans le localStorage de votre navigateur. Ces données ne quittent
              jamais votre appareil sauf si vous choisissez de les exporter. Vous pouvez effacer toutes les
              données à tout moment via les paramètres du navigateur ou la page Paramètres.
            </p>
          </section>

          <section>
            <h3 className="text-base font-bold opacity-80 mb-2">Paiements et données Stripe</h3>
            <div className="space-y-2 text-base opacity-60">
              <p>
                Les paiements par carte bancaire sont traités par Stripe. Strangrz ne stocke jamais vos
                informations de carte. Lors d'un paiement, vous êtes redirigé vers l'interface sécurisée de
                Stripe. Seul un identifiant de transaction est conservé pour le suivi de commande.
              </p>
              <p>
                Pour les vendeurs utilisant Stripe Connect, la vérification d'identité (KYC) est gérée
                directement par Stripe. Strangrz n'a pas accès à ces données.
              </p>
            </div>
          </section>

          {/* ─── RGPD ─────────────────────────────────────── */}
          <section>
            <h3 className="text-base font-bold opacity-90 mb-2">Conformité RGPD (Règlement Général sur la Protection des Données)</h3>
            <div className="space-y-2 text-base opacity-60">
              <p>
                Strangrz est conforme au RGPD (UE 2016/679) par conception. Étant donné que la plateforme
                ne collecte aucune donnée personnelle identifiable, la plupart des obligations du RGPD ne
                s'appliquent pas directement. Néanmoins, nous garantissons les droits suivants :
              </p>
              <ul className="space-y-1.5 ml-4">
                <li className="flex items-start gap-2">
                  <span className="opacity-80 mt-0.5">&bull;</span>
                  <span><strong>Droit d'accès :</strong> Toutes vos données sont stockées localement sur votre appareil.
                  Vous y avez un accès direct et permanent.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="opacity-80 mt-0.5">&bull;</span>
                  <span><strong>Droit de rectification :</strong> Vous pouvez modifier votre pseudonyme et votre profil
                  à tout moment dans les Paramètres.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="opacity-80 mt-0.5">&bull;</span>
                  <span><strong>Droit à l'effacement :</strong> Vous pouvez supprimer l'intégralité de votre compte
                  et de vos données locales via Paramètres → Supprimer le profil.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="opacity-80 mt-0.5">&bull;</span>
                  <span><strong>Droit à la portabilité :</strong> Vous pouvez exporter vos données (Recovery Kit,
                  export wallet) dans un format standard.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="opacity-80 mt-0.5">&bull;</span>
                  <span><strong>Minimisation des données :</strong> Aucune donnée personnelle n'est collectée
                  au-delà de ce qui est strictement nécessaire au fonctionnement du service.</span>
                </li>
              </ul>
              <p>
                Si vous utilisez Stripe pour les paiements, les données de paiement sont traitées par Stripe
                en tant que sous-traitant conforme RGPD. Consultez la politique de confidentialité de Stripe
                pour plus de détails.
              </p>
              <p>
                Si vos données sont synchronisées avec Supabase (cloud backup), les serveurs sont hébergés
                dans l'Union Européenne. Les données sont chiffrées en transit (TLS) et au repos.
              </p>
            </div>
          </section>

          <div className="text-base opacity-50 pt-2 border-t border-current/10">
            Dernière mise à jour : mars 2026 &middot; Strangrz Foundation
          </div>
        </div>
      </div>
    </div>
  );
}
