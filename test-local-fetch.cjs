const axios = require("axios");
axios.get("http://127.0.0.1:3000/api/reports/report_1781433606873_442").then(res => console.log(res.data)).catch(err => console.log(err.message));
