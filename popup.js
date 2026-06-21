const SETTINGS_KEY = "buyNowOnlyEnabled";

const checkbox = document.getElementById("buyNowOnly");

chrome.storage.local.get(SETTINGS_KEY).then((stored) => {
  checkbox.checked = stored[SETTINGS_KEY] ?? false;
});

checkbox.addEventListener("change", () => {
  chrome.storage.local.set({ [SETTINGS_KEY]: checkbox.checked });
});
