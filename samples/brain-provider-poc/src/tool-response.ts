import { readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';

// Host-side helper: input MUST be the result of the actual requested MCP call,
// not a locally synthesized cloud success. Private tool metadata stays in .runs.
const [mailbox, expectedTool, resultFile] = process.argv.slice(2);
if (!mailbox || !expectedTool || !resultFile) throw new Error('Usage: tool-response MAILBOX EXPECTED_TOOL CAPTURED_RESULT_JSON');
const request = JSON.parse(await readFile(join(mailbox, 'request.json'), 'utf8')) as { id: string; name: string };
if (request.name !== expectedTool) throw new Error(`Pending request is ${request.name}, not ${expectedTool}`);
const result = JSON.parse(await readFile(resultFile, 'utf8'));
const staging = join(mailbox, 'response.staging');
await writeFile(staging, JSON.stringify({ id: request.id, result }));
await rename(staging, join(mailbox, 'response.json'));
console.log(JSON.stringify({ kind: 'captured-tool-result-delivered', name: expectedTool }));
