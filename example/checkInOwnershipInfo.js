/**
 * 所有権チェックインサンプル
 * @ignore
 */

const moment = require('moment');
const readline = require('readline');
const kwskfsapi = require('../lib/index');

const API_ENDPOINT = process.env.KWSKFS_API_ENDPOINT

async function main() {
    const ticketToken = await new Promise((resolve, reject) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question('チケットトークンを入力してください。\n', async (ticketToken) => {
            rl.close();
            resolve(ticketToken);
        });
    });

    const auth = new kwskfsapi.auth.ClientCredentials({
        domain: process.env.TEST_AUTHORIZE_SERVER_DOMAIN,
        clientId: process.env.TEST_CLIENT_ID,
        clientSecret: process.env.TEST_CLIENT_SECRET,
        scopes: [],
        state: '12345'
    });

    const ownershipInfoService = new kwskfsapi.service.OwnershipInfo({
        endpoint: API_ENDPOINT,
        auth: auth
    });

    // チェックイン実行
    console.log('checking in...');
    const checkInAction = await ownershipInfoService.checkInByTicketToken({
        goodType: kwskfsapi.factory.reservationType.EventReservation,
        ticketToken: ticketToken
    });
    console.log('checkInAction created.', checkInAction.id);

    // チェックイン履歴検索
    console.log('searching checkIn actions...');
    const checkInActions = await ownershipInfoService.searchCheckInActions({
        goodType: kwskfsapi.factory.reservationType.EventReservation,
        ticketToken: ticketToken
    });
    console.log(checkInActions.length, 'checkInActions found.');
}

main().then(() => {
    console.log('success!');
}).catch(console.error);
