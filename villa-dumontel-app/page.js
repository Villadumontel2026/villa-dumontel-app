import { supabase } from "../../../lib/supabaseClient";

export const dynamic = "force-dynamic";

export default async function AttivitaPage() {
  const { data: posti } = await supabase
    .from("posti")
    .select("*")
    .eq("categoria", "attivita")
    .order("id", { ascending: true });

  return (
    <main>
      <p>
        <a href="/info">&larr; Informazioni</a>
      </p>
      <h1>Attività</h1>

      <div style={{ display: "grid", gap: "1rem" }}>
        {(posti || []).map((p) => (
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
          </div>
        ))}
      </div>
    </main>
  );
}
