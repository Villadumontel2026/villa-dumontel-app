"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { Cestino } from "../../components/IconeAzione";
import { caricaDocumento, eliminaDocumento, apriDocumento } from "../../../lib/documenti";

const UNITA = { minuti: 1, ore: 60, giorni: 1440 };

function inMinuti(valore, unita) {
  return Math.round(Number(valore) * UNITA[unita]);
}

function daMinuti(m) {
  if (m % 1440 === 0) return { valore: m / 1440, unita: "giorni" };
  if (m % 60 === 0) return { valore: m / 60, unita: "ore" };
  return { valore: m, unita: "minuti" };
}

const vuoto = {
  titolo: "",
  titolo_en: "",
  note: "",
  note_en: "",
  per_tipo: "villa",
  per_famiglia_id: "",
  vis_tutti: true,
  vis_famiglie: [],
  vis_collaboratori: false,
  durata: "singolo", // singolo | periodo
  data_inizio: "",
  ora_inizio: "",
  data_fine: "",
  ora_fine: "",
};

export default function EventoAdminPage() {
  const [stato, setStato] = useState("caricamento");
  const [famiglie, setFamiglie] = useState([]);
  const [id, setId] = useState(null);
  const [f, setF] = useState(vuoto);
  const [promemoria, setPromemoria] = useState([]); // {valore, unita, app, push}
  const [allegati, setAllegati] = useState([]); // documenti gia' collegati
  const [nuoviFile, setNuoviFile] = useState([]);
  const [avvisa, setAvvisa] = useState(true);
  const [attesa, setAttesa] = useState(false);
  const [errore, setErrore] = useState(null);

  const set = (campo, valore) => setF((prev) => ({ ...prev, [campo]: valore }));

  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return setStato("login");
      const { data: p } = await supabase.from("profili").select("ruolo").eq("id", session.user.id).single();
      if (!p || p.ruolo !== "admin") return setStato("ruolo");

      const { data: fam } = await supabase.from("famiglie").select("id, nome, test").order("id");
      setFamiglie((fam || []).filter((x) => !x.test));

      const eid = new URLSearchParams(window.location.search).get("id");
      if (eid) {
        const { data: e } = await supabase.from("eventi").select("*").eq("id", eid).single();
        if (!e) return setStato("nontrovato");
        setId(e.id);
        setF({
          titolo: e.titolo || "",
          titolo_en: e.titolo_en || "",
          note: e.note || "",
          note_en: e.note_en || "",
          per_tipo: e.per_tipo,
          per_famiglia_id: e.per_famiglia_id ? String(e.per_famiglia_id) : "",
          vis_tutti: e.vis_tutti,
          vis_famiglie: e.vis_famiglie || [],
          vis_collaboratori: e.vis_collaboratori,
          durata: e.data_fine || e.ora_fine ? "periodo" : "singolo",
          data_inizio: e.data_inizio,
          ora_inizio: e.ora_inizio ? String(e.ora_inizio).slice(0, 5) : "",
          data_fine: e.data_fine || "",
          ora_fine: e.ora_fine ? String(e.ora_fine).slice(0, 5) : "",
        });
        const { data: pm } = await supabase
          .from("eventi_promemoria")
          .select("*")
          .eq("evento_id", e.id)
          .order("anticipo_minuti", { ascending: false });
        setPromemoria(
          (pm || []).map((x) => ({ ...daMinuti(x.anticipo_minuti), app: x.canale_app, push: x.canale_push }))
        );
        const { data: al } = await supabase
          .from("eventi_documenti")
          .select("documenti(id, nome, percorso)")
          .eq("evento_id", e.id);
        setAllegati((al || []).map((r) => r.documenti).filter(Boolean));
        setAvvisa(false);
      }
      setStato("ok");
    }
    init();
  }, []);

  // Impostazioni di partenza per la visibilita' quando cambia "per chi e'" (solo su un evento nuovo)
  function cambiaPer(tipo, famId) {
    setF((prev) => {
      const n = { ...prev, per_tipo: tipo, per_famiglia_id: famId ?? prev.per_famiglia_id };
      if (!id) {
        if (tipo === "villa") {
          n.vis_tutti = true;
          n.vis_famiglie = [];
          n.vis_collaboratori = false;
        } else if (tipo === "famiglia") {
          n.vis_tutti = false;
          n.vis_famiglie = n.per_famiglia_id ? [Number(n.per_famiglia_id)] : [];
          n.vis_collaboratori = false;
        } else {
          n.vis_tutti = false;
          n.vis_famiglie = [];
          n.vis_collaboratori = false;
        }
      }
      return n;
    });
  }

  function toggleFamiglia(fid) {
    setF((prev) => ({
      ...prev,
      vis_famiglie: prev.vis_famiglie.includes(fid) ? prev.vis_famiglie.filter((x) => x !== fid) : [...prev.vis_famiglie, fid],
    }));
  }

  async function salva(e) {
    e.preventDefault();
    setErrore(null);
    if (!f.titolo.trim()) return setErrore("Scrivi il titolo dell'evento.");
    if (!f.data_inizio) return setErrore("Scegli la data.");
    if (f.per_tipo === "famiglia" && !f.per_famiglia_id) return setErrore("Scegli la famiglia.");
    let data_fine = null;
    let ora_fine = null;
    if (f.durata === "periodo") {
      data_fine = f.data_fine || f.data_inizio;
      ora_fine = f.ora_fine || null;
      if (data_fine < f.data_inizio) return setErrore("La data di fine non puo' essere prima dell'inizio.");
    }
    for (const p of promemoria) {
      if (!(Number(p.valore) > 0)) return setErrore("Ogni promemoria deve avere un anticipo maggiore di zero.");
    }
    setAttesa(true);

    const riga = {
      titolo: f.titolo.trim(),
      titolo_en: f.titolo_en.trim() || null,
      note: f.note.trim() || null,
      note_en: f.note_en.trim() || null,
      per_tipo: f.per_tipo,
      per_famiglia_id: f.per_tipo === "famiglia" ? Number(f.per_famiglia_id) : null,
      vis_tutti: f.vis_tutti,
      vis_famiglie: f.vis_tutti ? [] : f.vis_famiglie,
      vis_collaboratori: f.vis_tutti ? false : f.vis_collaboratori,
      data_inizio: f.data_inizio,
      ora_inizio: f.ora_inizio || null,
      data_fine,
      ora_fine,
    };

    let eventoId = id;
    if (id) {
      const { error } = await supabase.from("eventi").update(riga).eq("id", id);
      if (error) {
        setAttesa(false);
        return setErrore("Errore: " + error.message);
      }
    } else {
      const { data, error } = await supabase.from("eventi").insert(riga).select().single();
      if (error) {
        setAttesa(false);
        return setErrore("Errore: " + error.message);
      }
      eventoId = data.id;
    }

    // promemoria: si riscrivono tutti
    await supabase.from("eventi_promemoria").delete().eq("evento_id", eventoId);
    const righePm = promemoria
      .filter((p) => p.app || p.push)
      .map((p) => ({
        evento_id: eventoId,
        anticipo_minuti: inMinuti(p.valore, p.unita),
        canale_app: !!p.app,
        canale_push: !!p.push,
      }));
    if (righePm.length) {
      const { error } = await supabase.from("eventi_promemoria").insert(righePm);
      if (error) {
        setAttesa(false);
        return setErrore("Evento salvato ma promemoria non salvati: " + error.message);
      }
    }

    // nuovi allegati
    const falliti = [];
    for (const file of nuoviFile) {
      const r = await caricaDocumento(file, { categoria: "altro", visibilita: "admin" });
      if (r.errore || !r.doc) {
        falliti.push(file.name);
        continue;
      }
      const { error } = await supabase.from("eventi_documenti").insert({ evento_id: eventoId, documento_id: r.doc.id });
      if (error) falliti.push(file.name);
    }

    if (avvisa) {
      await supabase.rpc("evento_avvisa", { p_id: eventoId, p_tipo: id ? "modificato" : "nuovo" });
    }

    setAttesa(false);
    if (falliti.length) {
      return setErrore("Evento salvato, ma non sono stati caricati: " + falliti.join(", "));
    }
    window.location.href = "/calendario";
  }

  async function rimuoviAllegato(doc) {
    if (!window.confirm(`Rimuovere "${doc.nome}" da questo evento?`)) return;
    await supabase.from("eventi_documenti").delete().eq("evento_id", id).eq("documento_id", doc.id);
    // se non e' usato altrove, elimino anche il file
    const [{ count: c1 }, { count: c2 }] = await Promise.all([
      supabase.from("eventi_documenti").select("*", { count: "exact", head: true }).eq("documento_id", doc.id),
      supabase.from("documenti_spese").select("*", { count: "exact", head: true }).eq("documento_id", doc.id),
    ]);
    if (!c1 && !c2) await eliminaDocumento(doc);
    setAllegati((prev) => prev.filter((x) => x.id !== doc.id));
  }

  async function elimina() {
    if (!window.confirm("Eliminare definitivamente questo evento?")) return;
    if (avvisa) await supabase.rpc("evento_avvisa", { p_id: id, p_tipo: "annullato" });
    for (const d of allegati) {
      await supabase.from("eventi_documenti").delete().eq("evento_id", id).eq("documento_id", d.id);
      const [{ count: c1 }, { count: c2 }] = await Promise.all([
        supabase.from("eventi_documenti").select("*", { count: "exact", head: true }).eq("documento_id", d.id),
        supabase.from("documenti_spese").select("*", { count: "exact", head: true }).eq("documento_id", d.id),
      ]);
      if (!c1 && !c2) await eliminaDocumento(d);
    }
    const { error } = await supabase.from("eventi").delete().eq("id", id);
    if (error) return setErrore("Errore: " + error.message);
    window.location.href = "/calendario";
  }

  if (stato === "caricamento") {
    return (
      <main>
        <p>Caricamento...</p>
      </main>
    );
  }
  if (stato !== "ok") {
    return (
      <main>
        <div className="card">
          <p>
            {stato === "login"
              ? "Devi accedere per vedere questa pagina."
              : stato === "nontrovato"
              ? "Evento non trovato."
              : "Questa pagina e' riservata all'amministratore."}
          </p>
          <a href="/login" className="btn">
            Vai al login
          </a>
        </div>
      </main>
    );
  }

  const riga = { display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" };
  const check = { display: "flex", gap: "0.5rem", alignItems: "center", fontWeight: 400, margin: "0.2rem 0" };
  const cb = { width: "auto", margin: 0 };

  return (
    <main>
      <p>
        <a href="/calendario" className="btn btn-light">
          &larr; Calendario
        </a>
      </p>
      <h1>{id ? "Modifica evento" : "Nuovo evento"}</h1>

      <form onSubmit={salva} className="card" style={{ maxWidth: 640 }}>
        <label>
          Titolo
          <input value={f.titolo} onChange={(e) => set("titolo", e.target.value)} required placeholder="es. Arrivo di Karen e Julian" />
        </label>
        <label>
          Titolo in inglese (facoltativo, lo vedono gli ospiti in inglese)
          <input value={f.titolo_en} onChange={(e) => set("titolo_en", e.target.value)} />
        </label>

        <fieldset style={{ border: "none", padding: 0, margin: "1rem 0 0" }}>
          <strong>L&apos;evento e&apos; per</strong>
          <label style={check}>
            <input type="radio" style={cb} checked={f.per_tipo === "villa"} onChange={() => cambiaPer("villa")} /> Villa Dumontel
          </label>
          <label style={check}>
            <input type="radio" style={cb} checked={f.per_tipo === "famiglia"} onChange={() => cambiaPer("famiglia", f.per_famiglia_id || (famiglie[0] ? String(famiglie[0].id) : ""))} /> Una famiglia
          </label>
          {f.per_tipo === "famiglia" && (
            <select value={f.per_famiglia_id} onChange={(e) => cambiaPer("famiglia", e.target.value)} style={{ maxWidth: 280 }}>
              {famiglie.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nome}
                </option>
              ))}
            </select>
          )}
          <label style={check}>
            <input type="radio" style={cb} checked={f.per_tipo === "admin"} onChange={() => cambiaPer("admin")} /> Admin
          </label>
        </fieldset>

        <fieldset style={{ border: "none", padding: 0, margin: "1rem 0 0" }}>
          <strong>Chi lo vede</strong>
          <p className="muted" style={{ margin: "0.2rem 0 0.4rem", fontSize: "0.85em" }}>
            Puoi sceglierne piu' d&apos;uno. Tu (admin) vedi sempre tutto: senza altre spunte l&apos;evento e&apos; solo tuo.
          </p>
          <label style={check}>
            <input type="checkbox" style={cb} checked={f.vis_tutti} onChange={(e) => set("vis_tutti", e.target.checked)} /> Tutti (tutte le famiglie e i collaboratori)
          </label>
          {!f.vis_tutti && (
            <>
              {famiglie.map((x) => (
                <label key={x.id} style={check}>
                  <input type="checkbox" style={cb} checked={f.vis_famiglie.includes(x.id)} onChange={() => toggleFamiglia(x.id)} /> {x.nome}
                </label>
              ))}
              <label style={check}>
                <input type="checkbox" style={cb} checked={f.vis_collaboratori} onChange={(e) => set("vis_collaboratori", e.target.checked)} /> Collaboratori
              </label>
            </>
          )}
        </fieldset>

        <fieldset style={{ border: "none", padding: 0, margin: "1rem 0 0" }}>
          <strong>Quando</strong>
          <label style={check}>
            <input type="radio" style={cb} checked={f.durata === "singolo"} onChange={() => set("durata", "singolo")} /> Evento singolo (es. un arrivo)
          </label>
          <label style={check}>
            <input type="radio" style={cb} checked={f.durata === "periodo"} onChange={() => set("durata", "periodo")} /> Con inizio e fine
          </label>
          <div style={riga}>
            <label>
              {f.durata === "periodo" ? "Data di inizio" : "Data"}
              <input type="date" value={f.data_inizio} onChange={(e) => set("data_inizio", e.target.value)} required />
            </label>
            <label>
              Ora (facoltativa)
              <input type="time" value={f.ora_inizio} onChange={(e) => set("ora_inizio", e.target.value)} />
            </label>
          </div>
          {f.durata === "periodo" && (
            <div style={riga}>
              <label>
                Data di fine
                <input type="date" value={f.data_fine} min={f.data_inizio || undefined} onChange={(e) => set("data_fine", e.target.value)} required />
              </label>
              <label>
                Ora di fine (facoltativa)
                <input type="time" value={f.ora_fine} onChange={(e) => set("ora_fine", e.target.value)} />
              </label>
            </div>
          )}
          {!f.ora_inizio && <p className="muted" style={{ fontSize: "0.85em", margin: "0.2rem 0" }}>Senza ora l&apos;evento e&apos; per tutto il giorno.</p>}
        </fieldset>

        <label style={{ marginTop: "1rem" }}>
          Note
          <textarea value={f.note} onChange={(e) => set("note", e.target.value)} rows={4}></textarea>
        </label>
        <label>
          Note in inglese (facoltative)
          <textarea value={f.note_en} onChange={(e) => set("note_en", e.target.value)} rows={3}></textarea>
        </label>

        <div style={{ margin: "1rem 0" }}>
          <strong>Allegati</strong>
          {allegati.map((d) => (
            <p key={d.id} className="descrizione" style={{ margin: "0.2rem 0" }}>
              <a
                href="#"
                onClick={(ev) => {
                  ev.preventDefault();
                  apriDocumento(d);
                }}
              >
                {d.nome}
              </a>
              <Cestino titolo="Rimuovi allegato" onClick={() => rimuoviAllegato(d)} />
            </p>
          ))}
          <input type="file" multiple onChange={(e) => setNuoviFile(Array.from(e.target.files || []))} />
          {nuoviFile.length > 0 && <p className="muted" style={{ fontSize: "0.85em", margin: "0.2rem 0" }}>{nuoviFile.length} file da caricare al salvataggio.</p>}
          <p className="muted" style={{ fontSize: "0.85em", margin: "0.2rem 0" }}>Chi vede l&apos;evento puo&apos; aprire e scaricare gli allegati.</p>
        </div>

        <div style={{ margin: "1rem 0" }}>
          <strong>Promemoria</strong>
          <p className="muted" style={{ margin: "0.2rem 0 0.4rem", fontSize: "0.85em" }}>
            Partono per tutti quelli che vedono l&apos;evento (tu compreso), prima dell&apos;inizio. Senza ora, l&apos;evento conta dalle 9:00.
          </p>
          {promemoria.map((p, i) => (
            <div key={i} style={{ ...riga, marginBottom: "0.4rem" }}>
              <input
                type="number"
                min="1"
                value={p.valore}
                onChange={(e) => setPromemoria((prev) => prev.map((x, j) => (j === i ? { ...x, valore: e.target.value } : x)))}
                style={{ width: "5rem", marginBottom: 0 }}
              />
              <select
                value={p.unita}
                onChange={(e) => setPromemoria((prev) => prev.map((x, j) => (j === i ? { ...x, unita: e.target.value } : x)))}
                style={{ width: "auto", marginBottom: 0 }}
              >
                <option value="minuti">minuti prima</option>
                <option value="ore">ore prima</option>
                <option value="giorni">giorni prima</option>
              </select>
              <label style={{ ...check, margin: 0 }}>
                <input type="checkbox" style={cb} checked={p.app} onChange={(e) => setPromemoria((prev) => prev.map((x, j) => (j === i ? { ...x, app: e.target.checked } : x)))} /> App
              </label>
              <label style={{ ...check, margin: 0 }}>
                <input type="checkbox" style={cb} checked={p.push} onChange={(e) => setPromemoria((prev) => prev.map((x, j) => (j === i ? { ...x, push: e.target.checked } : x)))} /> Notifica
              </label>
              <Cestino titolo="Togli promemoria" onClick={() => setPromemoria((prev) => prev.filter((_, j) => j !== i))} />
            </div>
          ))}
          <button type="button" className="btn btn-light" onClick={() => setPromemoria((prev) => [...prev, { valore: 1, unita: "giorni", app: true, push: true }])}>
            Aggiungi un promemoria
          </button>
        </div>

        <label style={{ ...check, margin: "1rem 0" }}>
          <input type="checkbox" style={cb} checked={avvisa} onChange={(e) => setAvvisa(e.target.checked)} />
          {id ? "Avvisa chi lo vede della modifica" : "Avvisa subito chi lo vede"}
        </label>

        {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button type="submit" className="btn" disabled={attesa}>
            {attesa ? "Salvataggio..." : "Salva evento"}
          </button>
          {id && (
            <button type="button" className="btn btn-light" onClick={elimina}>
              Elimina evento
            </button>
          )}
        </div>
        {id && avvisa && <p className="muted" style={{ fontSize: "0.85em" }}>Se elimini l&apos;evento con la spunta attiva, chi lo vedeva riceve l&apos;avviso di annullamento.</p>}
      </form>
    </main>
  );
}
