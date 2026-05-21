const jwt = require('jsonwebtoken');
const token = jwt.sign({ user: { id: 1, email: 'admin@bluehorizon.com', role: 'ADMIN' } }, process.env.AUTH_SECRET || 'blue-horizon-dev-secret', { expiresIn: '7d' });
console.log(token);
