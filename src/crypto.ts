import { generateKeyPairSync, sign, createPrivateKey, createHmac, timingSafeEqual } from "crypto";

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

import { readFileSync } from "fs";

/**
 * Loads a private key from the filesystem.
 */
export function loadPrivateKey(keyPath: string): string {
    try {
        return readFileSync(keyPath, "utf-8");
    } catch (err: any) {
        throw new Error(`Failed to load private key from '${keyPath}': ${err.message}`);
    }
}

/**
 * Signs a JCS payload with the private key and returns base64 signature.
 */
export function signPayload(payloadObj: object, privateKeyPem: string): string {
    const canonicalStr = canonicalize(payloadObj);
    const canonicalBytes = Buffer.from(canonicalStr, "utf-8");
    const privateKeyObj = createPrivateKey(privateKeyPem);
    const signatureBytes = sign(null, canonicalBytes, privateKeyObj);
    return signatureBytes.toString("base64");
}

/**
 * Verifies an HMAC-SHA256 signature for a Creduent webhook payload.
 * Uses JCS canonicalization and timing-safe comparison.
 *
 * @param secret - The pre-shared webhook secret
 * @param signatureHex - The hex signature from X-Creduent-Signature256
 * @param timestamp - The timestamp from X-Creduent-Timestamp
 * @param payload - The parsed webhook payload object
 */
export function verifyWebhookSignature(
    secret: string,
    signatureHex: string,
    timestamp: string,
    payload: object
): boolean {
    try {
        const canonical = canonicalize(payload);
        const signedData = `${timestamp}.${canonical}`;
        const expectedSig = createHmac("sha256", secret).update(signedData).digest("hex");
        const expectedBuf = Buffer.from(expectedSig, "utf-8");
        const actualBuf = Buffer.from(signatureHex, "utf-8");
        if (expectedBuf.length !== actualBuf.length) return false;
        return timingSafeEqual(expectedBuf, actualBuf);
    } catch {
        return false;
    }
}

/**
 * Converts a Creduent agent:// URI into a W3C DID URI (did:creduent or did:web).
 */
export function agentToDid(agentId: string, options?: { method?: "creduent" | "web"; domain?: string }): string {
    if (!agentId.startsWith("agent://")) {
        throw new Error(`Invalid agent_id scheme: ${agentId}. Expected 'agent://...'`);
    }
    const rawPath = agentId.slice(8).replace(/^\/+|\/+$/g, "");
    const parts = rawPath.split("/");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
        throw new Error(`Invalid agent_id format: ${agentId}. Expected 'agent://namespace/name'`);
    }
    const [namespace, name] = parts;
    const method = options?.method || "creduent";
    if (method === "creduent") {
        return `did:creduent:${namespace}:${name}`;
    } else if (method === "web") {
        const targetDomain = options?.domain || `${namespace}.com`;
        const cleanDomain = targetDomain.replace(/\//g, ":");
        return `did:web:${cleanDomain}:agent:${name}`;
    }
    throw new Error(`Unsupported DID method: '${method}'`);
}

/**
 * Parses a did:creduent or did:web URI back into a Creduent agent:// URI.
 */
export function didToAgent(didUri: string): string {
    if (didUri.startsWith("did:creduent:")) {
        const parts = didUri.slice(13).split(":");
        if (parts.length >= 2) {
            return `agent://${parts[0]}/${parts[1]}`;
        }
    } else if (didUri.startsWith("did:web:")) {
        const parts = didUri.slice(8).split(":");
        if (parts.length >= 3 && parts[parts.length - 2] === "agent") {
            const name = parts[parts.length - 1];
            const namespace = parts[0].split(".")[0];
            return `agent://${namespace}/${name}`;
        } else if (parts.length >= 2) {
            const namespace = parts[0].split(".")[0];
            const name = parts[parts.length - 1];
            return `agent://${namespace}/${name}`;
        }
    }
    throw new Error(`Unsupported DID scheme: ${didUri}`);
}

/**
 * Generates a standard W3C DID Document (JSON-LD) from a Creduent agent.json dictionary or record.
 */
export function agentToDidDocument(agentData: Record<string, any>, options?: { method?: "creduent" | "web"; domain?: string }): Record<string, any> {
    const agentId = agentData.agent_id || agentData.identity?.agent_id;
    if (!agentId) {
        throw new Error("agentData missing required 'agent_id' field");
    }
    const didId = agentToDid(agentId, options);
    let publicKey = agentData.public_key;
    if (!publicKey && agentData.identity?.keys && agentData.identity.keys.length > 0) {
        publicKey = agentData.identity.keys[0].public_key;
    }
    const keyId = `${didId}#key-1`;
    const endpoint = agentData.endpoint || agentData.identity?.endpoint || "";
    const didDoc: Record<string, any> = {
        "@context": [
            "https://www.w3.org/ns/did/v1",
            "https://w3id.org/security/suites/ed25519-2020/v1"
        ],
        id: didId,
        alsoKnownAs: [agentId],
        verificationMethod: [
            {
                id: keyId,
                type: "Ed25519VerificationKey2020",
                controller: didId,
                publicKeyMultibase: publicKey || ""
            }
        ],
        authentication: [keyId],
        assertionMethod: [keyId],
        service: []
    };
    if (endpoint) {
        didDoc.service.push({
            id: `${didId}#endpoint`,
            type: "AgentServiceEndpoint",
            serviceEndpoint: endpoint
        });
    }
    return didDoc;
}

