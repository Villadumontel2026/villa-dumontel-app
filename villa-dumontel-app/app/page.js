import { supabase } from "../lib/supabaseClient";

export default async function Home() {
  const { data: alloggi, error } = await supabase
    .from("alloggi")
    .select("*");

  return (
    <main>
      <h1>Villa Dumontel</h1>
      <p>Test di collegamento al database.</p>

      {error && (
        <p style={{ color: "red" }}>
          Errore nel leggere gli alloggi: {error.message}
          <br />
          (Se dice "permission denied", serve una policy RLS che permetta
          la lettura pubblica della tabella "alloggi".)
        </p>
      )}

      {alloggi && alloggi.length > 0 && (
        <ul>
          {alloggi.map((a) => (
            <li key={a.id}>{a.nome}</li>
          ))}
        </ul>
      )}

      {alloggi && alloggi.length === 0 && !error && (
        <p>Connessione riuscita, ma nessun alloggio trovato (controlla la policy RLS).</p>
      )}
    </main>
  );
}
