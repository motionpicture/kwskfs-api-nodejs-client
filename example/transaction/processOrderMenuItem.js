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

    const restaurants = await organizationService.searchRestaurants({});
    console.log(restaurants.length, 'restaurants found.', restaurants);

    // const restaurants = await organizationService.searchRestaurantOrders({ identifier: restaurants[0].identifier });
    // console.log(restaurants.length, 'restaurants found.', restaurants);

    const placeOrderTransactionService = new kwskfsapi.service.transaction.PlaceOrder({
        endpoint: API_ENDPOINT,
        auth: auth
    });

    const transaction = await placeOrderTransactionService.start({
        expires: moment().add(30, 'minutes').toDate(),
        sellerId: '5ab60bd0c39335ff3ca5285f'
    });
    console.log('transaction started.', transaction.id);

    const menuItem = restaurants[0].hasMenu[0].hasMenuSection[0].hasMenuItem[0];
    const offer = menuItem.offers[0];
    console.log('authorizing menu item...', menuItem.identifier, offer.identifier);
    const menuItemAuthorization = await placeOrderTransactionService.createMenuItemAuthorization({
        transactionId: transaction.id,
        menuItemIdentifier: menuItem.identifier,
        offerIdentifier: offer.identifier,
        acceptedQuantity: 1
    });
    console.log('menu item authorized.', menuItemAuthorization);

    const pecorinoAuthorization = await placeOrderTransactionService.createPecorinoAuthorization({
        transactionId: transaction.id,
        price: offer.price
    });
    console.log('pecorino authorized.', pecorinoAuthorization);

    const personService = new kwskfsapi.service.Person({
        endpoint: API_ENDPOINT,
        auth: auth
    });
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
