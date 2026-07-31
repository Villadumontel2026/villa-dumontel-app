"use client";

import { useState } from "react";
import { creaRichiesta } from "./actions";

const CHECKLIST_PULIZIE = [
  "Cambio lenzuola",
  "Cambio asciugamani",
  "Pulizia bagni",
  "Pulizia cucina",
  "Pulizia terrazzo/balcone",
  "Riordino generale",
];

export default function NuovaRichiestaForm({ alloggi }) {
  const [tipo, setTipo] = useState("trasporto");

  return (
    <form action={creaRichiesta}>
      <label>
        Tipo di richiesta
        <select
          name="tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
        >
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

      {tipo === "trasporto" && (
        <>
          <label>
            Direzione
            <select name="sotto_tipo">
              <option value="andata">Arrivo in valle</option>
              <option value="ritorno">Verso aeroporto</option>
            </select>
          </label>
          <label>
            Data
            <input type="date" name="data" />
          </label>
          <label>
            Orario volo
            <input type="time" name="ora" />
          </label>
          <label>
            Numero passeggeri
            <input type="number" name="pax" />
          </label>
          <label>
            Aeroporto / luogo
            <input
              type="text"
              name="descrizione"
              placeholder="es. Malpensa T1 -> Courmayeur"
            />
          </label>
        </>
      )}

      {tipo === "ristorante" && (
        <>
          <label>
            Pasto
            <select name="sotto_tipo">
              <option value="pranzo">Pranzo</option>
              <option value="cena">Cena</option>
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
            Ristorante preferito
            <input
              type="text"
              name="descrizione"
              placeholder="lascia vuoto per un consiglio"
            />
          </label>
        </>
      )}

      {tipo === "attivita" && (
        <>
          <label>
            Tipo di attivit&agrave;
            <input
              type="text"
              name="sotto_tipo"
              placeholder="es. sci, escursione, spa"
            />
          </label>
          <label>
            Data
            <input type="date" name="data" />
          </label>
          <label>
            Numero partecipanti
            <input type="number" name="pax" />
          </label>
          <label>
            Dettagli
            <input
              type="text"
              name="descrizione"
              placeholder="es. livello, orario preferito"
            />
          </label>
        </>
      )}

      {tipo === "pulizie" && (
        <>
          <label>
            Data desiderata
            <input type="date" name="data" />
          </label>
          <label>Cosa serve</label>
          {CHECKLIST_PULIZIE.map((voce) => (
            <label
              key={voce}
              style={{
                fontWeight: 400,
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <input
                type="checkbox"
                name="voci"
                value={voce}
                style={{ width: "auto", marginBottom: 0 }}
              />
              {voce}
            </label>
          ))}
        </>
      )}

      <label>
        Note
        <textarea name="note"></textarea>
      </label>

      <button type="submit" className="btn">
        Aggiungi richiesta
      </button>
    </form>
  );
}
