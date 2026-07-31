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
        </p>
      )}

      {alloggi && alloggi.length > 0 && (
        <ul>
          {alloggi.map((a) => (
            <li key={a.id}>{a.nome}</li>
          ))}
        </ul>
      )}

      <p><a href="/richieste">Vai alle richieste &rarr;</a></p>
    </main>
  );
}
