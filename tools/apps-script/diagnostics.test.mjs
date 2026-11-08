import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicationFailure,publicationAnnotation} from './diagnostics.mjs';

test('Google-fouten worden vaste diagnosecodes, zonder tokens, e-mail, broncode of URL',()=>{
 const cases=[['Syntax error: SyntaxError: Unexpected token = line: 42 file: Artists','SOURCE_SYNTAX'],['invalid_grant','OAUTH_REAUTHORIZE'],['Apps Script API is disabled','API_DISABLED'],['PERMISSION_DENIED 403','PROJECT_PERMISSION'],['UNAUTHENTICATED 401','OAUTH_UNAUTHENTICATED'],['quota exceeded 429','GOOGLE_QUOTA'],['ECONNRESET','UPSTREAM_UNAVAILABLE'],['anything','TOOL_FAILURE']];
 for(const [message,code]of cases){
  const failure=publicationFailure('push',{stderr:message+' private-token person@example.invalid https://secret.invalid'},['Artists.gs']);
  assert.equal(failure.code,code);for(const secret of ['private-token','person@','https://secret'])assert.equal(failure.message.includes(secret),false);
  if(code==='SOURCE_SYNTAX')assert.match(failure.message,/Artists.gs:42/);
 }
 const unknown=publicationFailure('push',{message:'SyntaxError file: private-secret line: 17'},['Artists.gs']);assert.equal(unknown.message.includes('private-secret'),false);
});
test('Workflowannotatie bevat uitsluitend bekende code, command en bestaand bronbestand/regel',()=>{
 const failure=publicationFailure('push',{stderr:'SyntaxError file: Artists line: 42 secret-token user@example.invalid'},['Artists.gs']);
 assert.equal(publicationAnnotation(failure,['Artists.gs']),'APPS_SCRIPT_SOURCE_SYNTAX push Artists.gs:42');
 assert.equal(publicationAnnotation(Error('APPS_SCRIPT_SOURCE_SYNTAX: clasp push mislukt. private.gs:23. secret-token'),['Artists.gs']),'APPS_SCRIPT_SOURCE_SYNTAX push');
 assert.equal(publicationAnnotation(Error('private-token\n::error::injected')),'APPS_SCRIPT_PUBLICATION_FAILED');
 assert.equal(publicationAnnotation(Error('APPS_SCRIPT_SOURCE_MISMATCH: private-token')),'APPS_SCRIPT_SOURCE_MISMATCH');
});
