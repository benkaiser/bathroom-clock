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
const PIXELS_PER_HOUR = 40; // height scaling for timeline blocks
const MIN_BLOCK_HEIGHT = 38; // minimum block height so text is visible
const OVERLAP_INDENT = 12; // px indent for each overlap layer
const OVERLAP_MIN_TOP = 36; // minimum px offset for overlapping events so text doesn't merge
const GAP_BETWEEN = 6; // px gap between non-overlapping events

// Muted colors for event blocks
const BLOCK_COLORS = [
  'rgba(100, 160, 220, 0.25)',
  'rgba(160, 120, 200, 0.25)',
  'rgba(120, 190, 160, 0.25)',
  'rgba(200, 160, 100, 0.25)',
  'rgba(180, 120, 140, 0.25)',
  'rgba(100, 180, 200, 0.25)',
];

function isAllDay(event: IEvent): boolean {
  if (event.duration === ALL_DAY_SECONDS) return true;
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return hours >= 23;
}

function formatShortTime(date: dayjs.Dayjs): string {
  const m = date.minute();
  if (m === 0) return date.format('ha');
  return date.format('h:mma');
}

interface LayoutBlock {
  event: IEvent;
  top: number;
  height: number;
  depth: number;
  colorIndex: number;
}

function layoutEvents(events: IEvent[]): { blocks: LayoutBlock[], totalHeight: number } {
  if (events.length === 0) return { blocks: [], totalHeight: 0 };

  const sorted = [...events].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const blocks: LayoutBlock[] = [];
  // Track placed blocks with their absolute start/end ms and pixel positions
  const placed: { startMs: number; endMs: number; top: number; height: number }[] = [];

  sorted.forEach((event, i) => {
    const startMs = new Date(event.startDate).getTime();
    const endMs = new Date(event.endDate).getTime();
    const durationHrs = Math.max((endMs - startMs) / (1000 * 60 * 60), 0.5);
    const height = Math.max(durationHrs * PIXELS_PER_HOUR, MIN_BLOCK_HEIGHT);

    // Find overlapping placed blocks (those whose time range intersects this event)
    const overlapping = placed.filter(p => p.startMs < endMs && p.endMs > startMs);

    let top: number;
    let depth: number;

    if (overlapping.length === 0) {
      // No overlap — place after the last block with a small gap
      if (placed.length === 0) {
        top = 0;
      } else {
        const lastBottom = Math.max(...placed.map(p => p.top + p.height));
        top = lastBottom + GAP_BETWEEN;
      }
      depth = 0;
    } else {
      // Overlapping — place at minimum OVERLAP_MIN_TOP below the latest overlapping block's top
      const latestOverlapTop = Math.max(...overlapping.map(p => p.top));
      top = latestOverlapTop + OVERLAP_MIN_TOP;
      depth = overlapping.length;
    }

    blocks.push({ event, top, height, depth, colorIndex: i % BLOCK_COLORS.length });
    placed.push({ startMs, endMs, top, height });
  });

  const totalHeight = Math.max(...blocks.map(b => b.top + b.height));
  return { blocks, totalHeight };
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

  renderTimeline(events: IEvent[]) {
    const { blocks, totalHeight } = layoutEvents(events);
    if (blocks.length === 0) return null;

    return (
      <div className="timeline" style={{ height: totalHeight, position: 'relative' }}>
        {blocks.map((b, i) => {
          const left = b.depth * OVERLAP_INDENT;
          const startTime = dayjs(b.event.startDate);
          const endTime = dayjs(b.event.endDate);
          const timeStr = `${formatShortTime(startTime)}\u2013${formatShortTime(endTime)}`;

          return (
            <div
              key={b.event.id || b.event.summary + i}
              className="timelineBlock"
              style={{
                position: 'absolute',
                top: b.top,
                left,
                right: 0,
                height: b.height,
                backgroundColor: BLOCK_COLORS[b.colorIndex],
                borderLeft: `3px solid ${BLOCK_COLORS[b.colorIndex].replace('0.25', '0.7')}`,
              }}
            >
              <span className="timelineTime">{timeStr}</span>
              <span className="timelineSummary">{b.event.summary}</span>
            </div>
          );
        })}
      </div>
    );
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
          {this.renderTimeline(timed)}
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
