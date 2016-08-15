# GAS-Sync

This is a CLI utility to sync a local folder with a Google Apps Script. This
allows you to edit GAS code in your favourite editor. 

## Install

Install as a global npm package `npm install -g tuxmachine/gas-sync`

You also need to generate OAuth client credentials (I'm hesitant to publish mine
to GitHub, if anyone has a suggestion, open up an issue).

1. Use [this wizard](https://console.developers.google.com/start/api?id=drive)
to create or select a project in the Google Developers Console and automatically
turn on the API. Click Continue, then Go to credentials.
2. At the top of the page, select the OAuth consent screen tab. Select an Email
address, enter a Product name if not already set, and click the Save button.
3. Select the Credentials tab, click the Create credentials button and select
OAuth client ID.
4. Select the application type Other, enter the name "Drive API Quickstart", and
click the Create button.
5. Click OK to dismiss the resulting dialog.
6. Click the file_download (Download JSON) button to the right of the client ID.
7. Move this file to `$HOME/.gas-sync/client_secret.json`

<sup>These instructions are borrowed from [Google](https://developers.google.com/drive/v3/web/quickstart/nodejs)</sup>

## Getting started

The syntax mimics git for convenience.
```
gas authorise       # Follow console instructions and authorise GAS-Sync to manage your script files
cd /project/folder  # An empty folder that will contain the code
gas init            # Create project settings file and create a default ESLint config
gas remote-add [name] [fileId]  # Give a name to the remote file 

# From this point you can pull/push to a remote
gas pull [name] 
gas push [name] [-w] # Adding -w will watch local files for changes and push them immediately
```

## Command line options
```
Usage: gas-sync COMMAND [options] 

Commands:
 
  authorise
        Generate OAuth tokens for access to your Drive account. You can
        provide an alias by appending ' -u [alias]' if you need to use 
        multiple accounts
  init
        Initialize a local folder for syncing with a GoogleAppsScript
  push
        Update a GoogleAppsScript with the latest changes from your
        filesystem
  pull
        Update your filesystem with the latest changes from a 
        GoogleAppsScript on Drive
  remote
        List the remote GoogleAppsScript files this repository is 
        synced with
  remote-add [name] [fileId]
        Add a remote GoogleAppsScript to sync with
  remote-remove [name]
        Remove the sync with a remote GoogleAppsScript
        
Options:
  -u [alias]
        The user whose OAuth tokens should be used for setting up
        remote. If left empty, it'll use 'default'
  -f
        Force generating a new authorisation token or overwriting
        changes
  -w
        Continually watch for changes in toplevel JS/HTML files
        and push them to Drive (Careful! It'll overwrite without
        asking)
```

## Future

If I (or you) have any spare time, these are some features that would be nice to add

* Prevent accidentally overwriting local/remote changes - Possibly show a diff before push/pull'ing
* Ability to execute GAS function using the Execution API
* Tweak the default eslintrc to improve compatibility with GAS editor

# Disclaimer

This project is quickly thrown together and comes with absolutely no warrenty. 