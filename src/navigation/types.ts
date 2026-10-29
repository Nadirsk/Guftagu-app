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
  Home: undefined;
};
