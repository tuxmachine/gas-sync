var fs = require('fs');
var _ = require('lodash');
var path = require('path');
var readline = require('readline');
var googleAuth = require('google-auth-library');

const SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata',
    'https://www.googleapis.com/auth/drive.scripts'
];
const CONFIG_DIR = path.resolve((process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE), '.gas-sync');
const TOKEN_PATH = path.resolve(CONFIG_DIR,'credentials.json');
var credentials;
try {
    credentials = fs.readFileSync(path.resolve(__dirname,'..', 'client_secret.json'));
} catch(err) {
    try {
        credentials = fs.readFileSync(path.resolve(CONFIG_DIR, 'client_secret.json'));
    } catch(err) {
        console.error('Please create an OAuth2 client credentials file and place it under ~/.gas-sync/client_secret.json (See: https://developers.google.com/drive/v3/web/quickstart/nodejs)');
        process.exit(1);
    }
}
try {
    const CREDENTIALS = JSON.parse(credentials);
} catch(err) {
    console.errer('Invalid client_secret.json, check syntax');
    process.exit(1);
}

var tokens = {};
(function populateTokens() {
    try {
        fs.mkdirSync(CONFIG_DIR);
    }
    catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }
    
    try {
        tokens = fs.readFileSync(TOKEN_PATH,'utf8') || '{}';
        tokens = JSON.parse(tokens);
    } catch (err) {
        tokens = {};
    }
})();

var _clientCache = {};

module.exports.getOAuthClient = function(alias, callback) {
    if(_clientCache[alias]) return callback(null, _clientCache[alias]);
    var clientSecret = CREDENTIALS.installed.client_secret;
    var clientId = CREDENTIALS.installed.client_id;
    var redirectUrl = CREDENTIALS.installed.redirect_uris[0];
    var auth = new googleAuth();
    var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
    if(tokens[alias]) {
        oauth2Client.credentials = tokens[alias];
        _clientCache[alias] = oauth2Client;
        return callback(null, oauth2Client);
    }
    getNewToken(oauth2Client, function(err, token) {
        if(err) return callback(err);
        tokens[alias] = token;
        fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
        oauth2Client.credentials = token;
        _clientCache[alias] = oauth2Client;
        callback(null, oauth2Client);
    });
};

module.exports.clearToken = function(alias) {
    delete tokens[alias];
};

module.exports.aliases = _.keys(tokens);

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });
    console.log('Authorize this app by visiting this url: ', authUrl);
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('Enter the code from that page here: ', function(code) {
        rl.close();
        oauth2Client.getToken(code, function(err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return callback(err);
            }
            callback(null, token);
        });
    });
}