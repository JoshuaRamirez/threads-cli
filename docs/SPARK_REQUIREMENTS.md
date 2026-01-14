# Threads UI - GitHub Spark Requirements

## App Overview

**Threads** is a personal momentum tracker for streams of activity. Unlike task managers that focus on what needs to be done, Threads tracks what you're actively doing through self-reported progress notes. The core metaphor is **temperature** - hot threads are where your energy is focused, cold threads have gone dormant.

This is NOT a todo list. It's a journal of work streams with momentum tracking.

---

## Data Model

### Thread
A thread represents a stream of activity (project, initiative, ongoing work).

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| name | string | Short name for the thread |
| description | string | Optional one-line summary |
| status | enum | `active`, `paused`, `completed`, `archived` |
| temperature | enum | `frozen`, `cold`, `tepid`, `warm`, `hot` (momentum level) |
| size | enum | `tiny`, `small`, `medium`, `large`, `huge` (scope) |
| importance | number | 1-5 star rating |
| tags | string[] | Organizational labels |
| groupId | string | Optional group assignment |
| parentId | string | Optional parent thread (for sub-threads) |
| progress | ProgressEntry[] | Timestamped notes (activity log) |
| details | string | Current structured notes about the thread |
| createdAt | datetime | When created |
| updatedAt | datetime | Last modified |

### ProgressEntry
A timestamped note about activity on a thread.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| timestamp | datetime | When this happened |
| note | string | What you did or observed |

### Group
An organizational container for threads.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| name | string | Group name |
| description | string | Optional description |

---

## Views

### 1. Dashboard (Home)

The default landing page showing momentum at a glance.

**Sections:**
- **Hot Now**: Threads with temperature = `hot`, shown as prominent cards
- **Warming Up**: Threads with temperature = `warm`
- **Going Cold**: Active threads that haven't had progress in 3+ days (warning state)
- **Recent Activity**: Last 5-10 progress entries across all threads as a feed
- **Quick Stats**: Total active threads, entries this week, threads by group

**Interactions:**
- Click any thread to open detail view
- Quick-add progress button on each thread card
- "What are you working on?" input at top for rapid progress entry

### 2. Thread List

Filterable, sortable list of all threads.

**Display Options:**
- **Tree View** (default): Show parent-child hierarchy with indentation
- **Flat View**: Simple list without hierarchy
- **Group View**: Organized by groups as sections

**Filters (combinable):**
- Status: checkboxes for each status
- Temperature: range slider or checkboxes
- Importance: star rating filter
- Group: dropdown or chips
- Tags: multi-select
- Search: text search across name, description, progress notes

**Sorting:**
- By temperature (hot first) - default
- By importance (high first)
- By recent activity
- By name (alphabetical)
- By created date

**Each thread row shows:**
- Temperature indicator (colored dot or icon)
- Name
- Status badge
- Importance stars
- Last progress timestamp
- Tags as small chips

### 3. Thread Detail

Full view of a single thread (modal or dedicated page).

**Header:**
- Thread name (editable inline)
- Description (editable inline)
- Parent thread link (if sub-thread)

**Properties Panel:**
- Status dropdown
- Temperature slider or segmented control (visual: cold blue to hot red)
- Size dropdown
- Importance: clickable 5-star rating
- Tags: chip input with autocomplete from existing tags
- Group: dropdown selector

**Details Section:**
- Rich text area for current structured notes
- "Updated X ago" timestamp
- Edit button

**Progress Timeline:**
- Reverse chronological list of progress entries
- Each entry shows: timestamp, note text
- Add new entry input at top with "Add Progress" button
- Option to set custom timestamp when adding
- Edit/delete buttons on hover for each entry

**Sub-threads Section (if any):**
- List of child threads
- "Spawn Sub-thread" button
- Click to navigate to child

**Actions:**
- Archive button
- Clone button
- Delete button (with confirmation)

### 4. Add/Edit Thread Modal

Form for creating or editing a thread.

**Fields:**
- Name (required)
- Description (optional)
- Status (default: active)
- Temperature (default: warm)
- Size (default: medium)
- Importance (default: 3 stars)
- Group (optional dropdown)
- Parent thread (optional, for creating sub-thread)
- Tags (optional, chip input)
- Initial details (optional, textarea)

### 5. Timeline View

Global activity feed across all threads.

**Display:**
- Chronological list of all progress entries
- Each entry shows: thread name (linked), timestamp, note
- Grouped by day with date headers

**Filters:**
- Date range picker
- Specific thread filter
- Limit/pagination

### 6. Focus View (What to Work On)

Recommendation view for deciding what needs attention.

**Algorithm:**
Score = (importance × 3) + (temperature × 2) + (recency × 1)

**Display:**
- Top 5 recommended threads as cards
- Each card shows: name, why it's recommended (e.g., "High importance, warming up")
- "Start Working" button that sets temperature to hot and opens detail view

**Also show:**
- Threads that are going cold (active but no progress in 3+ days)
- Paused threads that might need resuming

### 7. Groups Management

Simple CRUD for groups.

**Display:**
- List of groups with thread counts
- Add new group button
- Edit/delete each group
- Drag threads between groups (optional)

---

## Visual Design

### Temperature Visualization
This is the most important visual element. Temperature should be immediately visible.

| Temperature | Color | Visual Treatment |
|-------------|-------|------------------|
| hot | Red/Orange (#EF4444) | Glowing effect, pulsing animation |
| warm | Yellow/Amber (#F59E0B) | Subtle warm glow |
| tepid | Gray (#9CA3AF) | Neutral, no effect |
| cold | Light Blue (#60A5FA) | Slight blue tint |
| freezing | Blue (#3B82F6) | More saturated blue |
| frozen | Ice Blue (#93C5FD) | Faded, low opacity, frost effect |

### Status Badges
- Active: Green badge
- Paused: Yellow/amber badge
- Completed: Blue badge with checkmark
- Archived: Gray badge, entire row slightly faded

### Importance Stars
- Filled stars (★) for the rating level
- Empty stars (☆) for remaining
- Gold/yellow color for stars

### Cards
Thread cards should have:
- Left border colored by temperature
- Subtle shadow
- Hover state with slight lift
- Temperature icon or indicator in corner

### Typography
- Thread names: Semi-bold, medium size
- Descriptions: Regular weight, muted color
- Progress notes: Regular weight, normal color
- Timestamps: Small, muted color

---

## Key Interactions

### Quick Progress Entry
From anywhere in the app, user should be able to quickly add a progress note:
1. Global "+" button or keyboard shortcut
2. Opens small modal: thread selector + note input
3. Submit adds progress and optionally warms the thread

### Temperature Adjustment
When adding progress, offer option to:
- Keep current temperature
- Warm up (increase one level)
- Set to hot (I'm actively focused on this)

### Drag and Drop (nice to have)
- Reorder threads within a group
- Move threads between groups
- Reorder progress entries

### Inline Editing
- Thread name: click to edit
- Description: click to edit
- Progress notes: click to edit
- Details: click to edit

### Keyboard Navigation (nice to have)
- Arrow keys to navigate thread list
- Enter to open detail
- Escape to close modals
- `/` to focus search

---

## Sample Workflows

### Daily Check-in
1. Open app → Dashboard shows hot threads and going-cold warnings
2. Click thread → Add progress note about what you did
3. Adjust temperature if momentum changed
4. Check "Going Cold" section for things to resume or archive

### Starting New Work
1. Click "+ New Thread"
2. Enter name, set importance, optionally assign to group
3. Add initial details about the work
4. Set temperature to warm or hot
5. Begin adding progress as you work

### Weekly Review
1. Go to Timeline view, filter to past 7 days
2. See all activity across threads
3. Go to Focus view to see recommendations
4. Archive completed threads
5. Warm up threads that need attention

### Finding Past Work
1. Use search in Thread List
2. Filter by tags, group, or status
3. Open thread to see full progress history

---

## Empty States

### No Threads Yet
"Start tracking your first stream of activity. Threads help you see where your momentum is flowing."
[Create First Thread] button

### No Progress on Thread
"No progress recorded yet. What have you been doing on this?"
[Add First Update] button

### No Hot Threads
"Nothing's hot right now. Pick something to focus on."
[See Recommendations] button

---

## Mobile Considerations

- Dashboard should be single column on mobile
- Thread detail as full-screen view
- Bottom navigation: Dashboard, Threads, Timeline, Add
- Swipe actions on thread rows: quick archive, quick progress
- Pull to refresh on lists

---

## Data Persistence

Use local storage or IndexedDB for persistence. Data should:
- Save automatically on every change
- Support export to JSON
- Support import from JSON (for migration from CLI version)

---

## Out of Scope (for v1)

- User accounts / authentication
- Cloud sync
- Collaboration / sharing
- Dependencies between threads (complex graph UI)
- Batch operations
- Undo/redo history
- Notifications / reminders
- Dark mode (unless trivial to add)

---

## Success Criteria

The app succeeds if users can:
1. Quickly see what's hot and what's going cold
2. Add progress notes in under 5 seconds
3. Find any past work through search or browsing
4. Feel the momentum metaphor through visual temperature cues
5. Not confuse this with a todo list - it's about tracking what IS happening, not what SHOULD happen
