import { unified } from "remark";
import remarkParse from "remark-parse";
import { visit } from "unist-util-visit";
import crypto from "node:crypto";

export type Chunk = {
  id: string; // file path + lowest header slug
  filePath: string;
  headerSlug: string;
  headerPath: string[]; // breadcrumb of headers
  title: string;
  content: string; // text under this lowest-level header
  contentHash: string;
};

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function chunkMarkdown(filePath: string, markdown: string): Chunk[] {
  const tree = unified().use(remarkParse).parse(markdown);

  // find maximum heading depth present
  let maxDepth = 0;
  visit(tree, "heading", (node: any) => {
    if (node.depth > maxDepth) maxDepth = node.depth;
  });

  const chunks: Chunk[] = [];
  const headerStack: { depth: number; title: string }[] = [];

  // We will iterate nodes and capture segments under headings of depth==maxDepth
  let current: { slug: string; title: string; headerPath: string[]; lines: string[] } | null = null;

  function pushCurrent() {
    if (!current) return;
    const content = current.lines.join("\n").trim();
    const contentHash = crypto.createHash("sha256").update(content).digest("hex");
    const id = `${filePath}#${current.slug}`;
    chunks.push({
      id,
      filePath,
      headerSlug: current.slug,
      headerPath: current.headerPath,
      title: current.title,
      content,
      contentHash
    });
    current = null;
  }

  visit(tree, (node: any) => {
    if (node.type === "heading") {
      // update header stack
      while (headerStack.length && headerStack[headerStack.length - 1]!.depth >= node.depth) {
        headerStack.pop();
      }
      const text = node.children?.filter((c: any) => c.type === "text").map((t: any) => t.value).join(" ") || "";
      headerStack.push({ depth: node.depth, title: text });

      if (node.depth === maxDepth) {
        // Start a new lowest-level chunk
        pushCurrent();
        const slug = slugify(text);
        const headerPath = headerStack.map(h => h.title);
        current = { slug, title: text, headerPath, lines: [] };
      }
    } else if (current) {
      // capture raw markdown for nodes under current lowest heading until next same-or-higher heading
      if (node.type === "text") {
        current.lines.push(node.value);
      } else if (node.type === "code") {
        current.lines.push("```" + (node.lang || "") + "\n" + (node.value || "") + "\n```");
      } else if (node.type === "paragraph") {
        const text = (node.children || [])
          .filter((c: any) => c.type === "text")
          .map((t: any) => t.value)
          .join("");
        current.lines.push(text);
      } else if (node.type === "listItem" || node.type === "list") {
        // Fallback stringify
        const text = JSON.stringify(node);
        current.lines.push(text);
      }
    }
  });

  pushCurrent();
  return chunks;
}


