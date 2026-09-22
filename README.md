# Client Email Log

**A free, private Thunderbird add-on for seeing your email activity with a client over time.**

Client Email Log counts the messages already in Thunderbird and shows them month by month: sent, received, replies, and threads.

Compare this year with last year, open a month to see the messages behind the count, and open any message directly in Thunderbird.

Everything runs locally. Nothing is uploaded.

## Who it's for

Built for agencies, consultants, freelancers, and small businesses that either:

- file email into a folder for each client, or
- regularly email the same company or contact throughout the year.

It gives you a simple record of the email work without requiring a timer.

## What it does

- Save folders with a name and optional company domain
- Scan an existing Thunderbird folder, including subfolders
- Count sent and received messages
- Count replies and conversation threads
- View activity month by month
- Compare this year with last year
- Click a month to see the underlying messages
- View From, To, and a short preview
- Open the original message directly in Thunderbird
- Find frequently contacted company domains and email addresses
- Search across accounts by company domain or full email address when Thunderbird has multiple accounts

Search all accounts matches From/To addresses. It does not search message subjects or bodies. Junk, trash, and drafts are skipped.

The button in Thunderbird's spaces bar is labeled **Touch Log**. That is the short name. The add-on name is Client Email Log.

## Not a time tracker

Client Email Log counts email activity. It does not track or estimate hours.

If you use email history as part of understanding how much communication a client required, this gives you the record without running a timer.

## Privacy

Client Email Log runs inside Thunderbird on your computer.

**Nothing is uploaded.**

Your saved folder list and cached results stay in your Thunderbird profile.

See [PRIVACY.md](PRIVACY.md) for details.

## Install for development

1. Open Thunderbird.
2. Open **Add-ons and Themes**.
3. Click the gear icon and choose **Debug Add-ons**.
4. Click **Load Temporary Add-on**.
5. Select `manifest.json` from this repository.

A temporary installation lasts until Thunderbird restarts.

Public installation instructions will be added after the extension is available through Thunderbird Add-ons.

## Permissions

Client Email Log requests Thunderbird permissions needed to:

- read account and folder information
- read messages locally
- save your folder settings locally
- open messages and the Client Email Log page in Thunderbird tabs

The extension does not transmit message data.

## Status

**0.1.0 — Initial public release**

The project is being prepared for submission to Thunderbird Add-ons.

## Author

Built by [Shad Vick](https://github.com/shadvick).

I'm a software architect and developer focused on practical business software, integrations, and tools that solve real workflow problems.

Bug reports and useful feature requests are welcome through [GitHub Issues](https://github.com/shadvick/touch-log/issues).

## License

MIT License. See [LICENSE](LICENSE).
