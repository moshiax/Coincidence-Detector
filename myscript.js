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

(async function() {
	chrome.runtime.sendMessage({ op: "clear-title" });

	const theTree = await loadTree();
	const anchorStack = new WeakSet();

	chrome.storage.local.get([location.host, 'echoFactor'], res => {
		const echoFactor = res.echoFactor ?? 3;
		const hostEnabled = typeof res[location.host] === 'boolean' ? res[location.host] : true;

		console.log("[CD] Host:", location.host);
		console.log("[CD] Echo factor:", echoFactor);
		console.log("[CD] Host enabled:", hostEnabled);

		if (!hostEnabled) return console.log("[CD] Site is disabled, exiting.");

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
			if ('' in obj[word]) return [1, obj[word]['']];
			return [-1, 0];
		}

		function handleTextTree(textNode) {
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
				console.log("[CD] Modified text:", `"${textNode.nodeValue.trim()}" → "${newText.trim()}"`);
			}

			textNode.nodeValue = newText;
			textNode._echoProcessed = true;
		}

		const observer = new MutationObserver(mutations => {
			mutations.forEach(mutation => {
				mutation.addedNodes.forEach(node => {
					if (node.nodeType === 1 && !node.isContentEditable) walk(node);
				});
			});
		});

		console.log("[CD] Starting tree walk...");
		walk(document.body);
		observer.observe(document.body, { childList: true, subtree: true });
		console.log("[CD] DOM observer attached.");
	});
})();