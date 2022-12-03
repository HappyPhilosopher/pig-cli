const axios = require('axios');

const BASE_URL = process.env.PIG_CLI_BASE_URL || 'http://api.painfulpig.cn:7001';

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 5000
});

request.interceptors.response.use(
  response => (response.status === 200 ? Promise.resolve(response.data) : Promise.reject(response)),
  error => Promise.reject(error.message || error)
);

module.exports = request;
