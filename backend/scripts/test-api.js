const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/test-db2',
  method: 'GET'
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log("Status:", res.statusCode);
    console.log("Response:", data.substring(0, 500));
  });
});

req.on('error', error => { console.error(error); });
req.end();
