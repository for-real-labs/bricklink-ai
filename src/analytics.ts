import type { PostHog } from "posthog-js";
let client: PostHog | undefined;
export async function initAnalytics() {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key) return;
  const host = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";
  if (!["https://us.i.posthog.com", "https://eu.i.posthog.com"].includes(host))
    return;
  const { default: posthog } = await import("posthog-js");
  posthog.init(key, {
    api_host: host,
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    person_profiles: "identified_only",
    persistence: "memory",
    advanced_disable_decide: true,
  });
  client = posthog;
}
export function track(
  event: string,
  properties: Record<string, string | number | boolean> = {},
) {
  client?.capture(`studio_${event}`, properties);
}
