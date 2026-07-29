import { describe, expect, it, beforeAll, beforeEach, afterAll } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { getIndex, clearIndexCache, createWikilinkResolver } from "@/lib/indexer";

const FIXTURE = path.join(import.meta.dirname, "fixtures", "knowledge");

beforeAll(() => {
  process.env.KNOWLEDGE_DIR = FIXTURE;
});

beforeEach(() => {
  clearIndexCache();
});

describe("扫描范围", () => {
  it("只收录四个分类目录下的普通笔记", async () => {
    const index = await getIndex();
    const ids = index.notes.map((n) => n.id).sort();

    expect(ids).toEqual([
      "00 灵感想法/想法收件箱.md",
      "00 灵感想法/重复的标题.md",
      "01 项目/恶意内容测试.md",
      "01 项目/重复的标题.md",
      "03 好东西/标签写法测试.md",
      "03 好东西/表格与代码.md",
    ]);
  });

  it("排除隐藏文件、仓库根 README 与分类 README", async () => {
    const index = await getIndex();
    const ids = index.notes.map((n) => n.id);

    expect(ids).not.toContain("00 灵感想法/.隐藏笔记.md");
    expect(ids).not.toContain("README.md");
    expect(ids.some((id) => id.endsWith("/README.md"))).toBe(false);
    expect(index.notes.some((n) => n.plainText.includes("FAKE_TOKEN"))).toBe(false);
  });

  it("分类 README 变成分类介绍", async () => {
    const index = await getIndex();
    expect(index.categoryDescriptions.get("ideas")).toContain("随手记录");
    expect(index.categoryDescriptions.get("lessons")).toContain("问题、根因");
  });

  it("没有普通笔记的分类得到空列表而不是报错", async () => {
    const index = await getIndex();
    expect(index.byCategory.get("lessons")).toEqual([]);
  });

  it("笔记按修改时间倒序排列", async () => {
    const index = await getIndex();
    const times = index.notes.map((n) => n.modifiedAt);
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });
});

describe("标题与元数据", () => {
  it("标题取首个一级标题", async () => {
    const index = await getIndex();
    expect(index.byId.get("00 灵感想法/想法收件箱.md")?.title).toBe("想法收件箱");
  });

  it("摘要不以标题开头，且不为空", async () => {
    const index = await getIndex();
    const note = index.byId.get("03 好东西/表格与代码.md")!;
    expect(note.summary.length).toBeGreaterThan(0);
    expect(note.summary.startsWith("表格与代码")).toBe(false);
  });

  it("分类归属正确", async () => {
    const index = await getIndex();
    expect(index.byId.get("01 项目/恶意内容测试.md")?.category).toBe("projects");
    expect(index.byId.get("03 好东西/表格与代码.md")?.categoryName).toBe("好东西");
  });
});

describe("标签提取", () => {
  it("同时支持元信息行与行内 Hashtag，并去重", async () => {
    const index = await getIndex();
    const note = index.byId.get("03 好东西/标签写法测试.md")!;

    expect(note.tags).toEqual(
      expect.arrayContaining(["自媒体", "游戏开发", "学习记录", "小游戏", "方法论"]),
    );
    // "自媒体" 同时出现在元信息行与正文 Hashtag 中，只应计一次
    expect(note.tags.filter((t) => t === "自媒体")).toHaveLength(1);
  });

  it("Markdown 标题不会被误判成标签", async () => {
    const index = await getIndex();
    const note = index.byId.get("03 好东西/标签写法测试.md")!;

    expect(note.tags).not.toContain("这个二级标题不是标签");
    expect(note.tags).not.toContain("标签写法测试");
  });

  it("代码块里的井号不会被当成标签", async () => {
    const index = await getIndex();
    const note = index.byId.get("03 好东西/表格与代码.md")!;

    expect(note.tags).not.toContain("这不是标签");
    expect(note.tags).toEqual(expect.arrayContaining(["排版", "可读性", "知识库搭建"]));
  });

  it("标签索引把同标签的笔记聚到一起", async () => {
    const index = await getIndex();
    expect(index.tags.get("自媒体")?.map((n) => n.id)).toEqual(["03 好东西/标签写法测试.md"]);
    expect(index.tags.has("待整理")).toBe(true);
  });
});

describe("wikilink 解析", () => {
  it("唯一命中时给出站内链接", async () => {
    const index = await getIndex();
    const resolve = createWikilinkResolver(index, "00 灵感想法");
    const r = resolve("表格与代码");

    expect(r.kind).toBe("found");
    expect(r.kind === "found" && r.href.startsWith("/note/")).toBe(true);
  });

  it("找不到目标时判定为 missing", async () => {
    const index = await getIndex();
    const resolve = createWikilinkResolver(index, "00 灵感想法");
    expect(resolve("根本不存在的笔记").kind).toBe("missing");
  });

  it("多篇同名时优先同目录", async () => {
    const index = await getIndex();
    const resolve = createWikilinkResolver(index, "00 灵感想法");
    const r = resolve("重复的标题");

    expect(r.kind).toBe("found");
    expect(r.kind === "found" && decodeURIComponent(r.href)).toContain("00 灵感想法");
  });

  it("同目录也无法消歧时判定为 ambiguous，绝不随机跳转", async () => {
    const index = await getIndex();
    const resolve = createWikilinkResolver(index, "03 好东西");
    expect(resolve("重复的标题").kind).toBe("ambiguous");
  });
});

describe("反向链接", () => {
  it("记录谁引用了这篇笔记", async () => {
    const index = await getIndex();
    const inbound = index.backlinks.get("03 好东西/表格与代码.md") ?? [];

    expect(inbound.map((n) => n.id)).toContain("00 灵感想法/想法收件箱.md");
  });

  it("无法消歧的 wikilink 不产生反链", async () => {
    const index = await getIndex();

    // 「表格与代码」从 03 好东西 引用「重复的标题」，跨目录同名无法消歧；
    // 正向不跳转，反向也不该凭空多出一条来源
    for (const id of ["00 灵感想法/重复的标题.md", "01 项目/重复的标题.md"]) {
      const inbound = index.backlinks.get(id) ?? [];
      expect(inbound.map((n) => n.id)).not.toContain("03 好东西/表格与代码.md");
    }
  });

  it("指向不存在笔记的 wikilink 不产生条目", async () => {
    const index = await getIndex();
    expect(index.backlinks.has("根本不存在的笔记")).toBe(false);
  });

  it("反链方向与正向解析一致：同目录优先的那篇才收到反链", async () => {
    const index = await getIndex();
    // 想法收件箱在 00 灵感想法，引用「重复的标题」时命中同目录那篇
    const sameDir = index.backlinks.get("00 灵感想法/重复的标题.md") ?? [];
    const otherDir = index.backlinks.get("01 项目/重复的标题.md") ?? [];

    expect(sameDir.map((n) => n.id)).toContain("00 灵感想法/想法收件箱.md");
    expect(otherDir.map((n) => n.id)).not.toContain("00 灵感想法/想法收件箱.md");
  });
});

describe("自动感知文件变化", () => {
  const tempNote = path.join(FIXTURE, "02 踩坑记录", "临时新增笔记.md");

  afterAll(async () => {
    await fs.rm(tempNote, { force: true });
  });

  it("新增笔记后无需重启即可出现在索引中", async () => {
    const before = await getIndex();
    expect(before.byId.has("02 踩坑记录/临时新增笔记.md")).toBe(false);

    await fs.writeFile(tempNote, "# 临时新增笔记\n\n用来验证目录指纹比对能感知新文件。\n", "utf8");

    // 不清缓存：正是要验证指纹比对自己发现了变化
    const after = await getIndex();
    expect(after.byId.has("02 踩坑记录/临时新增笔记.md")).toBe(true);
    expect(after.byCategory.get("lessons")).toHaveLength(1);

    await fs.rm(tempNote);

    const restored = await getIndex();
    expect(restored.byId.has("02 踩坑记录/临时新增笔记.md")).toBe(false);
  });
});
