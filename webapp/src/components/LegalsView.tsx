export default function LegalsView() {
  return (
    <div className="space-y-4 pb-4">
      <div className="glass-panel p-5 sm:p-6">
        <h2 className="text-title-md font-bold opacity-100 font-title mb-4">Mentions légales & CGU</h2>

        <div className="space-y-6 text-base opacity-70 leading-relaxed">

          {/* ─── CGU ─────────────────────────────────────── */}
          <section>
            <h3 className="text-base font-bold opacity-90 mb-2">Conditions Générales d'Utilisation (CGU)</h3>
            <div className="space-y-2 text-base opacity-60">
              <p>
                <strong>Article 1 — Objet.</strong> Les présentes CGU régissent l'utilisation de la plateforme Strangrz,
                accessible à l'adresse strangrz.com. En créant un compte ou en utilisant la plateforme, l'utilisateur
                accepte les présentes conditions sans réserve.
              </p>
              <p>
                <strong>Article 2 — Description du service.</strong> Strangrz est une plateforme de certification,
                de publication et de vente d'oeuvres numériques et d'objets certifiés. Chaque oeuvre publiée reçoit
                un certificat d'authenticité numérique (STCERT) infalsifiable. La plateforme permet l'achat, la vente
                et la revente d'oeuvres entre utilisateurs.
              </p>
              <p>
                <strong>Article 3 — Inscription.</strong> L'inscription est gratuite et ne nécessite aucune donnée
                personnelle. L'utilisateur crée un wallet local protégé par mot de passe. L'utilisateur est seul
                responsable de la sécurité de son mot de passe et de ses clés privées. Les clés perdues ne peuvent
                pas être récupérées par la plateforme.
              </p>
              <p>
                <strong>Article 4 — Frais et commissions.</strong> La publication d'oeuvres est gratuite. Des frais
                plateforme sont facturés à l'acheteur en sus du prix affiché : 10% sur le premier marché (première
                vente d'une oeuvre) et 5% sur le second marché (reventes). Le vendeur reçoit 100% du prix qu'il a fixé.
                Les royalties du créateur original (5% par défaut, configurable de 0% à 50% à la publication) sont
                prélevées sur le montant reçu par le vendeur lors des reventes.
              </p>
              <p>
                <strong>Article 5 — Paiement.</strong> Les paiements sont traités par Stripe (carte bancaire,
                Apple Pay, Google Pay, PayPal, virement SEPA). Tous les prix sont affichés en euros. Le vendeur
                peut recevoir ses paiements en euros via Stripe Connect après vérification d'identité.
              </p>
              <p>
                <strong>Article 6 — Livraison d'objets physiques.</strong> Strangrz est une plateforme numérique.
                La plateforme ne prend pas en charge la livraison, l'expédition ou la logistique des objets physiques.
                Pour les objets physiques certifiés (sneakers, vinyles, montres, cartes de collection), la plateforme
                fournit uniquement le certificat d'authenticité numérique (STCERT) et facilite la transaction de vente.
                L'expédition, la livraison et la gestion des objets physiques sont entièrement à la charge du vendeur
                et de l'acheteur, qui doivent s'organiser entre eux. Strangrz ne peut être tenu responsable de tout
                problème lié à l'expédition, la perte, les dommages ou la non-livraison d'objets physiques.
              </p>
              <p>
                <strong>Article 7 — Propriété intellectuelle.</strong> Le logiciel Strangrz, le protocole StrangrzMesh
                et la documentation associée sont la propriété intellectuelle de la Strangrz Foundation. Le contenu
                généré par les utilisateurs (posts, oeuvres, messages) reste la propriété de leurs créateurs. En
                publiant du contenu, l'utilisateur accorde aux autres utilisateurs le droit de visualiser et
                d'interagir avec ce contenu sur le réseau Strangrz.
              </p>
              <p>
                <strong>Article 8 — Tokens et actifs numériques.</strong> Les tokens Strangrz ({'\u2B23'}) et les actifs
                numériques sont des jetons cryptographiques expérimentaux. Leur valeur n'est pas garantie et peut
                fluctuer. La Strangrz Foundation ne fait aucune promesse concernant la valeur monétaire de ces actifs.
                Les tokens Strangrz sont des tokens de récompense et d'utilité, et ne constituent pas un instrument
                financier au sens de la réglementation applicable.
              </p>
              <p>
                <strong>Article 9 — Responsabilité.</strong> Strangrz est fourni « tel quel » sans garantie d'aucune
                sorte. La Strangrz Foundation n'est pas responsable de toute perte de fonds, de données ou d'actifs
                numériques pouvant survenir lors de l'utilisation de cette plateforme. L'utilisateur doit sauvegarder
                ses identifiants de wallet. Les clés privées perdues ne peuvent pas être récupérées.
              </p>
              <p>
                <strong>Article 10 — Droit de rétractation.</strong> Conformément à l'article L221-28 du Code de la
                consommation, le droit de rétractation ne s'applique pas à la fourniture de contenu numérique non
                fourni sur un support matériel dont l'exécution a commencé avec l'accord du consommateur. Toute vente
                d'oeuvre numérique sur Strangrz est définitive et non remboursable.
              </p>
              <p>
                <strong>Article 11 — Loi applicable.</strong> Strangrz fonctionne comme une application décentralisée.
                Les utilisateurs sont responsables du respect des lois et réglementations de leur juridiction concernant
                l'utilisation de crypto-monnaies et d'applications décentralisées.
              </p>
            </div>
          </section>

          {/* ─── CGV ─────────────────────────────────────── */}
          <section>
            <h3 className="text-base font-bold opacity-90 mb-2">Conditions Générales de Vente (CGV)</h3>
            <div className="space-y-2 text-base opacity-60">
              <p>
                <strong>Objet.</strong> Les présentes CGV régissent les transactions de vente d'oeuvres numériques
                et d'objets certifiés entre utilisateurs sur la plateforme Strangrz.
              </p>
              <p>
                <strong>Prix.</strong> Tous les prix sont affichés en euros (EUR). Le prix minimum d'une oeuvre est
                de 10€. Le vendeur fixe librement son prix. Des frais plateforme sont ajoutés pour l'acheteur :
                10% sur le premier marché (première vente) et 5% sur le second marché (reventes).
              </p>
              <p>
                <strong>Paiement.</strong> Le paiement est effectué en ligne via le prestataire Stripe. Les moyens
                de paiement acceptés sont : carte bancaire (Visa, Mastercard), Apple Pay, Google Pay, PayPal et
                virement SEPA. Le paiement est débité au moment de la confirmation d'achat.
              </p>
              <p>
                <strong>Livraison numérique.</strong> L'oeuvre numérique et son certificat d'authenticité (STCERT) sont
                transférés instantanément au wallet de l'acheteur après confirmation du paiement. Aucun délai de
                livraison ne s'applique aux oeuvres numériques.
              </p>
              <p>
                <strong>Objets physiques.</strong> La plateforme ne gère pas la livraison des objets physiques. Le
                vendeur et l'acheteur sont responsables de l'organisation de la livraison. La plateforme fournit
                uniquement la certification numérique et le traitement du paiement.
              </p>
              <p>
                <strong>Royalties.</strong> Sur chaque revente d'une oeuvre, le créateur original reçoit automatiquement
                un pourcentage du prix de vente (5% par défaut, configurable entre 0% et 50% au moment de la création).
                Ce montant est déduit du montant reçu par le vendeur.
              </p>
              <p>
                <strong>Remboursement.</strong> Les ventes d'oeuvres numériques sont définitives et non remboursables
                (article L221-28 du Code de la consommation). En cas de fraude avérée ou de non-conformité de l'oeuvre,
                l'acheteur peut contacter le support pour examen de la situation.
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
