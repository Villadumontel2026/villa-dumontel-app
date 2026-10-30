"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { dmy } from "../../../lib/i18n";
import { Matita, Cestino, Graffetta } from "../../components/IconeAzione";
import { caricaDocumento, apriDocumento, eliminaDocumento } from "../../../lib/documenti";

const ANNO_CORRENTE = new Date().getFullYear();

function Modale({ titolo, onChiudi, children }) {
  return (
    <div
      onClick={onChiudi}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "3vh 1rem", overflowY: "auto" }}
    >
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, background: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <h2 style={{ margin: 0 }}>{titolo}</h2>
          <button type="button" className="btn btn-light" onClick={onChiudi}>
            Chiudi
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function SpeseAdminPage() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [famiglie, setFamiglie] = useState([]);
  const [spese, setSpese] = useState([]);
  const [versamenti, setVersamenti] = useState([]);
  const [filtroFamiglia, setFiltroFamiglia] = useState("tutte");
  const [filtroAnno, setFiltroAnno] = useState(String(ANNO_CORRENTE));
  const [annoRiep, setAnnoRiep] = useState(String(ANNO_CORRENTE));
  const [allegati, setAllegati] = useState([]); // righe documenti_spese con documenti(...)
  const [caricandoSpesa, setCaricandoSpesa] = useState(null);
  const [modaleSpesa, setModaleSpesa] = useState(null); // spesa a cui si sta allegando
  const [archivio, setArchivio] = useState([]);
  const [cercaDoc, setCercaDoc] = useState("");
  const fileRef = useRef(null);

  async function apriModale(spesa) {
    setCercaDoc("");
    setModaleSpesa(spesa);
    const { data } = await supabase
      .from("documenti")
      .select("id, nome, percorso, mime, note, categoria, creato_il")
      .order("creato_il", { ascending: false })
      .limit(1000);
    setArchivio(data || []);
  }

  async function collegaEsistente(spesa, doc) {
    const ids = await scegliSpeseDaCollegare(spesa);
    const righe = ids.map((spesa_id) => ({ documento_id: doc.id, spesa_id }));
    const { error } = await supabase.from("documenti_spese").upsert(righe, { onConflict: "documento_id,spesa_id" });
    if (error) alert("Errore: " + error.message);
    setModaleSpesa(null);
    await caricaAllegati();
  }

  async function caricaAllegati() {
    const { data } = await supabase
      .from("documenti_spese")
      .select("documento_id, spesa_id, documenti(id, nome, percorso, mime)")
      .limit(5000);
    setAllegati(data || []);
  }

  async function scegliSpeseDaCollegare(spesa) {
    // Le quote di una stessa bolletta sono spese separate (una per famiglia): offro di collegare il file a tutte
    const gemelle = spese.filter(
      (x) =>
        x.id !== spesa.id &&
        x.oggetto === spesa.oggetto &&
        String(x.data) === String(spesa.data) &&
        !x.pagamento_collaboratore_id
    );
    let ids = [spesa.id];
    if (gemelle.length > 0) {
      const nomi = gemelle.map((x) => x.famiglie?.nome).filter(Boolean).join(", ");
      if (window.confirm(`Collegare lo stesso file anche alle spese di: ${nomi}? (stesso oggetto e data)`)) {
        ids = ids.concat(gemelle.map((x) => x.id));
      }
    }
    return ids;
  }

  async function allega(spesa, file) {
    const ids = await scegliSpeseDaCollegare(spesa);
    setCaricandoSpesa(spesa.id);
    const r = await caricaDocumento(file, { categoria: "fattura", visibilita: "admin", spesaIds: ids });
    setCaricandoSpesa(null);
    if (r.errore) alert("Errore: " + r.errore);
    setModaleSpesa(null);
    await caricaAllegati();
  }

  async function rimuoviAllegato(spesaId, doc) {
    if (!window.confirm(`Rimuovere "${doc.nome}" da questa spesa?`)) return;
    await supabase.from("documenti_spese").delete().eq("documento_id", doc.id).eq("spesa_id", spesaId);
    const altri = allegati.filter((a) => a.documento_id === doc.id && a.spesa_id !== spesaId);
    if (altri.length === 0) await eliminaDocumento(doc);
    await caricaAllegati();
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

      const { data: famiglieData } = await supabase.from("famiglie").select("*");
      setFamiglie(famiglieData || []);

      const { data: speseData } = await supabase
        .from("spese_famiglia")
        .select("*, famiglie(nome)")
        .order("data", { ascending: false });
      setSpese(speseData || []);

      const { data: versData } = await supabase
        .from("pagamenti_famiglie")
        .select("*, famiglie(nome)")
        .order("data", { ascending: false });
      setVersamenti(versData || []);
      await caricaAllegati();

      setCaricamento(false);
    }

    carica();
  }, []);

  async function eliminaSpesa(id) {
    if (!window.confirm("Eliminare definitivamente questa spesa?")) return;
    const { error } = await supabase.from("spese_famiglia").delete().eq("id", id);
    if (error) {
      alert("Errore: " + error.message);
      return;
    }
    setSpese((prev) => prev.filter((x) => x.id !== id));
  }

  async function eliminaVersamento(id) {
    if (!window.confirm("Eliminare definitivamente questo versamento?")) return;
    const { error } = await supabase.from("pagamenti_famiglie").delete().eq("id", id);
    if (error) {
      alert("Errore: " + error.message);
      return;
    }
    setVersamenti((prev) => prev.filter((x) => x.id !== id));
  }

  const anni = useMemo(() => {
    const set = new Set([ANNO_CORRENTE]);
    spese.forEach((x) => set.add(annoSpesa(x)));
    versamenti.forEach((v) => set.add(parseInt(String(v.data || "").slice(0, 4), 10)));
    return Array.from(set).filter(Boolean).sort((a, b) => b - a);
  }, [spese, versamenti]);

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
            <a href="/login" className="btn">Vai al login</a>
          </p>
        </div>
      </main>
    );
  }

  const filtrate = spese.filter(
    (x) =>
      (filtroFamiglia === "tutte" || String(x.famiglia_id) === filtroFamiglia) &&
      (filtroAnno === "tutti" || annoSpesa(x) === parseInt(filtroAnno, 10))
  );

  const famiglieMostrate = famiglie.filter(
    (f) => filtroFamiglia === "tutte" || String(f.id) === filtroFamiglia
  );
  const totali = famiglieMostrate.map((f) => ({
    ...f,
    totale: filtrate
      .filter((x) => x.famiglia_id === f.id)
      .reduce((t, r) => t + (r.importo || 0), 0),
  }));
  const annoDi = (d) => parseInt(String(d || "").slice(0, 4), 10);
  const sommaImp = (arr) => arr.reduce((t, r) => t + (r.importo || 0), 0);
  const tuttiAnni = annoRiep === "tutti";
  const YR = parseInt(annoRiep, 10);
  const riepiloghi = famiglie.map((f) => {
    const sp = spese.filter((x) => x.famiglia_id === f.id);
    const inc = versamenti.filter((x) => x.famiglia_id === f.id);
    const riporto = tuttiAnni
      ? 0
      : sommaImp(sp.filter((x) => annoSpesa(x) < YR)) - sommaImp(inc.filter((x) => annoDi(x.data) < YR));
    const speseAnno = sommaImp(sp.filter((x) => tuttiAnni || annoSpesa(x) === YR));
    const incassiAnno = sommaImp(inc.filter((x) => tuttiAnni || annoDi(x.data) === YR));
    return { ...f, riporto, spese: speseAnno, incassi: incassiAnno, saldo: riporto + speseAnno - incassiAnno };
  });

  const versFiltrati = versamenti.filter(
    (x) =>
      (filtroFamiglia === "tutte" || String(x.famiglia_id) === filtroFamiglia) &&
      (filtroAnno === "tutti" || parseInt(String(x.data || "").slice(0, 4), 10) === parseInt(filtroAnno, 10))
  );
  const totaleVersamenti = versFiltrati.reduce((t, r) => t + (r.importo || 0), 0);
  const totaleGenerale = filtrate.reduce((t, r) => t + (r.importo || 0), 0);

  return (
    <main>
      <h1>Spese</h1>

      <p style={{ marginBottom: "1.5rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <a href="/spese/admin/nuova" className="btn">
          Aggiungi una spesa
        </a>
        <a href="/spese/admin/versamento" className="btn">
          Registra un versamento
        </a>
      </p>

      <h2>Riepilogo</h2>
      <p className="muted" style={{ marginBottom: "0.75rem" }}>
        Spese per anno di competenza, versamenti per data. Il saldo include il riporto degli anni precedenti.
      </p>
      <label style={{ maxWidth: "220px", marginBottom: "1rem" }}>
        Anno del riepilogo
        <select value={annoRiep} onChange={(e) => setAnnoRiep(e.target.value)}>
          {anni.map((a) => (
            <option key={a} value={String(a)}>
              {a}
            </option>
          ))}
          <option value="tutti">Tutti gli anni (verifica)</option>
        </select>
      </label>

      <div style={{ display: "grid", gap: "1rem", marginBottom: "2.5rem" }}>
        {riepiloghi.map((f) => (
          <div key={f.id} className="card">
            <h3 style={{ marginBottom: "0.5rem" }}>{f.nome}</h3>
            <p className="muted" style={{ margin: "0.25rem 0" }}>
              Riporto anni precedenti: {f.riporto.toFixed(2)} &euro;
            </p>
            <p className="muted" style={{ margin: "0.25rem 0" }}>
              Spese dell&apos;anno (pulizie e gasolio incluse): {f.spese.toFixed(2)} &euro;
            </p>
            <p className="muted" style={{ margin: "0.25rem 0" }}>
              Gi&agrave; incassato: {f.incassi.toFixed(2)} &euro;
            </p>
            <div
              style={{
                marginTop: "0.75rem",
                padding: "0.75rem 1rem",
                borderRadius: "10px",
                fontWeight: 600,
                background: f.saldo > 0 ? "#fde2e2" : "#dff3e3",
                color: f.saldo > 0 ? "#8a1f1f" : "#1f5c2e",
              }}
            >
              {f.saldo > 0
                ? `Da incassare: ${f.saldo.toFixed(2)} €`
                : f.saldo < 0
                ? `Credito della famiglia: ${(-f.saldo).toFixed(2)} €`
                : "Saldo in pari: 0.00 €"}
            </div>
          </div>
        ))}
      </div>

      <h2>Elenco spese e versamenti</h2>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <label style={{ minWidth: "200px" }}>
          Famiglia
          <select value={filtroFamiglia} onChange={(e) => setFiltroFamiglia(e.target.value)}>
            <option value="tutte">Tutte le famiglie</option>
            {famiglie.map((f) => (
              <option key={f.id} value={String(f.id)}>
                {f.nome}
              </option>
            ))}
          </select>
        </label>
        <label style={{ minWidth: "160px" }}>
          Anno
          <select value={filtroAnno} onChange={(e) => setFiltroAnno(e.target.value)}>
            {anni.map((a) => (
              <option key={a} value={String(a)}>
                {a}
              </option>
            ))}
            <option value="tutti">Tutti gli anni</option>
          </select>
        </label>
      </div>

      <h2>
        Elenco{" "}
        <span className="muted" style={{ fontWeight: 400 }}>
          ({filtrate.length} spese)
        </span>
      </h2>
      <div className="card">
        {filtrate.length === 0 && <p className="muted">Nessuna spesa per questa selezione.</p>}
        {filtrate.map((s) => (
          <div key={s.id} className="richiesta-item">
            <strong>{s.oggetto}</strong> &mdash; {s.famiglie?.nome}
            {!s.pagamento_collaboratore_id && (
              <span style={{ marginLeft: "0.4rem", whiteSpace: "nowrap" }}>
                <Matita onClick={() => (window.location.href = "/spese/admin/modifica?id=" + s.id)} />
                <Graffetta onClick={() => apriModale(s)} titolo="Allega una fattura o un documento" />
                <Cestino onClick={() => eliminaSpesa(s.id)} />
              </span>
            )}
            {caricandoSpesa === s.id && <span className="muted"> caricamento...</span>}
            {allegati
              .filter((a) => a.spesa_id === s.id && a.documenti)
              .map((a) => (
                <span key={a.documento_id} style={{ display: "inline-block", marginLeft: "0.6rem", fontSize: "0.85em" }}>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      apriDocumento(a.documenti);
                    }}
                  >
                    {a.documenti.nome}
                  </a>
                  <Cestino titolo="Rimuovi allegato" onClick={() => rimuoviAllegato(s.id, a.documenti)} />
                </span>
              ))}
            <p className="descrizione">
              {dmy(s.data)}
              {s.anno_riferimento && String(s.anno_riferimento) !== String(s.data).slice(0, 4)
                ? ` (competenza ${s.anno_riferimento})`
                : ""}{" "}
              &mdash; {Number(s.importo).toFixed(2)} &euro;
              {s.note ? ` (${s.note})` : ""}
            </p>
            {s.pagamento_collaboratore_id ? (
              <p className="muted" style={{ fontSize: "0.85em", margin: "0.25rem 0 0" }}>
                Generata da un versamento alla collaboratrice: si modifica da Pulizie &gt; Collaboratrici.
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: "2rem" }}>
        Versamenti degli ospiti{" "}
        <span className="muted" style={{ fontWeight: 400 }}>
          ({versFiltrati.length} &mdash; {totaleVersamenti.toFixed(2)} &euro;)
        </span>
      </h2>
      <div className="card">
        {versFiltrati.length === 0 && <p className="muted">Nessun versamento per questa selezione.</p>}
        {versFiltrati.map((v) => (
          <div key={v.id} className="richiesta-item">
            <strong>{Number(v.importo).toFixed(2)} &euro;</strong> &mdash; {v.famiglie?.nome}
            <span style={{ marginLeft: "0.4rem", whiteSpace: "nowrap" }}>
              <Cestino onClick={() => eliminaVersamento(v.id)} />
            </span>
            <p className="descrizione">
              {dmy(v.data)}
              {v.metodo ? ` — ${v.metodo}` : ""}
              {v.note ? ` (${v.note})` : ""}
            </p>
          </div>
        ))}
      </div>
      {modaleSpesa && (
        <Modale titolo="Allega un documento" onChiudi={() => setModaleSpesa(null)}>
          <p className="muted" style={{ margin: "0.5rem 0" }}>
            {modaleSpesa.oggetto} &mdash; {modaleSpesa.famiglie?.nome} &mdash; {dmy(modaleSpesa.data)}
          </p>
          <label>
            Cerca nell&apos;archivio
            <input value={cercaDoc} onChange={(e) => setCercaDoc(e.target.value)} placeholder="es. 08 09" autoFocus />
          </label>
          <div style={{ maxHeight: "40vh", overflowY: "auto", marginBottom: "1rem" }}>
            {archivio
              .filter((d) => {
                const q = cercaDoc.trim().toLowerCase();
                return !q || (d.nome + " " + (d.note || "")).toLowerCase().includes(q);
              })
              .slice(0, 60)
              .map((d) => (
                <div key={d.id} className="richiesta-item" style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center" }}>
                  <span style={{ minWidth: 0 }}>
                    <strong style={{ wordBreak: "break-word" }}>{d.nome}</strong>
                    {d.note && <span className="muted" style={{ display: "block", fontSize: "0.8em" }}>{d.note}</span>}
                  </span>
                  <button type="button" className="btn" onClick={() => collegaEsistente(modaleSpesa, d)}>
                    Collega
                  </button>
                </div>
              ))}
            {archivio.length === 0 && <p className="muted">L&apos;archivio e&apos; vuoto: carica prima i documenti dalla pagina Documenti.</p>}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files && e.target.files[0];
              e.target.value = "";
              if (f) allega(modaleSpesa, f);
            }}
          />
          <button type="button" className="btn btn-light" onClick={() => fileRef.current && fileRef.current.click()}>
            Oppure carica un nuovo file dal computer
          </button>
        </Modale>
      )}
    </main>
  );
}

