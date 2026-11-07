import type { ChatUser } from '../screens/chats/parts';
import type { FeedItem } from '../screens/moment/parts';
import type { StoreItem } from '../screens/store/parts';

/** Which of the Profile's three people lists a `ProfileList` screen shows. */
export type ProfileListKind = 'visitors' | 'followers' | 'following';

export type RootStackParamList = {
  Welcome: undefined;
  ProfileSetup: undefined;
  EmailAuth: undefined;
  PhoneAuth: undefined;
  /** The tab shell: Home / Party / Chats / Mine under one fixed bottom bar. */
  Tabs: undefined;
  /** Pushed over the shell, so these cover the bar — as their frames draw. */
  Search: undefined;
  PostMoment: undefined;
  /**
   * Carries the row it was opened from, so it paints before any fetch.
   * `following` comes from which tab opened it: `SocialPresenter::user()` does
   * not report follow state, so without it the chip would offer to follow
   * somebody you already follow.
   */
  PostDetails: { post: FeedItem; following?: boolean };
  /** Full-screen media, opened by tapping a thumbnail. `index` is which one. */
  MediaViewer: { urls: string[]; index?: number };
  /** Moment notifications screen */
  MomentNotifications: undefined;
  /** A voice room (section 66:544). Opening it joins; only its exit dialog leaves. */
  Room: { uuid: string };
  /** Create Room (Figma 397:2803); Start replaces it with the new room. */
  CreateRoom: undefined;
  /** Weekly Star (section 587:5950). Without a uuid it opens the live weekly_star event. */
  WeeklyStar: { uuid?: string } | undefined;
  /** Rich / Charm rankings (section 590:6566); `wealth` is the Rich board. */
  Ranking: { board?: 'wealth' | 'charm' } | undefined;
  /** Profile → Visitors / Followers / Following (Figma 2015:9671, 2015:9818). */
  ProfileList: { kind: ProfileListKind };
  /** Profile → Level: Wealth Level (2015:9314) / Charm Level (2015:9378), switchable on screen. */
  Level: { kind?: 'wealth' | 'charm' } | undefined;
  /** Profile → Store (section 272:9563): the grid, then Purchase or Send. */
  Store: undefined;
  /** Profile → Settings (Figma 606:3700) and the screens its rows open. */
  Settings: undefined;
  Account: undefined;
  LanguageSettings: undefined;
  BlockList: undefined;
  NotificationSettings: undefined;
  Feedback: undefined;
  /** About Us / Privacy Policy / Terms of use: a published CMS page. */
  LegalPage: { type: 'about' | 'privacy' | 'terms'; title: string };
  /** Profile → Item Bag (2015:9442): what you own, and what you are wearing. */
  ItemBag: undefined;
  /** Wallet (Figma 188:966): Coin / Diamonds balance, payment methods, resellers. */
  Wallet: { tab?: 'coin' | 'diamonds' } | undefined;
  /** Wallet → clock icon: Coins history (Figma 211:7265). */
  CoinsHistory: undefined;
  /** Wallet → Diamonds → Exchange: Points into Coins (Figma 205:5143 / 209:7154). */
  Exchange: undefined;
  /** Profile to Medals (Figma 560:3303) and its rules page (573:2638). */
  Medals: undefined;
  MedalRule: undefined;
  /** Profile to CP: CP Ranking / Reward / Plaza (Figma 2015:10692). */
  CpRanking: undefined;
  /** Aristocracy Privileges (Figma 176:1116). */
  VipPrivileges: undefined;
  /** Profile to Invite Reward (Figma 2015:9706). */
  InviteReward: undefined;
  /** Party to Blind Date Room: create (Figma 2015:8837), then the room (2015:8464 / 8590 / 8713). */
  BlindDateCreate: undefined;
  BlindDateRoom: { title?: string; cover?: string } | undefined;
  /** Store → Send: pick a friend or someone you follow to buy `item` for. */
  StoreSend: { item: StoreItem };
  /** The weekly reward screen (590:7029), drawn over the Ranking page. */
  RankingReward: { board: 'wealth' | 'charm' };
  /** A DM thread (511:2459); `peer` paints the header before anything loads. */
  /** `alias` is the caller's private nickname for the peer, when the opener already has it, so the header shows it from the first frame. */
  Conversation: { uuid: string; peer: ChatUser; alias?: string | null };
  /** Chat Settings (514:2763) for that thread. */
  ChatSettings: { uuid: string; peer: ChatUser; alias?: string | null };
  /** Report a user (514:3014). */
  Report: { userUuid: string; /** Who it is about, so the screen can show them. */ peer?: ChatUser };
  Home: undefined;
};
