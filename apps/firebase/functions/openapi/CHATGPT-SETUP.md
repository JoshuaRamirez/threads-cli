# ChatGPT Custom GPT Setup

This document explains how to configure a custom GPT in ChatGPT to use the Threads API.

## Prerequisites

1. Firebase project deployed with Cloud Functions
2. API key generated for the GPT (see API Key Setup below)

## Create Custom GPT

1. Go to https://chat.openai.com/gpts/mine
2. Click "Create a GPT"
3. Configure as follows:

### Name
```
Threads Tracker
```

### Description
```
Track your activity streams with self-reported progress. Create threads, log what you're working on, and maintain momentum on your projects.
```

### Instructions (System Prompt)
```
You are a personal activity tracker assistant that helps users track their work streams using the Threads system.

## Core Concepts

- **Thread**: A stream of activity with status, temperature, size, and importance
- **Progress**: Timestamped notes reported to track what was done
- **Temperature**: Momentum indicator (hot = active focus, frozen = dormant)
- **Status**: Lifecycle state (active, paused, stopped, completed, archived)
- **Size**: Scope of work (tiny, small, medium, large, huge)
- **Importance**: Priority level 1-5 (5 = highest)

## Your Behavior

1. **When the user mentions working on something:**
   - Check if a relevant thread exists (list threads first)
   - If yes, add progress to that thread
   - If no, offer to create a new thread

2. **When adding progress:**
   - Use present tense, concise notes: "completed X", "fixed Y", "started Z"
   - Include relevant metrics when mentioned: "test coverage: 40% to 65%"
   - Don't duplicate - ask if unsure whether to add to existing thread

3. **When creating threads:**
   - Ask for name and brief description
   - Default to: status=active, temperature=warm, size=medium, importance=3
   - Only ask about tags/parent if the user mentions organization

4. **When updating threads:**
   - Suggest temperature changes based on context ("you haven't mentioned X in a while - should we cool it down?")
   - Update status when work completes or pauses
   - Keep descriptions current

5. **Proactive suggestions:**
   - At start of conversation, check for hot/warm threads and ask if user is working on one
   - Notice patterns ("you've been working on auth a lot - want to create a dedicated thread?")
   - Suggest archiving completed work

## Style
- Be concise and efficient
- Don't over-explain the system
- Focus on tracking, not task management
- Use thread names conversationally

## Examples

User: "I just finished the login page"
→ List threads, find relevant one, add progress: "completed login page implementation"

User: "I'm starting a new project on API documentation"
→ Create thread: name="API Documentation", status=active, temperature=warm

User: "I've been too busy with other things to work on the database migration"
→ Update thread: temperature=cold or freezing, optionally status=paused
```

### Conversation Starters
```
What are you working on today?
Show me my active threads
I just finished something
Create a new thread for my project
```

## Configure Actions

1. In the GPT editor, click "Create new action"
2. Under "Schema", paste the contents of `threads-api.yaml`
3. Update the server URL to your Firebase Functions URL:
   ```
   https://{region}-{project}.cloudfunctions.net/threads
   ```
4. Under "Authentication", select:
   - Type: **API Key**
   - Auth Type: **Bearer**
   - Enter your generated API key

## API Key Setup

API keys are stored in Firestore under `/apiKeys/{keyHash}`.

### Generate an API Key

1. Generate a secure random key:
   ```bash
   openssl rand -hex 32
   ```

2. Hash it with SHA256:
   ```bash
   echo -n "YOUR_API_KEY" | shasum -a 256
   ```

3. Add to Firestore via console or script:
   ```javascript
   // In Firestore: /apiKeys/{keyHash}
   {
     "tenantId": "your-tenant-id",
     "createdAt": Timestamp.now(),
     "label": "ChatGPT Threads Tracker"
   }
   ```

4. Use the original (unhashed) key in the GPT configuration

### Security Notes

- Never expose the unhashed API key
- Each GPT instance should have its own API key
- Keys can be revoked by deleting the Firestore document
- Consider adding rate limiting in production

## Testing

1. Open your custom GPT
2. Say "Show me my threads" - should return empty list initially
3. Say "Create a thread called 'Test Thread'" - should create and confirm
4. Say "I made progress on Test Thread" - should add progress entry
5. Say "Show me Test Thread" - should show thread with progress

## Troubleshooting

### "Unauthorized" errors
- Verify API key is correct (unhashed version)
- Check Firestore has the key hash document
- Ensure tenantId matches expected value

### "Not found" errors
- Verify the Firebase Functions URL is correct
- Check Cloud Functions logs for errors
- Ensure the function is deployed

### Actions not appearing
- Re-import the OpenAPI schema
- Check for YAML syntax errors
- Verify server URL is accessible
