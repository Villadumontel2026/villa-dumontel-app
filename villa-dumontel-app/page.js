import { supabase } from "../../../lib/supabaseClient";

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
        <a href="/info">&larr; Informazioni</a>
      </p>
      <h1>Ristoranti</h1>

      {ordineFinale.map((gruppo) => (
        <section key={gruppo} style={{ marginBottom: "1.75rem" }}>
          <h2>{gruppo}</h2>
          <div style={{ display: "grid", gap: "1rem" }}>
            {gruppi[gruppo].map((p) => (
              <div key={p.id} className="card">
                <h3 style={{ marginBottom: "0.25rem" }}>
                  {p.sito_web ? (
                    <a href={p.sito_web} target="_blank" rel="noreferrer">
                      {p.nome}
                    </a>
                  ) : (
                    p.nome
                  )}
                </h3>
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
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
