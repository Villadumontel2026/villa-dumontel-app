"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";

export default function CollaboratriciPage() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);

  const [collaboratori, setCollaboratori] = useState([]);
  const [turni, setTurni] = useState([]);
  const [pagamentiCollab, setPagamentiCollab] = useState([]);
  const [alloggiList, setAlloggiList] = useState([]);
  const [famiglie, setFamiglie] = useState([]);
  const [escluse, setEscluse] = useState([]);

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

      const { data: collaboratoriData } = await supabase
        .from("collaboratori")
        .select("*");
      setCollaboratori(collaboratoriData || []);

      const { data: turniData } = await supabase
        .from("turni_pulizia")
        .select("*")
        .eq("stato", "approvato")
        .eq("storico", false);
      setTurni(turniData || []);

      const { data: pagCollabData } = await supabase
        .from("pagamenti_collaboratori")
        .select("*")
        .eq("storico", false);
      setPagamentiCollab(pagCollabData || []);

      const { data: alloggiData } = await supabase.from("alloggi").select("*");
      setAlloggiList(alloggiData || []);

      const { data: famData } = await supabase.from("famiglie").select("*");
      setFamiglie(famData || []);

      setCaricamento(false);
    }

    carica();
  }, []);

  async function eliminaVersamento(id) {
    if (!window.confirm("Eliminare questo versamento? Verra' tolta anche la spesa collegata.")) return;
    const { error } = await supabase.from("pagamenti_collaboratori").delete().eq("id", id);
    if (error) {
      alert("Errore: " + error.message);
      return;
    }
    setPagamentiCollab((prev) => prev.filter((p) => p.id !== id));
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

  const somma = (arr, campo) => arr.reduce((t, r) => t + (r[campo] || 0), 0);

  // Colonne: Totale + una per alloggio (con il nome della famiglia)
  const colonne = [
    { chiave: "totale", titolo: "Totale", alloggioId: null },
    ...alloggiList.map((a) => {
      const f = famiglie.find((x) => x.id === a.famiglia_id);
      return { chiave: String(a.id), titolo: f ? f.nome : a.nome, alloggioId: a.id };
    }),
  ];

  function calcola(turniSel, pagSel, alloggioId) {
    const t = alloggioId ? turniSel.filter((x) => x.alloggio_id === alloggioId) : turniSel;
    const p = alloggioId ? pagSel.filter((x) => x.alloggio_id === alloggioId) : pagSel;
    const dovuto = somma(t, "importo_dovuto");
    const versato = somma(p, "importo");
    return { dovuto, versato, saldo: dovuto - versato };
  }

  const visibili = collaboratori.filter((c) => !escluse.includes(c.id));
  const idVisibili = visibili.map((c) => c.id);

  const situazione = visibili.map((c) => {
    const t = turni.filter((x) => x.collaboratore_id === c.id);
    const p = pagamentiCollab.filter((x) => x.collaboratore_id === c.id);
    return { ...c, righe: colonne.map((col) => calcola(t, p, col.alloggioId)) };
  });
  const complessivo = colonne.map((col) =>
    calcola(
      turni.filter((x) => idVisibili.includes(x.collaboratore_id)),
      pagamentiCollab.filter((x) => idVisibili.includes(x.collaboratore_id)),
      col.alloggioId
    )
  );

  function toggleCollab(id) {
    setEscluse((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const chip = (attivo) => ({
    border: "1px solid #2f4739",
    background: attivo ? "#2f4739" : "transparent",
    color: attivo ? "white" : "#2f4739",
    borderRadius: "999px",
    padding: "0.35rem 0.9rem",
    fontSize: "0.9rem",
    cursor: "pointer",
  });

  const euro = (n) => n.toFixed(2) + " €";

  function tabella(righe) {
    return (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.92rem" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "0.3rem 0.4rem" }}></th>
              {colonne.map((c) => (
                <th key={c.chiave} style={{ textAlign: "right", padding: "0.3rem 0.4rem" }}>
                  {c.titolo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ["Dovuto (turni effettuati)", "dovuto"],
              ["Già versato", "versato"],
              ["Saldo residuo", "saldo"],
            ].map(([etichetta, campo]) => (
              <tr key={campo} style={campo === "saldo" ? { fontWeight: 700 } : {}}>
                <td style={{ padding: "0.3rem 0.4rem", borderTop: campo === "saldo" ? "1px solid #ddd" : "none" }}>
                  {etichetta}
                </td>
                {righe.map((r, i) => (
                  <td
                    key={i}
                    style={{
                      textAlign: "right",
                      padding: "0.3rem 0.4rem",
                      borderTop: campo === "saldo" ? "1px solid #ddd" : "none",
                    }}
                  >
                    {euro(r[campo])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <main>
      <p>
        <a href="/pulizie/admin">&larr; Pulizie</a>
      </p>
      <h1>Collaboratrici</h1>

      <p style={{ marginBottom: "1.5rem" }}>
        <a href="/pulizie/admin/collaboratrici/nuovo" className="btn">
          Registra un versamento
        </a>
      </p>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {collaboratori.map((c) => (
          <button
            key={c.id}
            type="button"
            style={chip(!escluse.includes(c.id))}
            onClick={() => toggleCollab(c.id)}
          >
            {c.nome}
          </button>
        ))}
        {escluse.length > 0 && (
          <button type="button" style={{ ...chip(false), border: "1px dashed #2f4739" }} onClick={() => setEscluse([])}>
            Mostra tutte
          </button>
        )}
      </div>

      <div style={{ display: "grid", gap: "1rem" }}>
        <details open className="card">
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>
            {visibili.length === collaboratori.length ? "Tutte le collaboratrici" : "Selezione"}{" "}
            <span className="muted" style={{ fontWeight: 400 }}>
              &mdash; saldo residuo {euro(complessivo[0] ? complessivo[0].saldo : 0)}
            </span>
          </summary>
          <div style={{ marginTop: "0.75rem" }}>{tabella(complessivo)}</div>
        </details>

        {situazione.length === 0 && <p className="muted">Nessuna collaboratrice selezionata.</p>}

        {situazione.map((c) => (
          <details key={c.id} className="card">
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>
              {c.nome}{" "}
              <span className="muted" style={{ fontWeight: 400 }}>
                &mdash; saldo residuo {euro(c.righe[0].saldo)}
              </span>
            </summary>
            <div style={{ marginTop: "0.75rem" }}>{tabella(c.righe)}</div>
          </details>
        ))}
      </div>

      <h2 style={{ marginTop: "2rem" }}>Ultimi versamenti</h2>
      <div className="card">
        {pagamentiCollab.length === 0 && <p className="muted">Nessun versamento registrato.</p>}
        {[...pagamentiCollab]
          .sort((a, b) => String(b.data).localeCompare(String(a.data)) || b.id - a.id)
          .map((p) => {
            const c = collaboratori.find((x) => x.id === p.collaboratore_id);
            const al = alloggiList.find((x) => x.id === p.alloggio_id);
            return (
              <div key={p.id} className="richiesta-item">
                <strong>{Number(p.importo).toFixed(2)} &euro;</strong> &mdash; {c?.nome}{" "}
                &mdash; {al?.nome}
                <p className="descrizione">
                  {p.data}
                  {p.note ? ` (${p.note})` : ""}
                </p>
                <div className="stato-actions">
                  <button onClick={() => eliminaVersamento(p.id)}>Elimina</button>
                </div>
              </div>
            );
          })}
      </div>
    </main>
  );
}
