/**
 * pg 8 treats sslmode=prefer, require and verify-ca as verify-full (certificate and host name checked), and warns
 * that pg 9 will give them libpq's weaker meaning. Spelling the mode as verify-full keeps today's checks through
 * that upgrade and silences the warning. Only the query string is touched.
 */
export function withVerifiedTls(connectionString: string): string {
  const q = connectionString.indexOf("?");
  if (q === -1) return connectionString;
  const query = connectionString.slice(q).replace(/([?&])sslmode=(?:prefer|require|verify-ca)(?=&|$)/g, "$1sslmode=verify-full");
  return connectionString.slice(0, q) + query;
}
