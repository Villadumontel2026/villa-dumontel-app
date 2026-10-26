import { supabase } from "../../../lib/supabaseClient";

import { T } from "../../components/AppProvider";
import NuovoBadge from "../../components/NuovoBadge";

export const dynamic = "force-dynamic";

export default async function FoodDrinkPage() {
  const { data: posti } = await supabase
    .from("posti")
    .select("*")
    .eq("categoria", "food_drink")
    .order("id", { ascending: true });

  return (
    <main>
      <p>
        <a href="/info">
          <T k="i.back" />
        </a>
      </p>
      <h1>
        <T k="i.food" />
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
            {p.indirizzo && (
              <p className="muted" style={{ margin: "0.25rem 0", fontSize: "0.9em" }}>
                {p.indirizzo}
              </p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
