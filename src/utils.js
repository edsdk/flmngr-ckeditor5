
export function showWarning(
    editor,
    title,
    doLocalizeTitle,
    message,
    doLocalizeMessage
) {
    const notification = editor.plugins.get( 'Notification' );
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
            doLocalizeMessage ? t(message) : message
        );
    }
}