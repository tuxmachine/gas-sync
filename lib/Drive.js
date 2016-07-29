var drive = require('googleapis').drive('v3');
var _ = require('lodash');
var Auth = require('./Auth');

module.exports.getScript = function(alias, fileId, callback) {
    Auth.getOAuthClient(alias, function(err, auth) {
        if(err) return callback(err);
        drive.files.export({
            auth: auth,
            fileId: fileId,
            mimeType: 'application/vnd.google-apps.script+json'
        }, callback);
    });
};

module.exports.getMeta = function(alias, fileId, callback) {
    Auth.getOAuthClient(alias, function(err, auth) {
        if(err) return callback(err);
        drive.files.get({
            fileId: fileId,
            fields: 'modifiedTime',
            auth: auth
        }, callback);
    });
};

module.exports.putScript = function(alias, fileId, script, callback) {
    Auth.getOAuthClient(alias, function(err, auth) {
        if(err) return callback(err);
        drive.files.update({
            fileId: fileId,
            resource: {
                mimeType: 'application/vnd.google-apps.script+json'
            },
            media: {
                body: typeof script === 'string' ? script : JSON.stringify(script),
                mimeType: 'application/vnd.google-apps.script+json'
            },
            auth: auth
        }, callback);
    });
};