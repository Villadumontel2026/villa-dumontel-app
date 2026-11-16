"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import { Matita, Cestino } from "../../../components/IconeAzione";
import PopupScheda from "../../../components/PopupEvento";

// Zone di ogni alloggio (camere, soggiorno, cucina...) tra cui scegliere nelle richieste di pulizia e manutenzione
export default function ZoneAlloggioPage() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [famiglie, setFamiglie] = useState([]);
  const [zone, setZone] = useState([]);
  const [errore, setErrore] = useState(null);
  const [modifica, setModifica] = useState(null);

  async function carica() {
    const { data: z } = await supabase.from("zone_alloggio").select("*").order("ordine", { ascending: true });
    setZone(z || []);
  }

  useEffect(() => {
    async function inizia() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setErroreAccesso("Devi accedere per vedere questa pagina.");
        setCaricamento(false);
        return;
      }
      const { data: profilo } = await supabase.from("profili").select("*").eq("id", session.user.id).single();
      if (!profilo || profilo.ruolo !== "admin") {
        setErroreAccesso("Questa pagina e' riservata all'amministratore.");
        setCaricamento(false);
        return;
      }
      const { data: f } = await supabase.from("famiglie").select("id, nome, test").order("id");
      setFamiglie((f || []).filter((x) => !x.test));
      await carica();
      setCaricamento(false);
    }
    inizia();
  }, []);

  const esegui = async (promessa) => {
    const { error } = await promessa;
    if (error) return setErrore("Errore: " + error.message);
    setErrore(null);
    await carica();
  };

  async function aggiungi(e, famigliaId) {
    e.preventDefault();
    const f = e.target;
    const nome = f.nome.value.trim();
    if (!nome) return;
    const max = zone.filter((z) => z.famiglia_id === famigliaId).reduce((m, z) => Math.max(m, z.ordine || 0), 0);
    await esegui(supabase.from("zone_alloggio").insert({ famiglia_id: famigliaId, nome, ordine: max + 1 }));
    f.reset();
  }

  async function sposta(z, direzione) {
    const lista = zone.filter((x) => x.famiglia_id === z.famiglia_id);
    const i = lista.findIndex((x) => x.id === z.id);
    const altro = lista[i + direzione];
    if (!altro) return;
    await esegui(
      Promise.all([
        supabase.from("zone_alloggio").update({ ordine: altro.ordine }).eq("id", z.id),
        supabase.from("zone_alloggio").update({ ordine: z.ordine }).eq("id", altro.id),
      ]).then((r) => r.find((x) => x.error) || { error: null })
    );
  }

  if (caricamento) return <main><p>Caricamento...</p></main>;
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

  return (
    <main>
      <p>
        <a href="/pulizie/admin" className="btn btn-light">&larr; Pulizie</a>
      </p>
      <h1>Zone degli alloggi</h1>
      <p className="muted">
        Sono le voci tra cui gli ospiti scelgono cosa pulire (o dove c&apos;è un problema di manutenzione). &laquo;Tutta la casa&raquo; è già prevista da sola.
      </p>
      {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}

      {famiglie.map((fam) => {
        const lista = zone.filter((z) => z.famiglia_id === fam.id);
        return (
          <div key={fam.id} className="card" style={{ marginBottom: "1rem" }}>
            <h2 style={{ marginTop: 0 }}>{fam.nome}</h2>
            {lista.length === 0 && <p className="muted">Nessuna zona.</p>}
            {lista.map((z, i) => (
              <div key={z.id} style={{ display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.25rem 0" }}>
                <span style={{ flex: 1 }}>{z.nome}</span>
                <button type="button" className="btn btn-light" style={{ padding: "0.1rem 0.5rem" }} disabled={i === 0} onClick={() => sposta(z, -1)} aria-label="Su">↑</button>
                <button type="button" className="btn btn-light" style={{ padding: "0.1rem 0.5rem" }} disabled={i === lista.length - 1} onClick={() => sposta(z, 1)} aria-label="Giù">↓</button>
                <Matita onClick={() => setModifica(z)} titolo="Rinomina" />
                <Cestino
                  onClick={() => {
                    if (window.confirm("Togliere «" + z.nome + "»?")) esegui(supabase.from("zone_alloggio").delete().eq("id", z.id));
                  }}
                />
              </div>
            ))}
            <form onSubmit={(e) => aggiungi(e, fam.id)} style={{ display: "flex", gap: "0.5rem", marginTop: "0.6rem" }}>
              <input type="text" name="nome" placeholder="Nuova zona (es. Camera Blu)" style={{ marginBottom: 0 }} />
              <button type="submit" className="btn">Aggiungi</button>
            </form>
          </div>
        );
      })}

      {modifica && (
        <PopupScheda titolo={modifica.nome} sottotitolo="Rinomina" onChiudi={() => setModifica(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const nome = e.target.nome.value.trim();
              if (nome) await esegui(supabase.from("zone_alloggio").update({ nome }).eq("id", modifica.id));
              setModifica(null);
            }}
          >
            <input type="text" name="nome" defaultValue={modifica.nome} required />
            <button type="submit" className="btn">Salva</button>
          </form>
        </PopupScheda>
      )}
    </main>
  );
}
