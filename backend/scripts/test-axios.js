const axios = require('axios');
async function test() {
  try {
    const loginResp = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@bluehorizon.com',
      password: 'admin123'
    });
    const token = loginResp.data.token;
    console.log("Got token");

    const getAll = await axios.get('http://localhost:3001/api/signals', {
      params: { page: 1, limit: 20 },
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("getAll returned:", getAll.data.data.length, "items");

    const getNeedsVote = await axios.get('http://localhost:3001/api/signals/needs-vote', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("getNeedsVote returned:", getNeedsVote.data.length, "items");
  } catch (error) {
    if (error.response) {
      console.error("Error response:", error.response.status, error.response.data);
    } else {
      console.error("Error:", error.message);
    }
  }
}
test();
