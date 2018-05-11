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
    const eventService = new kwskfsapi.service.Event({
        endpoint: API_ENDPOINT,
        auth: auth
    });

    // フードイベント検索
    const foodEvents = await eventService.search({ eventType: kwskfsapi.factory.eventType.FoodEvent });
    console.log(foodEvents.length, 'foodEvents found.');
    if (foodEvents.length === 0) {
        throw new Error('foodEvents not found.');
    }
    // フードイベント確定
    const foodEvent = foodEvents[0];
    console.log('foodEvent:', foodEvent);

    // レストラン検索
    const restaurants = await organizationService.search({
        organizationType: kwskfsapi.factory.organizationType.Restaurant,
        identifiers: foodEvent.attendee.map((a) => a.identifier),
        limit: 100
    });
    if (restaurants.length === 0) {
        throw new Error('restaurants not found.');
    }
    console.log(restaurants.length, 'restaurants found.');
    // レストラン確定
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
        eventType: foodEvent.typeOf,
        eventIdentifier: foodEvent.identifier,
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
        eventType: foodEvent.typeOf,
        eventIdentifier: foodEvent.identifier,
        menuItemIdentifier: selectedMenuItem.identifier,
        offerIdentifier: selectedOffer.identifier,
        acceptedQuantity: 2,
        organizationIdentifier: selectedRestaurant.identifier
    });
    console.log('menu item authorized.', menuItemAuthorization);
    menuItemAuthorizations.push(menuItemAuthorization);

    // 口座検索
    const contact = await personService.getContacts({ personId: 'me' });
    const accounts = await personService.findAccounts({ personId: 'me' });
    let account = accounts[0];
    if (account === undefined) {
        // 口座がなければ開設
        account = await personService.openAccount({
            personId: 'me',
            name: `${contact.familyName} ${contact.givenName}`,
            initialBalance: 100000000
        });
    }

    const pecorinoAuthorization = await placeOrderTransactionService.createPecorinoAuthorization({
        transactionId: transaction.id,
        price: menuItemAuthorizations.reduce((a, b) => a + b.result.price, 0),
        fromAccountId: account.id
    });
    console.log('pecorino authorized.', pecorinoAuthorization);

    // 連絡先追加
    await placeOrderTransactionService.setCustomerContact({
        transactionId: transaction.id,
        contact: contact
    });
    console.log('contact set.', contact);

    // 注文追加
    const order = await placeOrderTransactionService.confirm({
        transactionId: transaction.id,
        sendEmailMessage: true
    });
    console.log('transaction confirmed.', order);
}

main().then(() => {
    console.log('success!');
}).catch(console.error);
