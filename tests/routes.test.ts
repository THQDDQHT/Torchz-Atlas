import { describe, expect, it } from "vitest";
import { noteHref, tagHref, tagPageName } from "@/lib/routes";

describe("静态站路由", () => {
  it("笔记链接去掉扩展名并逐段编码", () => {
    expect(noteHref("00 灵感想法/想法收件箱.md")).toBe(
      "/note/00%20%E7%81%B5%E6%84%9F%E6%83%B3%E6%B3%95/%E6%83%B3%E6%B3%95%E6%94%B6%E4%BB%B6%E7%AE%B1",
    );
  });

  it("普通中文标签保留可读文件名", () => {
    expect(tagPageName("游戏开发")).toBe("游戏开发");
    expect(tagHref("游戏开发")).toBe("/tag/%E6%B8%B8%E6%88%8F%E5%BC%80%E5%8F%91");
  });

  it("含路径分隔符的标签改用安全文件名", () => {
    expect(tagPageName("a/b")).toMatch(/^tag-/);
    expect(tagPageName("a/b")).not.toContain("/");
  });
});
