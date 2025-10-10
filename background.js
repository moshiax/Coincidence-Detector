var storage = {
  get: function(key) {
    var val = localStorage.getItem(key);
    try {
      return val === null ? null : JSON.parse(val);
    } catch {
      return undefined;
    }
  },
  set: function(key, val) {
    localStorage[key] = JSON.stringify(val);
    return val;
  },
  default: function(key, val) {
    var x = this.get(key);
    return x === null ? this.set(key, val) : x;
  }
};

var theTree = {};
var echoFactor = storage.default('echoFactor', 3);

var treeUrl = chrome.runtime.getURL('data/theTree.json');
var loadedTree = false;

function load(url, cb) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      try {
        cb(null, JSON.parse(xhr.responseText));
      } catch (err) {
        cb(err);
      }
    }
  };
  xhr.onerror = function() {
    cb(new Error("Could not load '" + url + "'"));
  };
  xhr.send();
}

function loadTheTree(cb) {
  load(treeUrl, function(err, data) {
    if (err) return cb?.(err);
    loadedTree = true;
    theTree = data;
    cb?.(null, theTree);
  });
}

var disabledHostnames = [
  "mail.google.com",
  "gmail.com",
  "googlemail.com",
  "live.com",
  "hotmail.com",
  "mail.yahoo.com"
];

if (navigator.userAgent.toLowerCase().includes('chrome')) {
  chrome.runtime.onInstalled.addListener(function() {
    loadTheTree();
    disabledHostnames.forEach(h => localStorage[h] = 1);
  });
}

chrome.runtime.onMessage.addListener(function(command, sender, sendResponse) {
  switch (command.op) {
    case "load":
      if (!loadedTree) loadTheTree();
      sendResponse({
        theTree,
        echoFactor,
        storage: localStorage
      });
      break;
    case "clear-title":
      chrome.browserAction.setBadgeText({ text: '' });
      break;
    case "set-title":
      chrome.browserAction.setBadgeText({ text: command.text });
      break;
  }
});