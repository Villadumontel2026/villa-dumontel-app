"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "../../components/AppProvider";
import { QR_PATH, QR_VIEWBOX, URL_ACCESSO } from "../../../lib/qrAccesso";

// Modelli di comunicazione: l'impaginazione e' fissa, si scrive solo il testo.
const COLORI = {
  verde: { nome: "Verde", hex: "#2f4739" },
  bordeaux: { nome: "Bordeaux", hex: "#6b1b26" },
};

const FORMATI = {
  a5: { nome: "A5 verticale", w: 148, h: 210, pagina: "A5 portrait" },
  a4: { nome: "A4 verticale", w: 210, h: 297, pagina: "A4 portrait" },
  schermo: { nome: "Schermo del telefono (9:16)", w: 108, h: 192, pagina: "108mm 192mm" },
};

const LINGUE = {
  it: { nome: "Italiano", firma: "Famiglia Désayeux", luogo: "Entrèves" },
  en: { nome: "English", firma: "The Désayeux family", luogo: "Entrèves" },
  fr: { nome: "Français", firma: "La famille Désayeux", luogo: "Entrèves" },
};

const MODELLI = {
  welcome: {
    nome: "Benvenuto",
    titolo: { it: "Benvenuti", en: "Welcome", fr: "Bienvenue" },
    testo: {
      it: "Benvenuti a Villa Dumontel.\nCi auguriamo un soggiorno meraviglioso.\n\nPer qualsiasi cosa, siamo a vostra disposizione.",
      en: "Welcome to Villa Dumontel.\nWe wish you a wonderful stay.\n\nFor anything at all, we are at your disposal.",
      fr: "Bienvenue à Villa Dumontel.\nNous vous souhaitons un merveilleux séjour.\n\nPour toute demande, nous sommes à votre disposition.",
    },
    qr: false,
  },
  qr: {
    nome: "Accesso all'app (con QR code)",
    titolo: { it: "L'app di Villa Dumontel", en: "The Villa Dumontel app", fr: "L'application de Villa Dumontel" },
    testo: {
      it: "Inquadrate il codice con la fotocamera del telefono, compilate la richiesta e riceverete una email appena l'accesso sarà approvato.",
      en: "Scan the code with your phone camera, fill in the request and you will receive an email as soon as your access is approved.",
      fr: "Scannez le code avec l'appareil photo de votre téléphone, remplissez la demande et vous recevrez un e-mail dès que l'accès sera approuvé.",
    },
    qr: true,
  },
};

const oggiStr = () => {
  const d = new Date();
  return String(d.getDate()).padStart(2, "0") + "." + String(d.getMonth() + 1).padStart(2, "0") + "." + String(d.getFullYear()).slice(2);
};

export default function ModelliPage() {
  const { ruolo, pronto } = useApp();
  const [modello, setModello] = useState("welcome");
  const [lingua, setLingua] = useState("it");
  const [colore, setColore] = useState("verde");
  const [formato, setFormato] = useState("a5");
  const [stile, setStile] = useState("elegante");
  const [titolo, setTitolo] = useState(MODELLI.welcome.titolo.it);
  const [testo, setTesto] = useState(MODELLI.welcome.testo.it);
  const [luogoData, setLuogoData] = useState("Entrèves, " + oggiStr());
  const [scala, setScala] = useState(1);
  const box = useRef(null);

  const m = MODELLI[modello];
  const f = FORMATI[formato];
  const hex = COLORI[colore].hex;
  const mm = 96 / 25.4;
  const pxW = f.w * mm;
  const pxH = f.h * mm;

  useEffect(() => {
    const calcola = () => {
      if (box.current) setScala(Math.min(1, box.current.clientWidth / pxW));
    };
    calcola();
    window.addEventListener("resize", calcola);
    return () => window.removeEventListener("resize", calcola);
  }, [pxW]);

  function cambiaModello(k) {
    setModello(k);
    setTitolo(MODELLI[k].titolo[lingua]);
    setTesto(MODELLI[k].testo[lingua]);
  }
  function cambiaLingua(l) {
    setLingua(l);
    setTitolo(m.titolo[l]);
    setTesto(m.testo[l]);
  }

  if (pronto && ruolo !== "admin") {
    return (
      <main>
        <div className="card">
          <p>Questa pagina è riservata all&apos;amministratore.</p>
        </div>
      </main>
    );
  }

  const fontTesto = stile === "mano" ? "'Caveat', 'Segoe Script', cursive" : "'Fraunces', Georgia, serif";
  const dimTesto = stile === "mano" ? 7.2 : 4.4; // mm
  const paragrafi = testo.split(/\n\s*\n/);

  return (
    <main>
      <p className="no-stampa">
        <a href="/info" className="btn btn-light">
          ← Info
        </a>
      </p>
      <h1 className="no-stampa">Modelli di comunicazione</h1>
      <p className="muted no-stampa">
        Scrivi solo il testo: intestazione, bande di colore e firma sono già impostate. Poi premi Stampa e scegli «Salva come PDF» per
        inviarlo, oppure stampalo.
      </p>

      <div className="card no-stampa" style={{ marginBottom: "1.25rem" }}>
        <label>
          Modello
          <select value={modello} onChange={(e) => cambiaModello(e.target.value)}>
            {Object.entries(MODELLI).map(([k, v]) => (
              <option key={k} value={k}>
                {v.nome}
              </option>
            ))}
          </select>
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0 0.8rem" }}>
          <label>
            Lingua
            <select value={lingua} onChange={(e) => cambiaLingua(e.target.value)}>
              {Object.entries(LINGUE).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Colore delle bande
            <select value={colore} onChange={(e) => setColore(e.target.value)}>
              {Object.entries(COLORI).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Formato
            <select value={formato} onChange={(e) => setFormato(e.target.value)}>
              {Object.entries(FORMATI).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Scrittura
            <select value={stile} onChange={(e) => setStile(e.target.value)}>
              <option value="elegante">Elegante</option>
              <option value="mano">A mano</option>
            </select>
          </label>
        </div>
        <label>
          Titolo
          <input type="text" value={titolo} onChange={(e) => setTitolo(e.target.value)} />
        </label>
        <label>
          Testo (una riga vuota per iniziare un nuovo paragrafo)
          <textarea rows={7} value={testo} onChange={(e) => setTesto(e.target.value)}></textarea>
        </label>
        <label>
          Luogo e data (facoltativo)
          <input type="text" value={luogoData} onChange={(e) => setLuogoData(e.target.value)} />
        </label>
        <button type="button" className="btn" onClick={() => window.print()}>
          Stampa / salva PDF
        </button>
      </div>

      <div ref={box} className="no-stampa-box" style={{ width: "100%", overflow: "hidden", height: pxH * scala + 8 }}>
        <div
          className="foglio"
          style={{
            width: pxW,
            height: pxH,
            transform: "scale(" + scala + ")",
            transformOrigin: "top left",
            background: "#fff",
            border: "1px solid #ddd",
            boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
            position: "relative",
            boxSizing: "border-box",
            color: "#2a2a26",
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
            overflow: "hidden",
          }}
        >
          {/* bande */}
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: pxH * 0.03, background: hex }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: pxH * 0.03, background: hex }} />
          <div style={{ position: "absolute", left: "9%", right: "9%", top: pxH * 0.045, borderTop: "1px solid " + hex, opacity: 0.55 }} />
          <div style={{ position: "absolute", left: "9%", right: "9%", bottom: pxH * 0.045, borderTop: "1px solid " + hex, opacity: 0.55 }} />

          <div style={{ position: "absolute", inset: 0, padding: pxH * 0.08 + "px " + pxW * 0.11 + "px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            {/* intestazione */}
            <div style={{ fontFamily: "'Fraunces', Georgia, serif", letterSpacing: "0.32em", textTransform: "uppercase", fontSize: f.w * 0.045 * mm, color: hex, fontWeight: 600 }}>
              Villa Dumontel
            </div>
            <div style={{ width: pxW * 0.12, borderTop: "1px solid " + hex, margin: pxH * 0.02 + "px 0 " + pxH * 0.05 + "px" }} />

            {/* corpo */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", width: "100%" }}>
              {titolo && (
                <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: f.w * 0.075 * mm, color: hex, marginBottom: pxH * 0.035, lineHeight: 1.15 }}>{titolo}</div>
              )}
              {m.qr && (
                <svg viewBox={"-2 -2 " + (parseInt(QR_VIEWBOX.split(" ")[2], 10) + 4) + " " + (parseInt(QR_VIEWBOX.split(" ")[3], 10) + 4)} style={{ width: pxW * 0.42, height: pxW * 0.42, marginBottom: pxH * 0.03 }}>
                  <rect x="-2" y="-2" width="100" height="100" fill="#fff" />
                  <path d={QR_PATH} fill={hex} />
                </svg>
              )}
              {paragrafi.map((p, i) => (
                <p key={i} style={{ fontFamily: fontTesto, fontSize: dimTesto * mm * (f.w / 148), lineHeight: 1.45, margin: "0 0 " + pxH * 0.02 + "px", whiteSpace: "pre-line" }}>
                  {p}
                </p>
              ))}
              {m.qr && (
                <div style={{ fontSize: f.w * 0.026 * mm, color: "#777", marginTop: pxH * 0.01 }}>{URL_ACCESSO.replace("https://", "")}</div>
              )}
            </div>

            {/* firma */}
            <div style={{ marginBottom: pxH * 0.03 }}>
              <div style={{ fontFamily: stile === "mano" ? "'Caveat', cursive" : "'Fraunces', Georgia, serif", fontStyle: "italic", fontSize: f.w * 0.05 * mm, color: hex }}>{LINGUE[lingua].firma}</div>
              {luogoData && <div style={{ fontStyle: "italic", fontSize: f.w * 0.03 * mm, color: "#777", marginTop: 4 }}>{luogoData}</div>}
            </div>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url("https://fonts.googleapis.com/css2?family=Caveat:wght@500&display=swap");
            @media print {
              @page { size: ${f.pagina}; margin: 0; }
              html, body { background: #fff !important; }
              body * { visibility: hidden !important; }
              .foglio, .foglio * { visibility: visible !important; }
              .no-stampa-box { height: auto !important; overflow: visible !important; }
              .foglio { position: fixed !important; left: 0; top: 0; transform: none !important; border: none !important; box-shadow: none !important; width: ${f.w}mm !important; height: ${f.h}mm !important; }
            }
          `,
        }}
      />
    </main>
  );
}
