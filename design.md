# Personal Workspace Design

## 1. Design Direction

Personal Workspace should still feel quiet, personal, and precise. The next version shifts from queue-based operation to agent-first operation without becoming a heavy chat product. The left side is a calm assistant surface; the right side remains an elegant visual workspace.

The most important design principle is: every design and interaction must meet modern web product standards and feel elegant, simple, and intentional. The product must not stop at a logically correct prototype. Simplicity means removing friction and visual noise while preserving craft, alignment, affordance, hierarchy, and interaction quality; it must never become crude, under-designed, or ambiguous.

The interface is backed by platform services, but the UI should not expose platform complexity. SSO, database persistence, and LLM routing are invisible infrastructure. Users should only perceive a calm personal workspace and a capable agent.

Visual language:

- Warm off-white background.
- Near-black text.
- Soft gray lines.
- Muted quadrant colors.
- Red only for avatar or destructive emphasis.
- No marketing hero, heavy nav, or explanatory clutter.

## 2. Page Structure

### Owner Page

Two-column layout:

- Left: agent chat panel.
- Right: planning surface.

The left panel replaces the old request queue entirely. The right side switches between quadrant map and calendar.

The boundary between the agent panel and planning surface is resizable. The resize handle should be visually subtle but discoverable, constrained to sensible widths, and saved as a local preference.

### Submit Page

Centered agent conversation:

- Brand at top.
- Conversation panel.
- Input and `生成需求卡片` action.
- Preview card before final submit.
- Success state with submitted card summary and `新建另一个需求`.

Reopening `/submit` starts a new temporary conversation.

## 3. Owner Agent Panel

Top:

- `Personal Workspace` brand.
- New session icon/button.
- Session drawer icon/button.

Middle:

- Current session messages.
- Agent messages can include embedded request cards.
- Agent messages may be produced by the platform LLM or deterministic fallback, but both use the same visual language.
- User messages are compact and right-aligned.
- Agent messages are left-aligned and can include actions.

Bottom:

- Input box.
- Send button.
- Contextual action buttons such as `生成需求卡片`.
- Owner avatar row.

Session drawer:

- Opens over or beside the left panel.
- Shows session title, updated time, optional related request.
- Selecting a session switches the current conversation.

Avatar menu:

- Settings.
- Agent config.
- Clear local data.

## 4. Embedded Request Cards

Agent messages may include compact request cards.

Card content:

- Title.
- Status label.
- Due date.
- Quadrant color dot.
- Short background/source summary.

Actions:

- View details.
- Approve.
- Reject.
- Change date.

Approval from the card executes immediately. Rejection opens an explicit reason/confirmation flow.

## 5. Quadrant Map

The map is an open coordinate space, not four boxes.

Elements:

- Horizontal urgency axis with right arrow and `紧急程度`.
- Vertical importance axis with upward arrow and `重要程度`.
- Top-right elegant arrow to calendar view.

Capsules:

- Title-only.
- Pill shape.
- Background uses quadrant color.
- Border uses quadrant color.
- `unreviewed` uses dashed border.
- `archived` uses solid border.
- Dragging updates position and derived quadrant.
- Axis collision is avoided by automatic push-away behavior.

## 6. Calendar Month View

Header:

- Left top elegant arrow returns to quadrant map.
- Center shows year/month as an interactive control.
- Small left/right controls switch months.
- Clicking the year/month opens a compact month picker for quick navigation.
- Right side stays visually quiet.

Grid:

- Conventional 7-column month calendar.
- Muted leading/trailing dates.
- Today can have a subtle mark.
- Each date cell shows up to 3 capsules.
- Extra items collapse into `+N`.
- `+N` opens a day popover/list.

Calendar capsules:

- More compact than map capsules.
- Same quadrant color.
- Dashed for `unreviewed`.
- Solid for `archived`.
- Dragging to another date updates due date.

## 7. Settings Modal

Settings are opened from the avatar menu.

Tabs or sections:

- Quadrant colors.
- Agent config.
- Data reset.

Quadrant colors:

- Four swatches with labels.
- Native color inputs or refined color controls.
- Changes apply immediately after saving.

Agent config:

- Markdown textarea for `agents.md`.
- Save button.
- Text also editable via agent conversation with owner confirmation.

Data reset:

- Clear button.
- Confirmation prompt.
- Reset to default colors, default `agents.md`, no requests, default session.

## 8. Details Modal

The details modal remains the precise editing fallback.

Fields:

- Title.
- Requester.
- Due date.
- Background.
- Related docs.
- Deliverable.
- Status.
- Rejection reason.
- Source summary.

Actions:

- Save.
- Approve if unreviewed.
- Reject.
- Delete.
- Open related session if available.

If status is changed from rejected to visible status and coordinates are missing, the UI should either infer position or ask for a quadrant shortcut.

## 9. Interaction Principles

- Agent-first does not mean agent-only; direct visual manipulation remains available.
- Querying is conversational.
- Reviewing can be conversational, card-based, modal-based, or visual.
- High-risk actions like rejection, deletion, reset, and `agents.md` changes need explicit confirmation.
- Approval from an already visible agent card does not need a second confirmation.
- Calendar is a time planning view, not a complete backlog.
- The quadrant map is the complete visible workspace for non-rejected requests.
- LLM latency should be handled with subtle pending states, not heavy loading screens.
- Fallback agent responses should not visually look broken or apologetic; they should remain concise and useful.

## 10. Platform Integration Design

Platform identity and agent routing stay below the surface:

- No login chrome is shown inside the app; the platform provides identity.
- The avatar/settings area can display the current user name when available.
- Model errors should degrade to fallback agent behavior instead of interrupting the workspace.
- Destructive actions remain user-confirmed even when suggested by the agent.

## 11. Responsive Behavior

Desktop is primary.

- Owner page keeps the two-column layout on desktop.
- On narrow screens, agent panel and planning surface can stack.
- Calendar and submit chat remain usable on smaller screens.
- Advanced dragging is optimized for desktop pointer use.
