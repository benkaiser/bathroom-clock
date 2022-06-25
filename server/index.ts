import express from 'express';
import { xml2json } from 'xml-js';
import IcalExpander from 'ical-expander';
import dotenv from 'dotenv';
import rpio from 'rpio';
import path from 'path';
import { exec } from 'child_process';
const nocache = require("nocache");

dotenv.config();
console.log(process.env.ICAL_URL_1);
const icalUrls = [];
for (let x = 1; process.env['ICAL_URL_' + x]; x++) {
  icalUrls.push(process.env['ICAL_URL_' + x]);
}

const app = express()
const port = process.env.PORT || 5222;

app.use(nocache());
let needsRestart = true;
app.get('/', (_, res) => {
  needsRestart = false;
  res.sendFile(path.resolve('static/index.html'));
});
app.use(express.static('static'));

app.get('/needsrestart', (_, res) => {
  res.send(needsRestart ? 'yes' : 'no');
});

app.get('/weather', (_, res) => {
  // IDQ10610 represents the Gold Coast area code
  fetch('http://www.bom.gov.au/fwo/IDQ10610.xml')
  .then(response => response.text())
  .then(responseJson => {
    res.send(xml2json(responseJson, { compact: true }));
  })
  .catch(error => {
    console.error(error);
    res.status(500).send('Fetch failed');
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
  })
  .catch(error => {
    console.error(error);
    res.status(500).send('Fetch failed');
  });
});

app.listen(port, () => {
  console.log(`App running on port ${port}`)
});

// listen for motion sensor changes
const MOTION_PIN = process.env.PIN || 8; // maps to GPIO 14 (pin 8) on the Raspberry Pi
const TURN_OFF_DELAY_MORNING = 1000 * 60 * 30; // 30 minutes of no motion turns off screen
const TURN_OFF_DELAY_OTHER = 1000 * 60; // 1 minute of no motion turns off screen
try {
  rpio.open(MOTION_PIN, rpio.INPUT);
  let monitorState: boolean = false;
  function turnOffMonitor() {
    if (monitorState) {
      console.log('Turning monitor off');
      exec(`${__dirname}/monitor_off.sh`, (error, stdout, stderr) => {
        console.log(stdout);
        console.error(stderr);
      });
      monitorState = false;
    }
  }
  function turnOnMonitor() {
    if (!monitorState) {
      console.log('Turning monitor on');
      exec(`${__dirname}/monitor_on.sh`, (error, stdout, stderr) => {
        console.log(stdout);
        console.error(stderr);
      });
      monitorState = true;
    }
  }
  turnOnMonitor();

  function offDelay() {
    const hour = new Date().getHours();
    if (hour > 5  && hour < 12) {
	    return TURN_OFF_DELAY_MORNING;
    } else {
	    return TURN_OFF_DELAY_OTHER;
    }
  }

  let offTimeout = setTimeout(turnOffMonitor, offDelay());
  function onMotion() {
    console.log('Resetting timeout');
    turnOnMonitor();
    clearTimeout(offTimeout);
    offTimeout = setTimeout(turnOffMonitor, offDelay());
  }
  // default polling method pings every 1ms, to reduce load, make this once every second
  // rpio.poll(MOTION_PIN, onMotion, rpio.POLL_HIGH);
  let lastMotion: boolean = false;
  setInterval(() => {
    const motion = rpio.read(MOTION_PIN);
    // uncomment to see raw pin values
    // console.log('Read value: ' + motion);
    if (motion !== lastMotion && motion) {
      onMotion();
    }
    lastMotion = motion;
  }, 1000);
} catch (e) {
  console.error(e);
}
