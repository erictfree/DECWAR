// Inverse of WARMAC DACON (34–44): radix-31 day, radix-12 month, year since
// 1964. The archived decoder subtracts 2000 for display; leave that behavior in
// the source routine. UTC calendar selection is an explicit modern host policy.
export function utcDateWord(date:Date):bigint{
  if(!Number.isFinite(date.getTime())||date.getUTCFullYear()<1964)throw new RangeError('Unsupported host date');
  return (BigInt(date.getUTCFullYear()-1964)*12n+BigInt(date.getUTCMonth()))*31n+BigInt(date.getUTCDate()-1);
}
