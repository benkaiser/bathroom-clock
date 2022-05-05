import express from 'express';
import { xml2json } from 'xml-js';
import IcalExpander from 'ical-expander';
import dotenv from 'dotenv';
dotenv.config();
console.log(process.env.ICAL_URL_1);
const icalUrls = [];
for (let x = 1; process.env['ICAL_URL_' + x]; x++) {
  icalUrls.push(process.env['ICAL_URL_' + x]);
}

const app = express()
const port = process.env.PORT || 5222;

app.use(express.static('static'));

app.get('/', (_, res) => {
  res.sendFile('./static/index.html');
});

app.get('/weather', (_, res) => {
  // IDQ10610 represents the Gold Coast area code
  fetch('http://www.bom.gov.au/fwo/IDQ10610.xml')
  .then(response => response.text())
  .then(responseJson => {
    res.send(xml2json(responseJson, { compact: true }));
  });
});

app.get('/events', (_, res) => {
  Promise.all(
    icalUrls.map(url => fetch(url).then(response => response.text()))
  ).then(responses => {
    let finalEvents = [];
    responses.forEach(response => {
      const icalExpander = new IcalExpander({ ics: response, maxIterations: 100 });
      const oneHourAgo = new Date(new Date().getTime() - (1000*60*60));
      const tomorrow = new Date(new Date().getTime() + (1000*60*60*24));
      const events = icalExpander.between(oneHourAgo, tomorrow);
      const mappedEvents = events.events.map(e => ({
        id: e.uid,
        startDate: e.startDate.toJSDate(),
        endDate: e.endDate.toJSDate(),
        duration: e.duration?.toSeconds(),
        summary: e.summary
      }));
      const mappedOccurrences = events.occurrences.map(o => ({
        id: o.uid,
        startDate: o.startDate.toJSDate(),
        endDate: o.endDate.toJSDate(),
        duration: o.duration?.toSeconds(),
        summary: o.item.summary
      }));
      const allEvents = [].concat(mappedEvents, mappedOccurrences);
      finalEvents = finalEvents.concat(allEvents);
    });
    res.send(finalEvents.sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate)));
  });
});

app.listen(port, () => {
  console.log(`App running on port ${port}`)
});