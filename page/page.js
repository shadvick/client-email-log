const SHARED_MAIL_HOSTS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "ymail.com",
  "rocketmail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "aol.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "gmx.net",
  "mail.com",
  "comcast.net",
  "verizon.net",
  "att.net",
  "sbcglobal.net",
  "bellsouth.net",
  "cox.net",
  "charter.net"
]);
const SKIP_FOLDER_TYPES = new Set(["trash", "junk", "drafts", "templates", "outbox"]);
const SKIP_ACCOUNT_TYPES = new Set(["rss", "nntp"]);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const els = {
  tabs: document.getElementById("saved-tabs"),
  editor: document.getElementById("saved-editor"),
  savedList: document.getElementById("saved-list"),
  savedForm: document.getElementById("saved-form"),
  year: document.getElementById("year"),
  mailFolder: document.getElementById("mail-folder"),
  allAccountsOption: document.getElementById("all-accounts-option"),
  allAccountsNote: document.getElementById("all-accounts-note"),
  scan: document.getElementById("btn-scan"),
  status: document.getElementById("status"),
  results: document.getElementById("results"),
  summary: document.getElementById("summary"),
  months: document.getElementById("months"),
  log: document.getElementById("log"),
  logTitle: document.getElementById("log-title"),
  foldersBtn: document.getElementById("btn-folders"),
  suggest: document.getElementById("suggest"),
  suggestLabel: document.getElementById("suggest-label"),
  suggestList: document.getElementById("suggest-list")
};

const state = {
  savedFolders: [],
  selectedId: null,
  mailFolders: [],
  mailAccountIds: [],
  mailFolderBySaved: {},
  identities: new Set(),
  report: null,
  openMonth: null,
  logYear: null,
  snippets: new Map(),
  topDomains: [],
  suggestLimit: 10
};

function slugId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now();
}

function extractEmails(value) {
  if (!value) {
    return [];
  }
  const text = Array.isArray(value) ? value.join(" ") : String(value);
  const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
  return matches ? matches.map((email) => email.toLowerCase()) : [];
}

function hostMatches(email, domains) {
  const host = (email.split("@")[1] || "").toLowerCase();
  return domains.some((domain) => {
    if (domain.indexOf("@") !== -1) {
      return email === domain;
    }
    return host === domain || host.endsWith("." + domain);
  });
}

function addressTouchesDomain(message, domains) {
  const emails = extractEmails(message.author)
    .concat(extractEmails(message.recipients))
    .concat(extractEmails(message.ccList));
  return emails.some((email) => hostMatches(email, domains));
}

function normalizeSubject(subject) {
  return String(subject || "")
    .replace(/^(re|fw|fwd)\s*:\s*/gi, "")
    .replace(/^(re|fw|fwd)\s*:\s*/gi, "")
    .trim()
    .toLowerCase() || "(no subject)";
}

function isReply(subject) {
  return /^(re|aw|sv|antw)(\[\d+\])?\s*:/i.test(String(subject || "").trim());
}

function parseDomains(value) {
  return String(value || "")
    .split(/[,\s]+/)
    .map((domain) => domain.replace(/^@/, "").toLowerCase())
    .filter(Boolean);
}

function flattenMailFolders(folder, accountName, depth, list) {
  if (!folder) {
    return;
  }
  const label = accountName + " / " + (folder.path || folder.name || "Folder");
  if (folder.id) {
    list.push({
      id: folder.id,
      name: folder.name,
      path: folder.path || folder.name,
      type: folder.type,
      accountName,
      depth,
      label
    });
  }
  (folder.subFolders || []).forEach((child) => {
    flattenMailFolders(child, accountName, depth + 1, list);
  });
}

function normalizeSavedFolder(item) {
  return {
    id: item.id,
    name: item.name,
    domains: Array.isArray(item.domains) ? item.domains : parseDomains(item.domains)
  };
}

function hasMultipleAccounts() {
  return state.mailAccountIds.length > 1;
}

async function loadSettings() {
  const stored = await messenger.storage.local.get([
    "folders",
    "clients",
    "selectedId",
    "mailFolderBySaved",
    "folderByClient"
  ]);
  const rawList = Array.isArray(stored.folders) && stored.folders.length
    ? stored.folders
    : stored.clients;
  state.savedFolders = Array.isArray(rawList) ? rawList.map(normalizeSavedFolder) : [];
  state.mailFolderBySaved = stored.mailFolderBySaved || stored.folderByClient || {};
  state.selectedId = stored.selectedId || null;
  if (state.savedFolders.length && !state.savedFolders.some((item) => item.id === state.selectedId)) {
    state.selectedId = state.savedFolders[0].id;
  }
  if (!state.savedFolders.length) {
    state.selectedId = null;
  }
}

async function saveSettings() {
  await messenger.storage.local.set({
    folders: state.savedFolders,
    selectedId: state.selectedId,
    mailFolderBySaved: state.mailFolderBySaved
  });
}

function selectedSaved() {
  return state.savedFolders.find((item) => item.id === state.selectedId) || state.savedFolders[0] || null;
}

function guessMailFolderId(saved) {
  if (!saved) {
    return state.mailFolders[0] ? state.mailFolders[0].id : "";
  }
  const remembered = state.mailFolderBySaved[saved.id];
  if (remembered && state.mailFolders.some((folder) => folder.id === remembered)) {
    return remembered;
  }
  const needles = [saved.name, ...saved.domains]
    .join(" ")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((part) => part.length > 2);
  const match = state.mailFolders.find((folder) => {
    const hay = (folder.label || "").toLowerCase();
    return needles.some((needle) => hay.includes(needle));
  });
  return match ? match.id : (state.mailFolders[0] ? state.mailFolders[0].id : "");
}

function updateEmptyState() {
  const empty = !state.savedFolders.length;
  els.scan.disabled = empty;
  if (empty) {
    els.editor.classList.remove("ctl-hidden");
    setStatus("Add a folder to start.");
  }
}

function renderTabs() {
  els.tabs.replaceChildren();
  if (!state.savedFolders.length) {
    const empty = document.createElement("p");
    empty.className = "ctl-hint";
    empty.textContent = "No folders yet.";
    els.tabs.appendChild(empty);
  }
  state.savedFolders.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ctl-tab" + (item.id === state.selectedId ? " is-active" : "");
    button.textContent = item.name;
    button.addEventListener("click", async () => {
      state.selectedId = item.id;
      await saveSettings();
      renderTabs();
      renderEditor();
      els.mailFolder.value = guessMailFolderId(item);
    });
    els.tabs.appendChild(button);
  });
  updateEmptyState();
}

function renderEditor() {
  els.savedList.replaceChildren();
  state.savedFolders.forEach((item) => {
    const row = document.createElement("div");
    row.className = "ctl-item-row" + (item.id === state.selectedId ? " is-active" : "");
    row.addEventListener("click", async (event) => {
      if (event.target.closest("button")) {
        return;
      }
      state.selectedId = item.id;
      await saveSettings();
      renderTabs();
      renderEditor();
      els.mailFolder.value = guessMailFolderId(item);
    });
    const info = document.createElement("div");
    info.textContent = item.domains.length
      ? item.name + " · " + item.domains.join(", ")
      : item.name;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "ctl-btn";
    remove.textContent = "Remove";
    remove.addEventListener("click", async () => {
      state.savedFolders = state.savedFolders.filter((saved) => saved.id !== item.id);
      state.selectedId = state.savedFolders[0] ? state.savedFolders[0].id : null;
      await saveSettings();
      renderTabs();
      renderEditor();
    });
    row.append(info, remove);
    els.savedList.appendChild(row);
  });
  updateEmptyState();
}

function fillYears() {
  const now = new Date().getFullYear();
  els.year.replaceChildren();
  for (let year = now; year >= now - 8; year -= 1) {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    els.year.appendChild(option);
  }
}

function fillMailFolders() {
  els.mailFolder.replaceChildren();
  state.mailFolders.forEach((folder) => {
    const option = document.createElement("option");
    option.value = folder.id;
    option.textContent = folder.label;
    els.mailFolder.appendChild(option);
  });
  const saved = selectedSaved();
  if (saved) {
    els.mailFolder.value = guessMailFolderId(saved);
  }
}

function setStatus(text) {
  els.status.textContent = text || "";
}

function modeValue() {
  const checked = document.querySelector('input[name="mode"]:checked');
  return checked ? checked.value : "folder";
}

function updateModeUi() {
  const multi = hasMultipleAccounts();
  els.allAccountsOption.classList.toggle("ctl-hidden", !multi);
  if (!multi && modeValue() === "all-accounts") {
    const folderMode = document.querySelector('input[name="mode"][value="folder"]');
    if (folderMode) {
      folderMode.checked = true;
    }
  }
  const allAccounts = modeValue() === "all-accounts";
  els.mailFolder.classList.toggle("ctl-hidden", allAccounts);
  els.allAccountsNote.classList.toggle("ctl-hidden", !allAccounts);
}

async function loadAccounts() {
  const accounts = await messenger.accounts.list(true);
  const mailFolders = [];
  const identities = new Set();
  const mailAccountIds = [];
  accounts.forEach((account) => {
    if (SKIP_ACCOUNT_TYPES.has(account.type)) {
      return;
    }
    mailAccountIds.push(account.id);
    (account.identities || []).forEach((identity) => {
      if (identity.email) {
        identities.add(identity.email.toLowerCase());
      }
    });
    flattenMailFolders(account.rootFolder, account.name, 0, mailFolders);
  });
  state.mailFolders = mailFolders;
  state.mailAccountIds = mailAccountIds;
  state.identities = identities;
  fillMailFolders();
  updateModeUi();
}

async function collectMessages(queryInfo, onPage) {
  let page = await messenger.messages.query(queryInfo);
  const all = [];
  while (true) {
    all.push(...page.messages);
    if (onPage) {
      onPage(all.length);
    }
    if (!page.id) {
      break;
    }
    page = await messenger.messages.continueList(page.id);
  }
  return all;
}

function touchKey(email) {
  const host = (email.split("@")[1] || "").toLowerCase();
  if (!host) {
    return "";
  }
  return SHARED_MAIL_HOSTS.has(host) ? email : host;
}
function ownDomains() {
  const domains = new Set();
  state.identities.forEach((email) => {
    const host = (email.split("@")[1] || "").toLowerCase();
    if (host) {
      domains.add(host);
    }
  });
  return domains;
}

function otherPartyDomains(message) {
  const mine = ownDomains();
  const outbound = directionOf(message) === "out";
  const emails = outbound
    ? extractEmails(message.recipients).concat(extractEmails(message.ccList))
    : extractEmails(message.author);
  const keys = new Set();
  emails.forEach((email) => {
    const host = (email.split("@")[1] || "").toLowerCase();
    if (!host || state.identities.has(email)) {
      return;
    }
    if (!SHARED_MAIL_HOSTS.has(host) && mine.has(host)) {
      return;
    }
    const key = touchKey(email);
    if (key) {
      keys.add(key);
    }
  });
  return keys;
}

function renderSuggestions() {
  els.suggestList.replaceChildren();
  if (!state.topDomains.length) {
    els.suggest.classList.add("ctl-hidden");
    return;
  }
  els.suggest.classList.remove("ctl-hidden");
  els.suggestLabel.textContent = "Most touched";
  const shown = state.topDomains.slice(0, state.suggestLimit);
  shown.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    const already = state.savedFolders.some((saved) => saved.domains.indexOf(item.domain) !== -1);
    button.className = "ctl-tab" + (already && selectedSaved() && selectedSaved().domains.indexOf(item.domain) !== -1 ? " is-active" : "");
    button.textContent = item.domain + " · " + item.count;
    button.addEventListener("click", () => {
      useSuggestedDomain(item.domain).catch((error) => setStatus(error.message || String(error)));
    });
    els.suggestList.appendChild(button);
  });
  if (state.topDomains.length > 10) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "ctl-tab";
    const expanded = state.suggestLimit > 10;
    toggle.textContent = expanded ? "Less" : "…";
    toggle.addEventListener("click", () => {
      state.suggestLimit = expanded ? 10 : state.topDomains.length;
      renderSuggestions();
    });
    els.suggestList.appendChild(toggle);
  }
}

async function useSuggestedDomain(domain) {
  let saved = state.savedFolders.find((item) => item.domains.indexOf(domain) !== -1);
  if (!saved) {
    saved = { id: slugId(domain), name: domain, domains: [domain] };
    state.savedFolders.push(saved);
  }
  state.selectedId = saved.id;
  await saveSettings();
  renderTabs();
  renderEditor();
  renderSuggestions();
  fillMailFolders();
  updateEmptyState();
  const allAccounts = document.querySelector('input[name="mode"][value="all-accounts"]');
  if (allAccounts && hasMultipleAccounts()) {
    allAccounts.checked = true;
    updateModeUi();
  }
}

function skipSpecialFolder(message) {
  const folderType = message.folder && message.folder.type;
  return folderType && SKIP_FOLDER_TYPES.has(folderType);
}

async function findTopDomains() {
  const year = new Date().getFullYear();
  const stored = await messenger.storage.local.get("topDomains");
  const cache = stored.topDomains;
  if (cache && cache.version === 2 && cache.year === year && Array.isArray(cache.items) && cache.items.length) {
    state.topDomains = cache.items;
    renderSuggestions();
    return;
  }
  if (!state.mailAccountIds.length) {
    return;
  }
  els.suggest.classList.remove("ctl-hidden");
  els.suggestLabel.textContent = "Finding contacts…";
  const fromDate = new Date(year, 0, 1);
  fromDate.setSeconds(fromDate.getSeconds() - 1);
  const toDate = new Date(year + 1, 0, 1);
  const counts = new Map();
  for (const accountId of state.mailAccountIds) {
    const inbound = await collectMessages({
      accountId,
      toMe: true,
      fromDate,
      toDate,
      messagesPerPage: 250
    });
    const outbound = await collectMessages({
      accountId,
      fromMe: true,
      fromDate,
      toDate,
      messagesPerPage: 250
    });
    inbound.concat(outbound).forEach((message) => {
      if (skipSpecialFolder(message)) {
        return;
      }
      otherPartyDomains(message).forEach((domain) => {
        counts.set(domain, (counts.get(domain) || 0) + 1);
      });
    });
  }
  state.topDomains = Array.from(counts.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 40);
  await messenger.storage.local.set({
    topDomains: { version: 2, year, items: state.topDomains }
  });
  renderSuggestions();
}

async function searchAllAccounts(saved, fromDate, toDate) {
  const byId = new Map();
  const queryDates = {
    fromDate,
    toDate,
    messagesPerPage: 250
  };

  for (const accountId of state.mailAccountIds) {
    const inbound = await collectMessages({
      accountId,
      toMe: true,
      ...queryDates
    }, () => {
      setStatus("Scanning addresses… " + byId.size + " matches");
    });
    const outbound = await collectMessages({
      accountId,
      fromMe: true,
      ...queryDates
    }, () => {
      setStatus("Scanning addresses… " + byId.size + " matches");
    });
    inbound.concat(outbound).forEach((message) => {
      if (!skipSpecialFolder(message) && addressTouchesDomain(message, saved.domains)) {
        byId.set(message.id, message);
      }
    });
    setStatus("Scanning addresses… " + byId.size + " matches");
  }

  return Array.from(byId.values());
}

function textFromPart(part, allowHtml) {
  if (!part) {
    return "";
  }
  const type = String(part.contentType || "").toLowerCase();
  if (part.body && type.indexOf("text/plain") === 0) {
    return part.body;
  }
  const kids = part.parts || [];
  for (let i = 0; i < kids.length; i += 1) {
    const found = textFromPart(kids[i], false);
    if (found) {
      return found;
    }
  }
  if (!allowHtml) {
    return "";
  }
  if (part.body && type.indexOf("text/html") === 0) {
    return part.body
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/\s+/g, " ")
      .trim();
  }
  for (let i = 0; i < kids.length; i += 1) {
    const found = textFromPart(kids[i], true);
    if (found) {
      return found;
    }
  }
  return "";
}

function clipSnippet(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) {
    return "No message text.";
  }
  return clean.length > 320 ? clean.slice(0, 320) + "…" : clean;
}

async function loadSnippet(messageId) {
  if (state.snippets.has(messageId)) {
    return state.snippets.get(messageId);
  }
  let snippet = "Could not read this message.";
  try {
    const full = await messenger.messages.getFull(messageId);
    snippet = clipSnippet(textFromPart(full, true));
  } catch (error) {
    snippet = "Could not read this message.";
  }
  state.snippets.set(messageId, snippet);
  return snippet;
}

function showSelection(report) {
  const year = state.logYear || report.year;
  const stats = year === report.year ? report.current : report.previous;
  const month = state.openMonth == null ? null : report.months[state.openMonth];
  const rows = month && year === report.year ? month.current.rows : stats.rows;
  const title = month && year === report.year
    ? month.label + " " + year
    : String(year);
  renderSummary(report);
  renderMonths(report);
  renderLog(rows, title);
}
function directionOf(message) {
  const from = extractEmails(message.author)[0];
  return from && state.identities.has(from) ? "out" : "in";
}

function buildReport(messages, year) {
  const rows = messages.map((message) => {
    const date = new Date(message.date);
    return {
      id: message.id,
      date,
      year: date.getFullYear(),
      month: date.getMonth(),
      direction: directionOf(message),
      subject: message.subject || "(no subject)",
      thread: normalizeSubject(message.subject),
      author: message.author || "",
      recipients: (message.recipients || []).join(", ")
    };
  }).filter((row) => row.year === year || row.year === year - 1);

  const inboundThreads = new Set(
    rows.filter((row) => row.direction === "in").map((row) => row.thread)
  );
  rows.forEach((row) => {
    row.reply = row.direction === "out" && (isReply(row.subject) || inboundThreads.has(row.thread));
  });

  function statsFor(targetYear, monthIndex) {
    const subset = rows.filter((row) => {
      if (row.year !== targetYear) {
        return false;
      }
      return monthIndex == null ? true : row.month === monthIndex;
    });
    const threads = new Set(subset.map((row) => row.thread));
    return {
      touches: subset.length,
      inbound: subset.filter((row) => row.direction === "in").length,
      outbound: subset.filter((row) => row.direction === "out").length,
      replies: subset.filter((row) => row.reply).length,
      threads: threads.size,
      rows: subset.sort((a, b) => b.date - a.date)
    };
  }

  return {
    year,
    current: statsFor(year),
    previous: statsFor(year - 1),
    months: MONTHS.map((label, index) => ({
      label,
      index,
      current: statsFor(year, index),
      previous: statsFor(year - 1, index)
    }))
  };
}

function renderSummary(report) {
  els.summary.replaceChildren();
  const items = [
    { label: report.year + " touches", value: report.current.touches, year: report.year },
    { label: (report.year - 1) + " touches", value: report.previous.touches, year: report.year - 1 },
    { label: "Sent", value: report.current.outbound },
    { label: "Received", value: report.current.inbound },
    { label: "Your replies", value: report.current.replies },
    { label: "Threads", value: report.current.threads }
  ];
  items.forEach((item) => {
    const box = document.createElement(item.year ? "button" : "div");
    box.className = "ctl-stat";
    if (item.year) {
      box.type = "button";
      const active = state.logYear === item.year && state.openMonth == null;
      if (active) {
        box.classList.add("is-active");
      }
      box.addEventListener("click", () => {
        state.logYear = item.year;
        state.openMonth = null;
        showSelection(report);
      });
    }
    const number = document.createElement("b");
    number.textContent = String(item.value);
    const caption = document.createElement("span");
    if (item.year) {
      caption.textContent = (state.logYear === item.year && state.openMonth == null)
        ? "Showing all " + item.year
        : "View all " + item.year;
    } else {
      caption.textContent = item.label;
    }
    box.append(number, caption);
    els.summary.appendChild(box);
  });
}

function renderMonths(report) {
  els.months.replaceChildren();
  const max = Math.max(1, ...report.months.map((month) => month.current.touches));
  report.months.forEach((month) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ctl-month" + (state.logYear === report.year && state.openMonth === month.index ? " is-open" : "");
    const name = document.createElement("strong");
    name.textContent = month.label;
    const barWrap = document.createElement("div");
    barWrap.className = "ctl-bar";
    const bar = document.createElement("i");
    bar.style.width = Math.round((month.current.touches / max) * 100) + "%";
    barWrap.appendChild(bar);
    const counts = document.createElement("span");
    counts.className = "ctl-month-counts";
    counts.textContent = month.current.touches + " this year · " + month.previous.touches + " last year";
    button.append(name, barWrap, counts);
    button.addEventListener("click", () => {
      state.logYear = report.year;
      state.openMonth = month.index;
      showSelection(report);
    });
    els.months.appendChild(button);
  });
}

function renderLog(rows, title) {
  els.logTitle.textContent = title + " — " + rows.length + " messages";
  els.log.replaceChildren();
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "ctl-empty";
    empty.textContent = "No messages.";
    els.log.appendChild(empty);
    return;
  }
  const list = document.createElement("div");
  list.className = "ctl-log";
  rows.forEach((row) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "ctl-log-item";
    const when = document.createElement("span");
    when.className = "ctl-log-when";
    when.textContent = row.date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric"
    }) + ", " + row.date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit"
    });
    const dir = document.createElement("span");
    dir.className = "ctl-dir ctl-dir-" + row.direction;
    dir.textContent = row.direction === "out" ? "Sent" : "In";
    const subject = document.createElement("span");
    subject.className = "ctl-log-copy";
    subject.textContent = row.subject;
    const who = document.createElement("span");
    who.className = "ctl-log-who";
    who.textContent = row.direction === "out" ? row.recipients : row.author;
    item.append(when, dir, subject, who);

    const preview = document.createElement("div");
    preview.className = "ctl-preview ctl-hidden";
    const fromLine = document.createElement("p");
    fromLine.textContent = "From " + (row.author || "—");
    const toLine = document.createElement("p");
    toLine.textContent = "To " + (row.recipients || "—");
    const body = document.createElement("p");
    body.className = "ctl-preview-body";
    const open = document.createElement("button");
    open.type = "button";
    open.className = "ctl-btn";
    open.textContent = "Open message";
    open.addEventListener("click", (event) => {
      event.stopPropagation();
      messenger.messageDisplay.open({ messageId: row.id }).catch(console.error);
    });
    preview.append(fromLine, toLine, body, open);

    const entry = document.createElement("div");
    entry.className = "ctl-log-entry";
    entry.append(item, preview);
    item.addEventListener("click", () => {
      const willOpen = preview.classList.contains("ctl-hidden");
      list.querySelectorAll(".ctl-preview").forEach((node) => {
        if (node !== preview) {
          node.classList.add("ctl-hidden");
        }
      });
      preview.classList.toggle("ctl-hidden", !willOpen);
      if (!willOpen || preview.dataset.loaded) {
        return;
      }
      preview.dataset.loaded = "1";
      body.textContent = "Reading…";
      loadSnippet(row.id).then((text) => {
        body.textContent = text;
      });
    });
    list.appendChild(entry);
  });
  els.log.appendChild(list);
}

async function scan() {
  const saved = selectedSaved();
  if (!saved) {
    return;
  }
  const year = Number(els.year.value);
  const mode = modeValue();
  els.scan.disabled = true;
  els.results.classList.add("ctl-hidden");
  setStatus("Scanning…");

  try {
    const fromDate = new Date(year - 1, 0, 1);
    fromDate.setSeconds(fromDate.getSeconds() - 1);
    const toDate = new Date(year + 1, 0, 1);
    let messages;

    if (mode === "all-accounts") {
      if (!hasMultipleAccounts()) {
        throw new Error("Search all accounts is only shown when more than one account is set up.");
      }
      if (!saved.domains.length) {
        throw new Error("Add a domain to this folder first.");
      }
      messages = await searchAllAccounts(saved, fromDate, toDate);
    } else {
      const folderId = els.mailFolder.value;
      if (!folderId) {
        throw new Error("Pick a Thunderbird folder first.");
      }
      state.mailFolderBySaved[saved.id] = folderId;
      await saveSettings();
      messages = await collectMessages({
        folderId,
        includeSubFolders: true,
        fromDate,
        toDate,
        messagesPerPage: 250
      }, (count) => {
        setStatus("Scanning… " + count + " messages");
      });
    }

    state.report = buildReport(messages, year);
    state.logYear = year;
    state.openMonth = null;
    state.snippets = new Map();
    showSelection(state.report);
    els.results.classList.remove("ctl-hidden");
    setStatus(
      mode === "all-accounts"
        ? "Counted From/To " + saved.domains.join(", ") + " across all accounts."
        : "Counted everything in that Thunderbird folder for " + year + "."
    );
  } catch (error) {
    setStatus(error.message || String(error));
  } finally {
    els.scan.disabled = false;
  }
}

els.foldersBtn.addEventListener("click", () => {
  els.editor.classList.toggle("ctl-hidden");
});

els.savedForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = document.getElementById("saved-name").value.trim();
  const domains = parseDomains(document.getElementById("saved-domains").value);
  if (!name) {
    return;
  }
  const item = { id: slugId(name), name, domains };
  state.savedFolders.push(item);
  state.selectedId = item.id;
  await saveSettings();
  els.savedForm.reset();
  renderTabs();
  renderEditor();
  fillMailFolders();
  updateEmptyState();
});

document.querySelectorAll('input[name="mode"]').forEach((input) => {
  input.addEventListener("change", updateModeUi);
});

els.scan.addEventListener("click", () => {
  scan().catch((error) => setStatus(error.message || String(error)));
});

fillYears();
updateModeUi();
renderEditor();

loadSettings()
  .then(async () => {
    renderTabs();
    renderEditor();
    updateEmptyState();
    await loadAccounts();
    findTopDomains().catch((error) => setStatus(error.message || String(error)));
  })
  .catch((error) => setStatus(error.message || String(error)));
