import { supabase } from "../../lib/supabaseClient";
import NuovaRichiestaForm from "./NuovaRichiestaForm";
import StatoButtons from "./StatoButtons";

export const dynamic = "force-dynamic";

const ETICHETTE_STATO = {
  nuova: "nuova",
  "in gestione": "in gestione",
  confermata: "confermata",
  completata: "completata",
};

function classeBadge(stato) {
  return "badge badge-" + stato.replace(" ", "-");
}

export default async function RichiestePage() {
  const { data: richieste } = await supabase
    .from("richieste")
    .select("*, alloggi(nome), famiglie(nome)")
    .order("data", { ascending: true });

  const { data: alloggi } = await supabase.from("alloggi").select("*");
  const { data: famiglie } = await supabase.from("famiglie").select("*");

  const gruppi = {
    nuova: [],
    "in gestione": [],
    confermata: [],
    completata: [],
  };
  (richieste || []).forEach((r) => {
    const key = gruppi[r.stato] ? r.stato : "nuova";
    gruppi[key].push(r);
  });

  return (
    <main>
      <p>
        <a href="/">&larr; Home</a>
      </p>
      <h1>Richieste</h1>

      <p>
        <a href="/pulizie/admin">Vai a Pulizie (gestione) &rarr;</a>
      </p>

      <div className="card" style={{ marginBottom: "2rem" }}>
        <h2>Nuova richiesta</h2>
        <NuovaRichiestaForm alloggi={alloggi} />
      </div>

      {Object.entries(gruppi).map(([stato, items]) => (
        <section key={stato} style={{ marginBottom: "1.75rem" }}>
          <h2>
            {ETICHETTE_STATO[stato]}{" "}
            <span className="muted" style={{ fontWeight: 400 }}>
              ({items.length})
            </span>
          </h2>

          {items.length === 0 && <p className="muted">Nessuna richiesta.</p>}

          {items.length > 0 && (
            <div className="card">
              {items.map((r) => (
                <div key={r.id} className="richiesta-item">
                  <span className={classeBadge(r.stato)}>{r.tipo}</span>{" "}
                  <strong>{r.alloggi?.nome}</strong> &mdash; {r.famiglie?.nome}
                  <p className="descrizione">
                    {r.data} {r.ora} &mdash;{" "}
                    {r.sotto_tipo ? `${r.sotto_tipo} — ` : ""}
                    {r.descrizione}
                    {r.note ? ` (${r.note})` : ""}
                  </p>
                  <div className="stato-actions">
                    <StatoButtons id={r.id} statoAttuale={r.stato} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </main>
  );
}
