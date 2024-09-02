import { Command, first } from 'ckeditor5';

export default class ImgPenCommand extends Command {

	static flmngr;

	constructor( editor ) {
		super( editor );

		// Remove default document listener to lower its priority.
		this.stopListening( this.editor.model.document, 'change' );

		// Lower this command listener priority to be sure that refresh() will be called after link & image refresh.
		this.listenTo( this.editor.model.document, 'change', () => this.refresh(), { priority: 'low' } );
	}

	getSelectedImage() {
		const selection = this.editor.model.document.selection;
		const el = selection.getSelectedElement() || first( selection.getSelectedBlocks() );
		if (!!el && (el.name === 'imageBlock' || el.name === 'imageInline')) {
			return el;
		}
		return null;
	}

	refresh() {
		this.isEnabled = this.getSelectedImage() != null;
	}

	execute() {

		if (!ImgPenCommand.flmngr) {
			console.log("File manager is not loaded yet");
			return;
		}

		const elImg = this.getSelectedImage();

		ImgPenCommand.flmngr.editImageAndUpload({
			url: elImg.getAttribute("src"),
			onSave: (newUrl) => {
				this.changeImgSrc(elImg, ImgPenCommand.flmngr.getNoCacheUrl(newUrl));
			},
			onFail: (error) => {
				const notification = editor.plugins.get( 'Notification' );
				const t = editor.locale.t;
				notification.showWarning(error, {
					title: t( 'Uploading edited image to server failed' ),
					namespace: 'flmngr'
				} );
			}
		});
	}

	changeImgSrc(el, url) {
		this.editor.model.change( writer => {
			writer.setAttribute("src", url, el);
			writer.removeAttribute("srcset", el);
			writer.removeAttribute("sizes", el);

			let attr = el.getAttribute("htmlAttributes");
			if (attr) {
				delete attr.attributes.src;
				delete attr.attributes.srcset;
				delete attr.attributes.sizes;
				writer.setAttribute("htmlAttributes", attr, el);
			}
		});

	};

}
