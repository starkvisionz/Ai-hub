# workspace/ — Shared Filesystem

The common filesystem every hub service and agent mounts. On the VPS this is
Coolify **Persistent Storage** bind-mounted into `code-server` (and any other
service that needs files), so work survives redeploys and is visible to every
agent.

## Layout

| Path | What goes here | Tracked in Git? |
|------|----------------|-----------------|
| `repos/` | Cloned project repositories the hub coordinates (`repos/<project>/`) | No — only `.gitkeep`. Each project is its own repo. |
| `shared/` | Shared artifacts/handoffs between agents (exports, notes, generated files) | No — only `.gitkeep`. |
| `scratch/` | Throwaway working files. Safe to delete anytime. | No — only `.gitkeep`. |

## Rules

- **Don't commit repo contents here.** `repos/` holds independent clones; commit
  those in their own repos, not in the hub. `.gitignore` enforces this.
- **Secrets never land here.** Same rule as everywhere in the hub.
- Treat `scratch/` as ephemeral — nothing important should live only there.

The directory tree itself is kept in Git via `.gitkeep` files so the structure
exists on a fresh clone; the *contents* are intentionally ignored.
