import { supabase } from "../../lib/supabaseClient";
import { creaRichiesta } from "./actions";
import StatoButtons from "./StatoButtons";

export const dynamic = "force-dynamic";

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
      <p><a href="/">&larr; Home</a></p>
      <h1>Richieste</h1>

      <form
        action={creaRichiesta}
        style={{
          marginBottom: "2rem",
          display: "grid",
          gap: "0.5rem",
          maxWidth: 420,
          border: "1px solid #ddd",
          padding: "1rem",
          borderRadius: 8,
        }}
      >
        <label>
          Tipo
          <select name="tipo" required style={{ width: "100%" }}>
            <option value="trasporto">Trasporto</option>
            <option value="ristorante">Ristorante</option>
            <option value="attivita">Attivit&agrave;</option>
            <option value="pulizie">Pulizie</option>
          </select>
        </label>
        <label>
          Alloggio
          <select name="alloggio_id" required style={{ width: "100%" }}>
            {alloggi?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        </label>
        <label>
          Famiglia
          <select name="famiglia_id" required style={{ width: "100%" }}>
            {famiglie?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </label>
        <label>
          Data
          <input type="date" name="data" style={{ width: "100%" }} />
        </label>
        <label>
          Ora
          <input type="time" name="ora" style={{ width: "100%" }} />
        </label>
        <label>
          Numero persone
          <input type="number" name="pax" style={{ width: "100%" }} />
        </label>
        <label>
          Descrizione
          <input
            type="text"
            name="descrizione"
            placeholder="es. nome del ristorante"
            style={{ width: "100%" }}
          />
        </label>
        <label>
          Note
          <textarea name="note" style={{ width: "100%" }}></textarea>
        </label>
        <button type="submit">Aggiungi richiesta</button>
      </form>

      {Object.entries(gruppi).map(([stato, items]) => (
        <section key={stato} style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ textTransform: "capitalize" }}>
            {stato} ({items.length})
          </h2>
          {items.length === 0 && <p>Nessuna richiesta.</p>}
          <ul>
            {items.map((r) => (
              <li key={r.id} style={{ marginBottom: "0.5rem" }}>
                <strong>{r.tipo}</strong> &mdash; {r.alloggi?.nome} &mdash;{" "}
                {r.famiglie?.nome} &mdash; {r.data} {r.ora} &mdash;{" "}
                {r.descrizione} {r.note ? `(${r.note})` : ""}
                <StatoButtons id={r.id} statoAttuale={r.stato} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
