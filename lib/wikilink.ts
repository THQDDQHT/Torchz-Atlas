import type MarkdownIt from "markdown-it";
import type StateInline from "markdown-it/lib/rules_inline/state_inline.mjs";
import type { KnowledgeIndex } from "./indexer";
import { createWikilinkResolver } from "./indexer";

function noteIdFromEnvironment(environment: Record<string, unknown>): string | null {
  const relativePath =
    typeof environment.relativePath === "string"
      ? environment.relativePath
      : typeof environment.path === "string"
        ? environment.path
        : null;

  if (!relativePath || !relativePath.startsWith("note/")) return null;
  return relativePath.slice("note/".length);
}

export function wikilinkPlugin(markdownInstance: unknown, index: KnowledgeIndex): void {
  // VitePress bundles its own Markdown-It types. Cast at this boundary so the plugin
  // can also be unit-tested against the project's direct Markdown-It dependency.
  const markdown = markdownInstance as MarkdownIt;
  markdown.inline.ruler.before(
    "link",
    "atlas-wikilink",
    (state: StateInline, silent: boolean): boolean => {
      const start = state.pos;
      if (state.src.charCodeAt(start) !== 0x5b || state.src.charCodeAt(start + 1) !== 0x5b) {
        return false;
      }

      const close = state.src.indexOf("]]", start + 2);
      if (close === -1) return false;

      const target = state.src.slice(start + 2, close).trim();
      if (!target || target.includes("\n")) return false;

      if (!silent) {
        const noteId = noteIdFromEnvironment(state.env as Record<string, unknown>);
        const note = noteId ? index.byId.get(noteId) : null;
        const resolution = note
          ? createWikilinkResolver(index, note.dir)(target)
          : { kind: "missing" as const };

        if (resolution.kind === "found") {
          const open = state.push("link_open", "a", 1);
          open.attrs = [
            ["href", resolution.href],
            ["class", "wikilink"],
          ];
          const text = state.push("text", "", 0);
          text.content = target;
          state.push("link_close", "a", -1);
        } else {
          const token = state.push("html_inline", "", 0);
          const className =
            resolution.kind === "ambiguous" ? "wikilink-ambiguous" : "wikilink-missing";
          token.content = `<span class="${className}">${markdown.utils.escapeHtml(
            state.src.slice(start, close + 2),
          )}</span>`;
        }
      }

      state.pos = close + 2;
      return true;
    },
  );
}
