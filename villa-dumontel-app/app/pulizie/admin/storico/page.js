"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import { dmy } from "../../../../lib/i18n";

const ETICHETTE_STATO = {
  "da approvare": "da validare",
  approvato: "effettuato",
  rifiutato: "rifiutato",
};

function classeBadgeStato(stato) {
  if (stato === "da approvare") return "badge badge-nuova";
  if (stato === "approvato") return "badge badge-confermata";
  if (stato === "rifiutato") return "badge badge-completata";
  return "badge";
}

export default function StoricoTurniPage() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [turni, setTurni] = useState([]);
  const [famiglie, setFamiglie] = useState([]);
  const [collaboratori, setCollaboratori] = useState([]);
  const [fFamiglia, setFFamiglia] = useState("tutte");
  const [fAnno, setFAnno] = useState(String(new Date().getFullYear()));
  const [fCollab, setFCollab] = useState("tutte");

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

      const { data } = await supabase
        .from("turni_pulizia")
        .select("*, alloggi(nome, famiglia_id), collaboratori(nome)")
        .order("data", { ascending: false });
      setTurni(data || []);

      const { data: fam } = await supabase.from("famiglie").select("*");
      setFamiglie(fam || []);
      const { data: col } = await supabase.from("collaboratori").select("*");
      setCollaboratori(col || []);
      setCaricamento(false);
    }

    carica();
  }, []);

  const anni = useMemo(() => {
    const set = new Set([new Date().getFullYear()]);
    turni.forEach((t) => t.data && set.add(parseInt(String(t.data).slice(0, 4), 10)));
    return Array.from(set).filter(Boolean).sort((a, b) => b - a);
  }, [turni]);

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

  const filtrati = turni.filter(
    (t) =>
      (fFamiglia === "tutte" || String(t.alloggi?.famiglia_id) === fFamiglia) &&
      (fAnno === "tutti" || String(t.data || "").slice(0, 4) === fAnno) &&
      (fCollab === "tutte" || String(t.collaboratore_id) === fCollab)
  );
  const totaleOre = filtrati.reduce((s, t) => s + (t.ore || 0), 0);
  const totaleImporto = filtrati.reduce((s, t) => s + (t.importo_dovuto || 0), 0);

  return (
    <main>
      <p>
        <a href="/pulizie/admin" className="btn btn-light">&larr; Pulizie</a>
      </p>
      <h1>Storico turni</h1>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <label style={{ minWidth: "190px" }}>
          Famiglia
          <select value={fFamiglia} onChange={(e) => setFFamiglia(e.target.value)}>
            <option value="tutte">Tutte le famiglie</option>
            {famiglie.map((f) => (
              <option key={f.id} value={String(f.id)}>
                {f.nome}
              </option>
            ))}
          </select>
        </label>
        <label style={{ minWidth: "150px" }}>
          Anno
          <select value={fAnno} onChange={(e) => setFAnno(e.target.value)}>
            {anni.map((a) => (
              <option key={a} value={String(a)}>
                {a}
              </option>
            ))}
            <option value="tutti">Tutti gli anni</option>
          </select>
        </label>
        <label style={{ minWidth: "170px" }}>
          Collaboratrice
          <select value={fCollab} onChange={(e) => setFCollab(e.target.value)}>
            <option value="tutte">Tutte</option>
            {collaboratori.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <p style={{ margin: 0 }}>
          <strong>{filtrati.length}</strong> turni &middot;{" "}
          <strong>{totaleOre.toFixed(1)}</strong> ore &middot;{" "}
          <strong>{totaleImporto.toFixed(2)} &euro;</strong>
        </p>
      </div>

      <div className="card">
        {filtrati.length === 0 && <p className="muted">Nessun turno per questa selezione.</p>}
        {filtrati.map((t) => (
          <div key={t.id} className="richiesta-item">
            <span className={classeBadgeStato(t.stato)}>{ETICHETTE_STATO[t.stato] || t.stato}</span>{" "}
            {t.storico && <span className="badge">storico</span>}{" "}
            <strong>{t.collaboratori?.nome}</strong> &mdash; {t.alloggi?.nome}{" "}
            &mdash; {dmy(t.data)} &mdash; {t.ore} ore &mdash; {Number(t.importo_dovuto || 0).toFixed(2)} &euro;
            {t.note && <p className="descrizione">{t.note}</p>}
          </div>
        ))}
      </div>
    </main>
  );
}
