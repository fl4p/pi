import { describe, expect, it } from "vitest";
import { streamSimple } from "../src/compat.ts";
import type { Context, Model } from "../src/types.ts";

interface AnthropicPayload {
	system?: Array<{ type: string; text: string }>;
	messages: Array<{ role: string; content: string | Array<{ type: string; text?: string }> }>;
}

class PayloadCaptured extends Error {}

const model: Model<"anthropic-messages"> = {
	id: "claude-sonnet-4-5",
	name: "Claude Sonnet 4.5",
	api: "anthropic-messages",
	provider: "anthropic",
	baseUrl: "http://127.0.0.1:9",
	reasoning: false,
	input: ["text"],
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	contextWindow: 200000,
	maxTokens: 1024,
};

const context: Context = {
	systemPrompt: "You are pi, a coding agent.",
	messages: [{ role: "user", content: "hello", timestamp: Date.now() }],
};

async function capture(apiKey: string): Promise<AnthropicPayload> {
	let payload: AnthropicPayload | undefined;
	const stream = streamSimple(model, context, {
		apiKey,
		onPayload: (p) => {
			payload = p as AnthropicPayload;
			throw new PayloadCaptured("captured");
		},
	});
	await stream.result();
	if (!payload) throw new Error("Expected payload capture before request");
	return payload;
}

describe("Anthropic OAuth system prompt placement", () => {
	it("keeps the OAuth system block to the Claude Code identity line alone", async () => {
		const payload = await capture("sk-ant-oat01-test");
		expect(payload.system?.map((block) => block.text)).toEqual([
			"You are Claude Code, Anthropic's official CLI for Claude.",
		]);
		const first = payload.messages[0];
		expect(first.role).toBe("user");
		expect(Array.isArray(first.content) && first.content.map((block) => block.text)).toEqual([
			"You are pi, a coding agent.",
			"hello",
		]);
	});

	it("leaves the system prompt in the system block for API keys", async () => {
		const payload = await capture("sk-ant-api03-test");
		expect(payload.system?.map((block) => block.text)).toEqual(["You are pi, a coding agent."]);
	});
});
