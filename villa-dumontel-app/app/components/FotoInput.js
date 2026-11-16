"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "./AppProvider";

// Bottoni "Scatta una foto" e "Scegli dalle foto"; mostra le anteprime e permette di toglierle.
// files: array di File gestito da chi usa il componente.
export default function FotoInput({ files, onChange, etichetta }) {
  const { lang } = useApp();
  const en = lang === "en";
  const camera = useRef(null);
  const galleria = useRef(null);
  const [anteprime, setAnteprime] = useState([]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setAnteprime(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  function aggiungi(e) {
    const nuovi = Array.from(e.target.files || []);
    if (nuovi.length) onChange([...files, ...nuovi]);
    e.target.value = "";
  }

  return (
    <div style={{ margin: "0 0 1rem" }}>
      <p style={{ margin: "0 0 0.4rem", fontWeight: 600 }}>{etichetta || (en ? "Photos (optional)" : "Foto (facoltative)")}</p>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button type="button" className="btn btn-light" onClick={() => camera.current && camera.current.click()}>
          {en ? "Take a photo" : "Scatta una foto"}
        </button>
        <button type="button" className="btn btn-light" onClick={() => galleria.current && galleria.current.click()}>
          {en ? "Choose from photos" : "Scegli dalle foto"}
        </button>
      </div>
      <input ref={camera} type="file" accept="image/*" capture="environment" onChange={aggiungi} style={{ display: "none" }} />
      <input ref={galleria} type="file" accept="image/*" multiple onChange={aggiungi} style={{ display: "none" }} />
      {anteprime.length > 0 && (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.6rem" }}>
          {anteprime.map((u, i) => (
            <div key={u} style={{ position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 8, display: "block" }} />
              <button
                type="button"
                aria-label={en ? "Remove" : "Togli"}
                onClick={() => onChange(files.filter((_, k) => k !== i))}
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  border: "none",
                  background: "#26261f",
                  color: "white",
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
