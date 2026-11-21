import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { logRequestPayload } from "../src/utils/payload-log.ts";

describe("logRequestPayload", () => {
	const dirs: string[] = [];
	afterEach(() => {
		for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
	});

	it("appends one JSON line per request when PI_PAYLOAD_LOG is set", async () => {
		const dir = mkdtempSync(join(tmpdir(), "pi-payload-log-"));
		dirs.push(dir);
		const path = join(dir, "payloads.jsonl");

		await logRequestPayload("model-a", { messages: [1] }, { PI_PAYLOAD_LOG: path });
		await logRequestPayload("model-b", { messages: [2] }, { PI_PAYLOAD_LOG: path });

		const lines = readFileSync(path, "utf-8")
			.trim()
			.split("\n")
			.map((line) => JSON.parse(line));
		expect(lines.map((line) => [line.modelId, line.params])).toEqual([
			["model-a", { messages: [1] }],
			["model-b", { messages: [2] }],
		]);
		expect(typeof lines[0].ts).toBe("string");
	});

	it("never throws when the log path is unwritable", async () => {
		await expect(
			logRequestPayload("m", {}, { PI_PAYLOAD_LOG: "/nonexistent-dir/x/payloads.jsonl" }),
		).resolves.toBeUndefined();
	});
});
