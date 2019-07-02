/**
 * 座席予約注文プロセス
 * @ignore
 */

const moment = require('moment');
const open = require('open');
const readline = require('readline');
const kwskfsapi = require('../../lib/index');

const API_ENDPOINT = process.env.KWSKFS_API_ENDPOINT

async function main() {
    const scopes = [];

    const auth = new kwskfsapi.auth.OAuth2({
        domain: process.env.TEST_AUTHORIZE_SERVER_DOMAIN,
        clientId: process.env.TEST_CLIENT_ID_OAUTH2,
        clientSecret: process.env.TEST_CLIENT_SECRET_OAUTH2,
        redirectUri: 'https://localhost/signIn',
        logoutUri: 'https://localhost/signOut'
    });

    const state = '12345';
    const codeVerifier = '12345';

    const authUrl = auth.generateAuthUrl({
        scopes: scopes,
        state: state,
        codeVerifier: codeVerifier
    });
    console.log('authUrl:', authUrl);

    open(authUrl);

    await new Promise((resolve, reject) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question('enter authorization code:\n', async (code) => {
            rl.question('enter state:\n', async (givenState) => {
                if (givenState !== state) {
                    reject(new Error('state not matched'));

                    return;
                }

                let credentials = await auth.getToken(code, codeVerifier);
                console.log('credentials published', credentials);

                auth.setCredentials(credentials);

                credentials = await auth.refreshAccessToken();
                console.log('credentials refreshed', credentials);

                rl.close();
                resolve();
            });
        });
    });

    const logoutUrl = auth.generateLogoutUrl();
    console.log('logoutUrl:', logoutUrl);

    const organizationService = new kwskfsapi.service.Organization({
        endpoint: API_ENDPOINT,
        auth: auth
    });
    const personService = new kwskfsapi.service.Person({
        endpoint: API_ENDPOINT,
        auth: auth
    });
    const eventService = new kwskfsapi.service.Event({
        endpoint: API_ENDPOINT,
        auth: auth
    });
    const placeOrderTransactionService = new kwskfsapi.service.transaction.PlaceOrder({
        endpoint: API_ENDPOINT,
        auth: auth
    });

    // スポーツチーム検索
    const sportsTeams = await organizationService.search({
        organizationType: kwskfsapi.factory.organizationType.SportsTeam,
        // identifiers: ['KawasakiFrontale'],
        limit: 1
    });
    console.log(sportsTeams.length, 'sportsTeams found.');
    if (sportsTeams.length === 0) {
        throw new Error('sportsTeams not found.');
    }
    // スポーツチーム確定
    const sportsTeam = sportsTeams[0];

    // スポーツイベント検索
    const sportsEvents = await eventService.search({ eventType: kwskfsapi.factory.eventType.SportsEvent });
    console.log(sportsEvents.length, 'sportsEvents found.');
    if (sportsEvents.length === 0) {
        throw new Error('sportsEvents not found.');
    }
    // スポーツイベント確定
    const sportsEvent = sportsEvents[0];

    // 注文取引開始
    const transaction = await placeOrderTransactionService.start({
        expires: moment().add(30, 'minutes').toDate(),
        sellerId: sportsTeam.id
    });
    console.log('transaction started.', transaction.id);

    let seatReservationAuthorizations = [];

    // 座席予約承認追加
    console.log('authorizing seat reservation...');
    let seatReservationAuthorization = await placeOrderTransactionService.createSeatEventReservationAuthorization({
        transactionId: transaction.id,
        eventType: sportsEvent.typeOf,
        eventIdentifier: sportsEvent.identifier
    });
    console.log('seat reservation authorized.', seatReservationAuthorization);
    seatReservationAuthorizations.push(seatReservationAuthorization);

    // 口座取得
    const accounts = await personService.findAccounts({ personId: 'me' });
    if (accounts.length === 0) {
        throw new Error('Account not found.');
    }

    // 口座オーソリ取得
    // const pecorinoAuthorization = await placeOrderTransactionService.createPecorinoAuthorization({
    //     transactionId: transaction.id,
    //     price: seatReservationAuthorizations.reduce((a, b) => a + b.result.price, 0),
    //     fromAccountId: accounts[0].id
    // });
    // console.log('pecorino authorized.', pecorinoAuthorization);

    // クレジットカードオーソリ取得
    const creditCardAuthorization = await placeOrderTransactionService.createCreditCardAuthorization({
        transactionId: transaction.id,
        orderId: moment().unix(),
        amount: seatReservationAuthorizations.reduce((a, b) => a + b.result.price, 0),
        method: '1',
        creditCard: {
            cardNo: '4111111111111111',
            // cardPass?: string;
            expire: '1812',
            holderName: 'AA AA'
        }
    });
    console.log('credit authorized.', creditCardAuthorization);

    // 連絡先追加
    const contact = await personService.getContacts({ personId: 'me' });
    await placeOrderTransactionService.setCustomerContact({
        transactionId: transaction.id,
        contact: contact
    });
    console.log('contact set.', contact);

    // 注文確定
    const order = await placeOrderTransactionService.confirm({
        transactionId: transaction.id
    });
    console.log('transaction confirmed.', order);
}

main().then(() => {
    console.log('success!');
}).catch(console.error);
