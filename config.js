const cc = String.fromCharCode;
const CACHE_KEY = 'cdCache';

const config = {
	siteEnabled: {
		type: "toggle",
		label: "Enable for ",
		perSite: true,
		default: true
	},
	regularsEnabled: {
		type: "toggle",
		label: "Enable Regulars",
		default: true
	},
	loggingEnabled: {
		type: "toggle",
		label: "Logging",
		default: false
	},
	echoFactor: {
		type: "number",
		label: "Echo Factor",
		min: 0,
		step: 1,
		default: 3
	},
	listProvider: {
		type: "text",
		label: "List Provider",
		default: "data/theTree.json"
	}
};
