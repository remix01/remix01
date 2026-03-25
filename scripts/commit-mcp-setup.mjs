import { execSync } from 'child_process';
import process from 'process';

try {
  process.chdir('/vercel/share/v0-project');
  
  // Configure git user
  try {
    execSync('git config user.email "v0@vercel.com"', { stdio: 'pipe' });
    execSync('git config user.name "v0 AI"', { stdio: 'pipe' });
  } catch (e) {
    console.log('[v0] Git config already set or skipped');
  }

  // Add all MCP files
  execSync('git add .mcp.json', { stdio: 'inherit' });
  execSync('git add .env.example', { stdio: 'inherit' });
  execSync('git add docs/mcp/', { stdio: 'inherit' });

  // Create commit
  const commitMessage = `chore: setup MCP (Model Context Protocol) configuration

- Add .mcp.json with Supabase, PostgreSQL, Upstash, Stripe, Sentry, GitHub, Vercel, Sequential Thinking, Memory, Brave Search, Filesystem, and Puppeteer MCP servers
- Update .env.example with all required MCP environment variables
- Add docs/mcp/MCP_SETUP_GUIDE.md with comprehensive setup instructions
- Add docs/mcp/ENV_VARS_CHECKLIST.md with environment variable reference
- Add docs/mcp/MCP_TOOLS_REFERENCE.md with detailed tool documentation
- Add docs/mcp/claude_desktop_config.example.json with Claude Desktop configuration template
- Add docs/mcp/README.md with MCP overview and quick start guide`;

  execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });

  console.log('✅ MCP configuration committed successfully!');
} catch (error) {
  console.error('❌ Error during commit:', error.message);
  process.exit(1);
}
