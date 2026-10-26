import { supabase } from "../../../lib/supabaseClient";

import { T } from "../../components/AppProvider";
import NuovoBadge from "../../components/NuovoBadge";
import Testo from "../../components/Testo";
import { AdminPostoRiga, AdminNuovoPosto } from "../../components/AdminPosto";

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
        <a href="/info" className="btn btn-light">
          <T k="i.back" />
        </a>
      </p>
      <h1>
        <T k="i.food" />
      </h1>

      <AdminNuovoPosto categoria="food_drink" gruppi={[]} conGruppo={false} etichetta="Aggiungi un nuovo posto Food & Drink" />

      <div style={{ display: "grid", gap: "1rem" }}>
        {(posti || []).map((p) => (
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
            <Testo en={p.perche} it={p.perche_it} style={{ margin: "0.25rem 0" }} />
            {p.indirizzo && (
              <p className="muted" style={{ margin: "0.25rem 0", fontSize: "0.9em" }}>
                {p.indirizzo}
              </p>
            )}
            <AdminPostoRiga posto={p} />
          </div>
        ))}
      </div>
    </main>
  );
}
