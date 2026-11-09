import { supabase } from "../../../lib/supabaseClient";
import PrenotaButton from "../../components/PrenotaButton";

import { T } from "../../components/AppProvider";
import NuovoBadge from "../../components/NuovoBadge";
import { PostoMatita, PostoPiu } from "../../components/AdminPosto";
import Testo from "../../components/Testo";

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
        <a href="/info" className="btn btn-light">
          <T k="i.back" />
        </a>
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>
          <T k="i.att" />
        </h1>
        <PostoPiu categoria="attivita" etichetta="Aggiungi un'attività" />
      </div>


      <div style={{ display: "grid", gap: "1rem" }}>
        {(posti || []).map((p) => (
          <div key={p.id} className="card" style={{ position: "relative" }}>
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
            <PrenotaButton tipo="attivita" nome={p.nome} />
            <PostoMatita posto={p} />
          </div>
        ))}
      </div>
    </main>
  );
}
