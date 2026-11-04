# Zen Auto Archive

Extension for [Zen Browser](https://zen-browser.app) bringing Arc's auto-archive feature: inactive unpinned tabs are automatically archived (closed) in the background.

## How it works

The extension runs quietly in the background and scans tabs periodically (every 15 minutes by default). A tab is archived only when meeting **all** conditions:

- **Not pinned**: Pinned tabs and Zen Essentials are never touched.
- **Not active**: The currently active tab in any window is never closed.
- **Not audible or sharing media**: Tabs playing music, podcasts, or sharing microphone/camera/screen in video calls are never closed.
- **Not excluded**: Domains listed in the exclusion settings (including pages opened in Reader View) are never closed.
- **Inactive**: Inactive for longer than the threshold (**12 hours** by default, matching Arc's default).

You can pause or resume auto-archiving at any time by clicking the **Active / Paused** badge in the toolbar popup.

### Zen Workspaces (Spaces)

Zen exposes active workspace tabs to extensions. To ensure tabs in background spaces are archived when overdue, an automatic check also runs when switching tabs, spaces, or windows (throttled to avoid redundant checks).

### Restoring Tabs

Because archived tabs are standard closed tabs, you can instantly restore any of them using the native browser shortcut:
- macOS: `Cmd + Shift + T`
- Linux / Windows: `Ctrl + Shift + T`

## Installation in Zen Browser

### Temporary (For development / testing)

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select `manifest.json` from this repository

### Permanent Install

From [Mazilla addons](https://addons.mozilla.org/firefox/downloads/file/5206201/zen_auto_archive-1.1.1.zip).  

Or from file `.xpi` file:
1. In `about:config`, set `xpinstall.signatures.required` to `false`.
2. Package the extension:
   ```sh
   zip -r zen-auto-archive.xpi manifest.json defaults.js background.js icons popup options LICENSE
   ```
3. Open `zen-auto-archive.xpi` in Zen Browser to install.


## License

[MIT](LICENSE)
