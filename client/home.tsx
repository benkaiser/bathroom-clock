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
  if (percent >= 60) return 'rgba(76, 175, 80, 0.6)';
  if (percent >= 30) return 'rgba(255, 152, 0, 0.6)';
  return 'rgba(244, 67, 54, 0.6)';
}

const HomeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign: 'middle', marginRight: '4px'}}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);

const CarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign: 'middle', marginRight: '4px'}}>
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path>
    <circle cx="7" cy="17" r="2"></circle>
    <path d="M9 17h6"></path>
    <circle cx="17" cy="17" r="2"></circle>
  </svg>
);

export default class Home extends React.Component<{}, HomeState> {
  state: HomeState = { data: null, error: false };

  componentDidMount() {
    this.fetchData();
    setInterval(() => this.fetchData(), 5 * 60 * 1000);
  }

  fetchData() {
    fetch('/home')
      .then(res => res.json())
      .then(data => this.setState({ data, error: false }))
      .catch(() => this.setState({ error: true }));
  }

  renderBar(label: string, value: number, icon: React.ReactNode) {
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
        {this.renderBar('Home Batt', data.battery.value, <HomeIcon />)}
        {this.renderBar('EV9 Batt', data.ev.value, <CarIcon />)}
        <div className="home-item">
          <div className="home-label">🏊 Pool</div>
          <div className="home-temp">{data.pool.value}{data.pool.unit}</div>
        </div>
      </div>
    );
  }
}
