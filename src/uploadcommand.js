import FlmngrCommand from "./flmngrcommand";

export default class UploadCommand extends FlmngrCommand {

	execute() {
		const flmngrCommand = this.editor.commands.get( 'upload' );
		flmngrCommand.executeUpload();
	}

}
