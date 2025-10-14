function getActiveTabHostname(cb) {
	chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		const url = tabs[0]?.url;
		const match = url?.match(/^[\w-]+:\/*\[?([\w.:-]+)\]?(?::\d+)?/);
		const hostname = match?.[1] ?? "";
		cb(hostname);
	});
}

function getStorage(key, cb) {
	chrome.storage.local.get(key, (res) => cb(res[key]));
}

function setStorage(key, value, cb) {
	chrome.storage.local.set({ [key]: value }, cb);
}

function toggleStorage(key, cb, defaultValue = true) {
	getStorage(key, (value) => {
		const current = typeof value === "boolean" ? value : defaultValue;
		const newValue = !current;
		setStorage(key, newValue, () => cb?.(newValue));
	});
}

function changeNumber(key, delta, cb, defaultValue = 1) {
	getStorage(key, (value) => {
		const base = value === undefined ? defaultValue : value;
		let newValue = base + delta;

		if (newValue < 0) newValue = 0;
		setStorage(key, newValue, () => cb?.(newValue));
	});
}

function displayToggleState(element, key, defaultValue = true) {
	getStorage(key, (value) => {
		const val = typeof value === "boolean" ? value : defaultValue;
		element.textContent = val ? "☑" : "☐";
	});
}

function displayNumber(element, key, defaultValue = 1) {
	getStorage(key, (value) => {
		element.textContent = value === undefined ? defaultValue : value;
	});
}

function displayText(element, key, defaultValue = "") {
	getStorage(key, (value) => {
		element.value = value === undefined ? defaultValue : value;
	});
}

function createSettingElement(key, hostname = "") {
	const setting = config[key];
	const li = document.createElement("li");

	const storageKey = setting.perSite && hostname ? hostname : key;

	if (setting.type === "toggle") {
		const spanState = document.createElement("span");
		spanState.style.marginRight = "5px";

		const spanLabel = document.createElement("span");
		spanLabel.textContent = setting.label;
		if (setting.perSite && hostname) spanLabel.innerHTML += ` <span class="setting-label">${hostname}</span>`;

		li.append(spanState, spanLabel);

		li.addEventListener("click", () => {
			toggleStorage(storageKey, () => displayToggleState(spanState, storageKey, setting.default), setting.default);
		});

		displayToggleState(spanState, storageKey, setting.default);

	} else if (setting.type === "number") {
		const dec = document.createElement("span");
		dec.textContent = "◀"; dec.style.cursor = "pointer";

		const num = document.createElement("span");
		num.style.minWidth = "30px"; num.style.textAlign = "center";

		const inc = document.createElement("span");
		inc.textContent = "▶"; inc.style.cursor = "pointer";

		li.append(dec, num, inc);

		displayNumber(num, key, setting.default);

		dec.addEventListener("click", () => changeNumber(key, -(setting.step || 1), val => num.textContent = val, setting.default));
		inc.addEventListener("click", () => changeNumber(key, setting.step || 1, val => num.textContent = val, setting.default));

	} else if (setting.type === "text") {
		const container = document.createElement("div");
		container.style.display = "flex"; container.style.flexDirection = "column";

		const label = document.createElement("span");
		label.textContent = setting.label + ":"; label.style.marginBottom = "3px";

		const input = document.createElement("input"); input.type = "text"; input.style.minWidth = "200px";

		container.append(label, input); li.appendChild(container);

		displayText(input, key, setting.default);

		input.addEventListener("input", () => setStorage(key, input.value));
	}

	return li;
}

function ensureDefaults(cb) {
	const keys = Object.keys(config);
	let remaining = keys.length;
	for (const key of keys) {
		const setting = config[key];
		getStorage(key, value => {
			if (value === undefined) setStorage(key, setting.default);
			if (--remaining === 0) cb?.();
		});
	}
}

function displayVersion(element) {
	element.textContent = chrome.runtime.getManifest().version;
}

function displayCacheElement(container) {
	const li = document.createElement('li');
	li.style.marginTop = '10px';
	li.style.display = 'flex';
	li.style.flexDirection = 'column';
	li.style.alignItems = 'flex-start';
	li.style.gap = '5px';

	const cacheRow = document.createElement('div');
	cacheRow.style.display = 'flex';
	cacheRow.style.alignItems = 'center';
	cacheRow.style.gap = '10px';

	const label = document.createElement('span');
	label.textContent = "Data cached:";
	cacheRow.appendChild(label);

	const indicator = document.createElement('div');
	indicator.style.width = '15px';
	indicator.style.height = '15px';
	indicator.style.borderRadius = '3px';
	cacheRow.appendChild(indicator);

	li.appendChild(cacheRow);

	const lastUpdateSpan = document.createElement('div');
	li.appendChild(lastUpdateSpan);

	const lastUrlSpan = document.createElement('div');
	lastUrlSpan.style.fontSize = '0.9em';
	lastUrlSpan.style.color = '#555';
	li.appendChild(lastUrlSpan);

	const btn = document.createElement('button');
	btn.textContent = 'Clear Cache';
	li.appendChild(btn);

	function updateIndicator() {
		chrome.storage.local.get(CACHE_KEY, res => {
			const cache = res[CACHE_KEY] || {};
			const keys = Object.keys(cache).filter(k => k !== 'LastUpdate');
			const hasData = keys.length > 0;
			indicator.style.background = hasData ? 'green' : 'red';

			if (cache.LastUpdate) {
				const d = new Date(cache.LastUpdate);
				lastUpdateSpan.textContent = `Last update: ${d.toLocaleString()}`;
			} else {
				lastUpdateSpan.textContent = "Last update: Never";
			}

			let lastUrl = "Never loaded";
			for (const key of keys) {
				if (cache[key]?.__lastUrl) {
					lastUrl = cache[key].__lastUrl;
					break;
				}
			}
			lastUrlSpan.textContent = `Last loaded from: ${lastUrl}`;
		});
	}

	btn.addEventListener('click', () => {
		chrome.storage.local.set({ [CACHE_KEY]: { LastUpdate: Date.now() } }, () => {
			updateIndicator();
		});
	});

	container.appendChild(li);
	updateIndicator();
}

document.addEventListener("DOMContentLoaded", () => {
	ensureDefaults(() => {
		const settingsList = document.getElementById("settingsList");
		getActiveTabHostname(hostname => {
			for (const key of Object.keys(config)) {
				const el = createSettingElement(key, hostname);
				settingsList.appendChild(el);
			}
			displayCacheElement(settingsList);
		});
		displayVersion(document.getElementById("version"));
	});
});