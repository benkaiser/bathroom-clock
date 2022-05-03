import express from 'express';
import { xml2json } from 'xml-js';

const app = express()
const port = process.env.PORT || 5222;

app.use(express.static('static'));

app.get('/', (req, res) => {
  res.sendFile('./static/index.html');
});

app.get('/weather', (req, res) => {
  fetch('http://www.bom.gov.au/fwo/IDQ10610.xml')
  .then(response => response.text())
  .then(responseJson => {
    res.send(xml2json(responseJson, { compact: true, spaces: 4 }));
  });
});

app.listen(port, () => {
  console.log(`App running on port ${port}`)
});