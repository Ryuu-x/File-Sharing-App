// testAuth.js
import dotenv from 'dotenv';
dotenv.config();

import B2 from 'backblaze-b2';

console.log('ENV VARS PRESENT:',
  { ACCOUNT: !!process.env.B2_ACCOUNT_ID,
    APP_KEY: !!process.env.B2_APPLICATION_KEY,
    BUCKET: !!process.env.B2_BUCKET_ID });

const b2 = new B2({
  accountId: process.env.B2_ACCOUNT_ID,
  applicationKey: process.env.B2_APPLICATION_KEY
});

(async () => {
  try {
    const auth = await b2.authorize();
    console.log('authorize() succeeded. keys:', Object.keys(auth.data || {}));
    console.log('apiUrl:', auth.data.apiUrl);
    console.log('downloadUrl:', auth.data.downloadUrl);
  } catch (err) {
    console.error('authorize() failed — full error:');
    console.error('message:', err.message);
    if (err.response) {
      console.error('status:', err.response.status);
      console.error('response.data:', err.response.data);
    } else {
      console.error(err);
    }
  }
})();
