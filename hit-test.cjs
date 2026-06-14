const axios = require('axios');
axios.post('http://127.0.0.1:3000/api/send-whatsapp-test', {
  role: "contributor"
}).then(res => console.log(JSON.stringify(res.data)))
.catch(async err => {
  console.log("WAIT 1s then read last lines of pm2/docker logs?");
  // Actually, I can just spawn it and capture! Let's just catch and fail.
  // The backend prints stack traces to stderr. Let's see if we can capture server output.
});
