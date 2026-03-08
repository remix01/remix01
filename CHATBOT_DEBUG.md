## CHATBOT DEBUG SUMMARY

### Problem Found
The chat component was sending requests to the WRONG endpoint with WRONG field names.

### API Route: `/app/api/agent/chat/route.ts`
```
POST /api/agent/chat
Input:  { message: string, conversationHistory: Array }
Output: { message: string, conversationHistory: Array }
ANTHROPIC_API_KEY: Read from process.env.ANTHROPIC_API_KEY (line 24)
```

### Before Fix - Chat Hook (`useAgentChat.ts`)
**WRONG:**
- ❌ URL: `/api/agent` (non-existent endpoint)
- ❌ Body: `{ message, sessionId }` (missing conversationHistory)
- ❌ Response field: `data.response` (should be `data.message`)
- ❌ Extra: `data.toolUsed` field (doesn't exist in response)
- ❌ Unused: `sessionId` state variable

### After Fix - Chat Hook
**CORRECT:**
- ✅ URL: `/api/agent/chat` (matches new endpoint)
- ✅ Body: `{ message, conversationHistory: [...] }`
  - Converts stored messages to Claude API format
  - `role: msg.role === 'agent' ? 'assistant' : 'user'`
- ✅ Response field: `data.message` (matches endpoint)
- ✅ Removed: `data.toolUsed` field
- ✅ Removed: unused `sessionId` state and return value
- ✅ Updated dependency array to include `messages`

### Files Fixed
1. `/components/agent/useAgentChat.ts` - Fixed endpoint URL, field names, removed unused vars
2. `/components/agent/AgentChat.tsx` - Removed `sessionId` from hook destructuring

### ANTHROPIC_API_KEY Location
Route: `/app/api/agent/chat/route.ts`, line 24
```typescript
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})
```

### Testing
1. Add `ANTHROPIC_API_KEY` to `.env.local`
2. Open chat in app
3. Send a message
4. Check browser DevTools Network tab - should POST to `/api/agent/chat`
5. Response should have `{ message: string, conversationHistory: [...] }`
