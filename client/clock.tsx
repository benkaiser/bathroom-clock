import * as React from 'react';
import dayjs from 'dayjs';

export default class Clock extends React.Component {
  render() {
    return <div className='clock'>{ dayjs().format('hh:mm a') }</div>
  }
}