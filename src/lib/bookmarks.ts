/**
 * Bookmarks moved into the visitor's browser when Notes Hub became a public,
 * account-free site — see lib/use-bookmarks. The server therefore cannot know
 * what anyone has saved, and this helper exists only so listing pages can say
 * "render the bookmark toggles" without also claiming to know their state.
 *
 * The returned set is always empty: BookmarkButton reads the real state from
 * localStorage after it mounts.
 */
export function getBookmarkedIds(): Set<string> {
  return new Set<string>();
}
