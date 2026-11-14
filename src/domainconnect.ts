/*
 * Copyright 2026 IDevSec
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import http from "node:http";
import crypto from "node:crypto";
import { exec } from "node:child_process";
import { resolveTxt } from "node:dns/promises";

export interface DomainConnectSettings {
    providerId: string;
    providerName: string;
    providerDisplayName: string;
    urlSyncUX: string;
    urlAPI: string;
}

export interface LoopbackResult {
    success: boolean;
    providerName?: string;
    manualDnsNeeded?: boolean;
    error?: string;
}

/**
 * Discovers if the domain's authoritative DNS provider supports Domain Connect.
 * Queries `_domainconnect.<domain>` and fetches the provider settings.
 */
export async function discoverDomainConnect(domain: string): Promise<DomainConnectSettings | null> {
    try {
        let prefix: string | null = null;

        // 1. Try native DNS TXT lookup
        try {
            const records = await resolveTxt(`_domainconnect.${domain}`);
            if (records && records.length > 0 && records[0].length > 0) {
                prefix = records[0].join("");
            }
        } catch {
            // Native DNS query failed, fallback to DNS-over-HTTPS
        }

        // 2. Fallback to Cloudflare DoH (1.1.1.1)
        if (!prefix) {
            try {
                const dohRes = await fetch(
                    `https://cloudflare-dns.com/dns-query?name=_domainconnect.${domain}&type=TXT`,
                    { headers: { Accept: "application/dns-json" } }
                );
                if (dohRes.ok) {
                    const data: any = await dohRes.json();
                    if (data.Answer && data.Answer.length > 0) {
                        prefix = data.Answer[0].data.replace(/^"|"$/g, "");
                    }
                }
            } catch {
                // DoH failed
            }
        }

        if (!prefix) {
            return null;
        }

        // Clean prefix path
        prefix = prefix.replace(/^https?:\/\//, "").replace(/\/+$/, "");

        // 3. Fetch Domain Connect settings for this domain
        const settingsUrl = `https://${prefix}/v2/${domain}/settings`;
        const settingsRes = await fetch(settingsUrl);
        if (!settingsRes.ok) {
            return null;
        }

        const settings: any = await settingsRes.json();
        if (settings.urlSyncUX || settings.urlAsyncUX) {
            return {
                providerId: settings.providerId || "unknown",
                providerName: settings.providerName || "unknown",
                providerDisplayName: settings.providerDisplayName || settings.providerName || "Domain Registrar",
                urlSyncUX: settings.urlSyncUX || settings.urlAsyncUX,
                urlAPI: settings.urlAPI || "",
            };
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Launches the system's default browser across platforms.
 */
export function openBrowser(url: string): void {
    const platform = process.platform;
    if (platform === "win32") {
        exec(`start "" "${url}"`);
    } else if (platform === "darwin") {
        exec(`open "${url}"`);
    } else {
        exec(`xdg-open "${url}"`);
    }
}

/**
 * Runs the 1-click Domain Connect browser loopback handshake.
 */
export async function runDomainConnectLoopback(options: {
    domain: string;
    agentId: string;
    publicKey: string;
    host?: string;
    timeoutSeconds?: number;
}): Promise<LoopbackResult> {
    const { domain, agentId, publicKey, host = "@", timeoutSeconds = 120 } = options;

    // 1. Discover Domain Connect support
    const settings = await discoverDomainConnect(domain);
    if (!settings || !settings.urlSyncUX) {
        return { success: false, manualDnsNeeded: true };
    }

    const stateNonce = crypto.randomBytes(16).toString("hex");

    return new Promise((resolveResult) => {
        let server: http.Server | null = null;
        let timeoutHandle: NodeJS.Timeout | null = null;

        const cleanup = () => {
            if (timeoutHandle) clearTimeout(timeoutHandle);
            if (server) {
                try {
                    server.close();
                } catch {
                    // ignore
                }
                server = null;
            }
        };

        server = http.createServer((req, res) => {
            const reqUrl = new URL(req.url || "/", `http://${req.headers.host}`);

            if (reqUrl.pathname === "/callback") {
                const receivedState = reqUrl.searchParams.get("state");
                const error = reqUrl.searchParams.get("error");

                if (error) {
                    res.writeHead(200, { "Content-Type": "text/html" });
                    res.end(`
            <!DOCTYPE html>
            <html>
            <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; text-align: center; padding-top: 15vh;">
              <h1 style="color: #ef4444; font-size: 28px;">DNS Configuration Cancelled</h1>
              <p style="color: #94a3b8; font-size: 16px;">The DNS configuration was declined. You can close this window and configure DNS manually.</p>
            </body>
            </html>
          `);
                    cleanup();
                    resolveResult({ success: false, error: `Registrar error: ${error}` });
                    return;
                }

                if (receivedState !== stateNonce) {
                    res.writeHead(400, { "Content-Type": "text/html" });
                    res.end("<h1>Error: Invalid State Nonce (Anti-CSRF check failed)</h1>");
                    cleanup();
                    resolveResult({ success: false, error: "Invalid state nonce" });
                    return;
                }

                // Success response to browser
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Creduent - DNS Configured</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
              .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 40px; text-align: center; max-width: 480px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
              h1 { color: #4ade80; font-size: 24px; margin-bottom: 12px; }
              p { color: #94a3b8; font-size: 15px; line-height: 1.5; }
              .badge { display: inline-block; background: #0ea5e9; color: #fff; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
            </style>
          </head>
          <body>
            <div class="card">
              <span class="badge">Creduent Protocol</span>
              <h1>✔ DNS Record Configured!</h1>
              <p>The cryptographic TXT verification record has been applied to <strong>${domain}</strong>.</p>
              <p style="margin-top: 16px; color: #64748b; font-size: 13px;">You may now close this browser tab and return to your terminal.</p>
            </div>
          </body>
          </html>
        `);

                cleanup();
                resolveResult({
                    success: true,
                    providerName: settings.providerDisplayName,
                });
            }
        });

        server.listen(0, "127.0.0.1", () => {
            const address = server!.address() as any;
            const port = address.port;
            const redirectUri = `http://127.0.0.1:${port}/callback`;

            // Clean base UX url
            let baseUX = settings.urlSyncUX.replace(/\/+$/, "");
            if (!baseUX.includes("/domainTemplates")) {
                baseUX += "/v2/domainTemplates";
            }

            const applyUrl = `${baseUX}/providers/idevsec.com/services/creduent-agent-identity/apply?domain=${encodeURIComponent(
                domain
            )}&host=${encodeURIComponent(host)}&agent_id=${encodeURIComponent(
                agentId
            )}&public_key=${encodeURIComponent(publicKey)}&redirect_uri=${encodeURIComponent(
                redirectUri
            )}&state=${stateNonce}`;

            console.log(
                `✔ Discovered DNS Provider: \x1b[1m\x1b[32m${settings.providerDisplayName}\x1b[0m \x1b[90m(Domain Connect ready)\x1b[0m`
            );
            console.log(`> Launching browser for 1-click DNS authorization...`);
            console.log(`  \x1b[90mOr open directly:\x1b[0m \x1b[4m${applyUrl}\x1b[0m\n`);
            console.log(`\x1b[33m⏳ Waiting for approval in browser...\x1b[0m`);

            openBrowser(applyUrl);

            timeoutHandle = setTimeout(() => {
                cleanup();
                resolveResult({
                    success: false,
                    error: `Timed out waiting for DNS authorization after ${timeoutSeconds}s.`,
                });
            }, timeoutSeconds * 1000);
        });
    });
}

/**
 * Direct Cloudflare API provisioning using an API token (Headless / CI/CD).
 */
export async function provisionCloudflareDirect(params: {
    domain: string;
    agentId: string;
    publicKey: string;
    cfToken: string;
}): Promise<{ success: boolean; error?: string }> {
    const { domain, agentId, publicKey, cfToken } = params;

    try {
        // 1. Get Zone ID for domain
        const zoneRes = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${domain}`, {
            headers: {
                Authorization: `Bearer ${cfToken}`,
                "Content-Type": "application/json",
            },
        });

        if (!zoneRes.ok) {
            return { success: false, error: `Cloudflare API error: ${zoneRes.statusText}` };
        }

        const zoneData: any = await zoneRes.json();
        if (!zoneData.result || zoneData.result.length === 0) {
            return { success: false, error: `No Cloudflare zone found for domain: ${domain}` };
        }

        const zoneId = zoneData.result[0].id;

        // 2. Create or update _creduent TXT record
        const recordContent = `v=creduent1; agent=${agentId}; k=${publicKey}`;
        const recordName = `_creduent.${domain}`;

        // Check for existing _creduent record
        const existingRes = await fetch(
            `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?type=TXT&name=${recordName}`,
            {
                headers: {
                    Authorization: `Bearer ${cfToken}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const existingData: any = await existingRes.json();
        if (existingData.result && existingData.result.length > 0) {
            const existingId = existingData.result[0].id;
            // Update existing
            const updateRes = await fetch(
                `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${existingId}`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${cfToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        type: "TXT",
                        name: "_creduent",
                        content: recordContent,
                        ttl: 300,
                    }),
                }
            );
            return { success: updateRes.ok };
        } else {
            // Create new
            const createRes = await fetch(
                `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${cfToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        type: "TXT",
                        name: "_creduent",
                        content: recordContent,
                        ttl: 300,
                    }),
                }
            );
            return { success: createRes.ok };
        }
    } catch (err: any) {
        return { success: false, error: err.message || "Failed to call Cloudflare API" };
    }
}

