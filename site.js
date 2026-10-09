// The website's one piece of logic. GitHub Pages holds only the sign-in page:
// every page behind it, its images and the news come from the backend, to
// someone signed in and no one else (the pages are in the backend's site/).
//
// BACKEND is the one address that has to match the server: where the backend
// is reached from the internet (see the backend's CS4452_PUBLIC_URL). A copy
// opened on this computer (localhost) talks to a backend on this computer.
const BACKEND = location.hostname === "localhost" ? "http://localhost:8080" : "https://shad-server.elf-tarpon.ts.net/cs4452-api";

// The pages, by what follows the "?" in the address (./?howto); Home is plain ./
const PAGES = { home: "CS4452", howto: "How to use", bots: "Bots", downloads: "Downloads", report: "Report a problem", admin: "Admin" };

// The signed-in session, in this browser only. Sessions from before the one
// sign-in (a friend's, the admin's) still count until they run out.
const session = {
  get() {
    try { return localStorage.getItem("cs4452.session") || localStorage.getItem("cs4452.admin") || localStorage.getItem("cs4452.friend") || ""; }
    catch (e) { return ""; }
  },
  set(token) { session.clear(); try { localStorage.setItem("cs4452.session", token); } catch (e) {} },
  clear() { try { ["cs4452.session", "cs4452.admin", "cs4452.friend"].forEach((key) => localStorage.removeItem(key)); } catch (e) {} },
};

// Who is signed in, as the backend said with the page: { role: "friend" or "admin", name }.
let viewer = { role: "", name: "" };

// One call to the backend, with the session. The answer's JSON comes back, or
// an Error whose message is the backend's own words and whose status is its code.
async function api(path, { method = "GET", body, raw } = {}) {
  const headers = {};
  const token = session.get();
  if (token) headers.Authorization = "Bearer " + token;
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
    if (reply.status === 401) session.clear();
    const error = new Error(detail);
    error.status = reply.status;
    throw error;
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

function pageName() {
  const name = location.search.slice(1).split("&")[0].toLowerCase();
  return Object.hasOwn(PAGES, name) ? name : "home";
}

// The pages' images come from the backend with the session, each fetched once.
const images = new Map();
function loadImage(img) {
  const path = img.dataset.src;
  if (!images.has(path)) {
    images.set(path, api("/api/site/" + path, { raw: true }).then((reply) => reply.blob()).then((blob) => URL.createObjectURL(blob)));
  }
  images.get(path).then((url) => { img.src = url; }).catch(() => {});
}

// One page from the backend, put in place of the sign-in.
async function show(page) {
  const main = document.getElementById("page");
  let reply;
  try {
    reply = await api("/api/site/" + page);
  } catch (e) {
    if (e.status === 401) { signIn(); return; }
    if ((e.status === 403 || e.status === 404) && page !== "home") { location.replace("./"); return; }
    document.getElementById("signin").classList.add("hidden");
    main.insertAdjacentHTML("beforeend", `<div class="card stone"><p class="err">${escapeHtml(e.message)}</p><p><a href="">Try again</a></p></div>`);
    return;
  }
  viewer = { role: reply.role, name: reply.name };
  document.title = page === "home" ? "CS4452" : PAGES[page] + " · CS4452";
  const nav = document.getElementById("nav");
  nav.classList.remove("hidden");
  document.getElementById("nav-admin").classList.toggle("hidden", viewer.role !== "admin");
  nav.querySelectorAll("a[data-page]").forEach((a) => a.classList.toggle("on", a.dataset.page === page));

  // Read in a template first, where nothing loads or runs: its images are then
  // fetched with the session, and its script runs once the page is in place.
  const template = document.createElement("template");
  template.innerHTML = reply.html;
  const scripts = [...template.content.querySelectorAll("script")];
  scripts.forEach((script) => script.remove());
  const pictures = [...template.content.querySelectorAll("img[src]")].filter((img) => !/^(https?|data|blob):/.test(img.getAttribute("src")));
  pictures.forEach((img) => { img.dataset.src = img.getAttribute("src"); img.removeAttribute("src"); });
  main.replaceChildren(template.content);
  pictures.forEach(loadImage);
  for (const old of scripts) {
    const script = document.createElement("script");
    script.textContent = old.textContent;
    main.appendChild(script);
  }
}

function signIn() {
  session.clear();
  document.title = "Sign in · CS4452";
  document.getElementById("nav").classList.add("hidden");
  document.getElementById("signin").classList.remove("hidden");
  document.querySelector("#signin-form [name=name]").focus();
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("signout").addEventListener("click", () => session.clear());
  document.getElementById("signin-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.target;
    const error = document.getElementById("signin-error");
    error.textContent = "";
    form.querySelector("button").disabled = true;
    try {
      const reply = await api("/api/signin", { method: "POST", body: { name: form.name.value, password: form.password.value } });
      session.set(reply.token);
      await show(pageName());
    } catch (e) {
      error.textContent = e.message;
    } finally {
      form.querySelector("button").disabled = false;
    }
  });
  if (session.get()) show(pageName()); else signIn();
});
