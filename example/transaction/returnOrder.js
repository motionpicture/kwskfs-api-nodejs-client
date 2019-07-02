/**
 * 注文返品サンプル
 * @ignore
 */

const moment = require('moment');
const open = require('open');
const readline = require('readline');
const kwskfsapi = require('../../lib/index');

const API_ENDPOINT = process.env.KWSKFS_API_ENDPOINT

async function main() {
    const scopes = [];

    const auth = new kwskfsapi.auth.ClientCredentials({
        domain: process.env.TEST_AUTHORIZE_SERVER_DOMAIN,
        clientId: process.env.TEST_CLIENT_ID,
        clientSecret: process.env.TEST_CLIENT_SECRET,
        scopes: scopes,
        state: '12345'
    });

    const returnOrderService = new kwskfsapi.service.transaction.ReturnOrder({
        endpoint: API_ENDPOINT,
        auth: auth
    });

    const transaction = await returnOrderService.start({
        expires: moment().add(5, 'minutes').toDate(),
        transactionId: '5af3fb2d234d14009b963220'
    });
    console.log(transaction.id, 'transaction started.');

    // await returnOrderService.cancel({
    //     transactionId: transaction.id
    // });

    await returnOrderService.confirm({
        transactionId: transaction.id
    });
    console.log(transaction.id, 'transaction confirmed.');
}

main().then(() => {
    console.log('success!');
}).catch(console.error);
