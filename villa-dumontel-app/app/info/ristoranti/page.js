import { supabase } from "../../../lib/supabaseClient";
import PrenotaButton from "../../components/PrenotaButton";

import { T } from "../../components/AppProvider";
import NuovoBadge from "../../components/NuovoBadge";
import GruppoTitolo from "../../components/GruppoTitolo";
import { slugGruppo } from "../../../lib/zone";
import ZonaDetails from "../../components/ZonaDetails";
import { PostoMatita, PostoPiu } from "../../components/AdminPosto";
import Testo from "../../components/Testo";

export const dynamic = "force-dynamic";

const ORDINE_GRUPPI = ["Entrèves", "Val Ferret", "Courmayeur", "On the slopes", "Valdigne", "Aosta area", "Chamonix", "Elsewhere"];

export default async function RistorantiPage() {
  const { data: posti } = await supabase
    .from("posti")
    .select("*")
    .eq("categoria", "ristorante")
    .order("id", { ascending: true });

  const gruppi = {};
  (posti || []).forEach((p) => {
    const key = p.sotto_categoria || "Altro";
    if (!gruppi[key]) gruppi[key] = [];
    gruppi[key].push(p);
  });

  const ordineFinale = [
    ...ORDINE_GRUPPI.filter((g) => gruppi[g]),
    ...Object.keys(gruppi).filter((g) => !ORDINE_GRUPPI.includes(g)),
  ];

  return (
    <main>
      <p>
        <a href="/info" className="btn btn-light">
          <T k="i.back" />
        </a>
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>
          <T k="i.rist" />
        </h1>
        <PostoPiu categoria="ristorante" gruppi={ordineFinale} conGruppo={true} etichetta="Aggiungi un ristorante" />
      </div>

      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", margin: "1rem 0 1.25rem" }}>
        {ordineFinale.map((gruppo) => (
          <a key={gruppo} href={"#" + slugGruppo(gruppo)} className="btn btn-light" style={{ padding: "0.3rem 0.85rem", fontSize: "0.9rem" }}>
            <GruppoTitolo nome={gruppo} breve /> ({gruppi[gruppo].length})
          </a>
        ))}
      </div>

      {ordineFinale.map((gruppo) => (
        <ZonaDetails key={gruppo} id={slugGruppo(gruppo)} titolo={<GruppoTitolo nome={gruppo} />} conteggio={gruppi[gruppo].length}>
          <div style={{ display: "grid", gap: "1rem" }}>
            {gruppi[gruppo].map((p) => (
              <div key={p.id} className="card" style={{ position: "relative", boxShadow: "none", border: "1px solid var(--color-border)" }}>
                <h3 style={{ marginBottom: "0.25rem", paddingRight: "2.2rem" }}>
                  {p.nome}
                  <NuovoBadge dal={p.nuovo_dal} />
                </h3>
                {p.sito_web && (
                  <p style={{ margin: "0.25rem 0 0.5rem" }}>
                    <a href={p.sito_web} target="_blank" rel="noreferrer" className="btn btn-light" style={{ padding: "0.3rem 0.8rem" }}>
                      <T k="i.sito" />
                    </a>
                  </p>
                )}
                <Testo en={p.perche} it={p.perche_it} style={{ margin: "0.25rem 0" }} />
                <Testo en={p.quando} it={p.quando_it} className="muted" style={{ margin: "0.25rem 0" }} />
                {p.indirizzo && (
                  <p className="muted" style={{ margin: "0.25rem 0", fontSize: "0.9em" }}>
                    {p.indirizzo}
                  </p>
                )}
                <PrenotaButton tipo="ristorante" nome={p.nome} />
                <PostoMatita posto={p} gruppi={ordineFinale} conGruppo />
              </div>
            ))}
          </div>
        </ZonaDetails>
      ))}
    </main>
  );
}
