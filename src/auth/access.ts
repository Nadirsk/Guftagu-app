import { useAuth, type AuthUser } from './AuthContext';

/**
 * Only these accounts get the whole app for now. Everyone else signs in through the
 * normal auth flow but lands on a view-only Home: Party, Chats and Mine are disabled
 * and nothing on Home navigates anywhere.
 *
 * Numbers are compared by their last 10 digits, so "+919326431979", "91 93264 31979"
 * and "9326431979" all match.
 */
const FULL_ACCESS_PHONES = ['9326431979', '8104946773'];

const last10 = (value: string) => value.replace(/\D/g, '').slice(-10);

export function hasFullAccess(user: Pick<AuthUser, 'phone'> | null | undefined): boolean {
  if (!user?.phone) return false;
  return FULL_ACCESS_PHONES.includes(last10(user.phone));
}

export function useFullAccess(): boolean {
  const { user } = useAuth();
  return hasFullAccess(user);
}
