import type { ChatUser } from '../screens/chats/parts';
import type { FeedItem } from '../screens/moment/parts';

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
  /** The weekly reward screen (590:7029), drawn over the Ranking page. */
  RankingReward: { board: 'wealth' | 'charm' };
  /** A DM thread (511:2459); `peer` paints the header before anything loads. */
  Conversation: { uuid: string; peer: ChatUser };
  /** Chat Settings (514:2763) for that thread. */
  ChatSettings: { uuid: string; peer: ChatUser };
  /** Report a user (514:3014). */
  Report: { userUuid: string };
  Home: undefined;
};
