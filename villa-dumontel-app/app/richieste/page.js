"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import FormRichiesta from "../components/FormRichiesta";
import CalendarButton from "../components/CalendarButton";

const STATI = ["nuova", "in gestione", "confermata", "completata", "annullata"];

function classeBadge(stato) {
  return "badge badge-" + String(stato).replace(" ", "-");
}

export default function RichiestePage() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [richieste, setRichieste] = useState([]);
  const [alloggi, setAlloggi] = useState([]);
  const [posti, setPosti] = useState([]);
  const [collaboratori, setCollaboratori] = useState([]);
  const [errore, setErrore] = useState(null);
  const [generiche, setGeneriche] = useState([]);
  const [famiglie, setFamiglie] = useState([]);

  async function caricaRichieste() {
    const { data } = await supabase
      .from("richieste")
      .select("*, alloggi(nome), famiglie(nome)")
      .order("data", { ascending: true });
    setRichieste(data || []);
  }

  async function caricaGeneriche() {
    const { data } = await supabase
      .from("richieste_generiche")
      .select("*, famiglie(nome)")
      .order("scadenza", { ascending: true, nullsFirst: false });
    setGeneriche(data || []);
  }

  async function aggiungiGenerica(e) {
    e.preventDefault();
    setErrore(null);
    const f = e.target;
    const { error } = await supabase.from("richieste_generiche").insert({
      testo: f.testo.value,
      famiglia_id: f.famiglia_id.value || null,
      scadenza: f.scadenza.value || null,
    });
    if (error) {
      setErrore("Errore: " + error.message);
      return;
    }
    f.reset();
    await caricaGeneriche();
  }

  async function segnaGenerica(id, fatta) {
    const { error } = await supabase
      .from("richieste_generiche")
      .update({ stato: fatta ? "fatta" : "da fare", completata_il: fatta ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) {
      setErrore("Errore: " + error.message);
      return;
    }
    await caricaGeneriche();
  }

  async function eliminaGenerica(id) {
    if (!window.confirm("Eliminare questo promemoria?")) return;
    const { error } = await supabase.from("richieste_generiche").delete().eq("id", id);
    if (error) {
      setErrore("Errore: " + error.message);
      return;
    }
    await caricaGeneriche();
  }

  useEffect(() => {
    async function carica() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setErroreAccesso("Devi accedere per vedere questa pagina.");
        setCaricamento(false);
        return;
      }

      const { data: profilo } = await supabase
        .from("profili")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (!profilo || profilo.ruolo !== "admin") {
        setErroreAccesso("Questa pagina e' riservata all'amministratore.");
        setCaricamento(false);
        return;
      }

      const { data: alloggiData } = await supabase.from("alloggi").select("*");
      setAlloggi(alloggiData || []);
      const { data: postiData } = await supabase
        .from("posti")
        .select("id, nome, categoria, sotto_categoria")
        .in("categoria", ["ristorante", "attivita"])
        .order("id", { ascending: true });
      setPosti(postiData || []);

      const { data: collData } = await supabase.from("collaboratori").select("*");
      setCollaboratori(collData || []);
      await caricaRichieste();
      const { data: famData } = await supabase.from("famiglie").select("id, nome").order("id");
      setFamiglie(famData || []);
      await caricaGeneriche();
      setCaricamento(false);
    }

    carica();
  }, []);

  async function cambiaStato(id, stato) {
    const { error } = await supabase.from("richieste").update({ stato }).eq("id", id);
    if (error) {
      setErrore("Errore: " + error.message);
      return;
    }
    await caricaRichieste();
  }

  async function assegnaCollaboratrice(id, collaboratore_id) {
    const { error } = await supabase
      .from("richieste")
      .update({ collaboratore_id: collaboratore_id || null, convalidata_il: null })
      .eq("id", id);
    if (error) {
      setErrore("Errore: " + error.message);
      return;
    }
    await caricaRichieste();
  }

  async function cambiaDurata(id, durata) {
    const { error } = await supabase
      .from("richieste")
      .update({ durata_ore: durata ? parseFloat(durata) : null })
      .eq("id", id);
    if (error) {
      setErrore("Errore: " + error.message);
      return;
    }
    await caricaRichieste();
  }

  async function salvaModifica(e, r) {
    e.preventDefault();
    setErrore(null);
    const f = e.target;
    const v = (n) => (f[n] && f[n].value !== "" ? f[n].value : null);
    const { error } = await supabase
      .from("richieste")
      .update({
        data: v("data"),
        ora: v("ora"),
        durata_ore: v("durata_ore") ? parseFloat(v("durata_ore")) : null,
        pax: v("pax") ? parseInt(v("pax"), 10) : null,
        sotto_tipo: v("sotto_tipo"),
        descrizione: v("descrizione"),
        note: v("note"),
      })
      .eq("id", r.id);
    if (error) {
      setErrore("Errore: " + error.message);
      return;
    }
    await caricaRichieste();
  }

  async function creaRichiesta(valori) {
    setErrore(null);
    const alloggio = alloggi.find((a) => String(a.id) === String(valori.alloggio_id));
    const { error } = await supabase.from("richieste").insert({
      ...valori,
      famiglia_id: alloggio?.famiglia_id || null,
      stato: "nuova",
    });
    if (error) return "Errore: " + error.message;
    await caricaRichieste();
    return null;
  }

  if (caricamento) {
    return (
      <main>
        <p>Caricamento...</p>
      </main>
    );
  }

  if (erroreAccesso) {
    return (
      <main>
        <div className="card">
          <p>{erroreAccesso}</p>
          <p>
            <a href="/login">Vai al login &rarr;</a>
          </p>
        </div>
      </main>
    );
  }

  const CATEGORIE = [
    { tipo: "trasporto", titolo: "Trasporti" },
    { tipo: "ristorante", titolo: "Ristoranti" },
    { tipo: "attivita", titolo: "Attività" },
    { tipo: "pulizie", titolo: "Pulizie" },
  ];
  const ORDINE_STATO = { nuova: 0, "in gestione": 1, confermata: 2 };
  const CHIUSE = ["completata", "annullata"];
  const perData = (x, y) => String(x.data || "9999").localeCompare(String(y.data || "9999"));

  const categorie = CATEGORIE.map((c) => {
    const tutte = richieste.filter((r) => r.tipo === c.tipo);
    const aperte = tutte
      .filter((r) => !CHIUSE.includes(r.stato))
      .sort((x, y) => (ORDINE_STATO[x.stato] ?? 0) - (ORDINE_STATO[y.stato] ?? 0) || perData(x, y));
    const chiuse = tutte.filter((r) => CHIUSE.includes(r.stato)).sort((x, y) => perData(y, x));
    const nuove = tutte.filter((r) => r.stato === "nuova").length;
    return { ...c, aperte, chiuse, nuove };
  });

  function riga(r) {
    return (
      <div key={r.id} className="richiesta-item">
        <span className={classeBadge(r.stato)}>{r.stato}</span>{" "}
        <strong>{r.alloggi?.nome}</strong> &mdash; {r.famiglie?.nome}
        <p className="descrizione">
          {r.data} {r.ora ? String(r.ora).slice(0, 5) : ""} &mdash;{" "}
          {r.sotto_tipo ? `${r.sotto_tipo} — ` : ""}
          {r.descrizione}
          {r.pax ? ` (${r.pax} pers.)` : ""}
          {r.note ? ` (${r.note})` : ""}
        </p>
        {r.tipo === "pulizie" && (
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center", margin: "0.5rem 0" }}>
            <label style={{ margin: 0, fontWeight: 400 }}>
              Collaboratrice{" "}
              <select
                value={r.collaboratore_id || ""}
                onChange={(e) => assegnaCollaboratrice(r.id, e.target.value)}
                style={{ width: "auto", marginBottom: 0 }}
              >
                <option value="">— da assegnare —</option>
                {collaboratori.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ margin: 0, fontWeight: 400 }}>
              Durata (ore){" "}
              <input
                type="number"
                min="0.5"
                max="12"
                step="0.5"
                defaultValue={r.durata_ore || ""}
                onBlur={(e) => {
                  if (String(e.target.value) !== String(r.durata_ore || "")) cambiaDurata(r.id, e.target.value);
                }}
                style={{ width: "5rem", marginBottom: 0 }}
              />
            </label>
            <span
              className={
                "badge " + (r.accettata_il ? "badge-confermata" : "badge-nuova")
              }
            >
              {!r.collaboratore_id
                ? "da assegnare"
                : r.stato === "completata"
                ? "pulizia fatta"
                : r.accettata_il
                ? "accettata dalla collaboratrice"
                : "in attesa di accettazione"}
            </span>
          </div>
        )}
        <details style={{ margin: "0.5rem 0" }}>
          <summary style={{ cursor: "pointer" }}>Modifica</summary>
          <form onSubmit={(e) => salvaModifica(e, r)} style={{ marginTop: "0.5rem" }}>
            <label>
              Data
              <input type="date" name="data" defaultValue={r.data || ""} />
            </label>
            <label>
              Ora
              <input type="time" name="ora" defaultValue={r.ora ? String(r.ora).slice(0, 5) : ""} />
            </label>
            {r.tipo === "pulizie" && (
              <label>
                Durata (ore)
                <input type="number" name="durata_ore" min="0.5" max="12" step="0.5" defaultValue={r.durata_ore || ""} />
              </label>
            )}
            <label>
              Persone
              <input type="number" name="pax" min="1" defaultValue={r.pax || ""} />
            </label>
            <label>
              Dettaglio (tipo)
              <input type="text" name="sotto_tipo" defaultValue={r.sotto_tipo || ""} />
            </label>
            <label>
              {r.tipo === "pulizie" ? "Cosa fare" : "Posto / dettagli"}
              <input type="text" name="descrizione" defaultValue={r.descrizione || ""} />
            </label>
            <label>
              Note
              <textarea name="note" defaultValue={r.note || ""}></textarea>
            </label>
            <button type="submit" className="btn">
              Salva modifiche
            </button>
          </form>
        </details>
        <div className="stato-actions">
          {(r.stato === "confermata" || (r.tipo === "pulizie" && !CHIUSE.includes(r.stato))) && (
            <CalendarButton richiesta={r} />
          )}{" "}
          {STATI.filter((s) => s !== r.stato).map((s) => (
            <button key={s} onClick={() => cambiaStato(r.id, s)}>
              {s === "annullata" ? "Annulla" : "→ " + s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <main>
      <h1>Richieste</h1>

      {errore && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <p style={{ color: "#a32d2d" }}>{errore}</p>
        </div>
      )}

      {(() => {
        const oggiStr = new Date().toISOString().slice(0, 10);
        const aperte = generiche.filter((g) => g.stato !== "fatta");
        const fatte = generiche.filter((g) => g.stato === "fatta");
        const colore = (g) => {
          if (!g.scadenza) return "transparent";
          const giorni = Math.round((new Date(g.scadenza) - new Date(oggiStr)) / 86400000);
          if (giorni < 0) return "#fde2e2";
          if (giorni <= 14) return "#fff6e0";
          return "transparent";
        };
        const rigaG = (g) => (
          <div key={g.id} className="richiesta-item" style={{ background: g.stato === "fatta" ? "transparent" : colore(g), borderRadius: 8, padding: "0.5rem" }}>
            <strong>{g.testo}</strong>
            <p className="descrizione" style={{ margin: "0.15rem 0" }}>
              {g.famiglie?.nome ? g.famiglie.nome : "Generale"}
              {g.scadenza ? ` — entro il ${g.scadenza}` : ""}
            </p>
            <div className="stato-actions">
              {g.stato === "fatta" ? (
                <button type="button" onClick={() => segnaGenerica(g.id, false)}>
                  Riapri
                </button>
              ) : (
                <button type="button" onClick={() => segnaGenerica(g.id, true)}>
                  Fatta
                </button>
              )}{" "}
              <button type="button" onClick={() => eliminaGenerica(g.id)}>
                Elimina
              </button>
            </div>
          </div>
        );
        return (
          <details open={aperte.length > 0} className="card" style={{ marginBottom: "1rem" }}>
            <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "1.1em" }}>
              Richieste generiche{" "}
              <span className="muted" style={{ fontWeight: 400 }}>
                ({aperte.length} da fare)
              </span>
            </summary>
            <div style={{ marginTop: "0.75rem" }}>
              <form onSubmit={aggiungiGenerica} style={{ marginBottom: "1rem" }}>
                <label>
                  Cosa devo ricordare
                  <input type="text" name="testo" placeholder="es. Aggiungere un freezer" required />
                </label>
                <label>
                  Famiglia (facoltativa)
                  <select name="famiglia_id" defaultValue="">
                    <option value="">— generale —</option>
                    {famiglie.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Entro il (facoltativo)
                  <input type="date" name="scadenza" />
                </label>
                <button type="submit" className="btn">
                  Aggiungi promemoria
                </button>
              </form>
              {aperte.length === 0 && <p className="muted">Nessun promemoria aperto.</p>}
              {aperte.map(rigaG)}
              {fatte.length > 0 && (
                <details style={{ marginTop: "1rem" }}>
                  <summary className="muted" style={{ cursor: "pointer" }}>
                    Fatte ({fatte.length})
                  </summary>
                  <div style={{ marginTop: "0.5rem" }}>{fatte.map(rigaG)}</div>
                </details>
              )}
            </div>
          </details>
        );
      })()}

      <details className="card" style={{ marginBottom: "2rem" }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>+ Nuova richiesta</summary>
        <div style={{ marginTop: "1rem" }}>
          <FormRichiesta
            alloggi={alloggi}
            posti={posti}
            collaboratori={collaboratori}
            tipoIniziale="trasporto"
            onSubmit={creaRichiesta}
            etichettaBottone="Aggiungi richiesta"
          />
        </div>
      </details>

      {categorie.map((c) => (
        <details
          key={c.tipo}
          open={c.aperte.length > 0}
          className="card"
          style={{ marginBottom: "1rem" }}
        >
          <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "1.1em" }}>
            {c.titolo}{" "}
            <span className="muted" style={{ fontWeight: 400 }}>
              ({c.aperte.length} aperte
              {c.nuove > 0 ? `, ${c.nuove} nuove` : ""})
            </span>
          </summary>

          <div style={{ marginTop: "0.75rem" }}>
            {c.aperte.length === 0 && <p className="muted">Nessuna richiesta aperta.</p>}
            {c.aperte.map(riga)}

            {c.chiuse.length > 0 && (
              <details style={{ marginTop: "1rem" }}>
                <summary className="muted" style={{ cursor: "pointer" }}>
                  Completate e annullate ({c.chiuse.length})
                </summary>
                <div style={{ marginTop: "0.5rem" }}>{c.chiuse.map(riga)}</div>
              </details>
            )}
          </div>
        </details>
      ))}
    </main>
  );
}
