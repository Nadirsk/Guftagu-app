import type { FeedItem } from '../screens/moment/parts';

export type RootStackParamList = {
  Welcome: undefined;
  ProfileSetup: undefined;
  EmailAuth: undefined;
  PhoneAuth: undefined;
  /** The tab shell: Home / Moment / Chat / Me under one fixed bottom bar. */
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
  Home: undefined;
};
