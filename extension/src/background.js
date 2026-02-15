/**
 * CosmoWarp Chrome Extension — Background Service Worker
 *
 * Handles extension lifecycle and storage management.
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[CosmoWarp] Extension installed');
  } else if (details.reason === 'update') {
    console.log('[CosmoWarp] Extension updated to', chrome.runtime.getManifest().version);
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_WALLET') {
    chrome.storage.local.get(['cosmowarp_wallet'], (result) => {
      sendResponse({ wallet: result.cosmowarp_wallet || null });
    });
    return true;
  }

  if (message.type === 'SAVE_WALLET') {
    chrome.storage.local.set({ cosmowarp_wallet: message.wallet }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'GET_STATE') {
    chrome.storage.local.get(null, (result) => {
      sendResponse(result);
    });
    return true;
  }
});
