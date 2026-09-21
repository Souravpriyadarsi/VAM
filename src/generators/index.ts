import { audiogram } from './audiogram';
import { barChart } from './barChart';
import { beforeAfter } from './beforeAfter';
import { animatedCaptions } from './captions';
import { channelAvatar, channelBanner } from './channel';
import { chatStory } from './chatStory';
import { checklist } from './checklist';
import { codeWindow } from './codeWindow';
import { comicPop } from './comic';
import { commentHighlight } from './comment';
import { creditsRoll } from './credits';
import { endScreen } from './endScreen';
import { subscriberGoal } from './goal';
import { infoTag } from './infoTag';
import { kineticText } from './kinetic';
import { newsTicker } from './newsTicker';
import { callout, lowerThird, progressBar, socialHandles, subscribeButton } from './overlays';
import { pollResults } from './poll';
import { quiz } from './quiz';
import { ranking } from './ranking';
import { emojiReactions } from './reactions';
import { reviewScore } from './reviewScore';
import { sponsorCallout } from './sponsor';
import { statReveal } from './statReveal';
import { streamScreen } from './stream';
import { thumbnail } from './thumbnail';
import { chapterCard, countdown, introTitle, quoteCard } from './titles';
import { transitionWipe } from './transition';
import { travelRoute } from './travelRoute';
import type { Category, Generator } from './types';
import { versusThumbnail } from './versus';
import { viewfinder } from './viewfinder';
import { webcamFrame } from './webcamFrame';

/** Every generator in the app. To add one, write a module that exports a `Generator` and list it here. */
export const GENERATORS: Generator[] = [
  thumbnail,
  versusThumbnail,
  animatedCaptions,
  kineticText,
  quiz,
  chatStory,
  audiogram,
  lowerThird,
  subscribeButton,
  sponsorCallout,
  commentHighlight,
  introTitle,
  transitionWipe,
  endScreen,
  creditsRoll,
  ranking,
  reviewScore,
  statReveal,
  barChart,
  beforeAfter,
  codeWindow,
  streamScreen,
  webcamFrame,
  channelBanner,
  channelAvatar,
  viewfinder,
  newsTicker,
  countdown,
  pollResults,
  subscriberGoal,
  chapterCard,
  comicPop,
  emojiReactions,
  travelRoute,
  checklist,
  infoTag,
  socialHandles,
  callout,
  progressBar,
  quoteCard,
];

export const CATEGORIES: Category[] = ['Thumbnails', 'Channel', 'Titles', 'Overlays', 'End Screens'];

export const getGenerator = (id: string) => GENERATORS.find((g) => g.id === id);
