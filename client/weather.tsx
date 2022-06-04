import dayjs from 'dayjs';
import * as React from 'react';

interface IForcast {
  day: Date;
  maximum: number;
  minimum: number;
  precipitation_range: number;
  precipitation_probability: number;
  description: string;
  icon: string;
}

interface IWeatherState {
  data: IForcast[];
  error?: Error;
}

function fancyNameForDay(item: IForcast): string {
  if (item.day.getDate() == new Date().getDate()) {
    return 'Today';
  }
  if (item.day.getDate() == new Date().getDate() + 1) {
    return 'Tomorrow';
  }
  return dayjs(item.day).format('dddd');
}

function transposeForcastEntry(item: any): any {
  transposeElementUsingType(item, 'element');
  transposeElementUsingType(item, 'text');
  return item;
}

function transposeElementUsingType(item: any, key: string): any {
  const transposedObj = {};
  item[key].forEach(innerItem => {
    transposedObj[innerItem._attributes.type] = innerItem._text;
  });
  item[key] = transposedObj;
}
const WEATHER_INTERVAL = 1000 * 60 * 60; // hourly

const bomToWeatherIconMap = {
  1: 'wi-day-sunny',
  2:	'wi-night-clear',
  3: 'wi-day-sunny-overcast',
  4: 'wi-cloudy',
  6: 'wi-day-haze',
  8: 'wi-day-rain',
  9: 'wi-day-cloudy-windy',
  10:	'wi-day-fog',
  11: 'wi-day-showers',
  12:	'wi-rain',
  13:	'wi-dust',
  14:	'wi-snowflake-cold',
  15: 'wi-day-snow',
  16: 'wi-day-thunderstorm',
  17: 'wi-raindrops',
  18: 'wi-raindrop',
  19: 'wi-hurricane'
};

export default class Weather extends React.Component<{}, IWeatherState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      data: null
    }
  }

  componentDidMount() {
    this.updateWeather();
    setInterval(() => {
      this.updateWeather();
    }, WEATHER_INTERVAL);
  }

  render() {
    if (this.state.error) {
      return <div className='weather'>Failed to fetch weather</div>
    }
    if (this.state.data) {
      return <div className='weather'>
        <div className='tiles'>
          {this.state.data.map(item => {
            const dayName = fancyNameForDay(item);
            return <div key={+item.day} className='tile'>
              <div className='date'>{dayName}</div>
              <i className={`wi ${bomToWeatherIconMap[item.icon]} weatherIcon`}></i>
              <div className='temps'><span className='minimum'>{item.minimum}</span> <span className='maximum'>{item.maximum}</span></div>
              <div className='description'>{item.description}</div>
            </div>;
          })}
        </div>
      </div>;
    }
    return <div className='weather'>Weather Loading...</div>
  }

  updateWeather() {
    fetch('/weather')
    .then(response => response.json())
    .then(responseJson => {
      const localForcast = responseJson.product.forecast.area.filter(i => i._attributes.aac == "QLD_PT003")[0]['forecast-period'];
      const localForcastWithTemps = localForcast.filter(i => i.element.length);
      const forcast: IForcast[] = localForcastWithTemps.map(item => {
        const entry = transposeForcastEntry(item);
        return {
          day: new Date(item._attributes['start-time-local']),
          maximum: entry.element.air_temperature_maximum,
          minimum: entry.element.air_temperature_minimum,
          precipitation_range: entry.element.precipitation_range,
          precipitation_probability: entry.text.probability_of_precipitation,
          description: entry.text.precis,
          icon: entry.element.forecast_icon_code
        };
      });
      console.log(forcast);
      this.setState({
        data: forcast
      });
    })
    .catch((e) => {
      this.setState({
        error: e
      })
    });
  }
}