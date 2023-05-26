import { Plugin } from 'ckeditor5/src/core';
import { Notification } from 'ckeditor5/src/ui';
import { ButtonView } from 'ckeditor5/src/ui';

import FlmngrCommand from "./flmngrcommand";
import ImgPenCommand from "./imgpencommand";
import iconUpload from '../ckeditor5-theme/theme/icons/upload.svg';
import iconFlmngr from '../ckeditor5-theme/theme/icons/flmngr.svg';
import iconImgPen from '../ckeditor5-theme/theme/icons/imgpen.svg';
import UploadCommand from "./uploadcommand";

export default class Flmngr extends Plugin {

	listenersFlmngrIsReady = [];

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

	setFlmngr(flmngr) {
		const options = this.editor.config.get('flmngr') || this.editor.config.get('Flmngr') || {};
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
		const apiKey = this.editor.config.get('flmngr.apiKey') || this.editor.config.get('Flmngr.apiKey') || 'FLMNFLMN';
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

			let delay = this.editor.config.get('flmngr.libLoadDelay') || this.editor.config.get('Flmngr.libLoadDelay');
			if (!delay || parseInt(delay) != delay)
				delay = 1;
			setTimeout(() => {
				Flmngr.includeJS("https://cloud.flmngr.com/cdn/" + apiKey + "/flmngr.js");
				Flmngr.includeJS("https://cloud.flmngr.com/cdn/" + apiKey + "/imgpen.js");
			}, delay);
		}

		/*if ( !this.editor.plugins.has( 'ImageBlockEditing' ) && !this.editor.plugins.has( 'ImageInlineEditing' ) ) {
			throw new CKEditorError( 'flmngr-missing-image-plugin', this.editor );
		}*/

		// Add the commands
		this.editor.commands.add( 'upload', new UploadCommand( this.editor ) );
		this.editor.commands.add( 'flmngr', new FlmngrCommand( this.editor ) );
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
			script.setAttribute("data-by-n1ed", "true");
			document.getElementsByTagName("head")[0].appendChild(script);
			return script;
		} else {
			return null;
		}
	}
}
