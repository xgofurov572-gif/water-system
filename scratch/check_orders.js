const { query } = require('../backend/src/db');
query('SELECT id, status, "courierId" FROM orders WHERE status IN (\'new\',\'assigned\',\'delivering\')').then(res => { console.log(res.rows); process.exit(0); }).catch(console.error);
