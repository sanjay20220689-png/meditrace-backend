const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes (we'll add these as we build each module)
app.use('/api/users', require('./src/routes/user.routes'));
app.use('/api/medications', require('./src/routes/medication.routes'));
app.use('/api/suppliers', require('./src/routes/supplier.routes'));
app.use('/api/batches', require('./src/routes/batch.routes'));
app.use('/api/sales', require('./src/routes/sale.routes'));
app.use('/api/audit', require('./src/routes/audit.routes'));
app.use('/api/traceability', require('./src/routes/traceability.routes'));
app.use('/api/inventory', require('./src/routes/inventory.routes'));

app.get('/', (req, res) => res.json({ message: 'Medi-Trace API running' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));