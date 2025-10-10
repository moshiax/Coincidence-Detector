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
var theList = [];

var echoFactor = storage.default('echoFactor', 3);
var caseSensitivity = storage.default('caseSensitivity', false);
var enableTree = storage.default('enableTree', true);
var enableSingle = storage.default('enableSingle', true);

var sourceUrl = chrome.runtime.getURL('data/theList.json');
var treeUrl = chrome.runtime.getURL('data/theTree.json');

var loaded = false;
var loadedTree = false;

var pattern = '';

function wordCount(s) {
  return s.split(' ').length;
}

function wordCountGT(n) {
  return function(s) {
    return wordCount(s) > n;
  };
}

function buildPattern(list) {
  return enableSingle
    ? '\\b(' + list.join('|') + ')\\b'
    : '\\b(' + list.filter(wordCountGT(1)).join('|') + ')\\b';
}

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

function loadTheList(cb) {
  load(sourceUrl, function(err, data) {
    if (err) return cb?.(err);
    loaded = true;
    theList = data;
    pattern = buildPattern(theList);
    cb?.(null, theList);
  });
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
    loadTheList();
    loadTheTree();
    disabledHostnames.forEach(h => localStorage[h] = 1);
  });
}

chrome.runtime.onMessage.addListener(function(command, sender, sendResponse) {
  switch (command.op) {
    case "load":
      if (!loaded) loadTheList();
      if (!loadedTree) loadTheTree();
      sendResponse({
        theList,
        pattern,
        theTree,
        enableTree,
        caseSensitivity,
        echoFactor,
        enableSingle,
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
