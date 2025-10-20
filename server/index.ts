import express from 'express';
import { xml2json } from 'xml-js';
import IcalExpander from 'ical-expander';
import dotenv from 'dotenv';
import path from 'path';
import { exec } from 'child_process';
const nocache = require("nocache");
import { Agent } from 'undici';

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
  fetch('http://www.bom.gov.au/fwo/IDQ10610.xml', { dispatcher: new Agent({ connectTimeout: 600000 })})
  .then(response => response.text())
  .then(responseJson => {
    res.send(xml2json(responseJson, { compact: true }));
  })
  .catch(error => {
    console.error(error);
    res.status(500).send('Fetch failed');
  });
});

const EDGE_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';

app.get('/events', async (_, res) => {
  const oneHourAgo = new Date(Date.now() - (1000 * 60 * 60));
  const tomorrow = new Date(Date.now() + (1000 * 60 * 60 * 24));
  try {
    type FetchResultOk = { ok: true; text: string; idx: number; url: string };
    type FetchResultErr = { ok: false; error: any; idx: number; url: string };
    type FetchResult = FetchResultOk | FetchResultErr;

    const fetchPromises: Promise<FetchResult>[] = icalUrls.map((url, idx) =>
      fetch(url, {
        dispatcher: new Agent({ connectTimeout: 600000 }),
        headers: { 'User-Agent': EDGE_USER_AGENT }
      } as any)
        .then(response => response.text())
        .then(text => ({ ok: true as const, text, idx, url }))
        .catch(error => ({ ok: false as const, error, idx, url }))
    );

    const results: FetchResult[] = await Promise.all(fetchPromises);

    let finalEvents: any[] = [];

    results.forEach(result => {
      if (!result.ok) {
        // Record a simple failure event for this ICAL_URL_X so the UI can show a "Failed ICAL_URL_X" line
        console.error(`Failed to fetch ${result.url}:`, result.error);
        finalEvents.push({
          id: `failed-${result.idx}`,
          startDate: oneHourAgo,
          endDate: oneHourAgo,
          duration: 0,
          location: undefined,
          summary: `Failed ICAL_URL_${result.idx + 1}`
        });
        return;
      }

      // Try parsing the calendar - if parsing fails for this calendar, record a failure and continue
      try {
        const icalExpander = new IcalExpander({ ics: result.text, maxIterations: 100 });
        const events = icalExpander.between(oneHourAgo, tomorrow);
        const mappedEvents = events.events.map((e: any) => ({
          id: e.uid,
          startDate: e.startDate.toJSDate(),
          endDate: e.endDate.toJSDate(),
          duration: e.duration?.toSeconds(),
          location: e.location,
          summary: e.summary
        }));
        const mappedOccurrences = events.occurrences.map((o: any) => ({
          id: o.uid,
          startDate: o.startDate.toJSDate(),
          endDate: o.endDate.toJSDate(),
          duration: o.duration?.toSeconds(),
          location: o.item.location,
          summary: o.item.summary
        }));
        const defaultFilter = (e: any) => e.location !== '[routine]' && !e.summary.includes('OOF');
        const allEvents = [].concat(mappedEvents, mappedOccurrences).filter(defaultFilter);
        finalEvents = finalEvents.concat(allEvents);
      } catch (e) {
        console.error(`Failed to parse iCal for ${result.url}:`, e);
        finalEvents.push({
          id: `failed-${result.idx}`,
          startDate: oneHourAgo,
          endDate: oneHourAgo,
          duration: 0,
          location: undefined,
          summary: `Failed ICAL_URL_${result.idx + 1}`
        });
      }
    });

    // Sort events by startDate and return
    res.send(finalEvents.sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate)));
  } catch (error) {
    console.error(error);
    res.status(500).send('Fetch failed');
  }
});

app.listen(port, () => {
  console.log(`App running on port ${port}`)
});

// listen for motion sensor changes
const MOTION_PIN = process.env.PIN || 8; // maps to GPIO 14 (pin 8) on the Raspberry Pi
const TURN_OFF_DELAY_MORNING = 1000 * 60 * 30; // 30 minutes of no motion turns off screen
const TURN_OFF_DELAY_OTHER = 1000 * 60; // 1 minute of no motion turns off screen

let useRaspberryPi = true;
let rpio: any = null;
let orangePiGpio: any = null;

// Try to load Raspberry Pi GPIO first
try {
  rpio = require('rpio');
  rpio.open(MOTION_PIN, rpio.INPUT);
  console.log('Using Raspberry Pi GPIO');
} catch (e) {
  console.log('Raspberry Pi GPIO failed, trying Orange Pi GPIO');
  useRaspberryPi = false;
  try {
    const OrangePiGpio = require("orange-pi-gpio");
    orangePiGpio = new OrangePiGpio({pin: MOTION_PIN, mode: 'in'});
    console.log('Using Orange Pi GPIO');
  } catch (err) {
    console.error('Both GPIO libraries failed:', err);
    throw err;
  }
}

try {
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

  let lastMotion: boolean = false;

  if (useRaspberryPi) {
    // Raspberry Pi GPIO (synchronous)
    setInterval(() => {
      const motion = rpio.read(MOTION_PIN);
      // uncomment to see raw pin values
      // console.log('Read value: ' + motion);
      if (motion !== lastMotion && motion) {
        onMotion();
      }
      lastMotion = motion;
    }, 1000);
  } else {
    // Orange Pi GPIO (asynchronous)
    setInterval(async () => {
      try {
        const motion = await orangePiGpio.read();
        // uncomment to see raw pin values
        // console.log('Read value: ' + motion);
        if (motion !== lastMotion && motion) {
          onMotion();
        }
        lastMotion = motion;
      } catch (error) {
        console.error('Error reading Orange Pi GPIO pin:', error);
      }
    }, 1000);
  }
} catch (e) {
  console.error(e);
}
