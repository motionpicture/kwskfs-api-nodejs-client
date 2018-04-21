// tslint:disable:no-implicit-dependencies

/**
 * clientCredentials client test
 * @ignore
 */

import { BAD_REQUEST, INTERNAL_SERVER_ERROR, OK } from 'http-status';
import * as nock from 'nock';
import * as assert from 'power-assert';
import * as sasaki from '../index';

const DOMAIN = 'DOMAIN';
const CLIENT_ID = 'CLIENT_ID';
const CLIENT_SECRET = 'CLIENT_SECRET';
const STATE = 'state';
const SCOPES = ['scopex', 'scopey'];

describe('getToken()', () => {
    let scope: nock.Scope;

    before(() => {
        nock.cleanAll();
    });

    beforeEach(() => {
        nock.cleanAll();
        nock.disableNetConnect();
    });

    afterEach(() => {
        nock.cleanAll();
    });

    it('認可サーバーが正常であれば、認可コードとアクセストークンを交換できるはず', async () => {
        scope = nock(`https://${DOMAIN}`)
            .post('/token')
            .reply(OK, { access_token: 'abc123', refresh_token: 'abc123', expires_in: 1000, token_type: 'Bearer' });

        const auth = new sasaki.auth.ClientCredentials({
            domain: DOMAIN,
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            scopes: SCOPES,
            state: STATE
        });

        const credentials = await auth.getToken();
        assert.equal(typeof credentials.access_token, 'string');
        assert.equal(typeof credentials.refresh_token, 'string');
        assert.equal(typeof credentials.expiry_date, 'number');
        assert.equal(credentials.token_type, 'Bearer');

        assert.equal(true, scope.isDone());
    });

    // tslint:disable-next-line:mocha-no-side-effect-code
    [BAD_REQUEST, INTERNAL_SERVER_ERROR].forEach((statusCode) => {
        it(`認可サーバーが次のステータスコードを返却されば、トークンを取得できないはず  ${statusCode}`, async () => {
            scope = nock(`https://${DOMAIN}`)
                .post('/token')
                .reply(statusCode, {});

            const auth = new sasaki.auth.ClientCredentials({
                domain: DOMAIN,
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                scopes: SCOPES,
                state: STATE
            });

            const getTokenError = await auth.getToken()
                .catch((error) => {
                    return error;
                });
            assert(getTokenError instanceof Error);

            assert.equal(true, scope.isDone());
        });
    });
});

describe('refreshAccessToken()', () => {
    before(() => {
        nock.cleanAll();
    });

    beforeEach(() => {
        nock.cleanAll();
        nock.disableNetConnect();
    });

    it('認可サーバーが正常であれば、アクセストークンをリフレッシュできるはず', async () => {
        const scope = nock(`https://${DOMAIN}`)
            .post('/token')
            .reply(OK, { access_token: 'abc123', refresh_token: 'abc123', expires_in: 1000, token_type: 'Bearer' });

        const auth = new sasaki.auth.ClientCredentials({
            domain: DOMAIN,
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            scopes: SCOPES,
            state: STATE
        });

        const credentials = await auth.refreshAccessToken();
        assert.equal(typeof credentials.access_token, 'string');
        assert.equal(typeof credentials.refresh_token, 'string');
        assert.equal(typeof credentials.expiry_date, 'number');
        assert.equal(credentials.token_type, 'Bearer');

        assert.equal(true, scope.isDone());
    });

    after(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });
});
