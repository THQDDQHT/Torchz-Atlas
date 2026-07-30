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

/**
 * MiniSearch 默认按非字母数字切词，中文整段正文会变成一个 token，导致搜不到。
 * 这里把中日韩连续字串切成单字 + 二元组，拉丁字母与数字仍按词切分。
 *
 * 注意:正则必须定义在函数体内。VitePress 会把 themeConfig 中的函数序列化后
 * 在浏览器端用 new Function() 重建,函数引用的模块作用域变量在浏览器里都不存在。
 */
function tokenizeCjk(text: string): string[] {
  const CJK_CHAR = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
  const WORD_CHAR = /[\p{L}\p{N}_]/u;
  const tokens: string[] = [];
  let cjkRun = "";
  let wordRun = "";

  const flushCjk = () => {
    for (let i = 0; i < cjkRun.length; i++) {
      tokens.push(cjkRun[i]);
      if (i + 1 < cjkRun.length) tokens.push(cjkRun.slice(i, i + 2));
    }
    cjkRun = "";
  };
  const flushWord = () => {
    if (wordRun) tokens.push(wordRun);
    wordRun = "";
  };

  for (const char of text) {
    if (CJK_CHAR.test(char)) {
      flushWord();
      cjkRun += char;
    } else if (WORD_CHAR.test(char)) {
      flushCjk();
      wordRun += char;
    } else {
      flushCjk();
      flushWord();
    }
  }
  flushCjk();
  flushWord();
  return tokens;
}

export default defineConfig({
  lang: "zh-CN",
  title: getSiteName(),
  description: getSiteDescription(),
  srcDir: sourceDir,
  outDir,
  cacheDir,
  cleanUrls: true,
  // 不能开:VitePress 的 lastUpdated 会对每个文件 spawn git log,
  // 而生成源目录不是 git 仓库,容器镜像里也没有 git。更新时间由
  // notePageData 写入 frontmatter.atlas.updatedAt,在 NoteFooter 中渲染。
  lastUpdated: false,
  appearance: true,
  head: [
    ["meta", { name: "robots", content: "noindex,nofollow,noarchive" }],
    ["meta", { name: "referrer", content: "no-referrer" }],
  ],
  markdown: {
    theme: { light: "github-light", dark: "github-dark-dimmed" },
    lineNumbers: false,
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
        miniSearch: {
          options: {
            tokenize: tokenizeCjk,
          },
          searchOptions: {
            combineWith: "AND",
          },
        },
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
