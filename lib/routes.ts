export function noteHref(id: string): string {
  const withoutExtension = id.replace(/\.md$/i, "");
  return `/note/${withoutExtension.split("/").map(encodeURIComponent).join("/")}`;
}

export function tagPageName(tag: string): string {
  if (
    tag.length > 0 &&
    !tag.startsWith(".") &&
    !tag.includes("/") &&
    !tag.includes("\\") &&
    !tag.includes("\0")
  ) {
    return tag;
  }

  return `tag-${Buffer.from(tag).toString("base64url")}`;
}

export function tagHref(tag: string): string {
  return `/tag/${encodeURIComponent(tagPageName(tag))}`;
}
