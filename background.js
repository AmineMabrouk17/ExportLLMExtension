// Background service worker: forwards toolbar-icon clicks to the active tab,
// where content.js performs the export. This makes the manifest "action" icon
// functional (Chrome requires a background worker to react to action clicks).
chrome.action.onClicked.addListener((tab) => {
  if (!tab || !tab.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "EXPORT_MARKDOWN" }).catch(() => {
    // Content script may not be present on this tab; ignore.
  });
});
