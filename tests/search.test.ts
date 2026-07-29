import { describe, expect, it, beforeAll, beforeEach } from "vitest";
import path from "node:path";
import { getIndex, clearIndexCache } from "@/lib/indexer";
import { search, highlight, tokenize } from "@/lib/search";

const FIXTURE = path.join(import.meta.dirname, "fixtures", "knowledge");

beforeAll(() => {
  process.env.KNOWLEDGE_DIR = FIXTURE;
});

beforeEach(() => {
  clearIndexCache();
});

async function notes() {
  return (await getIndex()).notes;
}

describe("匹配范围", () => {
  it("命中标题", async () => {
    const hits = search(await notes(), "想法收件箱");
    expect(hits.map((h) => h.note.id)).toContain("00 灵感想法/想法收件箱.md");
    expect(hits[0].titleMatched).toBe(true);
  });

  it("命中正文", async () => {
    const hits = search(await notes(), "服务端渲染");
    expect(hits.map((h) => h.note.id)).toContain("03 好东西/表格与代码.md");
  });

  it("命中标签", async () => {
    const hits = search(await notes(), "游戏开发");
    expect(hits.map((h) => h.note.id)).toContain("03 好东西/标签写法测试.md");
  });

  it("不区分大小写", async () => {
    const list = await notes();
    expect(search(list, "GFM").length).toBe(search(list, "gfm").length);
    expect(search(list, "gfm").length).toBeGreaterThan(0);
  });

  it("中文按连续字符串匹配", async () => {
    const hits = search(await notes(), "笔记软件");
    expect(hits.map((h) => h.note.id)).toContain("00 灵感想法/想法收件箱.md");
  });
});

describe("多词与空结果", () => {
  it("多个关键词取 AND", async () => {
    const list = await notes();

    // 两个词分别都能命中笔记，但没有一篇同时包含
    expect(search(list, "服务端渲染").length).toBeGreaterThan(0);
    expect(search(list, "游戏开发").length).toBeGreaterThan(0);
    expect(search(list, "服务端渲染 游戏开发")).toHaveLength(0);
  });

  it("同一篇内的多词命中仍返回结果", async () => {
    const hits = search(await notes(), "表格 代码");
    expect(hits.map((h) => h.note.id)).toContain("03 好东西/表格与代码.md");
  });

  it("查询为空或全空白时返回空结果", async () => {
    const list = await notes();
    expect(search(list, "")).toHaveLength(0);
    expect(search(list, "   ")).toHaveLength(0);
  });

  it("无匹配时返回空数组而不是抛错", async () => {
    expect(search(await notes(), "绝对不存在的关键词xyz")).toHaveLength(0);
  });

  it("正则元字符被当作普通文本处理", async () => {
    expect(() => search([], "a(b[c")).not.toThrow();
    expect(search([], ".*")).toHaveLength(0);
  });
});

describe("排序与摘要", () => {
  it("标题命中的结果排在正文命中之前", async () => {
    const hits = search(await notes(), "标题");
    const firstTitleMatched = hits.findIndex((h) => h.titleMatched);
    const firstBodyOnly = hits.findIndex((h) => !h.titleMatched);

    if (firstTitleMatched !== -1 && firstBodyOnly !== -1) {
      expect(firstTitleMatched).toBeLessThan(firstBodyOnly);
    }
  });

  it("命中摘要取自命中词附近的正文", async () => {
    const hits = search(await notes(), "服务端渲染");
    const text = hits[0].excerpt.map((s) => s.text).join("");

    expect(text).toContain("服务端渲染");
    expect(hits[0].excerpt.some((s) => s.hit)).toBe(true);
  });
});

describe("高亮切分", () => {
  it("把命中片段标记出来，其余保持原样", () => {
    const segs = highlight("知识库搭建与知识管理", ["知识"]);

    expect(segs.map((s) => s.text).join("")).toBe("知识库搭建与知识管理");
    expect(segs.filter((s) => s.hit).map((s) => s.text)).toEqual(["知识", "知识"]);
  });

  it("长词优先，避免短词抢走高亮范围", () => {
    const segs = highlight("知识库搭建", ["知识", "知识库"]);
    expect(segs.find((s) => s.hit)?.text).toBe("知识库");
  });

  it("大小写不同也能高亮，且保留原文大小写", () => {
    const segs = highlight("使用 GFM 表格", ["gfm"]);
    expect(segs.find((s) => s.hit)?.text).toBe("GFM");
  });

  it("没有关键词时原样返回", () => {
    expect(highlight("原文", [])).toEqual([{ text: "原文", hit: false }]);
  });
});

describe("分词", () => {
  it("按空白切分并去掉空片段", () => {
    expect(tokenize("  微信   小游戏 ")).toEqual(["微信", "小游戏"]);
    expect(tokenize("   ")).toEqual([]);
  });
});
