# Touch Log

A small Thunderbird add-on. It counts email touches per folder — by month, with a date/subject log.

It stays on your machine. Nothing is uploaded.

## What you get

- Add folders (name, optional domain). The list lives in that Thunderbird profile only.
- Scan a Thunderbird folder you already file mail into
- If you have more than one account: **Search all accounts** for that domain
- Year totals: touches, sent, received, your replies, threads
- Month bars with this-year vs last-year counts
- Click a month, then click a row to open the message

## Load it in Thunderbird

1. Thunderbird → the menu (☰) → **Add-ons and Themes**
2. Gear icon → **Debug Add-ons**
3. **Load Temporary Add-on…**
4. Pick `manifest.json` in this folder

The add-on lasts until Thunderbird restarts. For a keep-it install later, zip this folder’s contents (not the parent folder) and rename the zip to `.xpi`, then install from the same gear menu.

Click **Touch Log** in the toolbar, or the **Touch Log** button in the spaces bar on the left.

## How to use it

1. Add a folder (name, and a domain if you want all-account search)
2. Pick a year
3. Choose **A Thunderbird folder** if you already file that mail into a folder (best, fastest)
4. Or, if you have more than one account, choose **Search all accounts**
5. Click **Scan**

Folder scan treats everything in that Thunderbird folder as a match. Search all accounts matches From/To addresses at the domain (for example `@example.com`) across every account. It does not search subject or body. Skips junk, trash, and drafts.

## Edit folders

Use **Edit folders** to add or remove folders. Each person’s list stays on their computer.

## Privacy

Touch Log reads mail only inside Thunderbird, on that computer. It does not upload anything. Details are in [PRIVACY.md](PRIVACY.md).

## Source

[github.com/shadvick/touch-log](https://github.com/shadvick/touch-log)

Made by Shad Vick. MIT license.
