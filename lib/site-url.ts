/**
 * The deployed origin, resolved at BUILD time.
 *
 * `output: "export"` means there is no request to read an origin from, so anything needing an absolute
 * URL (the RSS feed, Storybook links) has to be told where the site lives. Precedence:
 *
 *   1. `NEXT_PUBLIC_SITE_URL` — set on the PRODUCTION environment. It has to win, because on a
 *      Cloudflare Pages production deploy `CF_PAGES_URL` is the *.pages.dev address, not the custom
 *      domain.
 *   2. `CF_PAGES_URL` — Cloudflare injects the current deployment's own URL. Leave
 *      `NEXT_PUBLIC_SITE_URL` unset on the Preview environment and every preview then advertises its
 *      own links, which is what reading `request.url` used to give for free.
 *   3. The production domain, so a bare local build still emits sane absolute URLs.
 *
 * One constant rather than a string repeated per call site: the domain moved once already, and the old
 * value was scattered across the feed, the Storybook link builder, and the hero's copy button.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.CF_PAGES_URL || "https://sistine.weekendsuperhero.io";

/** Trailing-slash-free origin joined to a path, for feed items and canonical links. */
export function siteUrl(path = ""): string {
  const base = SITE_URL.replace(/\/+$/, "");
  if (!path) return base;
  return `${base}/${path.replace(/^\/+/, "")}`;
}
