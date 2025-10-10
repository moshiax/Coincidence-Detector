function echo(s, factor) {
  return "(".repeat(factor) + s + ")".repeat(factor);
}

chrome.runtime.sendMessage(null, { op: "clear-title" });

chrome.runtime.sendMessage(null, { op: "load" }, null, function(state) {
  const theTree = state.theTree;
  const echoFactor = state.echoFactor;
  const storage = state.storage;
  const anchorStack = new WeakSet();

  function walk(node) {
    if (node.nodeName === 'A') anchorStack.add(node);

    if ([1, 9, 11].includes(node.nodeType)) {
      let child = node.firstChild;
      while (child) {
        const next = child.nextSibling;
        if (child.nodeType === 3 && !child._echoProcessed) handleTextTree(child);
        else walk(child);
        child = next;
      }
    }

    if (node.nodeName === 'A') anchorStack.delete(node);
  }

  function checkName(words, obj) {
    const word = words[words.length - 1].toLowerCase();
    if (!(word in obj)) return [-1, 0];

    if (obj[word] >= 0) return [1, obj[word]];

    if (words.length >= 2) {
      const r = checkName(words.slice(0, -1), obj[word]);
      if (r[0] > 0) return [r[0] + 1, r[1]];
    }

    if ("" in obj[word]) return [1, obj[word][""]];
    return [-1, 0];
  }

  function handleTextTree(textNode) {
    let words = textNode.nodeValue.split(/\b/);
    let newText = "";

    while (words.length > 0) {
      const [count, flag] = checkName(words, theTree);
      if (count > 0) {
        const segment = words.slice(-count).join("");
        newText = (flag > 0 ? echo(segment, echoFactor) : segment) + newText;
        words = words.slice(0, -count);
      } else {
        newText = words.pop() + newText;
      }
    }

    textNode.nodeValue = newText;
    textNode._echoProcessed = true;
  }

  const observerOptions = { childList: true, subtree: true };
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1 && !node.isContentEditable) walk(node);
      });
    });
  });

  if (!storage[location.host]) {
    walk(document.body);
    observer.observe(document.body, observerOptions);
  }
});
