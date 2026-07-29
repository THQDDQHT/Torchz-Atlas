/**
 * 时间显示。
 *
 * 固定用 Asia/Shanghai 渲染，而不是依赖容器的本地时区：服务器时区可能是 UTC，
 * 那样"今天更新"的笔记在晚上会显示成明天，对着自己的知识库看会很别扭。
 */

const TZ = process.env.DISPLAY_TIMEZONE || "Asia/Shanghai";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatDate(ms: number): string {
  if (!ms) return "";
  return dateFormatter.format(new Date(ms));
}

export function formatDateTime(ms: number): string {
  if (!ms) return "";
  return dateTimeFormatter.format(new Date(ms));
}

/** 供 <time datetime> 使用的机器可读值 */
export function toISO(ms: number): string {
  if (!ms) return "";
  return new Date(ms).toISOString();
}

/** 近几天用相对说法，更久则回到日期 —— 目的是让"最近更新"一眼能扫 */
export function formatRelative(ms: number, now: number = Date.now()): string {
  if (!ms) return "";
  const diff = now - ms;
  if (diff < 0) return formatDate(ms);

  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < hour) {
    const n = Math.max(1, Math.floor(diff / minute));
    return `${n} 分钟前`;
  }
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
  return formatDate(ms);
}
