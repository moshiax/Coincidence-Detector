const REGULARS_REGEX = /(?<=\p{L})([\p{L}]*?)(man{1,2}|berg|stein|blatt|ман{1,2}|берг|блатт|штайн|штейн)(?!\p{L})/gu;

function getStorage(key, cb) {
	chrome.storage.local.get(key, res => cb(res[key]));
}

function setStorage(key, value, cb) {
	chrome.storage.local.set({ [key]: value }, cb);
}

function getSetting(key, hostname = "") {
	const storageKey = (config[key]?.perSite && hostname) ? hostname : key;
	return new Promise(resolve => {
		getStorage(storageKey, value => resolve(value !== undefined ? value : config[key]?.default));
	});
}

function echo(s, factor) {
	return "(".repeat(factor) + s + ")".repeat(factor);
}

async function loadTree(treeId = 'theTree') {
	const urlSetting = await getSetting('listProvider');
	const isRemote = /^https?:\/\//i.test(urlSetting);
	const url = isRemote ? urlSetting : chrome.runtime.getURL(urlSetting);

	const cache = await new Promise(resolve =>
		chrome.storage.local.get(CACHE_KEY, res => resolve(res[CACHE_KEY] || {}))
	);

	const cachedTree = cache[treeId];
	if (cachedTree && cachedTree.__lastUrl === urlSetting) {
		console.log(`[CD] Loaded ${treeId} from cache (last URL: ${cachedTree.__lastUrl})`);
		return cachedTree.data || cachedTree;
	}

	try {
		console.log(`[CD] Fetching tree from URL: ${url}`);
		const res = await fetch(url);
		const tree = await res.json();

		cache[treeId] = {
			data: tree,
			__lastUrl: urlSetting
		};
		cache.LastUpdate = Date.now();

		chrome.storage.local.set({ [CACHE_KEY]: cache }, () => {
			console.log(`[CD] ${treeId} cached successfully (URL: ${urlSetting})`);
		});

		console.log(`[CD] Loaded ${treeId} from ${isRemote ? 'remote URL' : 'local file'}`);
		return tree;
	} catch (err) {
		console.error(`[CD] Error loading ${treeId} from ${url}:`, err);
		return {};
	}
}

function checkName(words, obj) {
	const word = words[words.length - 1]?.toLowerCase();
	if (!(word in obj)) return [-1, 0];
	if (obj[word] >= 0) return [1, obj[word]];
	if (words.length >= 2) {
		const r = checkName(words.slice(0, -1), obj[word]);
		if (r[0] > 0) return [r[0] + 1, r[1]];
	}
	if ('' in obj[word]) return [1, obj[word]['']];
	return [-1, 0];
}

function isAlreadyWrapped(text, start, length) {
	const before = text[start - 1] ?? '';
	const after = text[start + length] ?? '';
	return before === '(' && after === ')';
}

function handleTextTree(textNode, theTree, echoFactor) {
	if (!textNode.nodeValue) return false;

	let words = textNode.nodeValue.split(/\b/);
	let newText = "";
	let modified = false;

	while (words.length > 0) {
		const [count, flag] = checkName(words, theTree);
		if (count > 0) {
			const segment = words.slice(-count).join('');
			const segmentStart = newText.length === 0 ? 0 : newText.length;
			const alreadyWrapped = isAlreadyWrapped(textNode.nodeValue, segmentStart, segment.length);

			newText = (flag > 0 && !alreadyWrapped ? echo(segment, echoFactor) : segment) + newText;
			words = words.slice(0, -count);
			modified ||= flag > 0 && !alreadyWrapped;
		} else {
			newText = words.pop() + newText;
		}
	}

	if (modified) {
		console.log("[CD] Modified by tree:", `"${textNode.nodeValue.trim()}" → "${newText.trim()}"`);
		textNode.nodeValue = newText;
		return true;
	}

	return false;
}

function handleRegulars(textNode, factor) {
	if (!textNode.nodeValue) return false;

	let text = textNode.nodeValue;
	let modified = false;

	text = text.replace(REGULARS_REGEX, (match, prefix, group, offset) => {
		if (isAlreadyWrapped(text, offset + prefix.length, group.length)) return match;
		modified = true;
		return prefix + echo(group, factor);
	});

	if (modified) {
		console.log("[CD] Modified by regex:", `"${textNode.nodeValue.trim()}" → "${text.trim()}"`);
		textNode.nodeValue = text;
		return true;
	}

	return false;
}

(async function() {
	const [loggingEnabled, echoFactor, hostEnabled, regularsEnabled] = await Promise.all([
		getSetting('loggingEnabled'),
		getSetting('echoFactor'),
		getSetting('siteEnabled', location.host),
		getSetting('regularsEnabled')
	]);

	const originalLog = console.log;
	console.log = (...args) => { if (loggingEnabled) originalLog.apply(console, args); };

	console.log("[CD] Host:", location.host);
	console.log("[CD] Echo factor:", echoFactor);
	console.log("[CD] Host enabled:", hostEnabled);
	console.log("[CD] Regulars enabled:", regularsEnabled);

	if (!hostEnabled) return console.log("[CD] Site is disabled, exiting.");
	if (echoFactor === 0) return console.log("[CD] Echo factor is 0, skipping processing.");

	const theTree = await loadTree();
	const anchorStack = new WeakSet();

	function walk(node) {
		if (node.nodeName === 'A') anchorStack.add(node);

		if ([1, 9, 11].includes(node.nodeType)) {
			let child = node.firstChild;
			while (child) {
				const next = child.nextSibling;
				const val = child.nodeValue ?? "";
				const hasBrackets = val.startsWith('(') && val.endsWith(')');

				if (!hasBrackets) {
					if (handleTextTree(child, theTree, echoFactor)) {}
					else if (regularsEnabled) handleRegulars(child, echoFactor);
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
})();
