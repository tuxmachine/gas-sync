var fs = require('fs');
var _ = require('lodash');
var path = require('path');
var readline = require('readline');
var googleAuth = require('google-auth-library');


const CONFIG_DIR = path.resolve((process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE), '.gas-sync');
const TOKEN_PATH = path.resolve(CONFIG_DIR,'credentials.json');
var CREDENTIALS;
var tokens = {};
var _clientCache = {};

/* Load client credentials */
(function loadCredentials() {
    try {
        CREDENTIALS = fs.readFileSync(path.resolve(CONFIG_DIR, 'client_secret.json'));
    } catch(err) {
        try {
            CREDENTIALS = fs.readFileSync(path.resolve(__dirname,'..', 'client_secret.json'));
        } catch(err) {
            console.error('Please create an OAuth2 client credentials file and place it under ~/.gas-sync/client_secret.json');
            console.error('See: https://developers.google.com/drive/v3/web/quickstart/nodejs');
            process.exit(1);
        }
    }
    try {
        CREDENTIALS = JSON.parse(CREDENTIALS);
        var client_id = CREDENTIALS.installed.client_id;
    } catch(err) {
        console.error('Invalid client_secret.json, check syntax');
        process.exit(1);
    }
})();

/* Load existing tokens */
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


/**
 * Generate an Google OAuthClient for a provided alias
 * 
 * @param {String} alias The alias of the user that will be authenticated
 * @param {Function} callback Receives `(error, oauth2Client)`
 */
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
        _clientCache[alias] = oauth2Client;
        callback(null, oauth2Client);
    });
};

/**
 * Delete tokens for a given alias
 * 
 * @param {String} alias Alias of an authenticated user
 */
module.exports.clearToken = function(alias) {
    delete tokens[alias];
};

/**
 * Available aliases
 */
module.exports.aliases = _.keys(tokens);

/**
 * Generates a fresh set of authentication tokens and adds these to the given
 * client
 * 
 * Lifted almost straight from the Google API documentation
 * 
 * @param {OAuth2Client} oauth2Client
 * @param {Function} callback Receives `(error, tokens)`
 */
function getNewToken(oauth2Client, callback) {
    const scopes = [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.metadata',
        'https://www.googleapis.com/auth/drive.scripts'
    ];
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes
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
            oauth2Client.credentials = token;
            callback(null, token);
        });
    });
}