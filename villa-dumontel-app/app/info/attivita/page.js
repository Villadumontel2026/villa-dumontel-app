import { supabase } from "../../../lib/supabaseClient";
import PrenotaButton from "../../components/PrenotaButton";

import { T } from "../../components/AppProvider";
import NuovoBadge from "../../components/NuovoBadge";

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
        <a href="/info">
          <T k="i.back" />
        </a>
      </p>
      <h1>
        <T k="i.att" />
      </h1>

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
              <NuovoBadge dal={p.nuovo_dal} />
            </h3>
            {p.perche && <p style={{ margin: "0.25rem 0" }}>{p.perche}</p>}
            <PrenotaButton tipo="attivita" nome={p.nome} />
          </div>
        ))}
      </div>
    </main>
  );
}
