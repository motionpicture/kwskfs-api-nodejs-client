/**
 * メニューアイテム注文プロセス
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

    // 固定でイベント指定
    const eventType = kwskfsapi.factory.eventType.FoodEvent;
    const eventIdentifier = 'FoodEvent-pearlbowl-40th-frontiers-seagulls';

    const restaurants = await organizationService.search({
        organizationType: kwskfsapi.factory.organizationType.Restaurant,
        // identifiers: ['TTBreweryKawasakiLaCittadella'],
        limit: 100
    });
    console.log(restaurants.length, 'restaurants found.', restaurants);

    const selectedRestaurant = restaurants[0];

    const placeOrderTransactionService = new kwskfsapi.service.transaction.PlaceOrder({
        endpoint: API_ENDPOINT,
        auth: auth
    });

    const transaction = await placeOrderTransactionService.start({
        expires: moment().add(30, 'minutes').toDate(),
        sellerId: selectedRestaurant.id
    });
    console.log('transaction started.', transaction.id);

    let menuItemAuthorizations = [];

    // メニュー一つ目追加
    let selectedMenuItem = selectedRestaurant.hasMenu[0].hasMenuSection[0].hasMenuItem[0];
    let selectedOffer = selectedMenuItem.offers[0];
    console.log('authorizing menu item...', selectedMenuItem.identifier, selectedOffer.identifier);
    let menuItemAuthorization = await placeOrderTransactionService.createMenuItemEventReservationAuthorization({
        transactionId: transaction.id,
        eventType: eventType,
        eventIdentifier: eventIdentifier,
        menuItemIdentifier: selectedMenuItem.identifier,
        offerIdentifier: selectedOffer.identifier,
        acceptedQuantity: 1,
        organizationIdentifier: selectedRestaurant.identifier
    });
    console.log('menu item authorized.', menuItemAuthorization);
    menuItemAuthorizations.push(menuItemAuthorization);

    // メニュー二つ目選択
    selectedMenuItem = selectedRestaurant.hasMenu[0].hasMenuSection[1].hasMenuItem[0];
    selectedOffer = selectedMenuItem.offers[0];
    console.log('authorizing menu item...', selectedMenuItem.identifier, selectedOffer.identifier);
    menuItemAuthorization = await placeOrderTransactionService.createMenuItemEventReservationAuthorization({
        transactionId: transaction.id,
        eventType: eventType,
        eventIdentifier: eventIdentifier,
        menuItemIdentifier: selectedMenuItem.identifier,
        offerIdentifier: selectedOffer.identifier,
        acceptedQuantity: 2,
        organizationIdentifier: selectedRestaurant.identifier
    });
    console.log('menu item authorized.', menuItemAuthorization);
    menuItemAuthorizations.push(menuItemAuthorization);

    const accounts = await personService.findAccounts({ personId: 'me' });
    if (accounts.length === 0) {
        throw new Error('Account not found.');
    }

    const pecorinoAuthorization = await placeOrderTransactionService.createPecorinoAuthorization({
        transactionId: transaction.id,
        price: menuItemAuthorizations.reduce((a, b) => a + b.result.price, 0),
        fromAccountId: accounts[0].id
    });
    console.log('pecorino authorized.', pecorinoAuthorization);

    const contact = await personService.getContacts({ personId: 'me' });

    await placeOrderTransactionService.setCustomerContact({
        transactionId: transaction.id,
        contact: contact
    });
    console.log('contact set.', contact);

    const order = await placeOrderTransactionService.confirm({
        transactionId: transaction.id
    });
    console.log('transaction confirmed.', order);
}

main().then(() => {
    console.log('success!');
}).catch(console.error);
