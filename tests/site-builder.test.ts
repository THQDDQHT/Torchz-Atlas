import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { clearIndexCache } from "@/lib/indexer";
import { notePageData, prepareSiteSource } from "@/lib/site-builder";

const FIXTURE = path.join(import.meta.dirname, "fixtures", "knowledge");
let generatedRoot: string;

beforeAll(async () => {
  process.env.KNOWLEDGE_DIR = FIXTURE;
  generatedRoot = await fs.mkdtemp(path.join(os.tmpdir(), "torchz-atlas-site-"));
});

beforeEach(() => {
  clearIndexCache();
});

afterAll(async () => {
  await fs.rm(generatedRoot, { recursive: true, force: true });
});

describe("VitePress 源目录生成", () => {
  it("原始笔记不改内容地复制进 note 路由", async () => {
    await prepareSiteSource(generatedRoot);
    const source = await fs.readFile(path.join(FIXTURE, "03 好东西", "表格与代码.md"), "utf8");
    const generated = await fs.readFile(
      path.join(generatedRoot, "note", "03 好东西", "表格与代码.md"),
      "utf8",
    );

    expect(generated).toBe(source);
  });

  it("生成首页、分类页和标签页", async () => {
    await prepareSiteSource(generatedRoot);
    const home = await fs.readFile(path.join(generatedRoot, "index.md"), "utf8");
    const category = await fs.readFile(
      path.join(generatedRoot, "category", "good-things.md"),
      "utf8",
    );
    const tag = await fs.readFile(path.join(generatedRoot, "tag", "游戏开发.md"), "utf8");

    expect(home).toContain("## 最近更新");
    expect(home).toContain("## 分类");
    expect(category).toContain("表格与代码");
    expect(tag).toContain("标签写法测试");
  });

  it("文章页数据包含标签、反链、更新时间和相邻文章", async () => {
    const { index } = await prepareSiteSource(generatedRoot);
    const data = notePageData(index, {
      relativePath: "note/03 好东西/表格与代码.md",
      filePath: "note/03 好东西/表格与代码.md",
      title: "表格与代码",
      description: "",
      headers: [],
      frontmatter: {},
    });

    const atlas = data?.frontmatter?.atlas;
    expect(data?.lastUpdated).toBeGreaterThan(0);
    expect(atlas.tags).toEqual(
      expect.arrayContaining([{ name: "排版", href: "/tag/%E6%8E%92%E7%89%88" }]),
    );
    expect(atlas.backlinks.map((item: { title: string }) => item.title)).toContain(
      "想法收件箱",
    );
  });
});
