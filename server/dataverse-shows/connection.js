import {createDataverseSetupConnection} from '../dataverse-setup-client.js';
// Share only the service token, verified environment and schema session. Never
// business data or account rights. Replacing credentials creates a new session.
const sessions=new WeakMap();
export function nativeConnection(env=process.env){
 const signature=[env.DATAVERSE_TEST_URL,env.DATAVERSE_TEST_TENANT_ID,env.DATAVERSE_TEST_CLIENT_ID,env.DATAVERSE_TEST_CLIENT_SECRET];
 const previous=sessions.get(env);if(previous&&previous.signature.every((part,index)=>part===signature[index]))return previous.connection;
 const connection=createDataverseSetupConnection({env});sessions.set(env,{signature,connection});return connection;
}
