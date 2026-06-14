const https = require('https');

https.get('https://letters-platform.vercel.app/api/auth/me', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => {
    console.log(resp.statusCode);
    console.log(resp.headers);
    console.log(data);
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
