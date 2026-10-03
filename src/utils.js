
export function showWarning(
    editor,
    title,
    doLocalizeTitle,
    message,
    doLocalizeMessage
) {
    // plugins.get() throws for a plugin that is not loaded, so ask first
    const notification = editor.plugins.has( 'Notification' ) ? editor.plugins.get( 'Notification' ) : null;
    const t = editor.locale.t;
    if (!!notification) {
        notification.showWarning(
            doLocalizeMessage ? t(message) : message,
            {
                title: doLocalizeTitle ? t(title) : title,
                namespace: 'flmngr'
            }
        );
    } else {
        alert(
            (doLocalizeTitle ? t(title) : title) + "\n\n" +
            (doLocalizeMessage ? t(message) : message)
        );
    }
}