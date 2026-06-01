import { SessionStore } from '@/store/session';
import { Redirect } from 'expo-router';

export default function Index() {
  const session = SessionStore.get();
  return <Redirect href={session ? '/exploracion' : '/login'} />;
}
