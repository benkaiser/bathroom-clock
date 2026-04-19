import * as React from 'react'
import { createRoot } from 'react-dom/client';
import Clock from './clock';
import DailyMessage from './daily_message';
import Events from './events';
import Home from './home';
import Weather from './weather';
import { startThemeUpdater } from './theme';

class App extends React.Component {
  render() {
    return <div className="root">
      <div className="main">
        <div className="left">
          <Clock />
          <DailyMessage />
        </div>
        <div className="right">
          <div className='events'><Events /></div>
          <div className='home-panel'><Home /></div>
        </div>
      </div>
      <div className="bottom">
        <div className='weather'><Weather /></div>
      </div>
    </div>;
  }
}

setInterval(() => {
  fetch('/needsrestart')
  .then(response => response.text())
  .then(text => {
    if (text === 'yes') {
      window.location.reload();
    }
  })
}, 60000);

const root = createRoot(document.getElementById('app'));
root.render(<App />);

// Start the daylight theme system
startThemeUpdater();