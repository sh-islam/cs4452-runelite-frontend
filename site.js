// The website's one piece of logic: talking to the backend, and remembering
// who is signed in (in this browser only). Every page includes this.
//
// BACKEND is the one address that has to match the server: where the backend
// is reached from the internet (see the backend's CS4452_PUBLIC_URL).
const BACKEND = "https://shad-server.elf-tarpon.ts.net/cs4452-api";

const session = {
  get(kind) { try { return localStorage.getItem("cs4452." + kind) || ""; } catch (e) { return ""; } },
  set(kind, token) { try { localStorage.setItem("cs4452." + kind, token); } catch (e) {} },
  clear(kind) { try { localStorage.removeItem("cs4452." + kind); } catch (e) {} },
};

// One call to the backend. A kind ("friend" or "admin") sends that session's
// token. The answer's JSON comes back, or an Error whose message is the
// backend's own words.
async function api(path, { method = "GET", body, kind, raw } = {}) {
  const headers = {};
  if (kind) headers.Authorization = "Bearer " + session.get(kind);
  if (body !== undefined) headers["Content-Type"] = "application/json";
  let reply;
  try {
    reply = await fetch(BACKEND + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch (e) {
    throw new Error("the server could not be reached");
  }
  if (!reply.ok) {
    let detail = reply.statusText;
    try { detail = (await reply.json()).detail || detail; } catch (e) {}
    if (reply.status === 401 && kind) session.clear(kind);
    throw new Error(detail);
  }
  return raw ? reply : reply.json();
}

function when(seconds) {
  if (!seconds) return "-";
  return new Date(seconds * 1000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function escapeHtml(text) {
  return String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// The nav's current page, from the file name.
document.addEventListener("DOMContentLoaded", () => {
  const here = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("header nav a").forEach((a) => {
    if ((a.getAttribute("href") || "") === here) a.classList.add("on");
  });
});
