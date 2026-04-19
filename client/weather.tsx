import dayjs from 'dayjs';
import * as React from 'react';

interface IForcast {
  day: Date;
  maximum: number;
  minimum: number;
  precipitation_range: number;
  precipitation_probability: string;
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
    return 'Tmrw';
  }
  return dayjs(item.day).format('ddd');
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

// Chart dimensions
const CHART_HEIGHT = 130;
const CHART_PADDING_TOP = 30;
const CHART_PADDING_BOTTOM = 30;
const LABEL_OFFSET = 18;

function precipPercent(prob: string): number {
  if (!prob) return 0;
  const match = prob.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

function buildCurvePath(points: {x: number, y: number}[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpx = (p0.x + p1.x) / 2;
    d += ` C ${cpx} ${p0.y}, ${cpx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

function renderChart(data: IForcast[], width: number) {
  const n = data.length;
  if (n === 0) return null;

  const allTemps = data.flatMap(d => [d.maximum, d.minimum]);
  const minTemp = Math.min(...allTemps) - 2;
  const maxTemp = Math.max(...allTemps) + 2;
  const tempRange = maxTemp - minTemp || 1;

  const usableHeight = CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;
  const colWidth = width / n;

  function tempToY(temp: number): number {
    return CHART_PADDING_TOP + usableHeight - ((temp - minTemp) / tempRange) * usableHeight;
  }

  const maxPoints = data.map((d, i) => ({ x: colWidth * (i + 0.5), y: tempToY(d.maximum) }));
  const minPoints = data.map((d, i) => ({ x: colWidth * (i + 0.5), y: tempToY(d.minimum) }));

  const maxPath = buildCurvePath(maxPoints);
  const minPath = buildCurvePath(minPoints);

  // Build filled area between the two curves
  const minReversed = [...minPoints].reverse();
  const areaPath = maxPath +
    ` L ${minReversed[0].x} ${minReversed[0].y}` +
    buildCurvePath(minReversed).replace('M', ' L') +
    ` L ${maxPoints[0].x} ${maxPoints[0].y} Z`;

  return (
    <svg width={width} height={CHART_HEIGHT} className="weatherChart">
      {/* Filled area between curves */}
      <path d={areaPath} fill="rgba(255,255,255,0.08)" />

      {/* Max temp line */}
      <path d={maxPath} fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />

      {/* Min temp line */}
      <path d={minPath} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeDasharray="4 3" />

      {/* Data points and labels */}
      {maxPoints.map((p, i) => (
        <g key={`max-${i}`}>
          <circle cx={p.x} cy={p.y} r="3" fill="white" />
          <text x={p.x} y={p.y - LABEL_OFFSET} textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" fontFamily="Anybody, sans-serif">
            {data[i].maximum}°
          </text>
        </g>
      ))}
      {minPoints.map((p, i) => (
        <g key={`min-${i}`}>
          <circle cx={p.x} cy={p.y} r="2.5" fill="rgba(255,255,255,0.4)" />
          <text x={p.x} y={p.y + LABEL_OFFSET + 4} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="14" fontFamily="Anybody, sans-serif">
            {data[i].minimum}°
          </text>
        </g>
      ))}
    </svg>
  );
}

export default class Weather extends React.Component<{}, IWeatherState> {
  private containerRef = React.createRef<HTMLDivElement>();

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
      const chartWidth = Math.max(this.state.data.length * 130, 800);
      return <div className='weather' ref={this.containerRef}>
        {renderChart(this.state.data, chartWidth)}
        <div className='weatherDays' style={{ width: chartWidth }}>
          {this.state.data.map(item => {
            const dayName = fancyNameForDay(item);
            const precip = precipPercent(item.precipitation_probability);
            return <div key={+item.day} className='weatherDay'>
              <div className='weatherDayHeader'>
                <span className='weatherDayName'>{dayName}</span>
                <i className={`wi ${bomToWeatherIconMap[item.icon]} weatherDayIcon`}></i>
              </div>
              <div className='weatherDayDesc'>{item.description}</div>
              {precip > 0 && (
                <div className='weatherDayPrecip'>
                  <i className='wi wi-raindrop weatherPrecipIcon'></i> {item.precipitation_probability}
                </div>
              )}
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
      // Backfill missing minimum (today often lacks it) from the next day
      for (let i = 0; i < forcast.length; i++) {
        if (!forcast[i].minimum && forcast[i + 1]) {
          forcast[i].minimum = forcast[i + 1].minimum;
        }
      }
      console.log(forcast);
      this.setState({
        data: forcast,
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
