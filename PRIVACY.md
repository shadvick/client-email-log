# Privacy

Touch Log runs inside Thunderbird on your computer. It has no server. It does not send mail, addresses, or folder names anywhere.

## What it reads

Only while you use it:

- Message dates, subjects, and From/To addresses, so it can count touches and list rows
- A short excerpt of a message body, only after you open a row. That excerpt stays in memory until you close Touch Log. It is not saved.

Search all accounts matches addresses at a domain you type. It does not search the subject or the body.

## What it saves

In that Thunderbird profile only (`storage.local`):

- Folders you add (name and optional domain)
- Which Thunderbird folder you linked to each one
- Which folder you last had selected
- A cache of the busiest domains for the current year, used as suggestions

Removing the add-on removes that saved data.

## Data collection declaration

The manifest sets `data_collection_permissions` to `none`. That means Touch Log does not collect or transmit data outside Thunderbird. Reading mail locally is covered by the `messagesRead` permission, which Thunderbird shows at install.
