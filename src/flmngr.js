import { Plugin, Notification, ButtonView } from 'ckeditor5';
import * as Cookies from "./cookie";

import FlmngrCommand from "./flmngrcommand";
import ImgPenCommand from "./imgpencommand";
import iconUpload from '../ckeditor5-theme/theme/icons/upload.svg';
import iconFlmngr from '../ckeditor5-theme/theme/icons/flmngr.svg';
import iconImgPen from '../ckeditor5-theme/theme/icons/imgpen.svg';
import UploadCommand from "./uploadcommand";

export default class Flmngr extends Plugin {

	listenersFlmngrIsReady = [];
	flmngrCommand = null;

	static get pluginName() {
		return 'Flmngr';
	}

	static get requires() {
		return [
			Notification,
			//'Image',

			// Default Drupal 9 CKEditor 5 will fail to attach Flmngr if these lines are not commented
			// due to Link/LinkEditing plugins are not enabled until user adds Link button onto toolbar.
			// So these two plugins are optional dependency for Flmngr, it can work without them.
			//
			// 'Link',
		    // 'LinkEditing',
		];
	}

	restorePrototypes(obj) {
		if (obj === null || typeof obj !== 'object' || obj instanceof Date || obj instanceof RegExp) {
			return obj;
		}

		if (Array.isArray(obj)) {
			return obj.map(item => restorePrototypes(item));
		}

		if (Object.getPrototypeOf(obj) === Object.prototype) {
			const result = {};
			for (const [key, value] of Object.entries(obj)) {
				result[key] = this.restorePrototypes(value);
			}
			return result;
		}

		const result = {};

		for (const [key, value] of Object.entries(obj)) {
			result[key] = this.restorePrototypes(value);
		}

		return result;
	}

	setFlmngr(flmngr) {
		const options = this.restorePrototypes(this.editor.config.get('flmngr') || this.editor.config.get('Flmngr') || {});
		options.integration = options["integration"] || "ckeditor5";
		options.integrationType = "flmngr";
		let flmngrInstance = flmngr.create(options);
		FlmngrCommand.flmngr = flmngrInstance;
		ImgPenCommand.flmngr = flmngrInstance;

		let apiLegacy = flmngrInstance; // flmngr
		// New API exists only in Flmngr v2
		let apiNew = !!apiLegacy.getNewAPI && apiLegacy.getNewAPI();  // Flmngr but without isFlmngrReady & isImgPenReady
		this.editor["getFlmngr"] = (onFlmngrIsReady) => {
			onFlmngrIsReady(apiNew, apiLegacy); // new way to receive Flmngr
			return apiLegacy; // old way to receive Flmngr
		};
		// Call all previous listeners
		for (const l of this.listenersFlmngrIsReady)
			l(apiNew, apiLegacy);

		window.FlmngrCKEditor5 = flmngrInstance.getNewAPI();
	}

	init() {

		this.editor["getFlmngr"] = (onFlmngrIsReady) => {
			!!onFlmngrIsReady && this.listenersFlmngrIsReady.push(onFlmngrIsReady); // a new way to receive Flmngr
			return null; // an old way to receive Flmngr, but it is not loaded yet, 'getFlmngr' will be overridden later to return existing values
		};

		// Include Flmngr JS lib into the document if it was not added by 3rd party code
		const apiKey =  this.editor.config.get('apiKey') || this.editor.config.get('flmngr.apiKey') || this.editor.config.get('Flmngr.apiKey') || 'FLMNFLMN';
		if (window.flmngr) {
			// Already loaded by another instance or by using flmngr.js manually
			this.setFlmngr(window.flmngr);
		} else {
			// We will load it and wait
			if (!window.onFlmngrAndImgPenLoadedArray)
				window.onFlmngrAndImgPenLoadedArray = [];
			window.onFlmngrAndImgPenLoadedArray.push(() => {
				this.setFlmngr(window.flmngr);
			});

			let delay = this.editor.config.get('libLoadDelay') || this.editor.config.get('flmngr.libLoadDelay') || this.editor.config.get('Flmngr.libLoadDelay');
			if (!delay || parseInt(delay) != delay)
				delay = 1;
			setTimeout(() => {

				let host = "http" + (Cookies.get("N1ED_HTTPS") === "false" ? "" : "s") + "://" + (!!Cookies.get("N1ED_PREFIX") ? (Cookies.get("N1ED_PREFIX") + ".") : "") + "cloud.n1ed.com";

				Flmngr.includeJS(host + "/v/latest/sdk/flmngr.js?apiKey=" + apiKey);
				Flmngr.includeJS(host + "/v/latest/sdk/imgpen.js?apiKey=" + apiKey);
			}, delay);
		}

		/*if ( !this.editor.plugins.has( 'ImageBlockEditing' ) && !this.editor.plugins.has( 'ImageInlineEditing' ) ) {
			throw new CKEditorError( 'flmngr-missing-image-plugin', this.editor );
		}*/

		// Add the commands
		this.editor.commands.add( 'upload', new UploadCommand( this.editor ) );
		this.flmngrCommand = new FlmngrCommand( this.editor );
		this.editor.commands.add( 'flmngr', this.flmngrCommand );
		this.editor.commands.add( 'imgpen', new ImgPenCommand( this.editor ) );

		// Add UI button
		const componentFactory = this.editor.ui.componentFactory;
		const t = this.editor.t;

		componentFactory.add( 'upload', locale => {
			const command = this.editor.commands.get( 'upload' );

			const button = new ButtonView( locale );

			button.set( {
				label: t( 'Upload image or file' ),
				icon: iconUpload,
				tooltip: true
			} );

			button.bind( 'isEnabled' ).to( command );

			button.on( 'execute', () => {
				this.editor.execute( 'upload' );
				this.editor.editing.view.focus();
			} );

			return button;
		} );

		componentFactory.add( 'flmngr', locale => {
			const command = this.editor.commands.get( 'flmngr' );

			const button = new ButtonView( locale );

			button.set( {
				label: t( 'Browse image or file' ),
				icon: iconFlmngr,
				tooltip: true
			} );

			button.bind( 'isEnabled' ).to( command );

			button.on( 'execute', () => {
				this.editor.execute( 'flmngr' );
				this.editor.editing.view.focus();
			} );

			return button;
		} );

		componentFactory.add( 'imgpen', locale => {
			const command = this.editor.commands.get( 'imgpen' );

			const button = new ButtonView( locale );

			button.set( {
				label: t( 'Edit image' ),
				icon: iconImgPen,
				tooltip: true
			} );

			button.bind( 'isEnabled' ).to( command );

			button.on( 'execute', () => {
				this.editor.execute( 'imgpen' );
				this.editor.editing.view.focus();
			} );

			return button;
		} );

		this.attachToLinkBalloon();
	}

	attachToLinkBalloon() {

		const editor = this.editor;
		const linkUI = editor.plugins.get( "LinkUI" );
		const contextualBalloonPlugin = editor.plugins.get( 'ContextualBalloon' );

		this.listenTo( contextualBalloonPlugin, 'change:visibleView', ( evt, name, visibleView ) => {

			if ( visibleView === linkUI.formView ) {

				this.stopListening( contextualBalloonPlugin, 'change:visibleView' );

				let linkFormView = linkUI.formView;
				const buttonFlmngr = new ButtonView(editor.locale);
				buttonFlmngr.set({
					icon: iconFlmngr
				});
				buttonFlmngr.on('execute', () => {

					function blockClickOutside() {
						const handler = (event) => {
							event.stopImmediatePropagation(); // предотвращает вызов clickOutsideHandler
						};
						document.addEventListener('mousedown', handler, true); // capture: true
						return () => {
							document.removeEventListener('mousedown', handler, true);
						};
					}

					const unblock = blockClickOutside();

					this.flmngrCommand.execute2(false, (urls) => {
						unblock();
						if (urls !== null) { // null means cancelled/fail
							linkFormView.urlInputView.value = urls[0];
							linkFormView.urlInputView.fieldView.value = urls[0];
							linkFormView.fire('submit');
						}
					});
				});
				buttonFlmngr.render();
				let elButtonFlmngr = buttonFlmngr.element;


				let elButtonSvg = elButtonFlmngr.querySelector("svg");
				let elButtonTitle = document.createElement("div");
				elButtonTitle.innerText = "Browse";
				elButtonSvg.parentElement.insertBefore(elButtonTitle, elButtonSvg.nextSibling);

				let elStyle = document.createElement("style");
				elStyle.innerHTML = `
									.ck-button-flmngr {
										margin-left: 4px !important;
										margin-right: 20px !important;
										gap: 6px;
										padding-left: 6px !important;
										padding-right: 6px !important;
									}
									.ck-button-flmngr > svg {
										margin-top: -2px !important;
									}
									.ck-button-flmngr > div {
										font-weight: bold !important;
									}									
									.ck-labeled-field-view_focused + .ck-button-flmngr,
									.ck-labeled-field-view_focused + .ck-button-flmngr + style + .ck-button-upload {
										border: var(--ck-focus-ring);
										box-shadow: var(--ck-focus-outer-shadow), 0 0;
									}
								`;
				elButtonFlmngr.classList.add("ck-button-flmngr");
				elButtonFlmngr.appendChild(elStyle);


				// Register the button under the link form view, it will handle its destruction.
				linkFormView.registerChild( buttonFlmngr );

				// Inject the element into DOM.
				linkFormView.element.insertBefore( elButtonFlmngr, linkFormView.saveButtonView.element );
			}
		} );
	}

	static includeJS(urlJS) {
		let scripts = document.getElementsByTagName("script");
		let alreadyExists = false;
		let existingScript = null;
		for (let i = 0; i < scripts.length; i++) {
			let src = decodeURI(scripts[i].getAttribute("src"));
			if (src != null && src.indexOf(urlJS) !== -1) {
				alreadyExists = true;
				existingScript = scripts[i];
			}
		}
		if (!alreadyExists) {
			let script = document.createElement("script");
			script.type = "text/javascript";
			script.src = urlJS;
			script.setAttribute("data-by-flmngr", "true");
			document.getElementsByTagName("head")[0].appendChild(script);
			return script;
		} else {
			return null;
		}
	}
}
