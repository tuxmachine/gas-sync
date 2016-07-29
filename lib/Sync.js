var _ = require('lodash');
var fs = require('fs');
var Drive = require('./Drive');
var path = require('path');
var Promise = require('promise');
var minimatch = require('minimatch');

function Sync(attr) {
    _.assign(this, attr);
}

Sync.open = function(dir) {
    var settings = {};
    try {
        settings = JSON.parse(fs.readFileSync(path.resolve(dir, '.gas-sync.json'))); 
    } catch(err) {
        console.log(err);
        throw new Error('Not a valid GAS-Sync folder');
    }
    return new Sync(settings);
};

Sync.init = function(dir) {
    var config = path.resolve(dir, '.gas-sync.json');
    try {
        fs.readFileSync(config);
        console.error('ERROR: There\'s already a gas-sync repository here');
    } catch(err) {
        fs.writeFileSync(config, Sync.template, 'utf8');
        fs.appendFileSync('.gitignore', '.gas-sync.json');
        var eslint = fs.readFileSync(path.resolve(__dirname, 'eslintrc'));
        fs.writeFileSync(path.resolve(dir, '.eslintrc'), eslint);
        console.log('Done! Please add a remote next: gas-sync remote-add [name] [fileId]');
    }
};

Sync.template = JSON.stringify({ remotes: {} });

Sync.prototype.save = function() {
    fs.writeFileSync('.gas-sync.json', JSON.stringify(this, null, 4), 'utf8');
};

Sync.prototype.addRemote = function(alias, fileId, name) {
    Drive.getMeta(alias, fileId, (err, meta) => {
        if(err) {
            console.error('Error setting up remote; couldn\'t get file');
            return console.error(err);
        }
        this.remotes[name] = {
            name: name,
            fileId: fileId,
            lastFetch: (new Date()).toISOString(),
            lastModified: meta.modifiedTime,
            alias: alias
        };
        this.save();
    });
};

Sync.prototype.push = function(remote, diff) {
    var folder = this;
    remote = this.remotes[remote];
    var gasignores;
    try {
        gasignores = fs.readFileSync('.gasignore').split(/\n|\r\n/g);
    } catch(err) {
        gasignores = [];
    }
    var files = fs.readdirSync('.').filter(function(filename) {
        if(!/(\.js|\.html)$/.test(filename)) return false;
        for(var i = 0; i < gasignores.length; i++) {
            if(minimatch(filename, gasignores[i]))
                return false;
        }
        return true;
    });
    var readFile = Promise.denodeify(fs.readFile);
    Drive.getScript(remote.alias, remote.fileId, function(err, script) {
        if(err) {
            console.error(`ERROR: Couldn't get Script from ${remote.name}`);
            return console.error(err);
        }
        if(!diff) {
            var promises = files.map(filename => {
                var type = /\.js$/.test(filename) ? 'server_js' : 'html';
                return readFile(filename, 'utf8').then(source => {
                    return {
                        name: filename.replace(/\.(js|html)$/,''),
                        type: type,
                        source: source
                    };
                });
            });
            Promise.all(promises).then(localFiles => {
                // Push updates
                localFiles.forEach(localFile => {
                    var remoteFile = _.find(script.files, {
                        name: localFile.name,
                        type: localFile.type
                    });
                    if(!remoteFile)
                        return script.files.push(localFile);
                    remoteFile.source = localFile.source;
                });
                // And remove files no longer in local fs
                _.remove(script.files, function(remoteFile) {
                    return _.find(localFiles, {
                        name: remoteFile.name,
                        type: remoteFile.type
                    }) === undefined;
                });
                Drive.putScript(remote.alias, remote.fileId, script, function(err){
                    if(err) {
                        console.error('ERROR: Couldn\'t save changes to Drive');
                        return console.error(err);
                    }
                    console.log('Updated remote script');
                    remote.lastModified = (new Date()).toISOString();
                    remote.lastFetch = remote.lastModified;
                });
            }, err => {
                console.error('ERROR: Couldn\'t read local files');
                console.error(err);
            });
        }
    });
};

Sync.prototype.pull = function(remote, diff) {
    remote = this.remotes[remote];
    var writeFile = Promise.denodeify(fs.writeFile);
    Drive.getScript(remote.alias, remote.fileId, function(err, script) {
        if(err) {
            console.error(`ERROR: Couldn't get Script from ${remote.name}`);
            return console.error(err);
        }
        if(!diff) {
            var promises = [];
            script.files.forEach(file => {
                var ext = file.type === 'server_js' ? '.js' : '.html';
                var p = writeFile(path.resolve('./', file.name + ext), file.source).then(err => {
                    if(!err) return;
                    console.error('ERROR: Couldn\'t write local file ' + file.name + ext);
                    console.error(err);
                });
                promises.push(p);
            });
            Promise.all(promises).then(() => console.log('Updated local files'));
        }
    });
};

Sync.prototype.fetch = function(callback) {
    var getMeta = Promise.denodeify(Drive.getMeta);
    var promises = _.map(this.remotes, remote => {
        return getMeta(remote.alias, remote.fileId).then(meta => {
            remote.lastModified = meta.modifiedTime;
            remote.lastFetch = (new Date()).toISOString();
        }, err => {
            console.error(err);
            console.error('ERROR: Failed to update ' + remote.name);
        });
    });
    return Promise.all(promises).then(() => {
        this.save();
        callback();
    });
};

module.exports = Sync;
/* JSON format
{
    remotes: {
        origin: {
            name: 'origin',
            fileId: 'tnahoecrgrcaohintaoheu',
            oauth: 'default'
            lastModified: 'Date.toISOString'
            lastFetched: 'Date.toISOString'
        }
    }
}
*/