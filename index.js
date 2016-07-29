#!/usr/bin/env node
var Sync = require('./lib/Sync');
var minimist = require('minimist');
var argv =  minimist(process.argv.slice( process.argv[0] === 'node' ? 3 : 2));
var Auth = require('./lib/Auth');
var _ = require('lodash');
var gulp = require('gulp');

var alias, folder, remote, fileId;
switch(argv._[0]) {
    case 'init':
        alias = argv.u || _.first(Auth.aliases);
        if(!alias)
          return Auth.getOAuthClient('default',() => {
              Sync.init('./');
          });
        Sync.init('./');
        break;
    case 'push':
        folder = Sync.open('./');
        if(argv._.length < 2)
            return console.error('ERROR: Please specify a remote');
        remote = argv._[1];
        if(argv.w)
            gulp.watch(['*.js','*.html'], () => {
                folder.push(remote);
            });
        else 
            folder.push(remote);
        break;
    case 'pull':
        folder = Sync.open('./');
        if(argv._.length < 2)
            return console.error('ERROR: Please specify a remote');
        remote = argv._[1];
        folder.pull(remote);
        break;
    case 'remote':
    case 'status':
    case 'fetch':
        folder = Sync.open('./');
        console.log('Fetching info from Drive...');
        folder.fetch(function(err) {
            if(err) console.error('ERROR: Failed to update metadata');
            _.forEach(folder.remotes, remote => {
                console.log(`[${remote.alias}] ${remote.name} - last modified on ${remote.lastModified}`);
            });
        });
        break;
    case 'remote-add':
        if(argv._.length < 3)
            return console.error('ERROR: Please specify a name and a fileId for remote script');
        folder = Sync.open('./');
        alias = argv.u || 'default';
        remote = argv._[1];
        fileId = argv._[2];
        if(folder.remotes[remote] && !argv.f)
            return console.error(`ERROR: Remote with name "${remote}" already exists`);
        folder.addRemote(alias, fileId, remote);
        break;
    case 'remote-remove':
        folder = Sync.open('./');
        remote = argv._[1];
        if(!folder.remotes[remote])
            return console.error('ERROR: Remote doesn\'t exist');
        delete folder.remotes[remote];
        folder.save();
        break;
    case 'authorize':
    case 'authorise':
        alias = argv.u || 'default';
        if(_.includes(Auth.aliases,alias) && !argv.f)
          return console.error('Already authorized!');
        Auth.clearToken(alias);
        Auth.getOAuthClient(alias, () => {});
        break;
    default:
        console.log(`Usage: gas-sync COMMAND [options] 

Commands:
  authorise
        Generate OAuth tokens for access to your Drive account. You can
        provide an alias if you need to use multiple accounts
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
        remote. If left empty, it'll use the first one available.
  -f
        Force generating a new authorisation token or overwriting
        changes
  -w
        Continually watch for changes in toplevel JS/HTML files
        and push them to Drive (Careful! It'll overwrite without
        asking)
`);
        break;
}