/**
 * 注文検索サンプル
 * @ignore
 */

const moment = require('moment');
const open = require('open');
const readline = require('readline');
const kwskfsapi = require('../lib/index');

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

    const orderService = new kwskfsapi.service.Order({
        endpoint: API_ENDPOINT,
        auth: auth
    });

    const orders = await orderService.search({
        sellerId: '5adae69ff36d2843be76a1e5'
    });
    console.log(orders.length, 'orders found.');
}

main().then(() => {
    console.log('success!');
}).catch(console.error);
