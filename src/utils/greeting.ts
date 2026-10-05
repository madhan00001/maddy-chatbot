export interface TimeGreeting {
  greeting: string;
  emoji: string;
  subtext: string;
  starterMessage: string;
}

export function getTimeGreeting(userName?: string): TimeGreeting {
  const hour = new Date().getHours();
  const namePart = userName ? `, ${userName}` : '';

  if (hour >= 5 && hour < 12) {
    return {
      greeting: `Good morning${namePart}!`,
      emoji: '☀️',
      subtext: 'Wishing you a bright, happy, and productive morning! What shall we work on today?',
      starterMessage: `Good morning${namePart}! ☀️ I'm Maddy AI, your friendly companion! How can I help brighten your day or assist you today? 😊`,
    };
  } else if (hour >= 12 && hour < 17) {
    return {
      greeting: `Good afternoon${namePart}!`,
      emoji: '🌤️',
      subtext: 'Hope your afternoon is going smoothly! How can I make things easier for you right now?',
      starterMessage: `Good afternoon${namePart}! 🌤️ I'm Maddy AI, your friendly assistant! What would you like to dive into or explore together? 😊`,
    };
  } else if (hour >= 17 && hour < 21) {
    return {
      greeting: `Good evening${namePart}!`,
      emoji: '🌇',
      subtext: 'Hope you had a wonderful day! Ready to brainstorm, review documents, or chat?',
      starterMessage: `Good evening${namePart}! 🌇 I'm Maddy AI! How has your day been? Feel free to ask anything or share your thoughts! ✨`,
    };
  } else {
    return {
      greeting: `Good night${namePart}!`,
      emoji: '🌙✨',
      subtext: 'Burning the midnight oil or winding down? I am right here whenever you need me!',
      starterMessage: `Good night${namePart}! 🌙✨ I'm Maddy AI! Working late or relaxing? How can I assist you tonight? 😊`,
    };
  }
}
