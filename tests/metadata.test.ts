import { describe, expect, it } from "vitest";
import { parseNoteMeta, truncate } from "@/lib/metadata";

describe("笔记元数据", () => {
  it("提取首个一级标题、正文纯文本与摘要", () => {
    const meta = parseNoteMeta("# 我的标题\n\n**加粗**的[链接](https://example.com)文字");

    expect(meta.title).toBe("我的标题");
    expect(meta.plainText).toContain("加粗");
    expect(meta.plainText).not.toContain("**");
    expect(meta.summary.startsWith("我的标题")).toBe(false);
  });

  it("同时提取元信息行、行内标签并去重", () => {
    const meta = parseNoteMeta(
      "# 标题\n\n- 标签：自媒体、游戏开发, 学习记录\n\n正文 #自媒体 #方法论",
    );

    expect(meta.tags).toEqual(["自媒体", "游戏开发", "学习记录", "方法论"]);
  });

  it("标题与代码块里的井号不算标签", () => {
    const meta = parseNoteMeta("## 不是标签\n\n```js\n// #也不是标签\n```\n");

    expect(meta.tags).toEqual([]);
  });

  it("收集 wikilink 目标并去重", () => {
    const meta = parseNoteMeta("正文里有 [[甲]] 和 [[乙]]，还有重复的 [[甲]]");
    expect(meta.wikilinks).toEqual(["甲", "乙"]);
  });

  it("按指定长度截断摘要", () => {
    expect(truncate("一二三四", 3)).toBe("一二三…");
    expect(truncate("一二", 3)).toBe("一二");
  });
});
