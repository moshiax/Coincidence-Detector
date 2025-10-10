const TREE_URL = chrome.runtime.getURL('data/theTree.json');
const CACHE_KEY = 'cdCache';

chrome.storage.local.get('loggingEnabled', res => {
	const loggingEnabled = !!res.loggingEnabled;

	const originalLog = console.log;
	console.log = (...args) => {
		if (loggingEnabled) originalLog.apply(console, args);
	};
});

function echo(s, factor) {
	return "(".repeat(factor) + s + ")".repeat(factor);
}

async function loadTree(treeId = 'theTree', url = TREE_URL) {
	const cache = await new Promise(resolve =>
		chrome.storage.local.get(CACHE_KEY, res => resolve(res[CACHE_KEY] || {}))
	);

	if (cache[treeId]) {
		console.log(`[CD] Loaded ${treeId} from cache`);
		return cache[treeId];
	}

	try {
		const res = await fetch(url);
		const tree = await res.json();

		cache[treeId] = tree;
		cache.LastUpdate = Date.now();
		chrome.storage.local.set({ [CACHE_KEY]: cache });

		console.log(`[CD] Loaded ${treeId} from file and cached`);
		return tree;
	} catch (err) {
		console.error(`[CD] Err loading ${treeId}:`, err);
		return {};
	}
}

const REGULARS_REGEX = /\b(\w*?)(man|berg)\b/gi;

function checkName(words, obj) {
	const word = words[words.length - 1].toLowerCase();
	if (!(word in obj)) return [-1, 0];
	if (obj[word] >= 0) return [1, obj[word]];
	if (words.length >= 2) {
		const r = checkName(words.slice(0, -1), obj[word]);
		if (r[0] > 0) return [r[0] + 1, r[1]];
	}
	if ('' in obj[word]) return [1, obj[word]['']];
	return [-1, 0];
}

function handleTextTree(textNode, theTree, echoFactor) {
	if (!textNode.nodeValue || textNode._echoProcessed) return false;

	let words = textNode.nodeValue.split(/\b/);
	let newText = "";
	let modified = false;

	while (words.length > 0) {
		const [count, flag] = checkName(words, theTree);
		if (count > 0) {
			const segment = words.slice(-count).join('');
			newText = (flag > 0 ? echo(segment, echoFactor) : segment) + newText;
			words = words.slice(0, -count);
			modified ||= flag > 0;
		} else {
			newText = words.pop() + newText;
		}
	}

	if (modified) {
		console.log("[CD] Modified by tree:", `"${textNode.nodeValue.trim()}" → "${newText.trim()}"`);
		textNode.nodeValue = newText;
		textNode._echoProcessed = true;
		return true;
	}

	return false;
}

function handleRegulars(textNode, factor) {
    if (!textNode.nodeValue || textNode._echoProcessed) return false;

    let text = textNode.nodeValue;
    let modified = false;

    text = text.replace(REGULARS_REGEX, (_, prefix, group) => {
        modified = true;
        return prefix + echo(group, factor);
    });

    if (modified) {
        console.log("[CD] Modified by regex:", `"${textNode.nodeValue.trim()}" → "${text.trim()}"`);
        textNode.nodeValue = text;
        textNode._echoProcessed = true;
        return true;
    }

    return false;
}

(async function() {
	const theTree = await loadTree();

	chrome.storage.local.get([location.host, 'echoFactor', 'regularsEnabled'], res => {
		const echoFactor = res.echoFactor ?? 3;
		const hostEnabled = typeof res[location.host] === 'boolean' ? res[location.host] : true;
		const regularsEnabled = !!res.regularsEnabled;

		console.log("[CD] Host:", location.host);
		console.log("[CD] Echo factor:", echoFactor);
		console.log("[CD] Host enabled:", hostEnabled);
		console.log("[CD] Regulars enabled:", regularsEnabled);

		if (!hostEnabled) return console.log("[CD] Site is disabled, exiting.");
		if (echoFactor === 0) return console.log("[CD] Echo factor is 0, skipping processing.");

		const anchorStack = new WeakSet();

		function walk(node) {
			if (node.nodeName === 'A') anchorStack.add(node);

			if ([1, 9, 11].includes(node.nodeType)) {
				let child = node.firstChild;
				while (child) {
					const next = child.nextSibling;

					if (!child._echoProcessed) {
						let modified = false;

						if (handleTextTree(child, theTree, echoFactor)) modified = true;

						if (!modified && regularsEnabled) {
							if (handleRegulars(child, echoFactor)) modified = true;
						}

						if (!modified) child._echoProcessed = true;
					}

					if ([1, 9, 11].includes(child.nodeType)) walk(child);
					child = next;
				}
			}

			if (node.nodeName === 'A') anchorStack.delete(node);
		}

		console.log("[CD] Starting tree walk...");
		walk(document.body);

		const observer = new MutationObserver(mutations => {
			mutations.forEach(mutation => {
				mutation.addedNodes.forEach(node => {
					if (node.nodeType === 1 && !node.isContentEditable) walk(node);
				});
			});
		});

		observer.observe(document.body, { childList: true, subtree: true });
		console.log("[CD] DOM observer attached.");
	});
})();