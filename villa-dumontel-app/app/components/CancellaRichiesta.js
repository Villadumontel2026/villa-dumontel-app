"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "./AppProvider";
import PopupScheda from "./PopupEvento";
import { Cestino } from "./IconeAzione";

// Cestino per cancellare una richiesta, con finestra di conferma.
//  - admin: cancella subito (nota facoltativa); se il cliente ha chiesto di cancellare puo' accettare o mantenere
//  - collaboratore (solo pulizie sue): cancella subito (nota facoltativa) o accetta la richiesta del cliente
//  - ospite: nota obbligatoria; richiesta non confermata = cancellata subito, confermata/accettata = richiesta da accettare
export default function CancellaRichiesta({ r, ruolo, onFatto }) {
  const { lang } = useApp();
  const en = lang === "en";
  const [aperto, setAperto] = useState(false);
  const [nota, setNota] = useState("");
  const [errore, setErrore] = useState(null);
  const [occupato, setOccupato] = useState(false);
  const [esito, setEsito] = useState(null);

  if (!r || ["annullata", "completata", "rifiutata"].includes(r.stato)) return null;
  if (ruolo === "collaboratore" && r.tipo !== "pulizie") return null;

  const daAccettare = ruolo === "ospite" && (r.stato === "confermata" || !!r.accettata_il);
  const inAttesa = !!r.cancellazione_richiesta;

  // il cliente ha gia' chiesto di cancellare: niente cestino, solo informazione
  if (ruolo === "ospite" && inAttesa) {
    return (
      <span className="muted" style={{ fontSize: "0.9em" }}>
        {en ? "Cancellation requested, waiting for confirmation" : "Cancellazione richiesta, in attesa di conferma"}
      </span>
    );
  }

  function chiudi() {
    setAperto(false);
    setNota("");
    setErrore(null);
    setEsito(null);
  }

  async function esegui(rpc, args) {
    setErrore(null);
    setOccupato(true);
    const { data, error } = await supabase.rpc(rpc, args);
    setOccupato(false);
    if (error) return setErrore((en ? "Error: " : "Errore: ") + error.message);
    if (data === "nota_obbligatoria") return setErrore(en ? "Please write a note." : "Scrivi una nota.");
    if (data === "non_possibile" || data === "non_trovata" || data === "non_autorizzato" || data === "non_autorizzata" || data === "non_trovato")
      return setErrore(en ? "This request cannot be cancelled." : "Questa richiesta non si può cancellare.");
    if (rpc === "ospite_cancella_richiesta" && data === "richiesta") {
      setEsito(
        en
          ? "Cancellation request sent. The booking stays valid until it is accepted."
          : "Richiesta di cancellazione inviata. La prenotazione resta valida finché non viene accettata."
      );
      if (onFatto) await onFatto();
      return;
    }
    if (onFatto) await onFatto();
    chiudi();
  }

  const titolo = en ? "Cancel request" : "Cancella la richiesta";
  const infoNota = (testo) => (
    <div style={{ background: "#fff6e0", borderRadius: 8, padding: "0.6rem 0.8rem", margin: "0 0 0.8rem" }}>
      <strong style={{ fontSize: "0.88em" }}>{en ? "Note from the guest" : "Nota del cliente"}</strong>
      <p style={{ margin: "0.2rem 0 0", whiteSpace: "pre-line" }}>{testo}</p>
    </div>
  );

  return (
    <>
      <Cestino onClick={() => setAperto(true)} titolo={titolo} />
      {aperto && (
        <PopupScheda titolo={titolo} sottotitolo={(r.data ? String(r.data).slice(0, 10) : "") || undefined} onChiudi={chiudi}>
          {esito ? (
            <>
              <p>{esito}</p>
              <button type="button" className="btn" onClick={chiudi}>
                OK
              </button>
            </>
          ) : (
            <>
              {ruolo !== "ospite" && inAttesa && r.cancellazione_nota && infoNota(r.cancellazione_nota)}

              {ruolo === "ospite" && (
                <p style={{ marginTop: 0 }}>
                  {daAccettare
                    ? en
                      ? "This request is already confirmed: we will send a cancellation request, which has to be accepted. Please tell us why."
                      : "Questa richiesta è già confermata: invieremo una richiesta di cancellazione che dovrà essere accettata. Scrivi il motivo."
                    : en
                    ? "Do you want to cancel this request? Please leave a short note."
                    : "Vuoi cancellare questa richiesta? Lascia una breve nota."}
                </p>
              )}
              {ruolo !== "ospite" && !inAttesa && (
                <p style={{ marginTop: 0 }}>
                  {ruolo === "admin"
                    ? "Vuoi cancellare questa richiesta? Il cliente (e la collaboratrice, se è una pulizia) riceverà l'avviso, con la nota se la scrivi."
                    : "Vuoi cancellare questa pulizia? Il cliente e l'admin riceveranno l'avviso, con la nota se la scrivi."}
                </p>
              )}
              {ruolo !== "ospite" && inAttesa && (
                <p style={{ marginTop: 0 }}>
                  Il cliente chiede di cancellare. Se accetti la richiesta viene cancellata subito e lui riceve l&apos;avviso.
                </p>
              )}

              <label>
                {ruolo === "ospite"
                  ? en
                    ? "Note (required)"
                    : "Nota (obbligatoria)"
                  : ruolo === "admin" && inAttesa
                  ? "Nota per il cliente (facoltativa)"
                  : "Nota (facoltativa)"}
                <textarea value={nota} onChange={(e) => setNota(e.target.value)} required={ruolo === "ospite"}></textarea>
              </label>
              {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}

              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {ruolo === "ospite" && (
                  <button
                    type="button"
                    className="btn"
                    disabled={occupato}
                    onClick={() => esegui("ospite_cancella_richiesta", { p_id: r.id, p_nota: nota })}
                  >
                    {daAccettare ? (en ? "Send cancellation request" : "Invia richiesta di cancellazione") : en ? "Cancel the request" : "Cancella la richiesta"}
                  </button>
                )}
                {ruolo === "admin" && (
                  <button
                    type="button"
                    className="btn"
                    disabled={occupato}
                    onClick={() => esegui("admin_cancella_richiesta", { p_id: r.id, p_nota: nota })}
                  >
                    {inAttesa ? "Accetta la cancellazione" : "Cancella la richiesta"}
                  </button>
                )}
                {ruolo === "admin" && inAttesa && (
                  <button
                    type="button"
                    className="btn btn-light"
                    disabled={occupato}
                    onClick={() => esegui("admin_rifiuta_cancellazione", { p_id: r.id, p_nota: nota })}
                  >
                    Mantieni la prenotazione
                  </button>
                )}
                {ruolo === "collaboratore" && (
                  <button
                    type="button"
                    className="btn"
                    disabled={occupato}
                    onClick={() => esegui("collaboratrice_cancella_pulizia", { p_id: r.id, p_nota: nota })}
                  >
                    {inAttesa ? "Accetta la cancellazione" : "Cancella la pulizia"}
                  </button>
                )}
                <button type="button" className="btn btn-light" onClick={chiudi}>
                  {en ? "Back" : "Indietro"}
                </button>
              </div>
              {ruolo === "admin" && inAttesa && (
                <p className="muted" style={{ fontSize: "0.88em", marginTop: "0.8rem" }}>
                  Per proporre una modifica al cliente usa &laquo;Proponi una modifica all&apos;ospite&raquo; nella scheda (matita): la richiesta di cancellazione viene chiusa.
                </p>
              )}
            </>
          )}
        </PopupScheda>
      )}
    </>
  );
}
