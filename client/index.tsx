import * as React from 'react'
import { createRoot } from 'react-dom/client';
import Clock from './clock';
import Events from './events';
import Weather from './weather';

class App extends React.Component {
  render() {
    return <div className="root">
      <div className="top"><Clock /></div>
      <div className="bottom">
        <div className='weather'><Weather /></div>
        <div className='events'><Events /></div>
      </div>
    </div>;
  }
}

const root = createRoot(document.getElementById('app'));
root.render(<App />);