import "dotenv/config";
import path from "node:path";
import { defineConfig } from "vitepress";
import { getKnowledgeDir, getSiteDescription, getSiteName } from "../lib/config";
import { prepareSiteSource, notePageData } from "../lib/site-builder";
import { wikilinkPlugin } from "../lib/wikilink";

const projectRoot = path.resolve(import.meta.dirname, "..");
const sourceDir = path.resolve(
  process.env.SITE_SOURCE_DIR || path.join(projectRoot, ".vitepress", "generated"),
);
const outDir = path.resolve(
  process.env.SITE_OUT_DIR || path.join(projectRoot, ".vitepress", "dist"),
);
const cacheDir = path.resolve(
  process.env.VITEPRESS_CACHE_DIR || path.join(projectRoot, ".vitepress", "cache"),
);
const prepared = await prepareSiteSource(sourceDir);

export default defineConfig({
  lang: "zh-CN",
  title: getSiteName(),
  description: getSiteDescription(),
  srcDir: sourceDir,
  outDir,
  cacheDir,
  cleanUrls: true,
  lastUpdated: false,
  appearance: true,
  head: [
    ["meta", { name: "robots", content: "noindex,nofollow,noarchive" }],
    ["meta", { name: "referrer", content: "no-referrer" }],
  ],
  markdown: {
    theme: { light: "github-light", dark: "github-dark-dimmed" },
    lineNumbers: true,
    config(markdown) {
      wikilinkPlugin(markdown, prepared.index);
    },
  },
  transformPageData(pageData) {
    return notePageData(prepared.index, pageData);
  },
  themeConfig: {
    nav: [{ text: "首页", link: "/" }],
    sidebar: prepared.sidebar,
    outline: { level: [2, 3], label: "本页大纲" },
    search: {
      provider: "local",
      options: {
        translations: {
          button: {
            buttonText: "搜索",
            buttonAriaLabel: "搜索笔记",
          },
          modal: {
            displayDetails: "显示详情",
            resetButtonTitle: "清除查询",
            backButtonTitle: "关闭搜索",
            noResultsText: "没有找到相关笔记",
            footer: {
              selectText: "选择",
              navigateText: "切换",
              closeText: "关闭",
            },
          },
        },
      },
    },
    darkModeSwitchLabel: "外观",
    lightModeSwitchTitle: "切换到浅色模式",
    darkModeSwitchTitle: "切换到深色模式",
    sidebarMenuLabel: "目录",
    returnToTopLabel: "返回顶部",
    skipToContentLabel: "跳到正文",
    lastUpdated: {
      text: "最后更新",
      formatOptions: {
        dateStyle: "medium",
        timeStyle: "short",
        forceLocale: true,
      },
    },
    docFooter: {
      prev: "较新的笔记",
      next: "较早的笔记",
    },
    notFound: {
      title: "没有找到这个页面",
      quote: "它可能已被移动、重命名或删除。",
      linkLabel: "返回首页",
      linkText: "返回首页",
    },
    externalLinkIcon: true,
  },
  vite: {
    resolve: {
      // 生产环境的生成源目录位于 /tmp，不能依赖向上查找 node_modules。
      alias: [
        {
          find: /^vue\/server-renderer$/,
          replacement: path.join(projectRoot, "node_modules", "vue", "server-renderer", "index.mjs"),
        },
        {
          find: /^@vue\/server-renderer$/,
          replacement: path.join(
            projectRoot,
            "node_modules",
            "@vue",
            "server-renderer",
            "dist",
            "server-renderer.esm-bundler.js",
          ),
        },
        {
          find: /^vue$/,
          replacement: path.join(
            projectRoot,
            "node_modules",
            "vue",
            "dist",
            "vue.runtime.esm-bundler.js",
          ),
        },
      ],
    },
    server: {
      watch: {
        usePolling: true,
        interval: 500,
      },
      fs: {
        allow: [projectRoot, getKnowledgeDir(), sourceDir],
      },
    },
  },
});
