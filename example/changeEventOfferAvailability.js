/**
 * イベントオファーの在庫状況を変更する
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

    // イベントの販売情報を検索
    const eventIdentifier = 'FoodEvent-pearlbowl-40th-frontiers-seagulls';
    const offers = await eventService.searchOffers({
        eventType: kwskfsapi.factory.eventType.FoodEvent,
        eventIdentifier: eventIdentifier,
    });
    console.log(offers.length, 'offers found.');

    // 特定のオファーの在庫状況を変更する
    const restaurant = offers[0];
    const menuItem = restaurant.hasMenu[0].hasMenuSection[0].hasMenuItem[0];
    const offer = menuItem.offers[0];
    console.log('target offer availability is', offer.availability);

    const targetAvailability = kwskfsapi.factory.itemAvailability.InStock;
    console.log('changing availability to...', targetAvailability);
    await eventService.changeMenuItemOfferAvailability({
        eventType: kwskfsapi.factory.eventType.FoodEvent,
        eventIdentifier: eventIdentifier,
        organizationId: restaurant.id,
        menuItemIdentifier: menuItem.identifier,
        offerIdentifier: offer.identifier,
        availability: targetAvailability
    });
    console.log('availability changed to', targetAvailability);
}

main().then(() => {
    console.log('success!');
}).catch(console.error);
