import { supabase } from "../../../lib/supabaseClient";
import PrenotaButton from "../../components/PrenotaButton";

import { T } from "../../components/AppProvider";
import NuovoBadge from "../../components/NuovoBadge";
import { AdminPostoRiga, AdminNuovoPosto } from "../../components/AdminPosto";

export const dynamic = "force-dynamic";

const ORDINE_GRUPPI = ["Entrèves", "Courmayeur", "Aosta Valley", "Michelin", "Abroad"];

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
      <h1>
        <T k="i.rist" />
      </h1>

      <AdminNuovoPosto categoria="ristorante" gruppi={ordineFinale} conGruppo={true} etichetta="Aggiungi un nuovo ristorante" />

      {ordineFinale.map((gruppo) => (
        <section key={gruppo} style={{ marginBottom: "1.75rem" }}>
          <h2>{gruppo}</h2>
          <div style={{ display: "grid", gap: "1rem" }}>
            {gruppi[gruppo].map((p) => (
              <div key={p.id} className="card">
                <h3 style={{ marginBottom: "0.25rem" }}>
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
                {p.perche && <p style={{ margin: "0.25rem 0" }}>{p.perche}</p>}
                {p.quando && (
                  <p className="muted" style={{ margin: "0.25rem 0" }}>
                    {p.quando}
                  </p>
                )}
                {p.indirizzo && (
                  <p className="muted" style={{ margin: "0.25rem 0", fontSize: "0.9em" }}>
                    {p.indirizzo}
                  </p>
                )}
                <PrenotaButton tipo="ristorante" nome={p.nome} />
                <AdminPostoRiga posto={p} gruppi={ordineFinale} conGruppo />
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
