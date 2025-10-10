// Initial list in case load doesn't work.
var theList = [
"Abramov",
"Abramowicz",
"Abrams",
"Adelman",
"Adelson",
"Adelstein",
"Alinsky",
"Allred",
"Ashley Montagu",
"Axelrod",
"Berg",
"Berger",
"Berman",
"Bernstein",
"Blankfein",
"Blitzer",
"Bloomberg",
"Bloomfield",
"Boas",
"Bonnie Fuller",
"Braman",
"Cahan",
"Cantor",
"Cohen",
"Cohn",
"Dana Milbank",
"David Brooks",
"Dickstein",
"Dworkin",
"Edelman",
"Eduard David",
"Ehrenberg",
"Eichhorn",
"Eisenberg",
"Eisner",
"Emmanuel",
"Epstein",
"Ernst Toller",
"Erzberger",
"Estrich",
"Eychanar",
"Feith",
"Feld",
"Finkelstein",
"Fleischer",
"Foxman",
"Franken",
"Freud",
"Friedman",
"Geffen",
"Ginsberg",
"Glasser",
"Gohmann",
"Goldberg",
"Goldenberg",
"Goldman",
"Goldstein",
"Goldwyn",
"Gopnik",
"Gopstein",
"Gould",
"Greenberg",
"Greenglass",
"Gustav Landauer",
"Guttman",
"Haase",
"Harry Benjamin",
"Herschel",
"Hirschfeld",
"Horovitz",
"Horowitz",
"Howard Schultz",
"Jeff Bezos",
"Joe Klein",
"Jogiches",
"John Kerry",
"Jon Stewart",
"Kagan",
"Kahn",
"Kantor",
"Kaplan",
"Karl Radek",
"Katz",
"Katzenberg",
"Kohn",
"Koval",
"Krauthammer",
"Kristol",
"Kronfeld",
"Landsberg",
"Lekinski",
"Lerner",
"Levenson",
"Levi",
"Levin",
"Levine",
"Levitov",
"Levy",
"Lewin",
"Lieberman",
"Liebknecht",
"Lindelof",
"Lipset",
"Marx",
"Marxism",
"Meyer",
"Michael Dell",
"Muravchik",
"Natalie Portman",
"Paul Levi",
"Paul Singer",
"Perelman",
"Perl",
"Perle",
"Peter Coyote",
"Pfeffer",
"Podhoretz",
"Rathenau",
"Robert Reich",
"Rogen",
"Rosa Luxemburg",
"Rosenberg",
"Rosenthal",
"Roth",
"Rothschild",
"Rothstein",
"Rubenstein",
"Rubin",
"Ruthenberg",
"Sandberg",
"Sanders",
"Sarkozy",
"Scheidemann",
"Schiffer",
"Scholem",
"Schumer",
"Schwartz",
"Shachtman",
"Shapiro",
"Silverman",
"Silvermaster",
"Sobell",
"Solomon",
"Soros",
"Spielberg",
"Stein",
"Steinem",
"Steiner",
"Stern",
"Strauss",
"Tim Wise",
"Trotsky",
"Warburg",
"Warshauser",
"Weil",
"Weiner",
"Weinstein",
"Weisman",
"Weiss",
"Weissman",
"Wiesel",
"Winona Ryder",
"Wolfowitz",
"Woody Allen",
"Wylder",
"Yagoda",
"Yellen",
"Zetkin",
"Zinn",
"Zuckerberg",
"Zuckerman"
];

/**
 * Utility functions for localStorage
 */
var storage = {
  get: function(key) {
    var val = localStorage.getItem(key);
    var res;
    if (val == undefined) {
      return val;
    } else {
      try {
        res = JSON.parse(val);
      }
      catch (err) {
        res = undefined;
      }
      return res;
    }
  },
  set: function(key, val) {
    var storedVal = JSON.stringify(val);
    localStorage[key] = storedVal;
    return val;
  },
  default: function(key, val) {
    var x = this.get(key);
    if (x === null) {
      return this.set(key, val);
    } else {
      return x;
    }
  }
};

var judasList = [];

var theTree = {};

var echoFactor = storage.default('echoFactor', 3);

var caseSensitivity = storage.default('caseSensitivity', false);

var enableJudasWatch = storage.default('enableJudasWatch', false);

var enableTree = storage.default('enableTree', true);

var enableSingle = storage.default('enableSingle', true);

// This is a hack to make sure people who are upgrading do not have both
// enableJudasWatch and enableTree set true at the same time.
// They are currently mutually exclusive.
if (enableJudasWatch && enableTree) {
  storage.set('enableJudasWatch', false);
}

var sourceUrls = [
  'https://coincidencedetector.com/theList.json'
];

var judasUrls = [
  'https://coincidencedetector.com/judasList.json'
];

var treeUrls = [
  'https://coincidencedetector.com/theTree.json'
];

var loaded = false;

var loadedJudas = false;

var loadedTree = false;

if (localStorage.theList) {
  try {
    theList = JSON.parse(localStorage.theList);
  }
  catch (err) {
    console.warn(err);
  }
}

/*
if (localStorage.judasList) {
  try {
    judasList = JSON.parse(localStorage.judasList);
  }
  catch (err) {
    console.warn(err);
  }
}
*/

if (localStorage.theTree) {
  try {
    theTree = JSON.parse(localStorage.theTree);
  }
  catch (err) {
    console.warn(err);
  }
}

if (localStorage.theTree) {
  try {
    theTree = JSON.parse(localStorage.theTree);
  }
  catch (err) {
    console.warn(err);
  }
}

var pattern = buildPattern(theList);

var judasSet = buildJudasSet(judasList);

// Don't download heavy resources more than once every $rateLimit ms.
var rateLimit = 1000 * 60 * 15;

function randomPick(list) {
  return list[Math.trunc(Math.random() * list.length)];
}

/**
 * Run a function if (now - last) is > age.
 * @param {Integer}  age       age in milliseconds
 * @param {Integer}  last      instant in time to compare against
 * @param {Function} cb        function to run if age > (now - last)
 * @return {Void}
*/
function runIfOlderThan(age, last, cb) {
  var now = Date.now();
  if ((now - last) > age) {
    cb();
  }
}

function lastLoadOf(key, value) {
  if (!key) return v;
  var k = "lastLoadOf_" + key;
  var v = 0;
  if (!value) {
    if (localStorage[k]) {
      v = parseInt(localStorage[k], 10);
    }
    return v;
  } else {
    localStorage[k] = value;
    return value;
  }
}

function wordCount(s) {
  return s.split(' ').length;
}

function wordCountGT(n) {
  return function(s) {
    return wordCount(s) > n;
  };
}

function buildPattern(list) {
  if (enableSingle) {
    return '\\b(' + list.join('|') + ')\\b';
  } else {
    return '\\b(' + list.filter(wordCountGT(1)).join('|') + ')\\b';
  }
}

function buildJudasSet(list) {
  return list.reduce((function(m, a) { m[a.name_display] = a.name_unique; return m; }), {});
}

// load
function load(url, cb) {
  //console.warn('load', url);
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      var data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch(err) {
        if (err) {
          cb(err);
        }
      }
      cb(null, data);
    }
  };
  xhr.onerror = function() {
    cb(new Error("Could not load '"+url+"'"));
  };
  xhr.send();
}

// loadTheList
function loadTheList(cb) {
  //console.warn('loadTheList');
  var sourceUrl = randomPick(sourceUrls);
  load(sourceUrl, function(err, data) {
    if (err) {
      console.warn("loadTheList", err);
      if (cb && typeof cb === "function") cb(err);
    } else {
      loaded = true;
      theList = data;
      pattern = buildPattern(theList);
      try {
        localStorage.theList = JSON.stringify(data);
      }
      catch (err) {
        if (cb && typeof cb === "function") cb(err);
        return;
      }
      lastLoadOf('theList', Date.now());
      if (cb && typeof cb === "function") cb(null, theList);
    }
  });
}

function loadJudasSet(cb) {
  //console.warn('loadJudasSet');
  var judasUrl = randomPick(judasUrls);
  load(judasUrl, function(err, data) {
    if (err) {
      console.warn("loadTheList", err);
      if (cb && typeof cb === "function") cb(err);
    } else {
      loadedJudas = true;
      judasList = data || [];
      judasSet = buildJudasSet(judasList);
      try {
        localStorage.judasList = JSON.stringify(data);
      }
      catch (err) {
        if (cb && typeof cb === "function") cb(err);
        return;
      }
      lastLoadOf('judasSet', Date.now());
      if (cb && typeof cb === "function") cb(null, judasSet);
    }
  });
}

function loadTheTree(cb) {
  //console.warn('loadTheTree');
  var treeUrl = randomPick(treeUrls);
  load(treeUrl, function(err, data) {
    if (err) {
      console.warn("loadTheTree", err);
      if (cb && typeof cb === "function") cb(err);
    } else {
      loadedTree = true;
      theTree = data;
      try {
        localStorage.theTree = JSON.stringify(data);
      }
      catch (err) {
        if (cb && typeof cb === "function") cb(err);
        return;
      }
      lastLoadOf('theTree', Date.now());
      if (cb && typeof cb === "function") cb(null, theTree);
    }
  });
}

// Disable the following hostnames by default.
var disabledHostnames = [
  "mail.google.com",
  "gmail.com",
  "googlemail.com",
  "live.com",
  "hotmail.com",
  "mail.yahoo.com"
];

// onInstalled
if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1) {
  chrome.runtime.onInstalled.addListener(function(){
    loadTheList();
    //loadJudasSet();
    loadTheTree();
    disabledHostnames.forEach(function(h){ localStorage[h] = 1; });
    /*
     chrome.contextMenus.create({
     title: 'Report Coincidence: "%s"',
     contexts: ["selection"],
     id: "report-coincidence-selection"
     });
     chrome.contextMenus.onClicked.addListener(function(ev, tab){
     var selection = ev.selectionText;
     alert(selection);
     });
     */
  });
}

// onMessage
chrome.runtime.onMessage.addListener(function(command, sender, sendResponse){
  console.warn('background', command, theList.length);
  switch (command.op) {
    case "load":
      if (!loaded) {
        console.warn('loading data');
        if (localStorage.theList) {
          theList = JSON.parse(localStorage.theList);
          pattern = buildPattern(theList);
        }
        runIfOlderThan(rateLimit, lastLoadOf('theList'), function(){
          loadTheList(); // It should be ready for the next page load.
        });
      }
      /*
      if (!loadedJudas) {
        console.warn('loading judasList');
        if (localStorage.judasList) {
          judasList = JSON.parse(localStorage.judasList);
          judasSet = buildJudasSet(judasList);
        }
        runIfOlderThan(rateLimit, lastLoadOf('judasSet'), function(){
          loadJudasSet();
        });
      }
      */
      if (!loadedTree) {
        console.warn('loading theTree');
        if (localStorage.theTree) {
          theTree = JSON.parse(localStorage.theTree);
        }
        runIfOlderThan(rateLimit, lastLoadOf('theTree'), function(){
          loadTheTree();
        });
      }
      sendResponse({ theList: theList, pattern: pattern, judasList: judasList, judasSet: judasSet, enableJudasWatch: enableJudasWatch, theTree: theTree, enableTree: enableTree, caseSensitivity: caseSensitivity, echoFactor: echoFactor, enableSingle: enableSingle, storage: localStorage });
      break;
    case "clear-title":
      chrome.browserAction.setBadgeText({ text: '' });
      break;
    case "set-title":
      chrome.browserAction.setBadgeText({ text: command.text });
      break;
  }
});
