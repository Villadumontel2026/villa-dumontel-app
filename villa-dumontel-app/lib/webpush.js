// Invio di notifiche push (Web Push, standard VAPID + cifratura aes128gcm) senza librerie esterne.
import crypto from "node:crypto";

const b64u = (buf) => Buffer.from(buf).toString("base64url");
const fromB64u = (s) => Buffer.from(s, "base64url");

function chiaveVapid(pubB64, privB64) {
  const pub = fromB64u(pubB64); // 65 byte: 0x04 | x | y
  return crypto.createPrivateKey({
    format: "jwk",
    key: {
      kty: "EC",
      crv: "P-256",
      x: b64u(pub.subarray(1, 33)),
      y: b64u(pub.subarray(33, 65)),
      d: privB64,
    },
  });
}

function intestazioneVapid(endpoint, soggetto, pubB64, privB64) {
  const aud = new URL(endpoint).origin;
  const intest = b64u(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const corpo = b64u(
    JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: soggetto })
  );
  const firma = crypto.sign("sha256", Buffer.from(intest + "." + corpo), {
    key: chiaveVapid(pubB64, privB64),
    dsaEncoding: "ieee-p1363",
  });
  return "vapid t=" + intest + "." + corpo + "." + b64u(firma) + ", k=" + pubB64;
}

// RFC 8291 / RFC 8188 (aes128gcm)
export function cifraPayload(sub, testo) {
  const uaPublic = fromB64u(sub.p256dh);
  const authSecret = fromB64u(sub.auth);
  const ecdh = crypto.createECDH("prime256v1");
  ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const segreto = ecdh.computeSecret(uaPublic);
  const salt = crypto.randomBytes(16);

  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, asPublic]);
  const ikm = Buffer.from(crypto.hkdfSync("sha256", segreto, authSecret, keyInfo, 32));
  const cek = Buffer.from(crypto.hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(crypto.hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12));

  const cipher = crypto.createCipheriv("aes-128-gcm", cek, nonce);
  const cifrato = Buffer.concat([
    cipher.update(Buffer.concat([Buffer.from(testo, "utf-8"), Buffer.from([2])])),
    cipher.final(),
    cipher.getAuthTag(),
  ]);

  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, cifrato]);
}

// sub: {endpoint, p256dh, auth}; payload: oggetto {title, body, url}
export async function inviaPush(sub, payload) {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return { ok: false, status: 0, errore: "chiavi VAPID mancanti" };
  const soggetto =
    process.env.VAPID_SUBJECT ||
    "mailto:" + (process.env.NOTIFICHE_REPLY_TO || "accesso@villadumontel.it");
  try {
    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        Authorization: intestazioneVapid(sub.endpoint, soggetto, pub, priv),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "86400",
        Urgency: "normal",
      },
      body: cifraPayload(sub, JSON.stringify(payload)),
    });
    return { ok: res.ok, status: res.status, errore: res.ok ? null : (await res.text()).slice(0, 160) };
  } catch (e) {
    return { ok: false, status: 0, errore: e.message };
  }
}
