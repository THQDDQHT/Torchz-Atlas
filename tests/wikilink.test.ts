import MarkdownIt from "markdown-it";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import path from "node:path";
import { clearIndexCache, getIndex } from "@/lib/indexer";
import { wikilinkPlugin } from "@/lib/wikilink";

const FIXTURE = path.join(import.meta.dirname, "fixtures", "knowledge");

beforeAll(() => {
  process.env.KNOWLEDGE_DIR = FIXTURE;
});

beforeEach(() => {
  clearIndexCache();
});

async function render(source: string, relativePath = "note/00 灵感想法/想法收件箱.md") {
  const markdown = new MarkdownIt();
  wikilinkPlugin(markdown, await getIndex());
  return markdown.render(source, { relativePath });
}

describe("VitePress wikilink 插件", () => {
  it("唯一命中渲染为站内链接", async () => {
    const html = await render("见 [[表格与代码]]");
    expect(html).toContain('class="wikilink"');
    expect(html).toContain("/note/");
    expect(html).not.toContain("[[");
  });

  it("找不到时保留可读文本并标记状态", async () => {
    const html = await render("见 [[根本不存在的笔记]]");
    expect(html).toContain("wikilink-missing");
    expect(html).toContain("[[根本不存在的笔记]]");
    expect(html).not.toContain("<a");
  });

  it("跨目录同名无法消歧时不随机跳转", async () => {
    const html = await render("见 [[重复的标题]]", "note/03 好东西/表格与代码.md");
    expect(html).toContain("wikilink-ambiguous");
    expect(html).not.toContain("<a");
  });

  it("同目录重名优先命中同目录笔记", async () => {
    const html = await render("见 [[重复的标题]]");
    expect(decodeURIComponent(html)).toContain("/note/00 灵感想法/重复的标题");
  });

  it("代码块中的 wikilink 不参与转换", async () => {
    const html = await render("```\n[[表格与代码]]\n```");
    expect(html).toContain("[[表格与代码]]");
    expect(html).not.toContain("wikilink");
  });
});
