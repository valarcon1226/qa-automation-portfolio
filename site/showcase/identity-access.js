window.SHOWCASE = {
  headline: "Verified Keycloak 26 authentication security across Edge, Firefox, and WebKit, preserved 10,000 users and 20/20 2FA tokens in an 18.8 s upgrade, and protected password resets during mail outages.",
  source: "results/metrics.json",
  blocks: [
    {
      type: "stats",
      title: "Login performance & Keycloak 25 -> 26 upgrade",
      caption: "35 of 35 security, resilience, and cross-browser scenarios passed",
      items: [
        { label: "App token speed (p95)", value: "7 ms", note: "1,169 requests, 0 errors", tone: "good" },
        { label: "Password login (p95)", value: "55 ms", note: "273 requests, 0 errors", tone: "good" },
        { label: "Major upgrade time", value: "18.8 s", note: "Keycloak 25.0.6 -> 26.0.5", tone: "good" },
        { label: "Users & 2FA preserved", value: "10,000", note: "20 / 20 authenticator logins kept", tone: "good" }
      ]
    },
    {
      type: "checklist",
      title: "Security & reliability guarantees verified",
      items: [
        { text: "Reusing a rotated refresh token or auth code fails and revokes the whole session", status: "pass" },
        { text: "3 consecutive wrong passwords or 2FA codes lock the account on Edge, Firefox & WebKit", status: "pass" },
        { text: "Password reset shows the same generic message when mail delivery fails (no account leaks)", status: "pass" },
        { text: "A 300-request traffic spike sheds excess load cleanly without crashes and recovers in < 2 s", status: "pass" },
        { text: "Bulk user import with FAIL collision mode rolls back atomically with zero partial records", status: "pass" },
        { text: "Upgrading Keycloak 25 -> 26 preserves passwords, 2FA secrets, and client credentials", status: "pass" }
      ]
    },
    {
      type: "cards",
      title: "Operational notes documented for production admins",
      items: [
        {
          title: "Rapid-burst protection trips before 3-failure count",
          badge: "Informational",
          tone: "info",
          subtitle: "FIND-003 · Brute-Force Tuning",
          body: "Multiple failed logins within 1 second trigger instant throttling before reaching the 3-attempt lockout limit."
        },
        {
          title: "Admin tokens expire after 60 seconds",
          badge: "Low severity",
          tone: "warn",
          subtitle: "FIND-005 · Long Batch Jobs",
          body: "Walking all 10,000 users in small pages takes over a minute, so scripts must refresh admin tokens mid-run."
        },
        {
          title: "Concurrent registrations can duplicate pages during user export",
          badge: "Low severity",
          tone: "warn",
          subtitle: "FIND-008 · Offset Pagination",
          body: "If new accounts are created mid-walk, offset pages shift and repeat entries unless exports deduplicate by user ID."
        }
      ]
    }
  ]
};
