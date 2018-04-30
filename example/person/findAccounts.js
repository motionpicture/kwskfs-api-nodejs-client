/**
 * 口座検索サンプル
 * @ignore
 */

const moment = require('moment');
const util = require('util');
const pecorinoapi = require('../../lib/');

const oauth2client = new pecorinoapi.auth.OAuth2({
    domain: process.env.TEST_AUTHORIZE_SERVER_DOMAIN
});
oauth2client.setCredentials({
    access_token: process.env.TEST_ACCESS_TOKEN
});

const personService = new pecorinoapi.service.Person({
    endpoint: process.env.KWSKFS_API_ENDPOINT,
    auth: oauth2client
});

async function main() {
    const accounts = await personService.findAccounts({
        personId: 'me'
    });
    console.log('accounts:', accounts);
    console.log(accounts.length, 'accounts found.');
}

main().then(() => {
    console.log('main processed.');
}).catch(console.error);
