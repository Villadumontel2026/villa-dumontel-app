"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { applicaVista } from "../../lib/vista";
import { useApp } from "../components/AppProvider";
import { dmy } from "../../lib/i18n";
import { Cestino } from "../components/IconeAzione";
import {
  CATEGORIE,
  ETICHETTE_CATEGORIA_IT,
  apriDocumento,
  caricaDocumento,
  eliminaDocumento,
  dimensioneLeggibile,
} from "../../lib/documenti";

function categoriaDaCartella(cartella, predefinita) {
  const c = cartella.toLowerCase();
  if (/electric|elettric|water|acqua|acquedott|expenses|spese|purchases|services/.test(c)) return "fattura";
  if (/contract|contratt/.test(c)) return "contratto";
  if (/istruzion|welcome kit/.test(c)) return "istruzioni";
  if (/informazion/.test(c)) return "info";
  return predefinita;
}

export default function DocumentiPage() {
  const { t } = useApp();
  const [caricamento, setCaricamento] = useState(true);
  const [ruolo, setRuolo] = useState(null);
  const [famMia, setFamMia] = useState(null);
  const [vistaAdmin, setVistaAdmin] = useState(false);
  const [famiglie, setFamiglie] = useState([]);
  const [docs, setDocs] = useState([]);
  const [collegati, setCollegati] = useState({}); // documento_id -> n spese
  const [cerca, setCerca] = useState("");
  const [filtroCat, setFiltroCat] = useState("tutte");
  const [filtroVis, setFiltroVis] = useState("tutte");
  // form di caricamento (admin)
  const [catNuovo, setCatNuovo] = useState("fattura");
  const [visNuovo, setVisNuovo] = useState("admin");
  const [famNuovo, setFamNuovo] = useState("");
  const [stato, setStato] = useState(null);
  const [deduci, setDeduci] = useState(true);

  async function carica(prof) {
    const { data } = await supabase.from("documenti").select("*").order("creato_il", { ascending: false }).limit(1000);
    setDocs(data || []);
    if (prof?.ruolo === "admin") {
      const { data: dc } = await supabase.from("documenti_spese").select("documento_id").limit(10000);
      const m = {};
      (dc || []).forEach((r) => (m[r.documento_id] = (m[r.documento_id] || 0) + 1));
      setCollegati(m);
    }
  }

  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setCaricamento(false);
        return;
      }
      const { data: pRaw } = await supabase.from("profili").select("*").eq("id", session.user.id).single();
      const prof = applicaVista(pRaw);
      setRuolo(prof?.ruolo || null);
      setFamMia(prof?.famiglia_id || null);
      setVistaAdmin(pRaw?.ruolo === "admin" && prof?.ruolo === "ospite");
      if (prof?.ruolo === "admin") {
        const { data: f } = await supabase.from("famiglie").select("id, nome").order("id");
        setFamiglie(f || []);
        if (f && f.length) setFamNuovo(String(f[0].id));
      }
      await carica(prof);
      setCaricamento(false);
    }
    init();
  }, []);

  const filtrati = useMemo(() => {
    const q = cerca.trim().toLowerCase();
    return docs.filter(
      (d) =>
        (!q || (d.nome + " " + (d.note || "")).toLowerCase().includes(q)) &&
        (filtroCat === "tutte" || d.categoria === filtroCat) &&
        (filtroVis === "tutte" || d.visibilita === filtroVis)
    );
  }, [docs, cerca, filtroCat, filtroVis]);

  if (caricamento) {
    return (
      <main>
        <p>{t("c.caricamento")}</p>
      </main>
    );
  }
  if (ruolo !== "admin" && ruolo !== "ospite") {
    return (
      <main>
        <div className="card">
          <p>{t("c.loginRichiesto")}</p>
          <p>
            <a href="/login" className="btn">
              {t("c.vaiLogin")}
            </a>
          </p>
        </div>
      </main>
    );
  }

  // ---------- ospite ----------
  if (ruolo === "ospite") {
    // per l'ospite vero la lista e' gia' filtrata dal database; in "Vedi come" l'admin vede tutto, quindi filtro qui
    const visibili = vistaAdmin ? filtrati.filter((d) => d.visibilita === "tutti" || d.famiglia_id === famMia) : filtrati;
    const gruppi = CATEGORIE.map((c) => ({ c, elenco: visibili.filter((d) => d.categoria === c) })).filter((g) => g.elenco.length);
    return (
      <main>
        <h1>{t("doc.titolo")}</h1>
        <p className="muted">{t("doc.intro")}</p>
        <label style={{ maxWidth: 320, marginBottom: "1.5rem" }}>
          {t("doc.cerca")}
          <input value={cerca} onChange={(e) => setCerca(e.target.value)} />
        </label>
        {gruppi.length === 0 && <p className="muted">{t("doc.nessuno")}</p>}
        {gruppi.map((g) => (
          <div key={g.c} style={{ marginBottom: "1.5rem" }}>
            <h2>{t("doc.cat." + g.c)}</h2>
            <div className="card">
              {g.elenco.map((d) => (
                <div key={d.id} className="richiesta-item">
                  <strong>{d.nome}</strong>
                  <p className="descrizione">
                    {dmy(String(d.creato_il).slice(0, 10))} · {dimensioneLeggibile(d.dimensione)}
                  </p>
                  <button type="button" className="btn btn-light" onClick={() => apriDocumento(d)}>
                    {t("doc.apri")}
                  </button>{" "}
                  <button type="button" className="btn btn-light" onClick={() => apriDocumento(d, true)}>
                    {t("doc.scarica")}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    );
  }

  // ---------- admin ----------
  async function carica_files(e) {
    e.preventDefault();
    const scelti = Array.from(e.target.files_input.files || []);
    const cartella = Array.from(e.target.cartella_input.files || []);
    // dalla cartella scarto i file di sistema (es. .DS_Store)
    const files = scelti.concat(cartella.filter((f) => !f.name.startsWith(".") && f.name !== "Thumbs.db"));
    if (files.length === 0) return;
    if (visNuovo === "famiglia" && !famNuovo) {
      alert("Scegli la famiglia.");
      return;
    }
    let ok = 0;
    const errori = [];
    for (let i = 0; i < files.length; i++) {
      setStato(`Caricamento ${i + 1} di ${files.length}...`);
      const rel = files[i].webkitRelativePath || "";
      const cartellaDoc = rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : null;
      const r = await caricaDocumento(files[i], {
        categoria: deduci && cartellaDoc ? categoriaDaCartella(cartellaDoc, catNuovo) : catNuovo,
        visibilita: visNuovo,
        famiglia_id: visNuovo === "famiglia" ? Number(famNuovo) : null,
        note: cartellaDoc,
      });
      if (r.errore) errori.push(`${files[i].name}: ${r.errore}`);
      else ok++;
    }
    e.target.reset();
    setStato(`Caricati ${ok} file.` + (errori.length ? ` Errori: ${errori.join(" | ")}` : ""));
    await carica({ ruolo: "admin" });
  }

  async function aggiorna(d, campi) {
    const nuovo = { ...d, ...campi };
    if (nuovo.visibilita !== "famiglia") nuovo.famiglia_id = null;
    if (nuovo.visibilita === "famiglia" && !nuovo.famiglia_id && famiglie.length) nuovo.famiglia_id = famiglie[0].id;
    const { error } = await supabase
      .from("documenti")
      .update({ categoria: nuovo.categoria, visibilita: nuovo.visibilita, famiglia_id: nuovo.famiglia_id })
      .eq("id", d.id);
    if (error) {
      alert("Errore: " + error.message);
      return;
    }
    setDocs((prev) => prev.map((x) => (x.id === d.id ? nuovo : x)));
  }

  async function elimina(d) {
    if (!window.confirm(`Eliminare "${d.nome}"? Verra' rimosso anche dalle spese a cui e' collegato.`)) return;
    const err = await eliminaDocumento(d);
    if (err) {
      alert("Errore: " + err);
      return;
    }
    setDocs((prev) => prev.filter((x) => x.id !== d.id));
  }

  const nomeFam = (id) => famiglie.find((f) => f.id === id)?.nome || "";

  return (
    <main>
      <h1>Documenti</h1>
      <p className="muted">
        Archivio di fatture, contratti e istruzioni. Gli ospiti vedono solo i documenti della loro famiglia, quelli per tutti
        e le fatture collegate alle loro spese (le allegati dalla pagina Spese con la graffetta).
      </p>

      <div className="card" style={{ marginBottom: "2rem" }}>
        <h2>Carica documenti</h2>
        <form onSubmit={carica_files}>
          <label>
            File (anche piu' di uno)
            <input type="file" name="files_input" multiple />
          </label>
          <label>
            Oppure una cartella intera (il percorso resta nelle note)
            <input type="file" name="cartella_input" webkitdirectory="" directory="" multiple />
          </label>
          <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontWeight: 400 }}>
            <input type="checkbox" checked={deduci} onChange={(e) => setDeduci(e.target.checked)} style={{ width: "auto", margin: 0 }} />
            Deduci la categoria dal nome della cartella (bollette, contratti, istruzioni...)
          </label>
          <label>
            Categoria
            <select value={catNuovo} onChange={(e) => setCatNuovo(e.target.value)}>
              {CATEGORIE.map((c) => (
                <option key={c} value={c}>
                  {ETICHETTE_CATEGORIA_IT[c]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Chi lo vede
            <select value={visNuovo} onChange={(e) => setVisNuovo(e.target.value)}>
              <option value="admin">Solo admin</option>
              <option value="famiglia">Una famiglia</option>
              <option value="tutti">Tutti gli ospiti</option>
            </select>
          </label>
          {visNuovo === "famiglia" && (
            <label>
              Famiglia
              <select value={famNuovo} onChange={(e) => setFamNuovo(e.target.value)}>
                {famiglie.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button type="submit" className="btn">
            Carica
          </button>
          {stato && <p className="muted">{stato}</p>}
        </form>
        <p className="muted" style={{ fontSize: "0.85em" }}>
          Per una fattura di una spesa, e' piu' comodo allegarla dalla pagina Spese: viene collegata alla spesa e la famiglia la
          vede li'.
        </p>
      </div>

      <h2>
        Elenco <span className="muted" style={{ fontWeight: 400 }}>({filtrati.length} di {docs.length})</span>
      </h2>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <label style={{ minWidth: 200 }}>
          Cerca per nome o cartella
          <input value={cerca} onChange={(e) => setCerca(e.target.value)} />
        </label>
        <label style={{ minWidth: 180 }}>
          Categoria
          <select value={filtroCat} onChange={(e) => setFiltroCat(e.target.value)}>
            <option value="tutte">Tutte</option>
            {CATEGORIE.map((c) => (
              <option key={c} value={c}>
                {ETICHETTE_CATEGORIA_IT[c]}
              </option>
            ))}
          </select>
        </label>
        <label style={{ minWidth: 160 }}>
          Visibilita'
          <select value={filtroVis} onChange={(e) => setFiltroVis(e.target.value)}>
            <option value="tutte">Tutte</option>
            <option value="admin">Solo admin</option>
            <option value="famiglia">Una famiglia</option>
            <option value="tutti">Tutti</option>
          </select>
        </label>
      </div>

      <div className="card">
        {filtrati.length === 0 && <p className="muted">Nessun documento.</p>}
        {filtrati.map((d) => (
          <div key={d.id} className="richiesta-item">
            <strong>{d.nome}</strong>
            <span style={{ marginLeft: "0.4rem", whiteSpace: "nowrap" }}>
              <Cestino onClick={() => elimina(d)} />
            </span>
            <p className="descrizione">
              {dmy(String(d.creato_il).slice(0, 10))} · {dimensioneLeggibile(d.dimensione)}
              {collegati[d.id] ? ` · collegato a ${collegati[d.id]} spese` : ""}
              {d.visibilita === "famiglia" && d.famiglia_id ? ` · ${nomeFam(d.famiglia_id)}` : ""}
              {d.note ? ` · ${d.note}` : ""}
            </p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <select value={d.categoria} onChange={(e) => aggiorna(d, { categoria: e.target.value })} style={{ width: "auto", marginBottom: 0 }}>
                {CATEGORIE.map((c) => (
                  <option key={c} value={c}>
                    {ETICHETTE_CATEGORIA_IT[c]}
                  </option>
                ))}
              </select>
              <select value={d.visibilita} onChange={(e) => aggiorna(d, { visibilita: e.target.value })} style={{ width: "auto", marginBottom: 0 }}>
                <option value="admin">Solo admin</option>
                <option value="famiglia">Una famiglia</option>
                <option value="tutti">Tutti gli ospiti</option>
              </select>
              {d.visibilita === "famiglia" && (
                <select value={d.famiglia_id || ""} onChange={(e) => aggiorna(d, { famiglia_id: Number(e.target.value) })} style={{ width: "auto", marginBottom: 0 }}>
                  {famiglie.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              )}
              <button type="button" className="btn btn-light" onClick={() => apriDocumento(d)}>
                Apri
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
