import { h } from "vue";
import DefaultTheme from "vitepress/theme";
import NoteFooter from "./NoteFooter.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      "doc-footer-before": () => h(NoteFooter),
    });
  },
};
