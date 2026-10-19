import {
	Plugin,
	Notification,
	ButtonView,
	Command
} from "ckeditor5";

import * as Cookies from "./cookie";
import { showWarning } from "./utils";

import iconUpload from "../ckeditor5-theme/theme/icons/upload.svg";
import iconFlmngr from "../ckeditor5-theme/theme/icons/flmngr.svg";
import iconImgPen from "../ckeditor5-theme/theme/icons/imgpen.svg";

const ITEMS = [
	{ name: "upload", label: "Upload image or file", icon: iconUpload },
	{ name: "flmngr", label: "Browse image or file", icon: iconFlmngr },
	{ name: "imgpen", label: "Edit image", icon: iconImgPen }
];

class FlmngrCommand extends Command {

	constructor(editor, name) {
		super(editor);
		this.commandName = name;

		// Refresh after the image and link commands did: on a model change, and when the editor
		// leaves read-only mode (Blk42 keeps it read-only while it loads)
		this.stopListening(this.editor.model.document, "change");
		this.stopListening(this.editor, "change:isReadOnly");
		this.listenTo(this.editor.model.document, "change", () => this.refresh(), { priority: "low" });
		this.listenTo(this.editor, "change:isReadOnly", () => this.refresh(), { priority: "low" });
	}

	refresh() {
		let instance = this.editor["FlmngrInstance"];
		this.isEnabled = !!instance && instance.isEnabled(this.commandName);
	}

	execute() {
		let instance = this.editor["FlmngrInstance"];
		if (!!instance)
			instance.execute(this.commandName);
	}
}

export default class Flmngr extends Plugin {

	static get pluginName() {
		return "Flmngr";
	}

	static get requires() {
		return [
			Notification,
		];
	}

	getApiKey() {
		return this.editor.config.get("apiKey") ||
			this.editor.config.get("Flmngr.apiKey") ||
			this.editor.config.get("flmngr.apiKey") ||
			"FLMN24RR";
	}

	getUrlCdn() {
		let prefix = "";
		if (!!Cookies.get("N1ED_PREFIX"))
			prefix = Cookies.get("N1ED_PREFIX") + ".";
		if (!!window.N1ED_PREFIX)
			prefix = window.N1ED_PREFIX + ".";
		return "http" + (
			(Cookies.get("N1ED_HTTPS") === "false" || window.N1ED_HTTPS === false)
				? ""
				: "s"
		) + "://" + prefix + "cloud.n1ed.com";
	}


	init() {

		// Callbacks given to getFlmngr() before the CDN code is here are passed on to it
		this.listenersFlmngrIsReady = [];
		let getFlmngr = (onFlmngrIsReady) => {
			!!onFlmngrIsReady && this.listenersFlmngrIsReady.push(onFlmngrIsReady);
			return null; // not loaded yet, the CDN code replaces this
		};
		getFlmngr.n1edPending = this.listenersFlmngrIsReady;
		this.editor["getFlmngr"] = getFlmngr;

		// The CDN code reads the "Flmngr" section; "flmngr" works as it always did
		if (!!this.editor.config.get("flmngr"))
			this.editor.config.set("Flmngr", this.editor.config.get("flmngr"));

		this.addToolbarItems();

		this.loadFlmngr();

		// Same timeout knob as in all our editor plugins (0 disables the failsafe)
		let timeoutMs = typeof window.N1ED_FAILSAFE_TIMEOUT === "number" ? window.N1ED_FAILSAFE_TIMEOUT : 15000;
		if (timeoutMs > 0) {
			this._loadTimeout = setTimeout(() => {
				this.giveUpLoading("no answer in " + timeoutMs + " ms");
			}, timeoutMs);
		}
	}

	// CKE5 builds the toolbar at init, so the items and their commands are registered here
	addToolbarItems() {
		const t = this.editor.t;
		for (const item of ITEMS) {
			this.editor.commands.add(item.name, new FlmngrCommand(this.editor, item.name));

			this.editor.ui.componentFactory.add(item.name, locale => {
				const button = new ButtonView(locale);
				button.set({
					label: t(item.label),
					icon: item.icon,
					tooltip: true
				});
				button.bind("isEnabled").to(this.editor.commands.get(item.name));
				button.on("execute", () => {
					this.editor.execute(item.name);
					this.editor.editing.view.focus();
				});
				return button;
			});
		}
	}

	// The timeout above is the last resort, for a server which never answers at all. When the answer
	// does arrive and simply brings nothing (a failed request, or our own failsafe answer during an
	// outage), there is no reason to wait for the rest of the timeout.
	// `quiet`: nothing is broken, the key just has no Flmngr - a line in the console is enough, not
	// a warning on every editor the site opens.
	giveUpLoading(why, quiet) {
		if (this.editor["FlmngrInstance"] || this._gaveUp)
			return;
		this._gaveUp = true;
		if (this._loadTimeout) {
			clearTimeout(this._loadTimeout);
			this._loadTimeout = null;
		}
		if (!quiet) {
			showWarning(
				this.editor,
				"Flmngr",
				false,
				"Failed to load Flmngr from CDN. File manager is unavailable.",
				false
			);
		}
		console.warn("Flmngr did not load (" + why + "), the editor continues without the file manager");
	}

	loadFlmngr() {

		if (!window.CKEDITOR_VERSION)
			window.CKEDITOR_VERSION = "unknown";

		// FlmngrCKEditor5Api is exposed by the loaded JS
		if (!window.n1edEco)
			window.n1edEco = {};

		if (!!window.n1edEco.FlmngrCKEditor5Api) {
			this.initFlmngr(window.n1edEco.FlmngrCKEditor5Api);
		} else {
			// We will load it and wait
			if (!window.n1edEco.onFlmngrCKEditor5ApiLoadedArray)
				window.n1edEco.onFlmngrCKEditor5ApiLoadedArray = [];
			window.n1edEco.onFlmngrCKEditor5ApiLoadedArray.push(() => {
				this.initFlmngr(window.n1edEco.FlmngrCKEditor5Api);
			});

			// A healthy N1EDEco goes on to load Flmngr itself, so the API is not here yet - but it
			// does leave its config behind the moment it runs. Nothing at all means the answer was
			// empty, or the failsafe JS our server returns during an outage. It also lists what it
			// loads: a key without Flmngr (a Txt42 key, say) gets no Flmngr at all, so there is
			// nothing to wait for.
			const check = () => {
				let eco = window.n1edEco;
				if (!(eco && (eco.FlmngrCKEditor5Api || eco.n1edConfig)))
					this.giveUpLoading("the CDN answered without the ecosystem");
				else if (!eco.FlmngrCKEditor5Api && Array.isArray(eco.cke5Runtimes) && eco.cke5Runtimes.indexOf("Flmngr") === -1)
					this.giveUpLoading("this API key has no Flmngr", true);
			};

			// Another of our plugins in the page (Blk42) may have requested the same script already:
			// then its answer is the answer, whether it is still on its way or already in.
			let url = this.getUrlCdn() + "/a/" + this.getApiKey() + "/plugins/N1EDEco/plugin.js";
			let script = Flmngr.findScript(url);
			if (!!script) {
				if (window.n1edEco.n1edConfig || window.n1edEco.cke5Runtimes)
					check();
				else
					script.addEventListener("load", check);
			} else {
				script = Flmngr.includeJS(url);
				script.onerror = () => this.giveUpLoading("the CDN request failed");
				script.onload = check;
			}
		}
	}

	initFlmngr(Flmngr) {

		if (!!this.editor["FlmngrInstance"] || this.editor.state === "destroyed")
			return;

		// The CDN code builds on the editor UI, so it starts once the editor is ready. The first
		// editor of a page always is by the time the cloud code arrives; any later one (a second
		// field, an editor created again) gets the code at once, still inside init().
		if (this.editor.state !== "ready") {
			this.editor.once("ready", () => this.initFlmngr(Flmngr));
			return;
		}

		if (this._loadTimeout) {
			clearTimeout(this._loadTimeout);
			this._loadTimeout = null;
		}

		this.editor["FlmngrInstance"] = window.n1edEco.FlmngrCKEditor5Api.createInstance(this.editor);

		for (const item of ITEMS)
			this.editor.commands.get(item.name).refresh();
	}

	static findScript(urlJS) {
		let scripts = document.getElementsByTagName("script");
		for (let i = 0; i < scripts.length; i++) {
			let src = scripts[i].getAttribute("src");
			if (src != null && decodeURI(src).indexOf(urlJS) !== -1)
				return scripts[i];
		}
		return null;
	}

	static includeJS(urlJS) {
		let script = document.createElement("script");
		script.type = "text/javascript";
		script.src = urlJS;
		script.setAttribute("data-by-flmngr", "true");
		document.getElementsByTagName("head")[0].appendChild(script);
		return script;
	}
}
