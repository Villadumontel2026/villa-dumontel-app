"use client";

// Selettore a rotella: su iPhone/Android il menu nativo si apre come "ruota" da far girare.
// Usato al posto dei campi numerici (persone, passeggeri, ore).
//  tipo "numero": 1..max (passo 1) ; tipo "ore": 0.5..max (passo 0.5)
export default function SelettoreNumero({
  name,
  value,
  defaultValue,
  onChange,
  min = 1,
  max = 20,
  passo = 1,
  required = false,
  vuoto = "—",
  suffisso = "",
  style,
}) {
  const opzioni = [];
  for (let v = min; v <= max + 1e-9; v += passo) {
    opzioni.push(Math.round(v * 100) / 100);
  }
  const etichetta = (v) => String(v).replace(".", ",") + suffisso;
  const props = {};
  if (value !== undefined) props.value = value;
  else props.defaultValue = defaultValue === undefined || defaultValue === null ? "" : String(defaultValue);
  return (
    <select name={name} required={required} onChange={onChange} style={style} {...props}>
      {!required && <option value="">{vuoto}</option>}
      {required && (value === "" || (value === undefined && (defaultValue === undefined || defaultValue === ""))) && (
        <option value="">{vuoto}</option>
      )}
      {opzioni.map((v) => (
        <option key={v} value={v}>
          {etichetta(v)}
        </option>
      ))}
    </select>
  );
}
