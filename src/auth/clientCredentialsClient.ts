import * as createDebug from 'debug';
import * as httpStatus from 'http-status';
import * as fetch from 'isomorphic-fetch';
import * as querystring from 'querystring';

import ICredentials from './credentials';
import OAuth2client from './oAuth2client';

const debug = createDebug('kwskfs-api-nodejs-client:auth:clientCredentialsClient');

export interface IOptions {
    domain: string;
    clientId: string;
    clientSecret: string;
    scopes: string[];
    state: string;
}

/**
 * クライアント認証クライアント
 */
export default class ClientCredentialsClient extends OAuth2client {
    public options: IOptions;

    constructor(options: IOptions) {
        // tslint:disable-next-line:no-suspicious-comment
        // TODO add minimum validation

        super(options);
        this.options = options;

        this.credentials = { refresh_token: 'ignored' };
    }

    /**
     * クライアント認証でアクセストークンを取得します。
     */
    public async getToken(): Promise<ICredentials> {
        debug('requesting an access token...');
        const form = {
            scope: this.options.scopes.join(' '),
            state: this.options.state,
            grant_type: 'client_credentials'
        };
        const secret = Buffer.from(`${this.options.clientId}:${this.options.clientSecret}`, 'utf8').toString('base64');
        const options: RequestInit = {
            credentials: 'include',
            body: querystring.stringify(form),
            method: 'POST',
            headers: {
                Authorization: `Basic ${secret}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };

        debug('fetching...', options);

        return fetch(
            `https://${this.options.domain}${OAuth2client.OAUTH2_TOKEN_URI}`,
            options
        ).then(async (response) => {
            debug('response:', response.status);
            if (response.status !== httpStatus.OK) {
                if (response.status === httpStatus.BAD_REQUEST) {
                    const body = await response.json();
                    throw new Error(body.error);
                } else {
                    const body = await response.text();
                    throw new Error(body);
                }
            } else {
                const tokens = await response.json();
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                if (tokens && tokens.expires_in) {
                    // tslint:disable-next-line:no-magic-numbers
                    tokens.expiry_date = ((new Date()).getTime() + (tokens.expires_in * 1000));
                    delete tokens.expires_in;
                }

                tokens.refresh_token = 'ignored';

                return tokens;
            }
        });
    }

    /**
     * Refreshes the access token.
     */
    protected async refreshToken(__: string): Promise<ICredentials> {
        debug('refreshing an access token...');

        return this.getToken();
    }
}
