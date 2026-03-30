<div align="center">

# commitpilot

**AI-powered git commit messages. Free with Ollama. Zero config.**

Generate meaningful commit messages from your staged changes using AI.

[![npm](https://img.shields.io/npm/v/aimsg)](https://www.npmjs.com/package/aimsg)
![License](https://img.shields.io/badge/license-MIT-blue)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

</div>

---

## Quick Start

```bash
# With Ollama (free, local, no API key needed)
npx aimsg

# Or install globally
npm install -g aimsg
aimsg
```

That's it. Stage your changes, run `aimsg`, and get a commit message.

## Demo

```
$ git add .
$ aimsg

  Provider: ollama | Model: llama3.2
  Files: src/auth.ts, src/routes/login.ts
  Generating commit message...

  feat(auth): add JWT-based authentication with refresh tokens

  [Y]es / [e]dit / [r]egenerate / [n]o? y

  Committed!
```

## Features

- **Free with Ollama** — no API key needed, runs 100% locally
- **Multi-provider** — supports Ollama, OpenAI, Anthropic, and Google
- **Conventional Commits** — generates properly formatted conventional commits
- **Interactive** — accept, edit, regenerate, or cancel
- **Zero config** — works out of the box with Ollama
- **Fast** — generates messages in seconds
- **Private** — with Ollama, your code never leaves your machine

## Providers

### Ollama (Default — Free)

Install [Ollama](https://ollama.com), then:

```bash
ollama pull llama3.2
aimsg
```

### OpenAI

```bash
export OPENAI_API_KEY=sk-...
AUTO_COMMIT_PROVIDER=openai aimsg
```

### Anthropic

```bash
export ANTHROPIC_API_KEY=sk-ant-...
AUTO_COMMIT_PROVIDER=anthropic aimsg
```

### Google

```bash
export GOOGLE_API_KEY=...
AUTO_COMMIT_PROVIDER=google aimsg
```

## Configuration

All configuration is via environment variables. No config files needed.

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTO_COMMIT_PROVIDER` | `ollama` | Provider: `ollama`, `openai`, `anthropic`, `google` |
| `AUTO_COMMIT_MODEL` | Auto | Model name (auto-selects best for provider) |
| `AUTO_COMMIT_CONVENTIONAL` | `true` | Use Conventional Commits format |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama server URL |

### Default Models Per Provider

| Provider | Default Model |
|----------|--------------|
| Ollama | `llama3.2` |
| OpenAI | `gpt-4o-mini` |
| Anthropic | `claude-haiku-4-5-20251001` |
| Google | `gemini-2.0-flash` |

## Options

```bash
aimsg              # Generate and commit
aimsg --dry-run    # Generate without committing
aimsg --help       # Show help
```

## How It Works

1. Reads your staged git diff (`git diff --cached`)
2. Sends the diff to your chosen AI model
3. Returns a clean, conventional commit message
4. You accept, edit, regenerate, or cancel

Your diff is truncated to 8000 characters to stay within token limits. Only the diff is sent — no other files or context.

## Tips

- **Add to your shell alias**: `alias ac="aimsg"` for quick access
- **Use with Ollama for free**: no API costs, no data leaves your machine
- **Custom models**: `AUTO_COMMIT_MODEL=codellama aimsg`

## Contributing

PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)

---

<div align="center">

**If this saves you time, give it a star.**

</div>

---

## Also By OuterSpacee

| Project | Description |
|---------|-------------|
| [Awesome AI Tools](https://github.com/OuterSpacee/awesome-ai-tools) | 200+ AI tools across 22 categories |
| [Build Your Own AI](https://github.com/OuterSpacee/build-your-own-ai) | 150+ tutorials for building AI projects from scratch |
| [AI Engineering Handbook](https://github.com/OuterSpacee/ai-engineering-handbook) | Everything you need to build production AI apps |
