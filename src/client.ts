import {
  AgentRecord,
  RegisterPayload,
  ClientOptions,
  RenewPayload,
  RenewResult,
  WebhookPayload,
  WebhookResult,
  DiscoveryResult
} from "./types.js";

const DEFAULT_BASE_URL = "https://creduent.idevsec.com";

export class CreduentError extends Error {
  constructor(message: string, public statusCode?: number, public responseText?: string) {
    super(message);
    this.name = "CreduentError";
  }
}

export class AgentNotFoundError extends CreduentError {
  constructor(uri: string) {
    super(`Agent '${uri}' is not registered or has no active cryptographic attestation record.`, 404);
    this.name = "AgentNotFoundError";
  }
}

/**
 * Normalizes an agent URI to ensure it follows the canonical 'agent://<domain>/<path>' format.
 */
export function normalizeAgentUri(uri: string): string {
  let cleaned = uri.trim();
  if (cleaned.startsWith("agent:/") && !cleaned.startsWith("agent://")) {
    cleaned = "agent://" + cleaned.substring(7);
  } else if (cleaned.startsWith("agent:") && !cleaned.startsWith("agent://") && !cleaned.startsWith("agent:/")) {
    cleaned = "agent://" + cleaned.substring(6);
  } else if (!cleaned.startsWith("agent://")) {
    cleaned = "agent://" + cleaned;
  }
  return cleaned;
}

/**
 * Helper to build headers and fetch JSON from the registry securely.
 */
async function request<T>(
  url: string,
  method: "GET" | "POST",
  body?: any,
  options?: ClientOptions
): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    ...options?.headers,
  };

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }

  let response: Response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  try {
    response = await fetch(url, { ...fetchOptions, signal: controller.signal });
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new CreduentError("Registry request timed out after 10 seconds.");
    }
    throw new CreduentError(`Failed to connect to the Creduent Registry: ${error.message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 404) {
    throw new AgentNotFoundError(url.substring(url.indexOf("agent:")));
  }

  const text = await response.text();
  if (!response.ok) {
    throw new CreduentError(
      `Creduent Registry returned an unexpected error (${response.status} ${response.statusText}): ${text}`,
      response.status,
      text
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch (err) {
    throw new CreduentError(`Registry response is not valid JSON: ${text}`, response.status, text);
  }
}

/**
 * Resolves an AI agent's attestation record by their agent:// URI.
 * 
 * @param uri The agent:// URI of the AI agent
 * @param options Configurable options including custom registry baseUrl
 * @returns Full agent attestation record
 */
export async function resolveAgent(uri: string, options?: ClientOptions): Promise<AgentRecord> {
  const baseUrl = options?.baseUrl?.replace(/\/$/, "") || DEFAULT_BASE_URL;
  const normalizedUri = normalizeAgentUri(uri);

  // Construct the URL: e.g. https://creduent.idevsec.com/agent://creduent/reconbot
  const url = `${baseUrl}/${normalizedUri}`;
  return request<AgentRecord>(url, "GET", undefined, options);
}

import { verify, VerifyResult, discoverAgent as sdkDiscover } from "@idevsec/creduent";

/**
 * Verifies an AI agent identity natively using Ed25519 Web Crypto signatures.
 * Downloads the identity document and checks cryptographic integrity locally.
 * 
 * @param uri The agent:// URI of the AI agent
 * @param options Configurable options including custom registry baseUrl
 * @returns Cryptographic Verification Result
 */
export async function verifyAgent(uri: string, options?: ClientOptions): Promise<VerifyResult> {
  const originalEnv = process.env.CREDUENT_REGISTRY_URL;
  if (options?.baseUrl) {
    process.env.CREDUENT_REGISTRY_URL = options.baseUrl;
  }

  try {
    const result = await verify(uri);
    return result;
  } finally {
    if (originalEnv !== undefined) {
      process.env.CREDUENT_REGISTRY_URL = originalEnv;
    } else {
      delete process.env.CREDUENT_REGISTRY_URL;
    }
  }
}

/**
 * Registers an AI agent with the Creduent Attestation Registry.
 * 
 * @param payload Registration payload details
 * @param options Configurable options including custom registry baseUrl
 * @returns The created attestation record
 */
export async function registerAgent(payload: RegisterPayload, options?: ClientOptions): Promise<AgentRecord> {
  const baseUrl = options?.baseUrl?.replace(/\/$/, "") || DEFAULT_BASE_URL;

  // Normalise the agent ID inside payload
  const normalizedPayload = {
    ...payload,
    agent_id: normalizeAgentUri(payload.agent_id),
  };

  const url = `${baseUrl}/registry/register`;
  return request<AgentRecord>(url, "POST", normalizedPayload, options);
}

/**
 * Renews an agent's cryptographic attestation.
 */
export async function renewAgent(payload: RenewPayload, options?: ClientOptions): Promise<RenewResult> {
  const baseUrl = options?.baseUrl?.replace(/\/$/, "") || DEFAULT_BASE_URL;

  const normalizedPayload = {
    ...payload,
    agent_id: normalizeAgentUri(payload.agent_id),
  };

  const url = `${baseUrl}/registry/renew`;
  return request<RenewResult>(url, "POST", normalizedPayload, options);
}

/**
 * Registers a webhook URL for an agent.
 */
export async function registerWebhook(payload: WebhookPayload, options?: ClientOptions): Promise<WebhookResult> {
  const baseUrl = options?.baseUrl?.replace(/\/$/, "") || DEFAULT_BASE_URL;

  const normalizedPayload = {
    ...payload,
    agent_id: normalizeAgentUri(payload.agent_id),
  };

  const url = `${baseUrl}/registry/webhook/register`;
  return request<WebhookResult>(url, "POST", normalizedPayload, options);
}

/**
 * Queries the webhook URL registered for an agent.
 */
export async function queryWebhook(agentId: string, options?: ClientOptions): Promise<WebhookResult> {
  const baseUrl = options?.baseUrl?.replace(/\/$/, "") || DEFAULT_BASE_URL;
  const normalizedAgentId = normalizeAgentUri(agentId);

  const url = `${baseUrl}/registry/webhook/${encodeURIComponent(normalizedAgentId)}`;
  return request<WebhookResult>(url, "GET", undefined, options);
}

/**
 * Discovers an agent's capabilities.
 */
export async function discoverAgent(
  targetUri: string,
  myAgentId?: string,
  privateKeyPem?: string,
  options?: ClientOptions
): Promise<DiscoveryResult> {
  const originalEnv = process.env.CREDUENT_REGISTRY_URL;
  if (options?.baseUrl) {
    process.env.CREDUENT_REGISTRY_URL = options.baseUrl;
  }

  try {
    const result = await sdkDiscover(targetUri, myAgentId, privateKeyPem, options);
    return result;
  } finally {
    if (originalEnv !== undefined) {
      process.env.CREDUENT_REGISTRY_URL = originalEnv;
    } else {
      delete process.env.CREDUENT_REGISTRY_URL;
    }
  }
}


