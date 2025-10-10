function echo(s, factor) {
  return "(".repeat(factor) + s + ")".repeat(factor);
}

chrome.runtime.sendMessage(null, { op: "clear-title" });

chrome.runtime.sendMessage(null, { op: "load" }, null, function(state) {
  var theTree = state.theTree;
  var echoFactor = state.echoFactor;
  var storage = state.storage;
  var anchorStack = [];

  function walk(node) {
    if (node.nodeName === 'A') anchorStack.push('A');

    if ([1, 9, 11].includes(node.nodeType)) {
      let child = node.firstChild;
      while (child) {
        const next = child.nextSibling;
        walk(child);
        child = next;
      }
    } else if (node.nodeType === 3) {
      handleTextTree(node);
    }

    if (node.nodeName === 'A') anchorStack.pop();
  }

	function checkName(words, obj) {
	  let word = words[words.length - 1].toLowerCase();
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
  }

  const observerOptions = { childList: true, subtree: true };
  let observer;

  function mutationHandler(mutations) {
    mutations.forEach(mutation => {
      if (mutation.type !== 'childList') return;
      mutation.addedNodes.forEach(node => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        observer.disconnect();
        if (!node.isContentEditable) walk(node);
        observer.observe(document.body, observerOptions);
      });
    });
  }

  if (!storage[location.host]) {
    walk(document.body);
    observer = new MutationObserver(mutationHandler);
    observer.observe(document.body, observerOptions);
  }
});