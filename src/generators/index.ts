import { channelAvatar } from './channel/avatar';
import { channelBanner } from './channel/banner';
import { webcamFrame } from './channel/webcamFrame';
import { creditsRoll } from './endScreens/credits';
import { endScreen } from './endScreens/endScreen';
import { logoSting } from './endScreens/logoSting';
import { achievementToast } from './overlays/achievement';
import { callout } from './overlays/callout';
import { animatedCaptions } from './overlays/captions';
import { checklist } from './overlays/checklist';
import { comicPop } from './overlays/comic';
import { commentHighlight } from './overlays/comment';
import { subscriberGoal } from './overlays/goal';
import { infoTag } from './overlays/infoTag';
import { keystrokes } from './overlays/keystrokes';
import { lowerThird } from './overlays/lowerThird';
import { newsTicker } from './overlays/newsTicker';
import { progressBar } from './overlays/progressBar';
import { emojiReactions } from './overlays/reactions';
import { socialHandles } from './overlays/socialHandles';
import { socialPost } from './overlays/socialPost';
import { spotlight } from './overlays/spotlight';
import { sponsorCallout } from './overlays/sponsor';
import { subscribeButton } from './overlays/subscribe';
import { transitionWipe } from './overlays/transition';
import { travelRoute } from './overlays/travelRoute';
import { viewfinder } from './overlays/viewfinder';
import { watermark } from './overlays/watermark';
import { memeCaption } from './thumbnails/memeCaption';
import { thumbnail } from './thumbnails/thumbnail';
import { versusThumbnail } from './thumbnails/versus';
import { audiogram } from './titles/audiogram';
import { barChart } from './titles/barChart';
import { beforeAfter } from './titles/beforeAfter';
import { chapterCard } from './titles/chapter';
import { chatStory } from './titles/chatStory';
import { definitionCard } from './titles/definition';
import { donutChart } from './titles/donutChart';
import { codeWindow } from './titles/codeWindow';
import { countdown } from './titles/countdown';
import { introTitle } from './titles/intro';
import { headToHead } from './titles/headToHead';
import { kineticText } from './titles/kinetic';
import { lineChart } from './titles/lineChart';
import { pollResults } from './titles/poll';
import { pricingTable } from './titles/pricingTable';
import { quiz } from './titles/quiz';
import { quoteCard } from './titles/quote';
import { ranking } from './titles/ranking';
import { reviewScore } from './titles/reviewScore';
import { statReveal } from './titles/statReveal';
import { streamScreen } from './titles/stream';
import { tierList } from './titles/tierList';
import { timeSkip } from './titles/timeSkip';
import { timeline } from './titles/timeline';
import type { Category, Generator } from './types';

/** Every generator in the app. To add one, write a module in the matching category folder and list it here. */
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
  tierList,
  socialPost,
  timeSkip,
  keystrokes,
  lineChart,
  logoSting,
  timeline,
  headToHead,
  donutChart,
  pricingTable,
  memeCaption,
  definitionCard,
  spotlight,
  achievementToast,
  watermark,
];

export const CATEGORIES: Category[] = ['Thumbnails', 'Channel', 'Titles', 'Overlays', 'End Screens'];

export const getGenerator = (id: string) => GENERATORS.find((g) => g.id === id);
