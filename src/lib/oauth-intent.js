const adminIntentCookie = "hackmate_admin_oauth_intent";
const maxAgeSeconds = 10 * 60;

export function setAdminOAuthIntent(adminOrigin) {
  if (!adminOrigin) return;

  const value = encodeURIComponent(JSON.stringify({ adminOrigin, startedAt: Date.now() }));
  document.cookie = `${adminIntentCookie}=${value}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax${cookieDomainSuffix()}${secureSuffix()}`;
}

export function consumeAdminOAuthIntent() {
  const intent = peekAdminOAuthIntent();
  document.cookie = `${adminIntentCookie}=; Max-Age=0; Path=/; SameSite=Lax${cookieDomainSuffix()}${secureSuffix()}`;
  return intent;
}

export function clearAdminOAuthIntent() {
  document.cookie = `${adminIntentCookie}=; Max-Age=0; Path=/; SameSite=Lax${cookieDomainSuffix()}${secureSuffix()}`;
}

export function peekAdminOAuthIntent() {
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${adminIntentCookie}=`));

  if (!cookie) return null;

  try {
    return JSON.parse(decodeURIComponent(cookie.slice(adminIntentCookie.length + 1)));
  } catch {
    return null;
  }
}

function cookieDomainSuffix() {
  const hostname = window.location.hostname;
  if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return "";

  const labels = hostname.split(".");
  if (labels.length < 3) return "";

  const parentLabels = labels.length >= 4 ? labels.slice(-3) : labels.slice(-2);
  return `; Domain=.${parentLabels.join(".")}`;
}

function secureSuffix() {
  return window.location.protocol === "https:" ? "; Secure" : "";
}
