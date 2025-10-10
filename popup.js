function getActiveTabHostname(cb) {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    var tab = tabs[0];
    var hostname = "";
    if (tab.url) {
      hostname = tab.url.match(/^[\w-]+:\/*\[?([\w\.:-]+)\]?(?::\d+)?/)[1];
    }
    cb(null, hostname);
  });
}

var storage = {
  get: function(key) {
    var val = localStorage.getItem(key);
    if (val === undefined) return val;
    try {
      return JSON.parse(val);
    } catch {
      return undefined;
    }
  },
  set: function(key, val) {
    localStorage[key] = JSON.stringify(val);
    return val;
  },
  toggle: function(key) {
    var val = this.get(key);
    return this.set(key, !val);
  }
};

var cc = String.fromCharCode;

function displayToggleState(toggleState) {
  getActiveTabHostname(function(err, hostname) {
    toggleState.textContent = localStorage[hostname] ? cc(9744) : cc(9745);
  });
}

function displayEchoFactor(echoSpan) {
  chrome.runtime.getBackgroundPage(function(bg) {
    if (localStorage.echoFactor) bg.echoFactor = parseInt(localStorage.echoFactor, 10);
    echoSpan.textContent = bg.echoFactor.toString();
  });
}

function displayListLength(countSpan) {
  chrome.runtime.getBackgroundPage(function(bg) {
    countSpan.textContent = bg.theList.length.toString().replace(/(\d)(?=(\d{3})+$)/, '$1,');
  });
}

function displayVersion(versionSpan) {
  versionSpan.textContent = chrome.runtime.getManifest().version;
}

function inc(cb) {
  chrome.runtime.getBackgroundPage(function(bg) {
    bg.echoFactor++;
    localStorage.echoFactor = bg.echoFactor;
    cb(null, bg.echoFactor);
  });
}

function dec(cb) {
  chrome.runtime.getBackgroundPage(function(bg) {
    if (bg.echoFactor > 0) {
      bg.echoFactor--;
      localStorage.echoFactor = bg.echoFactor;
      cb(null, bg.echoFactor);
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  var siteName    = document.getElementById('siteName');
  var toggle      = document.getElementById('toggle');
  var toggleState = document.getElementById('toggleState');
  var toggleJudas       = document.getElementById('toggleJudas');
  var toggleJudasState  = document.getElementById('toggleJudasState');
  var echoSpan    = document.getElementById('echo');
  var incSpan     = document.getElementById('inc');
  var decSpan     = document.getElementById('dec');
  var countSpan   = document.getElementById('count');
  var refresh     = document.getElementById('refresh');
  var loading     = document.getElementById('loading');
  var versionSpan = document.getElementById('version');

  chrome.runtime.getBackgroundPage(function(bg) {
    bg.enableTree = true;
    bg.enableSingle = true;
    storage.set('enableTree', true);
    storage.set('enableSingle', true);
  });

  getActiveTabHostname(function(err, hostname) {
    siteName.textContent = hostname || "This Site";
  });

  displayToggleState(toggleState);
  displayEchoFactor(echoSpan);
  displayListLength(countSpan);
  displayVersion(versionSpan);

  toggle.addEventListener('click', function() {
    chrome.runtime.getBackgroundPage(function(bg) {
      getActiveTabHostname(function(err, hostname) {
        if (!hostname) return;
        if (localStorage[hostname]) {
          localStorage.removeItem(hostname);
        } else {
          localStorage[hostname] = 1;
        }
        displayToggleState(toggleState);
      });
    });
  });

  incSpan.addEventListener('click', function() {
    inc(function(err, echoFactor) {
      echoSpan.textContent = echoFactor.toString();
    });
  });

  decSpan.addEventListener('click', function() {
    dec(function(err, echoFactor) {
      echoSpan.textContent = echoFactor.toString();
    });
  });

  refresh.addEventListener('click', function() {
    loading.className = "";
    refresh.className = "";
    chrome.runtime.getBackgroundPage(function(bg) {
      bg.loadTheList(function(err) {
        if (err) refresh.className = "error";
        displayListLength(countSpan);
        bg.loadTheTree(function(err) {
          if (err) refresh.className = "error";
        });
        loading.className = "hidden";
      });
    });
  });
});