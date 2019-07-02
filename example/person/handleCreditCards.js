/**
 * a sample handling credit cards
 * クレジットカードを扱うサンプル
 *
 * @ignore
 */

const COA = require('@motionpicture/coa-service');
const GMO = require('@motionpicture/gmo-service');
const moment = require('moment');
const open = require('open');
const readline = require('readline');
const util = require('util');

const sasaki = require('../../lib/index');

async function main() {
    const auth = new sasaki.auth.OAuth2({
        domain: process.env.TEST_AUTHORIZE_SERVER_DOMAIN,
        clientId: process.env.TEST_CLIENT_ID_OAUTH2,
        clientSecret: process.env.TEST_CLIENT_SECRET_OAUTH2,
        redirectUri: 'https://localhost/signIn',
        logoutUri: 'https://localhost/signOut'
    });

    const state = '12345';
    const codeVerifier = '12345';

    const authUrl = auth.generateAuthUrl({
        scopes: [],
        state: state,
        codeVerifier: codeVerifier
    });
    console.log('authUrl:', authUrl);

    open(authUrl);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    await new Promise((resolve, reject) => {
        rl.question('enter authorization code:\n', async (code) => {
            rl.question('enter state:\n', async (givenState) => {
                if (givenState !== state) {
                    reject(new Error('state not matched'));

                    return;
                }

                let credentials = await auth.getToken(code, codeVerifier);
                console.log('credentials published', credentials);

                auth.setCredentials(credentials);

                resolve();
            });
        });
    });

    const people = new sasaki.service.Person({
        endpoint: process.env.KWSKFS_API_ENDPOINT,
        auth: auth
    });

    // クレジットカード追加
    const creditCard = await people.addCreditCard({
        personId: 'me',
        creditCard: {
            cardNo: '4111111111111111',
            expire: '2012',
            securityCode: '123'
        }
    });
    console.log('creditCard:', creditCard);

    // クレジットカード削除
    await people.deleteCreditCard({
        personId: 'me',
        cardSeq: creditCard.cardSeq
    });

    // クレジットカード検索
    const creditCards = await people.findCreditCards({
        personId: 'me'
    });
    console.log('creditCards:', creditCards);

    rl.close();
}

main().then(async () => {
    console.log('main processed.');
}).catch((err) => {
    console.error(err);
});
