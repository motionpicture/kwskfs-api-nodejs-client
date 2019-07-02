// tslint:disable:no-implicit-dependencies

/**
 * OAuth2 client test
 * @ignore
 */

import { BAD_REQUEST, FORBIDDEN, INTERNAL_SERVER_ERROR, OK, UNAUTHORIZED } from 'http-status';
import * as nock from 'nock';
import * as assert from 'power-assert';
import * as qs from 'querystring';
import * as url from 'url';
import * as sasaki from '../index';

const DOMAIN = 'DOMAIN';
const CLIENT_ID = 'CLIENT_ID';
const CLIENT_SECRET = 'CLIENT_SECRET';
const REDIRECT_URI = 'REDIRECT_URI';
const LOGOUT_URI = 'LOGOUT_URI';
// const ACCESS_TYPE = 'offline';
const STATE = 'state';
const CODE_VERIFIER = 'codeVerifier';
// const SCOPE = 'scopex';
const SCOPES = ['scopex', 'scopey'];

describe('generateAuthUrl()', () => {
    it('有効な認可ページURLが生成されるはず', () => {
        const opts = {
            scopes: SCOPES,
            responseType: 'code',
            state: STATE
        };
        const auth = new sasaki.auth.OAuth2({
            domain: DOMAIN,
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            redirectUri: REDIRECT_URI
        });

        const generated = auth.generateAuthUrl(opts);
        const parsed = url.parse(generated);
        if (parsed.query === null) {
            throw new Error('auth url must have a query strings.');
        }
        const query = qs.parse(parsed.query);

        assert.equal(query.response_type, opts.responseType);
        assert.equal(query.scope, SCOPES.join(' '));
        assert.equal(query.client_id, CLIENT_ID);
        assert.equal(query.redirect_uri, REDIRECT_URI);
    });

    it('検証コードがセットされれば、有効な認可ページURLにcode_challenge_methodとcode_challengeパラメータがセットされるはず', () => {
        const opts = {
            scopes: SCOPES,
            responseType: 'code',
            state: STATE,
            codeVerifier: CODE_VERIFIER
        };
        const auth = new sasaki.auth.OAuth2({
            domain: DOMAIN,
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            redirectUri: REDIRECT_URI
        });

        const generated = auth.generateAuthUrl(opts);
        const parsed = url.parse(generated);
        if (parsed.query === null) {
            throw new Error('auth url must have a query strings.');
        }
        const query = qs.parse(parsed.query);

        assert.equal(typeof query.code_challenge_method, 'string');
        assert.equal(typeof query.code_challenge, 'string');
    });
});

describe('generateLogoutUrl()', () => {
    it('有効なログアウトページURLが生成されるはず', () => {
        const auth = new sasaki.auth.OAuth2({
            domain: DOMAIN,
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            redirectUri: REDIRECT_URI,
            logoutUri: LOGOUT_URI
        });

        const generated = auth.generateLogoutUrl();
        const parsed = url.parse(generated);
        if (parsed.query === null) {
            throw new Error('auth url must have a query strings.');
        }
        const query = qs.parse(parsed.query);

        assert.equal(query.client_id, CLIENT_ID);
        assert.equal(query.logout_uri, LOGOUT_URI);
    });
});

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

        const auth = new sasaki.auth.OAuth2({
            domain: DOMAIN,
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            redirectUri: REDIRECT_URI
        });

        const credentials = await auth.getToken('', '');
        assert.equal(typeof credentials.access_token, 'string');
        assert.equal(typeof credentials.refresh_token, 'string');
        assert.equal(typeof credentials.expiry_date, 'number');
        assert.equal(credentials.token_type, 'Bearer');

        assert(scope.isDone());
    });

    // tslint:disable-next-line:mocha-no-side-effect-code
    [BAD_REQUEST, INTERNAL_SERVER_ERROR].forEach((statusCode) => {
        it(`認可サーバーが次のステータスコードを返却されば、トークンを取得できないはず  ${statusCode}`, async () => {
            scope = nock(`https://${DOMAIN}`)
                .post('/token')
                .reply(statusCode, {});

            const auth = new sasaki.auth.OAuth2({
                domain: DOMAIN,
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                redirectUri: REDIRECT_URI
            });

            const getTokenError = await auth.getToken('', '')
                .catch((error) => {
                    return error;
                });
            assert(getTokenError instanceof Error);

            assert(scope.isDone());
        });
    });
});

describe('setCredentials()', () => {
    it('認証情報を正しくセットできる', async () => {
        const auth = new sasaki.auth.OAuth2({
            domain: DOMAIN,
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            redirectUri: REDIRECT_URI
        });

        auth.setCredentials({
            refresh_token: 'refresh_token_placeholder',
            access_token: 'access_token',
            token_type: 'Bearer'
        });

        const accessToken = await auth.getAccessToken();
        assert.equal(accessToken, 'access_token');
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

    it('リフレッシュトークンが設定されていなければ、アクセストークンをリフレッシュできないはず', async () => {
        const auth = new sasaki.auth.OAuth2({
            domain: DOMAIN,
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            redirectUri: REDIRECT_URI
        });

        const refreshAccessTokenError = await auth.refreshAccessToken()
            .catch((error) => {
                return error;
            });
        assert(refreshAccessTokenError instanceof Error);
    });

    // tslint:disable-next-line:mocha-no-side-effect-code
    [BAD_REQUEST, INTERNAL_SERVER_ERROR].forEach((statusCode) => {
        it(`認可サーバーが次のステータスコードを返却されば、アクセストークンをリフレッシュできないはず  ${statusCode}`, async () => {
            const scope = nock(`https://${DOMAIN}`)
                .post('/token')
                .reply(statusCode, {});

            const auth = new sasaki.auth.OAuth2({
                domain: DOMAIN,
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                redirectUri: REDIRECT_URI
            });

            auth.credentials = {
                refresh_token: 'refresh-token-placeholder'
            };

            const refreshAccessTokenError = await auth.refreshAccessToken()
                .catch((error) => {
                    return error;
                });
            assert(refreshAccessTokenError instanceof Error);

            assert(scope.isDone());
        });
    });

    // it('リフレッシュトークンがあればアクセストークンを取得できるはず', async () => {
    //     const auth = new sasaki.auth.OAuth2({
    //         domain: DOMAIN,
    //         clientId: CLIENT_ID,
    //         clientSecret: CLIENT_SECRET,
    //         redirectUri: REDIRECT_URI
    //     });

    //     auth.credentials = { refresh_token: 'refresh_token' };
    //     const accessToken = await auth.getAccessToken();
    //     assert.equal(typeof accessToken, 'string');
    // });

    // it('should set access token type to Bearer if none is set', (done) => {
    //     const oauth2client = new sasaki.auth.OAuth2(
    //         CLIENT_ID,
    //         CLIENT_SECRET,
    //         REDIRECT_URI
    //     );
    //     oauth2client.credentials = { access_token: 'foo', refresh_token: '' };
    //     const scope = nock('https://www.sasaki.com')
    //         .get('/urlshortener/v1/url/history')
    //         .times(2)
    //         .reply(200);

    //     testNoBearer(localUrlshortener, oauth2client, (err) => {
    //         if (err) {
    //             return done(err);
    //         }
    //     });
    // });

    // it('should refresh if access token is expired', (done) => {
    //     const scope = nock('https://accounts.google.com')
    //         .post('/o/oauth2/token')
    //         .times(2)
    //         .reply(200, { access_token: 'abc123', expires_in: 1 });
    //     let oauth2client = new sasaki.auth.OAuth2(
    //         CLIENT_ID,
    //         CLIENT_SECRET,
    //         REDIRECT_URI
    //     );
    //     let now = new Date().getTime();
    //     let twoSecondsAgo = now - 2000;
    //     oauth2client.credentials = { refresh_token: 'abc', expiry_date: twoSecondsAgo };
    //     testExpired(localDrive, oauth2client, now, () => {
    //         oauth2client = new sasaki.auth.OAuth2(
    //             CLIENT_ID,
    //             CLIENT_SECRET,
    //             REDIRECT_URI
    //         );
    //         now = new Date().getTime();
    //         twoSecondsAgo = now - 2000;
    //         oauth2client.credentials = {
    //             refresh_token: 'abc',
    //             expiry_date: twoSecondsAgo
    //         };
    //     });
    // });

    // it('should make request if access token not expired', (done) => {
    //     const scope = nock('https://accounts.google.com')
    //         .post('/o/oauth2/token')
    //         .times(2)
    //         .reply(200, { access_token: 'abc123', expires_in: 10000 });
    //     let oauth2client = new sasaki.auth.OAuth2(
    //         CLIENT_ID,
    //         CLIENT_SECRET,
    //         REDIRECT_URI
    //     );
    //     let now = (new Date()).getTime();
    //     let tenSecondsFromNow = now + 10000;
    //     oauth2client.credentials = {
    //         access_token: 'abc123',
    //         refresh_token: 'abc',
    //         expiry_date: tenSecondsFromNow
    //     };
    //     localDrive.files.get({ fileId: 'wat', auth: oauth2client }, () => {
    //         assert.equal(JSON.stringify(oauth2client.credentials), JSON.stringify({
    //             access_token: 'abc123',
    //             refresh_token: 'abc',
    //             expiry_date: tenSecondsFromNow,
    //             token_type: 'Bearer'
    //         }));

    //         assert.throws(() => {
    //             scope.done();
    //         }, 'AssertionError');
    //         oauth2client = new sasaki.auth.OAuth2(
    //             CLIENT_ID,
    //             CLIENT_SECRET,
    //             REDIRECT_URI
    //         );
    //         now = (new Date()).getTime();
    //         tenSecondsFromNow = now + 10000;
    //         oauth2client.credentials = {
    //             access_token: 'abc123',
    //             refresh_token: 'abc',
    //             expiry_date: tenSecondsFromNow
    //         };
    //     });
    // });

    // it('should refresh if have refresh token but no access token', (done) => {
    //     const scope = nock('https://accounts.google.com')
    //         .post('/o/oauth2/token')
    //         .times(2)
    //         .reply(200, { access_token: 'abc123', expires_in: 1 });
    //     let oauth2client = new sasaki.auth.OAuth2(
    //         CLIENT_ID,
    //         CLIENT_SECRET,
    //         REDIRECT_URI
    //     );
    //     let now = (new Date()).getTime();
    //     oauth2client.credentials = { refresh_token: 'abc' };
    //     testNoAccessToken(localDrive, oauth2client, now, () => {
    //         now = (new Date()).getTime();
    //         oauth2client.credentials = { refresh_token: 'abc' };
    //     });
    // });

    // describe('revokeCredentials()', () => {
    //     it('should revoke credentials if access token present', (done) => {
    //         const scope = nock('https://accounts.google.com')
    //             .get('/o/oauth2/revoke?token=abc')
    //             .reply(200, { success: true });
    //         const oauth2client = new sasaki.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    //         oauth2client.credentials = { access_token: 'abc', refresh_token: 'abc' };
    //         oauth2client.revokeCredentials((err, result) => {
    //             assert.equal(err, null);
    //             assert.equal(result.success, true);
    //             assert.equal(JSON.stringify(oauth2client.credentials), '{}');
    //             scope.done();
    //             done();
    //         });
    //     });

    //     it('should clear credentials and return error if no access token to revoke', (done) => {
    //         const oauth2client = new sasaki.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    //         oauth2client.credentials = { refresh_token: 'abc' };
    //         oauth2client.revokeCredentials((err, result) => {
    //             assert.equal(err.message, 'No access token to revoke.');
    //             assert.equal(result, null);
    //             assert.equal(JSON.stringify(oauth2client.credentials), '{}');
    //             done();
    //         });
    //     });
    // });

    // describe('getToken()', () => {
    //     it('should return expiry_date', (done) => {
    //         const now = (new Date()).getTime();
    //         const scope = nock('https://accounts.google.com')
    //             .post('/o/oauth2/token')
    //             .reply(200, { access_token: 'abc', refresh_token: '123', expires_in: 10 });
    //         const oauth2client = new sasaki.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    //         oauth2client.getToken('code here', (err, tokens) => {
    //             if (err) {
    //                 return done(err);
    //             }
    //             assert(tokens.expiry_date >= now + (10 * 1000));
    //             assert(tokens.expiry_date <= now + (15 * 1000));
    //             scope.done();
    //             done();
    //         });
    //     });
    // });

    after(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });
});

describe('getAccessToken()', () => {
    before(() => {
        nock.cleanAll();
    });

    beforeEach(() => {
        nock.cleanAll();
        nock.disableNetConnect();
    });

    it('リフレッシュトークンもアクセストークンもなければ、アクセストークンを取得できないはず', async () => {
        const auth = new sasaki.auth.OAuth2({
            domain: DOMAIN,
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            redirectUri: REDIRECT_URI
        });

        const transferError = await auth.getAccessToken()
            .catch((error) => {
                return error;
            });
        assert(transferError instanceof Error);
    });

    after(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });
});

describe('fetch()', () => {
    let scope: nock.Scope;
    const API_ENDPOINT = 'https://example.com';

    beforeEach(() => {
        nock.cleanAll();
        scope = nock(`https://${DOMAIN}`)
            .post('/token')
            .reply(OK, { access_token: 'abc123', expires_in: 1 });

        nock(API_ENDPOINT).get('/').reply(OK, {});
    });

    afterEach(() => {
        nock.cleanAll();
    });

    it('アクセストークンがなければリフレッシュするはず', async () => {
        const auth = new sasaki.auth.OAuth2({
            domain: DOMAIN,
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            redirectUri: REDIRECT_URI
        });

        auth.credentials = { refresh_token: 'refresh-token-placeholder' };

        await auth.fetch(`${API_ENDPOINT}/`, { method: 'GET' }, [OK]);
        assert.equal('abc123', auth.credentials.access_token);
    });

    it('アクセストークンの期限が切れていればリフレッシュされるはず', async () => {
        const auth = new sasaki.auth.OAuth2({
            domain: DOMAIN,
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            redirectUri: REDIRECT_URI
        });

        auth.credentials = {
            access_token: 'initial-access-token',
            refresh_token: 'refresh-token-placeholder',
            // tslint:disable-next-line:no-magic-numbers
            expiry_date: (new Date()).getTime() - 1000
        };

        await auth.fetch(`${API_ENDPOINT}/`, { method: 'GET' }, [OK]);
        assert.equal('abc123', auth.credentials.access_token);

    });

    it('アクセストークンの期限が切れていなければリフレッシュされないはず', async () => {
        const auth = new sasaki.auth.OAuth2({
            domain: DOMAIN,
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            redirectUri: REDIRECT_URI
        });

        auth.credentials = {
            access_token: 'initial-access-token',
            refresh_token: 'refresh-token-placeholder',
            // tslint:disable-next-line:no-magic-numbers
            expiry_date: (new Date()).getTime() + 1000
        };

        await auth.fetch(`${API_ENDPOINT}/`, { method: 'GET' }, [OK]);
        assert.equal('initial-access-token', auth.credentials.access_token);
    });

    it('アクセストークンの期限が設定されていなければ、期限は切れていないとみなすはず', async () => {
        const auth = new sasaki.auth.OAuth2({
            domain: DOMAIN,
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            redirectUri: REDIRECT_URI
        });

        auth.credentials = {
            access_token: 'initial-access-token',
            refresh_token: 'refresh-token-placeholder'
        };

        await auth.fetch(`${API_ENDPOINT}/`, { method: 'GET' }, [OK]);
        assert.equal('initial-access-token', auth.credentials.access_token);
        assert(!scope.isDone());
    });

    // tslint:disable-next-line:mocha-no-side-effect-code
    [UNAUTHORIZED, FORBIDDEN].forEach((statusCode) => {
        it(`リソースサーバーが次のステータスコードを返却されば、アクセストークンはリフレッシュされるはず  ${statusCode}`, async () => {
            nock(API_ENDPOINT)
                .get('/access')
                // tslint:disable-next-line:no-magic-numbers
                .times(2)
                .reply(statusCode, { error: { code: statusCode, message: 'Invalid Credentials' } });

            const auth = new sasaki.auth.OAuth2({
                domain: DOMAIN,
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                redirectUri: REDIRECT_URI
            });

            auth.credentials = {
                access_token: 'initial-access-token',
                refresh_token: 'refresh-token-placeholder'
            };

            await auth.fetch(`${API_ENDPOINT}/access`, { method: 'GET' }, [OK]).catch((err) => err);
            assert.equal(auth.credentials.access_token, 'abc123');
            assert(scope.isDone());
        });
    });

    // tslint:disable-next-line:mocha-no-side-effect-code
    [{}, undefined, null].forEach((headers) => {
        it(`オプションに指定されたヘッダーが${typeof headers}の場合、正常に動作するはず`, async () => {
            const options = {
                method: 'GET',
                headers: <any>headers
            };
            const auth = new sasaki.auth.OAuth2({
                domain: DOMAIN,
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                redirectUri: REDIRECT_URI
            });
            auth.credentials = { refresh_token: 'refresh-token-placeholder' };

            await auth.fetch(`${API_ENDPOINT}/`, options, [OK]);
            assert.equal('abc123', auth.credentials.access_token);
        });
    });
});
