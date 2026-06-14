const axios = require('axios');
axios.get('https://ais-pre-7e7ueomjufef2e4zagaeqs-415170015555.europe-west2.run.app/api/reports/report_1781433606873_442').then(res => console.log(res.data)).catch(err => console.log(err.response.data));
