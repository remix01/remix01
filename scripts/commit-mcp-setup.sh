#!/bin/bash

# Git configuration and commit for MCP setup
cd /vercel/share/v0-project

# Configure git user if needed
git config user.email "v0@vercel.com" || true
git config user.name "v0 AI" || true

# Add all the new MCP files
git add .mcp.json
git add .env.example
git add docs/mcp/

# Commit with descriptive message
git commit -m "chore: setup MCP (Model Context Protocol) configuration

- Add .mcp.json with Supabase, PostgreSQL, Upstash, Stripe, Sentry, GitHub, Vercel, Sequential Thinking, Memory, Brave Search, Filesystem, and Puppeteer MCP servers
- Update .env.example with all required MCP environment variables
- Add docs/mcp/MCP_SETUP_GUIDE.md with comprehensive setup instructions
- Add docs/mcp/ENV_VARS_CHECKLIST.md with environment variable reference
- Add docs/mcp/MCP_TOOLS_REFERENCE.md with detailed tool documentation
- Add docs/mcp/claude_desktop_config.example.json with Claude Desktop configuration template
- Add docs/mcp/README.md with MCP overview and quick start guide"

echo "✅ MCP configuration committed successfully!"
