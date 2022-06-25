import * as React from 'react';

interface IDailyMessageState {
  message: string;
}

const messages = [
  "You are beautiful",
  "No eating junk food today",
  "Those scales don't know the real you",
  "Look alive!",
  "God loves you",
  "Be the best Mum today",
  "You can power through it",
  "Today feels like a Slurpee kind of day",
  "It gets easier",
  "Be intentional",
  "Nellie wuz here",
  "You got this",
  "Neb loves you",
  "Thanks for being awesome",
  "Don't forget to drop the kids off at the pool",
  "You have the biggest heart",
  "You are blessed to be a blessing",
  "Your day is what you make it",
  "Love is patient"
];

function milisUntilMidnight() {
  var midnight = new Date();
  midnight.setHours(24);
  midnight.setMinutes(0);
  midnight.setSeconds(0);
  midnight.setMilliseconds(0);
  return midnight.getTime() - new Date().getTime();
}

export default class DailyMessage extends React.Component<{}, IDailyMessageState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      message: ""
    };
  }

  componentDidMount() {
    this.refreshMessage();
  }

  render() {
    return <div className='message'>{this.state.message}</div>
  }

  private refreshMessage() {
    this.setState({ message: this.getMessage() });
    console.log(milisUntilMidnight());
    setTimeout(() => {
      this.refreshMessage();
    }, milisUntilMidnight() + 2000);
  }

  private getMessage(lastMessage?: string) {
    const messagesWithoutCurrent = messages.slice();
    if (lastMessage) {
      messagesWithoutCurrent.splice(messages.indexOf(lastMessage), 1);
    }
    return messagesWithoutCurrent[Math.floor(Math.random() * messagesWithoutCurrent.length)];
  }
}