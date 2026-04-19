import dayjs from 'dayjs';
import * as React from 'react';

interface IEvent {
  startDate: string;
  endDate: string;
  id: string;
  summary: string;
  duration?: number;
}

interface IEventsState {
  data?: IEvent[];
  responseKey?: number;
  error?: Error;
}

const EVENTS_INTERVAL = 1000 * 60 * 60; // hourly
const ERROR_RETRY_INTERVAL = 1000 * 60; // 1 minute
const SCROLL_SPEED = 0.5; // pixels per frame
const SCROLL_PAUSE_MS = 3000; // pause at top and bottom
const ALL_DAY_SECONDS = 86400;

function isAllDay(event: IEvent): boolean {
  if (event.duration === ALL_DAY_SECONDS) return true;
  // Also detect events with no duration but spanning 24h+
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return hours >= 23;
}

function formatTimeRange(event: IEvent): string {
  const start = dayjs(event.startDate);
  const end = dayjs(event.endDate);
  const durationMins = end.diff(start, 'minute');

  if (durationMins <= 60) {
    return start.format('h:mma');
  }
  // For multi-hour events, show range
  return `${start.format('h:mma')}-${end.format('h:mma')}`;
}

export default class Events extends React.Component<{}, IEventsState> {
  private containerRef = React.createRef<HTMLDivElement>();
  private animationId: number | null = null;
  private scrollDirection: 'down' | 'up' = 'down';
  private pauseTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(props: {}) {
    super(props);
    this.state = {
      data: undefined,
      responseKey: undefined
    }
  }

  componentDidMount() {
    this.updateEvents();
    setInterval(() => {
      this.updateEvents();
    }, EVENTS_INTERVAL);
    this.startAutoScroll();
  }

  componentWillUnmount() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.pauseTimeout) clearTimeout(this.pauseTimeout);
  }

  componentDidUpdate() {
    this.checkAndStartScroll();
  }

  startAutoScroll() {
    this.checkAndStartScroll();
  }

  checkAndStartScroll() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.pauseTimeout) clearTimeout(this.pauseTimeout);

    const container = this.containerRef.current;
    if (!container) return;

    const needsScroll = container.scrollHeight > container.clientHeight;
    if (!needsScroll) return;

    this.scrollDirection = 'down';
    container.scrollTop = 0;
    this.pauseTimeout = setTimeout(() => this.scrollStep(), SCROLL_PAUSE_MS);
  }

  scrollStep = () => {
    const container = this.containerRef.current;
    if (!container) return;

    const maxScroll = container.scrollHeight - container.clientHeight;
    if (maxScroll <= 0) return;

    if (this.scrollDirection === 'down') {
      container.scrollTop += SCROLL_SPEED;
      if (container.scrollTop >= maxScroll) {
        container.scrollTop = maxScroll;
        this.scrollDirection = 'up';
        this.pauseTimeout = setTimeout(() => {
          this.animationId = requestAnimationFrame(this.scrollStep);
        }, SCROLL_PAUSE_MS);
        return;
      }
    } else {
      container.scrollTop -= SCROLL_SPEED;
      if (container.scrollTop <= 0) {
        container.scrollTop = 0;
        this.scrollDirection = 'down';
        this.pauseTimeout = setTimeout(() => {
          this.animationId = requestAnimationFrame(this.scrollStep);
        }, SCROLL_PAUSE_MS);
        return;
      }
    }

    this.animationId = requestAnimationFrame(this.scrollStep);
  }

  render() {
    if (this.state.error) {
      return <div>Failed to fetch events, trying again shortly</div>
    }
    if (this.state.data) {
      const allDay = this.state.data.filter(isAllDay);
      const timed = this.state.data.filter(e => !isAllDay(e));

      return <div className='eventsContainer' ref={this.containerRef}>
        <div className='eventTiles' key={this.state.responseKey}>
          {allDay.length > 0 && (
            <div className='allDaySection'>
              {allDay.map(item => (
                <span key={item.id || item.summary} className='allDayChip'>{item.summary}</span>
              ))}
            </div>
          )}
          {timed.map(item => (
            <div key={item.id || item.summary} className='eventTile'>
              <span className='eventTime'>{formatTimeRange(item)}</span>
              <span className='eventSummary'>{item.summary}</span>
            </div>
          ))}
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
        responseKey: +new Date(),
        error: undefined
      });
    })
    .catch((e) => {
      this.setState({
        error: e
      });
      setTimeout(() => {
        this.updateEvents();
      }, ERROR_RETRY_INTERVAL);
    });
  }
}
