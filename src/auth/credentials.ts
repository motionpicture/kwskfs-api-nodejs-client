/**
 * OAuth認証情報
 */
interface ICredentials {
  /**
   * リフレッシュトークン
   */
  refresh_token?: string;
  /**
   * 期限UNIXタイムスタンプ
   */
  expiry_date?: number;
  /**
   * アクセストークン
   */
  access_token?: string;
  /**
   * トークンタイプ
   */
  token_type?: string;
}

export default ICredentials;
