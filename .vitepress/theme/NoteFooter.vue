<script setup lang="ts">
import { computed } from "vue";
import { useData } from "vitepress";

interface LinkItem {
  name?: string;
  title?: string;
  href: string;
}

interface AtlasMetadata {
  updatedAt?: number;
  category: { name: string; href: string };
  tags: LinkItem[];
  backlinks: LinkItem[];
}

const { frontmatter } = useData();
const metadata = computed<AtlasMetadata | null>(() => frontmatter.value.atlas ?? null);

const updatedAtText = computed(() => {
  const updatedAt = metadata.value?.updatedAt;
  if (!updatedAt) return null;
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(updatedAt));
});
</script>

<template>
  <div v-if="metadata" class="atlas-note-footer">
    <p v-if="updatedAtText" class="atlas-updated-at">最后更新于 {{ updatedAtText }}</p>

    <div class="atlas-note-taxonomy">
      <span class="atlas-taxonomy-label">收录于</span>
      <a class="atlas-category" :href="metadata.category.href">{{ metadata.category.name }}</a>
      <a
        v-for="tag in metadata.tags"
        :key="tag.href"
        class="atlas-tag"
        :href="tag.href"
      >
        #{{ tag.name }}
      </a>
    </div>

    <section v-if="metadata.backlinks.length > 0" class="atlas-backlinks" aria-labelledby="atlas-backlinks-title">
      <h2 id="atlas-backlinks-title">被这些笔记引用</h2>
      <ul>
        <li v-for="backlink in metadata.backlinks" :key="backlink.href">
          <a :href="backlink.href">{{ backlink.title }}</a>
        </li>
      </ul>
    </section>
  </div>
</template>
