import { describe, expect, it } from "vitest";
import { renderNote, parseNoteMeta, type WikilinkResolution } from "@/lib/markdown";

const noLinks = (): WikilinkResolution => ({ kind: "missing" });

async function render(md: string, resolver = noLinks) {
  return renderNote(md, resolver);
}

describe("HTML 净化（XSS 防线）", () => {
  it("剥离 script 标签及其内容", async () => {
    const { html } = await render(`# 标题\n\n<script>window.__pwned = true;</script>\n`);

    expect(html).not.toContain("<script");
    expect(html).not.toContain("__pwned");
  });

  it("剥离内联事件处理器", async () => {
    const { html } = await render(`<img src="x" onerror="window.__pwned=true">\n\n<div onclick="alert(1)">点我</div>`);

    expect(html).not.toContain("onerror");
    expect(html).not.toContain("onclick");
  });

  it("拦截 javascript: 协议链接", async () => {
    const { html } = await render(`[看起来正常](javascript:window.__pwned=true)`);

    expect(html).not.toContain("javascript:");
  });

  it("拦截 data: 协议的脚本链接", async () => {
    const { html } = await render(`[下载](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)`);

    expect(html).not.toContain("data:text/html");
  });

  it("剥离 iframe 与 style 标签", async () => {
    const { html } = await render(`<iframe src="https://example.com/evil"></iframe>\n\n<style>body{display:none}</style>`);

    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("<style");
  });

  it("正常内容不受影响", async () => {
    const { html } = await render(`# 标题\n\n**粗体**与*斜体*，还有 \`行内代码\`。\n\n> 一段引用\n\n- 列表项`);

    expect(html).toContain("<strong>粗体</strong>");
    expect(html).toContain("<em>斜体</em>");
    expect(html).toContain("<code>行内代码</code>");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("<li>列表项</li>");
  });
});

describe("链接处理", () => {
  it("外部链接新窗口打开并切断 opener", async () => {
    const { html } = await render(`[示例](https://example.com)`);

    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("站内链接不加 target", async () => {
    const { html } = await render(`[[某篇笔记]]`, () => ({
      kind: "found",
      href: "/note/x/y",
    }));

    expect(html).toContain('href="/note/x/y"');
    expect(html).not.toContain('target="_blank"');
  });
});

describe("wikilink 渲染", () => {
  it("命中时渲染成站内链接", async () => {
    const { html } = await render(`见 [[表格与代码]] 这篇`, () => ({
      kind: "found",
      href: "/note/03%20%E5%A5%BD/x",
    }));

    expect(html).toContain('class="wikilink"');
    expect(html).toContain("表格与代码");
    expect(html).not.toContain("[[");
  });

  it("找不到目标时降级为可读文本，不报错", async () => {
    const { html } = await render(`见 [[不存在的笔记]] 这篇`);

    expect(html).toContain("wikilink-missing");
    expect(html).toContain("[[不存在的笔记]]");
    expect(html).not.toContain("<a");
  });

  it("多篇同名时标记为存在多篇且不生成链接", async () => {
    const { html } = await render(`见 [[重复的标题]]`, () => ({ kind: "ambiguous" }));

    expect(html).toContain("wikilink-ambiguous");
    expect(html).not.toContain("<a");
  });

  it("代码块里的 wikilink 不被转换", async () => {
    const { html } = await render("```\n[[不该被转换]]\n```");

    expect(html).toContain("[[不该被转换]]");
    expect(html).not.toContain("wikilink");
  });

  it("wikilink 目标里的尖括号无法注入标签", async () => {
    const { html } = await render(`[[<img src=x onerror=alert(1)>]]`);

    expect(html).not.toContain("onerror");
    expect(html).not.toContain("<img");
  });
});

describe("GFM 与排版", () => {
  it("表格被包进可横向滚动的容器", async () => {
    const { html } = await render(`| A | B |\n| --- | --- |\n| 1 | 2 |`);

    expect(html).toContain('class="table-scroll"');
    expect(html).toContain("<table>");
  });

  it("代码块保留原始格式", async () => {
    const { html } = await render("```js\nconst a = 1;\n```");

    expect(html).toContain("<pre>");
    expect(html).toContain("const a = 1;");
  });
});

describe("目录生成", () => {
  it("收集二级与三级标题并带上锚点 id", async () => {
    const { html, toc } = await render(`# 一级\n\n## 第一节\n\n### 一点五\n\n## 第二节\n\n#### 四级不进目录`);

    expect(toc.map((t) => t.text)).toEqual(["第一节", "一点五", "第二节"]);
    expect(toc.map((t) => t.depth)).toEqual([2, 3, 2]);
    for (const entry of toc) {
      expect(entry.id).toBeTruthy();
      expect(html).toContain(`id="${entry.id}"`);
    }
  });
});

describe("元数据解析", () => {
  it("标题取首个一级标题，缺失时为 null", () => {
    expect(parseNoteMeta("# 我的标题\n\n正文").title).toBe("我的标题");
    expect(parseNoteMeta("没有标题的正文").title).toBeNull();
  });

  it("纯文本剥离 Markdown 语法，供搜索使用", () => {
    const meta = parseNoteMeta("# 标题\n\n**加粗**的[链接](https://a.b)文字");

    expect(meta.plainText).toContain("加粗");
    expect(meta.plainText).not.toContain("**");
    expect(meta.plainText).not.toContain("https://a.b");
  });

  it("收集 wikilink 目标", () => {
    const meta = parseNoteMeta("正文里有 [[甲]] 和 [[乙]]，还有重复的 [[甲]]");
    expect(meta.wikilinks).toEqual(["甲", "乙"]);
  });
});
