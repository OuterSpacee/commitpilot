#!/usr/bin/env node

import { execSync } from "child_process";
import * as readline from "readline";

// ── Config ───────────────────────────────────────────────────────────────────

interface Config {
  provider: "ollama" | "openai" | "anthropic" | "google";
  model: string;
  apiKey?: string;
  ollamaUrl: string;
  maxDiffLength: number;
  conventional: boolean;
}

function getConfig(): Config {
  return {
    provider: (process.env.AUTO_COMMIT_PROVIDER as Config["provider"]) || "ollama",
    model: process.env.AUTO_COMMIT_MODEL || getDefaultModel(),
    apiKey: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GOOGLE_API_KEY,
    ollamaUrl: process.env.OLLAMA_URL || "http://localhost:11434",
    maxDiffLength: parseInt(process.env.AUTO_COMMIT_MAX_DIFF || "8000"),
    conventional: process.env.AUTO_COMMIT_CONVENTIONAL !== "false",
  };
}

function getDefaultModel(): string {
  const provider = process.env.AUTO_COMMIT_PROVIDER || "ollama";
  switch (provider) {
    case "ollama": return "llama3.2";
    case "openai": return "gpt-4o-mini";
    case "anthropic": return "claude-haiku-4-5-20251001";
    case "google": return "gemini-2.0-flash";
    default: return "llama3.2";
  }
}

// ── Git ──────────────────────────────────────────────────────────────────────

function getGitDiff(): string {
  try {
    // Try staged changes first
    let diff = execSync("git diff --cached --stat --patch", { encoding: "utf-8" });
    if (!diff.trim()) {
      // Fall back to unstaged changes
      diff = execSync("git diff --stat --patch", { encoding: "utf-8" });
    }
    if (!diff.trim()) {
      console.error("No changes detected. Stage your changes with `git add` first.");
      process.exit(1);
    }
    return diff;
  } catch {
    console.error("Not a git repository or git is not installed.");
    process.exit(1);
  }
}

function getStagedFiles(): string[] {
  try {
    const output = execSync("git diff --cached --name-only", { encoding: "utf-8" });
    return output.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function commitWithMessage(message: string): void {
  try {
    execSync(`git commit -m ${JSON.stringify(message)}`, { stdio: "inherit" });
  } catch {
    console.error("Commit failed.");
    process.exit(1);
  }
}

// ── LLM Providers ────────────────────────────────────────────────────────────

function buildPrompt(diff: string, conventional: boolean): string {
  const format = conventional
    ? `Use Conventional Commits format: <type>(<optional scope>): <description>

Types: feat, fix, refactor, docs, style, test, chore, perf, ci, build

Examples:
- feat(auth): add OAuth2 login support
- fix: resolve null pointer in user service
- refactor(api): simplify error handling middleware
- docs: update installation guide`
    : `Write a clear, concise commit message. Start with an imperative verb.

Examples:
- Add user authentication with OAuth2
- Fix null pointer exception in user service
- Update installation guide`;

  return `You are a git commit message generator. Given a git diff, write ONE commit message.

Rules:
- One line only, max 72 characters
- Be specific about what changed
- No quotes, no period at the end
- ${format}

Git diff:
\`\`\`
${diff}
\`\`\`

Commit message:`;
}

async function callOllama(prompt: string, config: Config): Promise<string> {
  const response = await fetch(`${config.ollamaUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model,
      prompt,
      stream: false,
      options: { temperature: 0.3, num_predict: 100 },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama error: ${text}. Is Ollama running? Try: ollama serve`);
  }

  const data = (await response.json()) as { response: string };
  return data.response.trim();
}

async function callOpenAI(prompt: string, config: Config): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY environment variable is required");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 100,
    }),
  });

  if (!response.ok) throw new Error(`OpenAI error: ${await response.text()}`);
  const data = (await response.json()) as { choices: [{ message: { content: string } }] };
  return data.choices[0].message.content.trim();
}

async function callAnthropic(prompt: string, config: Config): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY environment variable is required");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 100,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`Anthropic error: ${await response.text()}`);
  const data = (await response.json()) as { content: [{ text: string }] };
  return data.content[0].text.trim();
}

async function callGoogle(prompt: string, config: Config): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY environment variable is required");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 100 },
    }),
  });

  if (!response.ok) throw new Error(`Google AI error: ${await response.text()}`);
  const data = (await response.json()) as { candidates: [{ content: { parts: [{ text: string }] } }] };
  return data.candidates[0].content.parts[0].text.trim();
}

async function generateMessage(prompt: string, config: Config): Promise<string> {
  switch (config.provider) {
    case "ollama": return callOllama(prompt, config);
    case "openai": return callOpenAI(prompt, config);
    case "anthropic": return callAnthropic(prompt, config);
    case "google": return callGoogle(prompt, config);
  }
}

// ── CLI ──────────────────────────────────────────────────────────────────────

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function cleanMessage(raw: string): string {
  // Remove quotes, markdown, and extra whitespace
  let msg = raw.replace(/^["'`]+|["'`]+$/g, "").trim();
  // Take only the first line
  msg = msg.split("\n")[0].trim();
  // Remove trailing period
  if (msg.endsWith(".")) msg = msg.slice(0, -1);
  // Cap at 72 chars
  if (msg.length > 72) msg = msg.slice(0, 72);
  return msg;
}

function printHelp(): void {
  console.log(`
  auto-commit - AI-powered git commit messages

  Usage:
    auto-commit              Generate a commit message and commit
    auto-commit --dry-run    Generate message without committing
    auto-commit --help       Show this help

  Environment Variables:
    AUTO_COMMIT_PROVIDER     ollama (default), openai, anthropic, google
    AUTO_COMMIT_MODEL        Model name (default depends on provider)
    AUTO_COMMIT_CONVENTIONAL true (default) or false for conventional commits
    OLLAMA_URL               Ollama server URL (default: http://localhost:11434)
    OPENAI_API_KEY           Required for OpenAI provider
    ANTHROPIC_API_KEY        Required for Anthropic provider
    GOOGLE_API_KEY           Required for Google provider

  Examples:
    # Free with Ollama (default - no API key needed)
    auto-commit

    # Use OpenAI
    AUTO_COMMIT_PROVIDER=openai auto-commit

    # Use Anthropic
    AUTO_COMMIT_PROVIDER=anthropic auto-commit

    # Use Google
    AUTO_COMMIT_PROVIDER=google auto-commit

    # Custom model
    AUTO_COMMIT_MODEL=mistral auto-commit
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  const dryRun = args.includes("--dry-run");
  const config = getConfig();

  // Get the diff
  const diff = getGitDiff();
  const stagedFiles = getStagedFiles();
  const truncatedDiff = diff.length > config.maxDiffLength
    ? diff.slice(0, config.maxDiffLength) + "\n... (diff truncated)"
    : diff;

  console.log(`\n  Provider: ${config.provider} | Model: ${config.model}`);
  if (stagedFiles.length > 0) {
    console.log(`  Files: ${stagedFiles.join(", ")}`);
  }
  console.log("  Generating commit message...\n");

  try {
    const prompt = buildPrompt(truncatedDiff, config.conventional);
    let message = cleanMessage(await generateMessage(prompt, config));

    // Interactive loop
    while (true) {
      console.log(`  ${message}\n`);

      if (dryRun) {
        console.log("  (dry run - not committing)");
        return;
      }

      const choice = await ask("  [Y]es / [e]dit / [r]egenerate / [n]o? ");

      switch (choice.toLowerCase()) {
        case "y":
        case "yes":
        case "":
          commitWithMessage(message);
          console.log("\n  Committed!");
          return;

        case "e":
        case "edit": {
          const edited = await ask(`  Edit message: `);
          if (edited) message = edited;
          break;
        }

        case "r":
        case "regenerate":
          console.log("  Regenerating...\n");
          message = cleanMessage(await generateMessage(prompt, config));
          break;

        case "n":
        case "no":
          console.log("  Aborted.");
          return;

        default:
          break;
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\n  Error: ${msg}\n`);
    process.exit(1);
  }
}

main();
