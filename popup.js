const cc = String.fromCharCode;
const CACHE_KEY = 'cdCache';

const settingsConfig = [
	{
		type: "toggle",
		key: "siteEnabled",
		label: "Enable for",
		perSite: true,
		default: true
	},
	{
		type: "toggle",
		key: "regularsEnabled",
		label: "Enable Regulars",
		default: true
	},
	{
		type: "toggle",
		key: "loggingEnabled",
		label: "Logging",
		default: false
	},
	{
		type: "number",
		key: "echoFactor",
		label: "Echo Factor",
		min: 0,
		step: 1,
		default: 3
	}
];

function getActiveTabHostname(cb) {
	chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
		const tab = tabs[0];
		let hostname = "";
		if (tab && tab.url) {
			const match = tab.url.match(/^[\w-]+:\/*\[?([\w\.:-]+)\]?(?::\d+)?/);
			hostname = match ? match[1] : "";
		}
		cb(hostname);
	});
}

function getStorage(key, cb) {
	chrome.storage.local.get(key, function(res) {
		cb(res[key]);
	});
}

function setStorage(key, value, cb) {
	chrome.storage.local.set({ [key]: value }, cb);
}

function toggleStorage(key, cb, defaultValue = true) {
	getStorage(key, function(value) {
		const current = typeof value === "boolean" ? value : defaultValue;
		const newValue = !current;
		setStorage(key, newValue, function() {
			if (cb) cb(newValue);
		});
	});
}

function changeNumber(key, delta, cb, defaultValue = 1) {
	getStorage(key, function(value) {
		let newValue = (value !== undefined ? value : defaultValue) + delta;
		if (newValue < 0) newValue = 0;
		setStorage(key, newValue, function() {
			if (cb) cb(newValue);
		});
	});
}

function displayToggleState(element, key, defaultValue = true) {
	getStorage(key, function(value) {
		const val = typeof value === "boolean" ? value : defaultValue;
		element.textContent = val ? cc(9745) : cc(9744);
	});
}

function displayNumber(element, key, defaultValue = 1) {
	getStorage(key, function(value) {
		element.textContent = (value !== undefined ? value : defaultValue);
	});
}

function createSettingElement(setting, hostname = "") {
	const li = document.createElement("li");

	if (setting.type === "toggle") {
		const spanState = document.createElement("span");
		spanState.id = `${setting.key}State`;
		spanState.style.marginRight = "5px";

		const spanLabel = document.createElement("span");
		spanLabel.textContent = setting.label;
		if (setting.perSite && hostname) {
			spanLabel.innerHTML += ` <span class="setting-label">${hostname}</span>`;
		}

		li.appendChild(spanState);
		li.appendChild(spanLabel);

		const storageKey = setting.perSite ? hostname : setting.key;

		li.addEventListener("click", () => {
			toggleStorage(storageKey, () => {
				displayToggleState(spanState, storageKey, setting.default);
			}, setting.default);
		});

		displayToggleState(spanState, storageKey, setting.default);

	} else if (setting.type === "number") {
		const dec = document.createElement("span");
		dec.textContent = "◀";
		dec.style.cursor = "pointer";

		const num = document.createElement("span");
		num.textContent = setting.default;
		num.style.minWidth = "30px";
		num.style.textAlign = "center";

		const inc = document.createElement("span");
		inc.textContent = "▶";
		inc.style.cursor = "pointer";

		li.appendChild(dec);
		li.appendChild(num);
		li.appendChild(inc);

		displayNumber(num, setting.key, setting.default);

		dec.addEventListener("click", () => {
			changeNumber(setting.key, -setting.step || -1, val => num.textContent = val, setting.default);
		});

		inc.addEventListener("click", () => {
			changeNumber(setting.key, setting.step || 1, val => num.textContent = val, setting.default);
		});
	}

	return li;
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

	// 1-я строка: Data cached + индикатор
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
		});
	}

	btn.addEventListener('click', () => {
		chrome.storage.local.set({ 
			[CACHE_KEY]: { LastUpdate: Date.now() } 
		}, () => {
			updateIndicator();
		});
	});

	container.appendChild(li);
	updateIndicator();
}

document.addEventListener("DOMContentLoaded", () => {
	const settingsList = document.getElementById("settingsList");

	getActiveTabHostname((hostname) => {
		settingsConfig.forEach(setting => {
			const el = createSettingElement(setting, hostname);
			settingsList.appendChild(el);
		});
		displayCacheElement(settingsList);
	});

	displayVersion(document.getElementById("version"));
});
