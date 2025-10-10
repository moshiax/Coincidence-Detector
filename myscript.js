function echo(s, factor) {
  return "(".repeat(factor) + s + ")".repeat(factor);
}

chrome.runtime.sendMessage(null, { op: "clear-title" });

chrome.runtime.sendMessage(null, { op: "load" }, null, function(state) {
  var theTree = state.theTree;
  var echoFactor = state.echoFactor;
  var storage = state.storage;
  var anchorStack = [];

  var walk = function(node) {
    var child = node.firstChild;
    if (node.nodeName === 'A') anchorStack.push(node.nodeName);

    if ([1, 9, 11].includes(node.nodeType)) {
      while (child) {
        var next = child.nextSibling;
        walk(child);
        child = next;
      }
    } else if (node.nodeType === 3) {
      handleTextTree(node);
    }

    if (node.nodeName === 'A') anchorStack.pop();
  };

  var checkName = function(words, obj) {
    var word = words[words.length - 1];
    if (word in obj) {
      if (obj[word] >= 0) return [1, obj[word]];
      if (words.length >= 2) {
        var r = checkName(words.slice(0, -1), obj[word]);
        if (r[0] > 0) return [r[0] + 1, r[1]];
      }
      if ("" in obj[word]) return [1, obj[word][""]];
    }
    return [-1, 0];
  };

  var handleTextTree = function(textNode) {
    var oldtext = textNode.nodeValue;
    var newtext = "";
    var words = oldtext.split(/\b/);

    while (words.length > 0) {
      var r = checkName(words, theTree);
      if (r[0] > 0) {
        newtext = (r[1] > 0 ? echo(words.slice(-r[0]).join(""), echoFactor) : words.slice(-r[0]).join("")) + newtext;
        words = words.slice(0, -r[0]);
      } else {
        newtext = words.pop() + newtext;
      }
    }

    textNode.nodeValue = newtext;
  };

  var observerOptions = { childList: true, subtree: true };
  var observer;

  var mutationHandler = function(mutations) {
    mutations.forEach(function(m) {
      if (m.type !== 'childList') return;
      m.addedNodes.forEach(function(n) {
        if (n.nodeType !== Node.ELEMENT_NODE) return;
        observer.disconnect();
        if (!n.isContentEditable) walk(n);
        observer.observe(document.body, observerOptions);
      });
    });
  };

  if (!storage[location.host]) {
    walk(document.body);
    observer = new MutationObserver(mutationHandler);
    observer.observe(document.body, observerOptions);
  }
});
