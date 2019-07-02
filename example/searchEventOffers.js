/**
 * イベント販売情報検索サンプル
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

    const eventService = new kwskfsapi.service.Event({
        endpoint: API_ENDPOINT,
        auth: auth
    });

    // イベント販売情報検索
    const offers = await eventService.searchOffers({
        eventType: kwskfsapi.factory.eventType.FoodEvent,
        eventIdentifier: 'FoodEvent-pearlbowl-40th-frontiers-seagulls'
    });
    console.log(offers.length, 'offers found.');
    const restaurant = offers[0];
    const menuItem = restaurant.hasMenu[0].hasMenuSection[0].hasMenuItem[0];
    const offer = menuItem.offers[0];
    console.log('offer:', offer);

    // 特定販売情報の在庫状況を変更してみる
    await eventService.changeMenuItemOfferAvailability({
        eventType: kwskfsapi.factory.eventType.FoodEvent,
        eventIdentifier: 'FoodEvent-pearlbowl-40th-frontiers-seagulls',
        organizationId: restaurant.id,
        menuItemIdentifier: menuItem.identifier,
        offerIdentifier: offer.identifier,
        availability: kwskfsapi.factory.itemAvailability.InStock
    });
    console.log('availability changed.');
}

main().then(() => {
    console.log('success!');
}).catch(console.error);
