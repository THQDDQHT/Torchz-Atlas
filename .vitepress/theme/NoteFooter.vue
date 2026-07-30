<script setup lang="ts">
import { computed } from "vue";
import { useData } from "vitepress";

interface LinkItem {
  name?: string;
  title?: string;
  href: string;
}

interface AtlasMetadata {
  category: { name: string; href: string };
  tags: LinkItem[];
  backlinks: LinkItem[];
}

const { frontmatter } = useData();
const metadata = computed<AtlasMetadata | null>(() => frontmatter.value.atlas ?? null);
</script>

<template>
  <div v-if="metadata" class="atlas-note-footer">
    <div class="atlas-note-taxonomy">
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
