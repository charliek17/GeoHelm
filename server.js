const config = require('./config.json');
if (config.apm_secretToken && config.apm_serverUrl) {
  const apm = require('elastic-apm-node').start({
    serviceName: 'GeoHelm',
    secretToken: config.apm_secretToken,
    serverUrl: config.apm_serverUrl,
    verifyServerCert: config.apm_verifyServerCert
  });
}
const express = require('express');
const { Client } = require('@elastic/elasticsearch');
const bodyParser = require('body-parser');
const path = require('path');


const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
console.log(config);
app.get('/api/f-names', (req, res) => {
  res.json(config);
});

app.post('/api/location', async (req, res) => {
  const client = new Client({
    node: config.elasticsearch_config.elasticsearch_url,
    caFingerprint: config.elasticsearch_config.caFingerprint,
    tls: {
      rejectUnauthorized: false
    },
    auth: {
      username: req.body.username,
      password: req.body.password
    }
  });
  try {
    delete req.body.password;
    const transformMap = new Map([
      ['note', config.comment],
      ['type', config.type],
      ['number', config.number],
      ['fruit', config.location_type]
    ]);
    
    const transformKeys = (reqBody) =>
      Object.fromEntries(
        Object.entries(req.body)
        .map(([k, v]) => [transformMap.get(k) || k, v])
      );
      console.log('Transforming keys:', transformKeys(req.body));

    
    const response = await client.index({
      index: 'locations',
      document: transformKeys(req.body),
    });
    res.status(200).json({ result: response.result });
    console.error('Indexing', req.body.username);
  } catch (error) {
    console.error('Indexing error:', error.meta?.body || error.message);
    res.status(500).json({ error: 'Elasticsearch indexing failed' });
  }
});

app.listen(3000, () => console.log('Server running at http://localhost:3000'));
