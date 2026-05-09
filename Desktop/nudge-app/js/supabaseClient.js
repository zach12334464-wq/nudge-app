import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://vwehtcqkqwfdujhnftjw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_AKHbvMuM2xZNBMysUi2GHg_78LxIA1D';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabase = supabase;
window.supabaseClient = supabase;

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('*, companies(*)')
    .eq('id', userId)
    .single();
  return data;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: 'email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar',
      redirectTo: window.location.origin + '/dashboard.html'
    }
  });
  if (error) console.error('Google auth:', error);
  return data;
}

export async function signInWithMicrosoft() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: {
      scopes: 'email profile Mail.Read Mail.Send Calendars.ReadWrite',
      redirectTo: window.location.origin + '/dashboard.html'
    }
  });
  if (error) console.error('Microsoft auth:', error);
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
}
