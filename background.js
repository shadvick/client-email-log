const PAGE_URL = messenger.runtime.getURL("page/index.html");
const SPACE_NAME = "client_touch_log";

async function openPage() {
  const existing = await messenger.tabs.query({ url: PAGE_URL });
  if (existing.length) {
    await messenger.tabs.update(existing[0].id, { active: true });
    return;
  }
  await messenger.tabs.create({ url: PAGE_URL });
}

async function ensureSpace() {
  const spaces = await messenger.spaces.query({
    name: SPACE_NAME,
    isSelfOwned: true
  });
  if (spaces.length) {
    return;
  }
  await messenger.spaces.create(SPACE_NAME, PAGE_URL, {
    title: "Touch Log",
    defaultIcons: "icons/icon-32.png"
  });
}

messenger.browserAction.onClicked.addListener(() => {
  openPage().catch(console.error);
});

ensureSpace().catch(console.error);
