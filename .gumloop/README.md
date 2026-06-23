# Gumloop Coding Agent for Verida AI

This directory contains configuration and skills for using Gumloop as a coding assistant for the Verida AI project.

## Quick Start

### 1. Authenticate Gumloop CLI

```bash
gumloop login --method oauth
```

Open the URL in your browser and complete authentication.

### 2. Run Setup Script

```bash
cd "/home/izzy/Videos/Verida AI"
./.gumloop/setup.sh
```

### 3. Create Agent in Gumloop Web UI

1. Go to https://app.gumloop.com
2. Click **Create Agent**
3. Name it **"Verida AI Coding Assistant"**
4. Copy the system prompt from `coding-agent-config.json`
5. Enable **Code Sandbox** (on by default)
6. Add **GitHub MCP** server
7. Upload skills from `skills/` directory

### 4. Add Secrets

In agent Settings → Secrets:
- `GITHUB_TOKEN` - Your GitHub personal access token
- `SHELBY_API_KEY` - Your Shelby API key (from .env)

## Files

| File | Purpose |
|------|---------|
| `coding-agent-config.json` | Agent configuration and system prompt |
| `skills/verida-coding-standards.md` | Project coding standards |
| `skills/typescript-patterns.md` | TypeScript code patterns |
| `skills/react-patterns.md` | React component patterns |
| `setup.sh` | Automated setup script |

## Usage Examples

### Fix a Bug
```
Read apps/api/src/routes/datasets.ts line 726 and fix the SQL injection 
vulnerability by escaping LIKE wildcards in the search query.
```

### Implement a Feature
```
Implement the handleSaveProfile function in apps/web/src/pages/Settings.tsx 
to save profile data to the API. Use the existing API client patterns.
```

### Write Tests
```
Write unit tests for the Shelby upload functionality in 
apps/api/src/lib/shelby/upload.ts using Vitest.
```

### Code Review
```
Review the upload worker in apps/api/src/lib/queue/workers/uploadWorker.ts 
for any issues or improvements.
```

## Credit Costs

| Action | Credits |
|--------|---------|
| Run Code (Python/shell) | 2-3 |
| Ask AI (simple) | 2-3 |
| Ask AI (complex) | 10-30 |
| GitHub MCP calls | Free |
| Web Search | Free |

## Tips

1. **Batch requests** - Ask for multiple fixes in one prompt to save credits
2. **Use Skills** - The pre-loaded skills help the agent understand your codebase
3. **Be specific** - Include file paths and line numbers when possible
4. **Use Run Code** - For execution tasks, it's cheaper than Ask AI

## Token Efficiency

Gumloop agents use ~3,000-5,000 tokens for tool schemas. To minimize:
- Keep conversations focused on one task
- Start new conversations for unrelated tasks
- Use the CLI for simple queries instead of the agent

## Troubleshooting

**Authentication failed:**
```bash
gumloop login --method oauth --no-browser
```

**Agent not responding:**
- Check if Code Sandbox is enabled
- Verify secrets are configured
- Check credit balance in Gumloop dashboard

**GitHub MCP not working:**
- Ensure GitHub MCP is added to the agent
- Verify GITHUB_TOKEN secret is set
- Check token has required permissions
