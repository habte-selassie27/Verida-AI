#!/bin/bash
# Gumloop Coding Agent Setup Script for Verida AI

echo "🔧 Setting up Gumloop Coding Agent for Verida AI..."
echo ""

# Check if gumloop CLI is installed
if ! command -v gumloop &> /dev/null; then
    echo "❌ Gumloop CLI not found. Installing..."
    pip install gumloop
fi

# Check if authenticated
if ! gumloop mcp list &> /dev/null; then
    echo "❌ Not authenticated. Please run:"
    echo "   gumloop login --method oauth"
    echo ""
    echo "Then complete the browser authentication."
    exit 1
fi

echo "✅ Gumloop CLI authenticated"
echo ""

# List available MCP servers
echo "📡 Available MCP servers:"
gumloop mcp list
echo ""

# Create agent via API
echo "🤖 Creating coding agent..."
echo ""
echo "Please go to https://app.gumloop.com and:"
echo "1. Click 'Create Agent'"
echo "2. Name it 'Verida AI Coding Assistant'"
echo "3. Use the system prompt from .gumloop/coding-agent-config.json"
echo "4. Enable Code Sandbox (should be on by default)"
echo "5. Add GitHub MCP server"
echo "6. Add the skills from .gumloop/skills/"
echo ""

# Upload skills
echo "📦 Uploading skills..."
for skill in .gumloop/skills/*.md; do
    if [ -f "$skill" ]; then
        echo "   Uploading: $(basename $skill)"
        gumloop skills upload "$skill" 2>/dev/null || echo "   ⚠️  Manual upload needed: $skill"
    fi
done

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Complete agent creation in Gumloop web UI"
echo "2. Add GitHub MCP server to the agent"
echo "3. Add secrets (GITHUB_TOKEN, SHELBY_API_KEY)"
echo "4. Start chatting with your coding agent!"
echo ""
echo "💡 Tip: Use 'gumloop chat' to interact with agents from terminal"
