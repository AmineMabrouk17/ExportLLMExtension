/**
 * Multi-Platform Chat → Markdown Exporter
 * =======================================
 * Works on Google AI Studio, Claude (claude.ai), and GLM/Z.ai (chatglm.cn, z.ai).
 * Each site has a small "adapter" describing how to find the title, the message
 * turns, the role of each turn, the thought/reasoning block, the message body,
 * and any grounding sources. A shared recursive DOM→Markdown converter handles
 * the actual rendering.
 *
 * Triggers:
 *   - A floating "📥 Export MD" button (top-right of the page)
 *   - Keyboard shortcut: Ctrl+Shift+E (or Cmd+Shift+E on macOS)
 */

/* ---------------------------------------------------------------- helpers */

function getChildrenMarkdown(element) {
  return Array.from(element.childNodes).map(nodeToMarkdown).join("");
}

function text(sel) {
  const el = typeof sel === "string" ? document.querySelector(sel) : sel;
  return el ? el.textContent.trim() : "";
}

const SKIP_TAGS = new Set([
  "script", "style", "link", "meta", "head", "noscript", "template",
  "svg", "button", "mat-icon", "input", "textarea", "form", "select",
  "time", "img",
]);

function shouldSkip(node) {
  const tag = node.tagName.toLowerCase();
  if (SKIP_TAGS.has(tag)) return true;
  const cls = node.classList;
  if (
    cls.contains("material-symbols-outlined") ||
    cls.contains("sr-only") ||
    cls.contains("actions-container") ||
    cls.contains("turn-footer") ||
    cls.contains("search-entry-point") ||
    cls.contains("feedback-buttons") ||
    cls.contains("toolbar-actions")
  )
    return true;
  // icon-font spans (Claude's <span data-cds="Icon"> glyphs)
  if (node.getAttribute && node.getAttribute("data-cds") === "Icon") return true;
  // screen-reader-only blocks (e.g. Claude's "Vous avez dit : …" h2)
  if (node.getAttribute && node.getAttribute("data-find-omitted") !== null) return true;
  // decorative aria-hidden regions (status texts, beam effects)
  if (node.getAttribute && node.getAttribute("aria-hidden") === "true" && /^(span|div)$/.test(tag))
    return true;
  // reasoning blocks are emitted separately via <details>
  if (tag === "ms-thought-chunk") return true;
  if (cls && cls.toString().indexOf("thinking-chain-container") !== -1) return true;
  // copy/edit/retry action toolbars
  if (node.getAttribute && node.getAttribute("role") === "toolbar") return true;
  if (node.getAttribute && node.getAttribute("aria-label") &&
      /actions du message/i.test(node.getAttribute("aria-label"))) return true;
  return false;
}

function nodeToMarkdown(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    if (node.textContent.trim() === "") {
      return node.textContent.includes("\n") ? "" : node.textContent;
    }
    return node.textContent;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  if (shouldSkip(node)) return "";

  const tag = node.tagName.toLowerCase();
  const cls = node.classList;

  // 1. AI Studio code block
  if (tag === "ms-code-block") {
    const lang = node.getAttribute("data-test-language") || "";
    const codeEl = node.querySelector("code");
    const codeText = codeEl ? codeEl.textContent.trim() : "";
    return `\n\`\`\`${lang}\n${codeText}\n\`\`\`\n\n`;
  }

  // 2. Generic fenced code block (Claude / GLM): <pre><code>…</code></pre>
  if (tag === "pre") {
    const codeEl = node.querySelector("code");
    let lang = "";
    if (codeEl) {
      const c = codeEl.className || "";
      const m = c.match(/language-([\w+-]+)/) || c.match(/hljs[^\s]*\s+([\w+-]+)/);
      if (m) lang = m[1];
    }
    const codeText = codeEl ? codeEl.textContent.trim() : node.textContent.trim();
    return `\n\`\`\`${lang}\n${codeText}\n\`\`\`\n\n`;
  }

  // 3. Inline code
  if (cls && cls.contains("inline-code")) return `\`${node.textContent.trim()}\``;
  if (tag === "code") {
    // code not wrapped in pre → inline
    const parent = node.parentElement;
    if (!parent || parent.tagName.toLowerCase() !== "pre")
      return `\`${node.textContent.trim()}\``;
  }

  // 4. LaTeX (AI Studio ms-katex, or generic KaTeX annotation)
  if (tag === "ms-katex") {
    const tex = node.querySelector("annotation[encoding='application/x-tex']");
    if (tex) return `$${tex.textContent.trim()}$`;
    return node.textContent.trim();
  }
  if (cls && /katex/.test(cls.toString())) {
    const tex = node.querySelector("annotation[encoding='application/x-tex']");
    if (tex) return `$${tex.textContent.trim()}$`;
  }

  // 5. Links
  if (tag === "a") {
    const href = node.getAttribute("href");
    const label = getChildrenMarkdown(node);
    return href ? `[${label}](${href})` : label;
  }

  // 6. Headings
  if (tag === "h1") return `\n# ${getChildrenMarkdown(node)}\n\n`;
  if (tag === "h2") return `\n## ${getChildrenMarkdown(node)}\n\n`;
  if (tag === "h3") return `\n### ${getChildrenMarkdown(node)}\n\n`;
  if (tag === "h4") return `\n#### ${getChildrenMarkdown(node)}\n\n`;

  // 7. Lists
  if (tag === "ul") return `\n${getChildrenMarkdown(node)}\n`;
  if (tag === "ol") return `\n${getChildrenMarkdown(node)}\n`;
  if (tag === "li") {
    const parentList = node.closest("ol, ul");
    const isOrdered = parentList && parentList.tagName.toLowerCase() === "ol";
    return isOrdered
      ? `1. ${getChildrenMarkdown(node).trim()}\n`
      : `- ${getChildrenMarkdown(node).trim()}\n`;
  }

  // 8. Blockquote
  if (tag === "blockquote") {
    const inner = getChildrenMarkdown(node).trim();
    return "\n" + inner.split("\n").map((l) => `> ${l}`).join("\n") + "\n\n";
  }

  // 9. Images (keep as markdown link when a src exists)
  if (tag === "img") {
    const src = node.getAttribute("src");
    const alt = node.getAttribute("alt") || "";
    return src ? `![${alt}](${src})` : "";
  }

  // 10. Inline formatting
  if (tag === "strong" || tag === "b") return `**${getChildrenMarkdown(node)}**`;
  if (tag === "em" || tag === "i") return `*${getChildrenMarkdown(node)}*`;
  if (tag === "del" || tag === "s") return `~~${getChildrenMarkdown(node)}~~`;

  // 11. Block-level wrappers
  if (tag === "p") return `${getChildrenMarkdown(node).trim()}\n\n`;
  if (tag === "hr") return `\n---\n\n`;
  if (tag === "br") return "\n";
  if (tag === "table") return extractTable(node) + "\n\n";

  return getChildrenMarkdown(node);
}

function extractTable(tableEl) {
  const rows = Array.from(tableEl.querySelectorAll("tr"));
  if (rows.length === 0) return "";
  const cellText = (tr, sel) =>
    Array.from(tr.querySelectorAll(sel)).map((c) =>
      c.textContent.trim().replace(/\n+/g, " ")
    );
  const header = cellText(rows[0], "th, td");
  if (header.length === 0) return "";
  let out = "| " + header.join(" | ") + " |\n";
  out += "| " + header.map(() => "---").join(" | ") + " |\n";
  for (let i = 1; i < rows.length; i++) {
    const cells = cellText(rows[i], "td");
    out += "| " + cells.join(" | ") + " |\n";
  }
  return out.trim();
}

/* ------------------------------------------------------------- adapters */

const ADAPTERS = {
  aistudio: {
    name: "Google AI Studio",
    match: () => location.hostname.endsWith("aistudio.google.com"),
    title: () => text("h1.mode-title") || "AI Studio Conversation",
    turns: () => Array.from(document.querySelectorAll("ms-chat-turn")),
    classify: (el) =>
      el.querySelector(".chat-turn-container.user") ? "user" : "assistant",
    thought: (el) => {
      const b = el.querySelector("ms-thought-chunk .mat-expansion-panel-body");
      return b && b.textContent.trim() ? getChildrenMarkdown(b).trim() : null;
    },
    body: (el) => {
      const c = el.querySelector(".turn-content") || el;
      const chunks = c.querySelectorAll("ms-prompt-chunk");
      return chunks.length ? Array.from(chunks) : [c];
    },
    sources: (el) => {
      const g = el.querySelector("ms-grounding-sources");
      if (!g) return null;
      const items = Array.from(
        g.querySelectorAll("a, .grounding-source-item, .source-chip")
      )
        .map((e) => {
          const href = e.getAttribute("href");
          const t = e.textContent.trim().replace(/\s+/g, " ");
          return href ? `[${t}](${href})` : t;
        })
        .filter(Boolean);
      const unique = [...new Set(items)];
      return unique.length ? `**Sources:** ${unique.join(", ")}\n\n` : null;
    },
  },

  claude: {
    name: "Claude",
    match: () => /(^|\.)claude\.ai$/.test(location.hostname),
    title: () =>
      text('[data-testid="chat-title-split"] span') || document.title || "Claude Conversation",
    turns: () => Array.from(document.querySelectorAll('div[role="article"]')),
    classify: (el) =>
      el.querySelector('[data-testid="user-message"], [data-cds="UserMessage"]')
        ? "user"
        : "assistant",
    thought: () => null,
    body: (el) => {
      const root =
        el.querySelector('[data-testid="user-message"]') ||
        el.querySelector(".standard-markdown") ||
        el;
      return [root];
    },
    sources: () => null,
  },

  glm: {
    name: "GLM / Z.ai",
    match: () => /(^|\.)(z\.ai|chatglm\.cn)$/.test(location.hostname),
    title: () => document.title || "GLM Chat",
    turns: () => Array.from(document.querySelectorAll('[id^="message-"]')),
    classify: (el) => (el.classList.contains("user-message") ? "user" : "assistant"),
    thought: (el) => {
      // GLM keeps reasoning in .thinking-chain-container; only the <p> is real text
      const p = el.querySelector('[class*="thinking-chain-container"] p');
      return p && p.textContent.trim() ? getChildrenMarkdown(p).trim() : null;
    },
    body: (el) => {
      const root = el.querySelector(".markdown-prose") || el;
      return [root];
    },
    sources: () => null,
  },
};

function getActiveAdapter() {
  return Object.values(ADAPTERS).find((a) => a.match()) || null;
}

/* ------------------------------------------------------------- extraction */

function downloadMarkdownFile(filename, content) {
  const sanitized = filename.replace(/[/\\?%*:|"<>]+/g, "-") + ".md";
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = sanitized;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function extractChatToMarkdown() {
  const adapter = getActiveAdapter();
  if (!adapter) {
    alert(
      "This site isn't supported by the exporter yet.\nSupported: aistudio.google.com, claude.ai, z.ai, chatglm.cn"
    );
    return;
  }

  const title = adapter.title();
  let markdown = `# ${title}\n\n`;

  const turns = adapter.turns();
  if (!turns || turns.length === 0) {
    alert("No conversation messages found on this page.");
    return;
  }

  turns.forEach((turn) => {
    const role = adapter.classify(turn) === "user" ? "### 👤 User" : "### 🤖 Assistant";
    markdown += `${role}\n\n`;

    if (adapter.thought) {
      const thoughtMd = adapter.thought(turn);
      if (thoughtMd) {
        markdown += `<details>\n<summary>Thought Process</summary>\n\n${thoughtMd}\n\n</details>\n\n`;
      }
    }

    const bodies = adapter.body(turn);
    bodies.forEach((b) => {
      const chunkMd = getChildrenMarkdown(b).trim();
      if (chunkMd) markdown += `${chunkMd}\n\n`;
    });

    if (adapter.sources) {
      const src = adapter.sources(turn);
      if (src) markdown += src;
    }

    markdown += `---\n\n`;
  });

  markdown = markdown.replace(/\n{3,}/g, "\n\n").trim() + "\n";
  downloadMarkdownFile(title, markdown);
}

/* --------------------------------------------------- virtual-scroll guard */

// AI Studio lazy-renders turns; scroll through to force them into the DOM.
function ensureAllTurnsLoaded() {
  return new Promise((resolve) => {
    const scroller =
      document.querySelector("ms-chat-scroll-viewport") ||
      document.querySelector(".cdk-virtual-scroll-viewport") ||
      document.querySelector("mat-sidenav-content .scroll-container");
    if (!scroller) return resolve();
    let step = 0;
    const total = 40;
    const tick = () => {
      const max = scroller.scrollHeight - scroller.clientHeight;
      if (step >= total || scroller.scrollTop >= max - 2) {
        scroller.scrollTop = 0;
        return resolve();
      }
      scroller.scrollTop = Math.min(scroller.scrollTop + 600, max);
      step++;
      setTimeout(tick, 60);
    };
    tick();
  });
}

async function exportWithScroll() {
  if (getActiveAdapter() && getActiveAdapter().name === "Google AI Studio") {
    await ensureAllTurnsLoaded();
    setTimeout(extractChatToMarkdown, 150);
  } else {
    extractChatToMarkdown();
  }
}

/* ---------------------------------------------- UI: floating export button */

function injectExportButton() {
  if (document.getElementById("btn-export-md")) return;
  const btn = document.createElement("button");
  btn.id = "btn-export-md";
  btn.className = "btn-export-md";
  btn.textContent = "📥 Export MD";
  btn.title = "Export this conversation to Markdown (Ctrl/Cmd+Shift+E)";
  btn.addEventListener("click", exportWithScroll);
  document.body.appendChild(btn);
}

const style = document.createElement("style");
style.textContent = `
.btn-export-md {
  position: fixed; top: 12px; right: 12px; z-index: 2147483647;
  background: #1a73e8; color: #fff; border: none;
  padding: 8px 14px; border-radius: 18px; font-size: 13px; font-weight: 500;
  cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.25);
  font-family: "Google Sans", Roboto, Arial, sans-serif; line-height: 1;
}
.btn-export-md:hover { background: #1765cc; }
.btn-export-md:active { background: #1456b0; }
`;
document.head.appendChild(style);

// Keyboard shortcut fallback.
function onKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "e") {
    e.preventDefault();
    exportWithScroll();
  }
}
document.addEventListener("keydown", onKeydown);

// Toolbar-icon click (sent from background.js via chrome.runtime message).
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "EXPORT_MARKDOWN") {
    exportWithScroll();
    if (typeof sendResponse === "function") sendResponse({ ok: true });
  }
});

// Observe DOM changes (SPA navigation / lazy rendering) and keep the button present.
const observer = new MutationObserver(() => injectExportButton());
observer.observe(document.body, { childList: true, subtree: true });
injectExportButton();
window.addEventListener("load", () => setTimeout(injectExportButton, 500));
