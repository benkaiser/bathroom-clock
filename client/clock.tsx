import * as React from 'react';
import dayjs from 'dayjs';

const CLOCK_INTERVAL: number = 5;

export default class Clock extends React.Component {
  componentDidMount() {
    setInterval(() => {
      this.forceUpdate();
    }, CLOCK_INTERVAL);
  }

  render() {
    return <div className='clock'>{ dayjs().format('hh:mm a') }</div>
  }
}