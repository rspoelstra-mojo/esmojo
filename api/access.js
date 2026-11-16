import {makeAccountsHandler} from '../server/accounts-api.js';
import {makeMfaHandler} from '../server/mfa-api.js';
import {makeLoginBackgroundHandler} from '../server/website-settings.js';

// Deel de bestaande serverfunctie; /api/mfa blijft een afzonderlijke route.
export function makeAccessDispatcher({accounts = makeAccountsHandler(), mfa = makeMfaHandler(), loginBackground=makeLoginBackgroundHandler()} = {}) {
  return (req, res) => req.query.action === 'mfa' ? mfa(req, res) : req.query.action==='login-background'?loginBackground(req,res):accounts(req, res);
}
export default makeAccessDispatcher();
