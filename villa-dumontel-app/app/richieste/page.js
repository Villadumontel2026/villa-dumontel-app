import { supabase } from "../../lib/supabaseClient";
import { creaRichiesta } from "./actions";
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

      <div className="card" style={{ marginBottom: "2rem" }}>
        <h2>Nuova richiesta</h2>
        <form action={creaRichiesta}>
          <label>
            Tipo
            <select name="tipo" required>
              <option value="trasporto">Trasporto</option>
              <option value="ristorante">Ristorante</option>
              <option value="attivita">Attivit&agrave;</option>
              <option value="pulizie">Pulizie</option>
            </select>
          </label>
          <label>
            Alloggio
            <select name="alloggio_id" required>
              {alloggi?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Famiglia
            <select name="famiglia_id" required>
              {famiglie?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Data
            <input type="date" name="data" />
          </label>
          <label>
            Ora
            <input type="time" name="ora" />
          </label>
          <label>
            Numero persone
            <input type="number" name="pax" />
          </label>
          <label>
            Descrizione
            <input
              type="text"
              name="descrizione"
              placeholder="es. nome del ristorante"
            />
          </label>
          <label>
            Note
            <textarea name="note"></textarea>
          </label>
          <button type="submit" className="btn">
            Aggiungi richiesta
          </button>
        </form>
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
                    {r.data} {r.ora} &mdash; {r.descrizione}
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
