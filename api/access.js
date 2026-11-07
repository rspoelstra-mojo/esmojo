import {makeSecurityMaintenance} from '../server/security-maintenance.js';
import {makeAccountsHandler} from '../server/accounts-api.js';
import {makeMfaHandler} from '../server/mfa-api.js';

// Deel de bestaande serverfunctie; /api/mfa blijft een afzonderlijke route.
export function makeAccessDispatcher({accounts = makeAccountsHandler(), mfa = makeMfaHandler(), security=makeSecurityMaintenance()} = {}) {
  return (req, res) => req.query.action === 'mfa' ? mfa(req, res) : req.query.action==='security-maintenance'?security(req,res):accounts(req, res);
}
export default makeAccessDispatcher();
