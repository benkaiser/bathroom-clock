import * as React from 'react';

interface HomeData {
  battery: { value: number; label: string; unit: string };
  ev: { value: number; label: string; unit: string };
  pool: { value: number; label: string; unit: string };
}

interface HomeState {
  data: HomeData | null;
  error: boolean;
}

function barColor(percent: number): string {
  if (percent >= 60) return '#4caf50';
  if (percent >= 30) return '#ff9800';
  return '#f44336';
}

export default class Home extends React.Component<{}, HomeState> {
  state: HomeState = { data: null, error: false };

  componentDidMount() {
    this.fetchData();
    setInterval(() => this.fetchData(), 5 * 60 * 1000); // every 5 minutes
  }

  fetchData() {
    fetch('/home')
      .then(res => res.json())
      .then(data => this.setState({ data, error: false }))
      .catch(() => this.setState({ error: true }));
  }

  renderBar(label: string, value: number, icon: string) {
    const color = barColor(value);
    return (
      <div className="home-item">
        <div className="home-label">{icon} {label}</div>
        <div className="home-value-row">
          <div className="bar-container">
            <div className="bar-fill" style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }} />
          </div>
          <span className="home-value">{Math.round(value)}%</span>
        </div>
      </div>
    );
  }

  render() {
    const { data, error } = this.state;

    if (error) return <div className="home">Failed to fetch home data</div>;
    if (!data) return <div className="home">Loading...</div>;

    return (
      <div className="home">
        {this.renderBar('Home Battery', data.battery.value, '🔋')}
        {this.renderBar('EV9 Battery', data.ev.value, '🚗')}
        <div className="home-item">
          <div className="home-label">🏊 Pool Temp</div>
          <div className="home-temp">{data.pool.value}{data.pool.unit}</div>
        </div>
      </div>
    );
  }
}
