import { generateKeyPairSync, sign, createPrivateKey } from "crypto";

import { canonicalize } from "@idevsec/creduent";

/**
 * Generates a new Ed25519 keypair.
 * Saves private key in PKCS8 PEM format and formats the public key as ed25519:<base64>.
 */
export function generateKeys(): { privateKeyPem: string; publicKeyStr: string } {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");

  // Export private key in PKCS8 PEM format
  const privateKeyPem = privateKey.export({
    type: "pkcs8",
    format: "pem",
  }) as string;

  // Export public key in SPKI DER format, then extract the raw 32 bytes
  const spkiDer = publicKey.export({
    type: "spki",
    format: "der",
  }) as Buffer;

  // An Ed25519 SPKI DER header is always 12 bytes. Slicing from index 12 gives raw 32 bytes.
  const rawPublicBytes = spkiDer.subarray(12);
  const publicKeyStr = `ed25519:${rawPublicBytes.toString("base64")}`;

  return { privateKeyPem, publicKeyStr };
}

/**
 * Signs a draft agent.json document with the provided private key PEM.
 * Returns the fully signed document with the 'signature' field added.
 */
export function signDocument(draft: Record<string, any>, privateKeyPem: string): Record<string, any> {
  const doc = { ...draft };

  // Normalize/set default fields
  doc["version"] = "1.0";
  if (!doc["issued_at"]) {
    // Standard UTC ISO timestamp without milliseconds to match standard Python outputs
    doc["issued_at"] = new Date().toISOString().replace(/\.\d{3}/, "");
  }

  // Ensure signature is removed before JCS canonicalization
  delete doc["signature"];

  // Canonicalize the payload
  const canonicalStr = canonicalize(doc);
  const canonicalBytes = Buffer.from(canonicalStr, "utf-8");

  // Load private key and sign
  const privateKeyObj = createPrivateKey(privateKeyPem);
  const signatureBytes = sign(null, canonicalBytes, privateKeyObj);
  const signatureBase64 = signatureBytes.toString("base64");

  // Add signature
  doc["signature"] = signatureBase64;

  return doc;
}
