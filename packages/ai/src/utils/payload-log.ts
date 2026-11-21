import type { ProviderEnv } from "../types.ts";
import { getProviderEnvValue } from "./provider-env.ts";

/**
 * Debug aid: when PI_PAYLOAD_LOG names a file, append the outgoing request body as one
 * JSON line ({ ts, modelId, params }). Called before `onPayload`, so it records what pi
 * built, not what an extension rewrote. Best effort: logging failures never fail the
 * request, and `node:fs` is loaded lazily so browser builds never import it.
 */
export async function logRequestPayload(modelId: string, params: unknown, env?: ProviderEnv): Promise<void> {
	const path = getProviderEnvValue("PI_PAYLOAD_LOG", env);
	if (!path) return;
	try {
		const { appendFileSync } = await import("node:fs");
		appendFileSync(path, `${JSON.stringify({ ts: new Date().toISOString(), modelId, params })}\n`);
	} catch {
		// Never let a debug log break the request.
	}
}
