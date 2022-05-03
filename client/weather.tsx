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

export default class Weather extends React.Component<{}, IWeatherState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      data: null
    }
  }

  componentDidMount() {
    this.updateWeather();
  }

  render() {
    return <div className='weather'>Weather</div>
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
          maximum: entry.element.air_temperature_minimum,
          minimum: entry.element.air_temperature_maximum,
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
    });
  }
}