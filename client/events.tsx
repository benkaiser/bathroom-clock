import dayjs from 'dayjs';
import * as React from 'react';

interface IWeather {
  startDate: string;
  endDate: string;
  id: string;
  summary: string;
}

interface IWeatherState {
  data: IWeather[];
  error?: Error;
}

const EVENTS_INTERVAL = 1000 * 60 * 60; // hourly

export default class Events extends React.Component<{}, IWeatherState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      data: null
    }
  }

  componentDidMount() {
    this.updateEvents();
    setInterval(() => {
      this.updateEvents();
    }, EVENTS_INTERVAL);
  }

  render() {
    if (this.state.error) {
      return <div>Failed to fetch events</div>
    }
    if (this.state.data) {
      return <div>
        <div className='eventTiles'>
          {this.state.data.map(item => {
            const start = new Date(item.startDate);
            const end = new Date(item.endDate);
            return <div key={+item.id} className='eventTile'>
              <span className='eventTime'>{dayjs(start).format('HH:mm')}</span><span className='description'>{item.summary}</span>
            </div>;
          })}
        </div>
      </div>;
    }
    return <div>Events Loading...</div>
  }

  updateEvents() {
    fetch('/events')
    .then(response => response.json())
    .then(responseJson => {
      this.setState({
        data: responseJson,
        error: undefined
      });
    })
    .catch((e) => {
      this.setState({
        error: e
      })
    });
  }
}