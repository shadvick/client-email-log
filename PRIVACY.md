# Privacy

Client Email Log runs inside Thunderbird on your computer. It has no server and does not send your messages, email addresses, folder names, or usage data anywhere.

## What it reads

Only while you use it:

- Message dates, subjects, and From/To addresses, so it can count messages and list rows
- A short excerpt of a message body, only after you open a row. That excerpt stays in memory until you close Client Email Log. It is not saved.

Search all accounts matches addresses at a domain you type, or one full email address. It does not search the subject or the body. Junk, trash, and drafts are skipped.

## What it saves

In that Thunderbird profile only (`storage.local`):

- Folders you add (name and optional domain)
- Which Thunderbird folder you linked to each one
- Which folder you last had selected
- A cache of the busiest domains and addresses for the current year, used as suggestions

Removing the add-on removes that saved data.

## Data collection declaration

The manifest sets `data_collection_permissions` to `none`. That means Client Email Log does not collect or transmit data outside Thunderbird. Reading mail locally is covered by the `messagesRead` permission, which Thunderbird shows at install.
