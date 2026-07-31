import { supabase } from "../lib/supabaseClient";

export default async function Home() {
  const { data: alloggi, error } = await supabase.from("alloggi").select("*");

  return (
    <main>
      <h1>Benvenuti a Villa Dumontel</h1>
      <p className="muted">
        Qui in futuro trover&agrave; le informazioni per gli ospiti. Per ora,
        questa &egrave; la pagina di test collegata al database.
      </p>

      <div className="card" style={{ marginTop: "1.5rem" }}>
        <h2>Alloggi</h2>

        {error && (
          <p style={{ color: "#a32d2d" }}>
            Errore nel leggere gli alloggi: {error.message}
          </p>
        )}

        {alloggi && alloggi.length > 0 && (
          <ul className="alloggi-list">
            {alloggi.map((a) => (
              <li key={a.id}>{a.nome}</li>
            ))}
          </ul>
        )}
      </div>

      <p style={{ marginTop: "1.5rem" }}>
        <a className="btn" href="/richieste">
          Vai alle richieste &rarr;
        </a>
      </p>
    </main>
  );
}
