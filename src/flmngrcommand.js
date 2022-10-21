import { Command } from 'ckeditor5/src/core';
import { first } from 'ckeditor5/src/utils';
import { findAttributeRange } from 'ckeditor5/src/typing';
import {showWarning} from "./utils";

export default class FlmngrCommand extends Command {

	static flmngr;

	imageExtensions = ['jpeg', 'jpg', 'png', 'bmp', 'svg', 'webp'];

	constructor( editor ) {
		super( editor );

		// Remove default document listener to lower its priority.
		this.stopListening( this.editor.model.document, 'change' );

		// Lower this command listener priority to be sure that refresh() will be called after link & image refresh.
		this.listenTo( this.editor.model.document, 'change', () => this.refresh(), { priority: 'low' } );
	}

	refresh() {
		const imageCommand = this.editor.commands.get( 'insertImage' );
		const linkCommand = this.editor.commands.get( 'link' );
		this.isEnabled = !imageCommand || // if there is no image command, the button IS always enabled: we will show a message
			(imageCommand.isEnabled || (!!linkCommand && linkCommand.isEnabled));
	}

	isImage(filepath) {
		let i = filepath.lastIndexOf(".");
		if (i > -1 && i < filepath.length-1) {
			let ext = filepath.substr(i + 1).toLowerCase();
			return ext === 'jpeg' || ext === 'jpg' || ext === 'png' || ext === 'gif' || ext === "bmp" || ext === "svg" || ext === "webp";
		}
		return false;
	}

	// Call a dialog to select local file and upload them ("Upload" action)
	executeUpload() {
		this.execute2(true);
	}

	// Call Flmngr ("Browse" action)
	execute() {
		this.execute2(false);
	}

	execute2(doUpload) { // false = browse

		const imageCommand = this.editor.commands.get( 'insertImage' );
		if (!imageCommand) {
			let msg = "Please enable CKEditor 5 `Image` plugin in order to use Flmngr file manager";
			if (!!window.Drupal)
				msg += ":\n\nDrupal users must set `Image Upload` -> `Enable image uploads` checkbox on the page of CKEditor 5 text format";
			alert(msg);
			return;
		}


		if (!FlmngrCommand.flmngr) {
			console.log("File manager is not loaded yet");
			return;
		}

		const selection = this.editor.model.document.selection;
		const el = selection.getSelectedElement() || first( selection.getSelectedBlocks() );

		let currentUrl = null;
		let elA = null;
		const position = selection.getFirstPosition();
		if ( selection.hasAttribute( 'linkHref' ) ) {
			elA = findAttributeRange(position, 'linkHref', selection.getAttribute('linkHref'), this.editor.model).getItems().next().value.textNode;
			currentUrl = elA.getAttribute("linkHref");
		}

		let elImg = null;
		if (el.name === 'imageBlock' || el.name === 'imageInline') {
			elImg = el;
			currentUrl = elImg.getAttribute("src");
			elA = null;
		}

		if (doUpload) {
			FlmngrCommand.flmngr.selectFiles({
				acceptExtensions: !!elImg ? this.imageExtensions : null,
				isMultiple: false,
				onFinish: (files) => {
					FlmngrCommand.flmngr.upload({
						filesOrLinks: files,
						onFinish: (urls, paths) => {
							this.createOrChange(el, elImg, elA, urls);
						},
						onFail: (error) => {
							showWarning(this.editor, 'Unable to upload files', true, error, false);
						}
					});
				}
			})
		} else {
			FlmngrCommand.flmngr.pickFiles({
				acceptExtensions: !!elImg ? this.imageExtensions : null,
				isMultiple: false,
				list: currentUrl ? [currentUrl] : null,
				onFinish: (files) => {
					this.createOrChange(el, elImg, elA, files.map(f => f.url));
				}
			});
		}
	}

	createOrChange(el, elImg, elA, urls) {
		if (!!elImg) {
			this.changeImgSrc(elImg, FlmngrCommand.flmngr.getNoCacheUrl(urls[0]));
		} else if (!!elA) {
			this.changeAHref(elA, urls[0]);
		} else {
			// Create new IMG and A elements
			let urlsImages = [];
			let urlsFiles = [];
			for (let url of urls) {
				if (this.isImage(url))
					urlsImages.push(FlmngrCommand.flmngr.getNoCacheUrl(url));
				else
					urlsFiles.push(url);
			}

			for (const url of urlsFiles)
				this.createNewA(url);

			for (const url of urlsImages)
				this.createNewImg(url);
		}
	}

	createNewImg(url) {
		this.editor.model.change( writer => {

			const imageCommand = this.editor.commands.get( 'insertImage' );

			// Check if inserting an image is actually possible - it might be possible to only insert a link.
			if ( !imageCommand.isEnabled ) {
				showWarning(this.editor, 'Inserting image failed', true, 'Could not insert image at the current position.', true);
				return;
			}

			this.editor.execute( 'insertImage', { source: [url] } );

		} );
	};

	createNewA(url) {
		this.editor.model.change( writer => {
			const insertPosition = this.editor.model.document.selection.getFirstPosition();

			const i = url.lastIndexOf("/");
			const filename = url.substr(i + 1);
			const title = "Download " + filename;

			writer.insertText( title, { linkHref: url }, insertPosition );
		} );
	};

	changeImgSrc(el, url) {
		this.editor.model.change( writer => {
			writer.setAttribute("src", url, el);
			writer.setAttribute("srcset", null, el);
			writer.setAttribute("width", null, el);
			writer.setAttribute("height", null, el);
		});

	};

	changeAHref(el, url) {
		this.editor.model.change( writer => {
			writer.setAttribute( 'linkHref', url, el );
			// TODO: probably change text
		});
	};

	isImage(filepath) {
		let i = filepath.lastIndexOf(".");
		if (i > -1 && i < filepath.length-1) {
			let ext = filepath.substr(i + 1).toLowerCase();
			if (this.imageExtensions.indexOf(ext) > -1)
				return true;
		}
		return false;
	}
}
