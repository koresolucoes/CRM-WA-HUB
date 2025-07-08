
import { supabase } from './supabaseClient';

export async function signUp(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signUp({
        email,
        password,
    });
    if (error) throw error;
}

export async function signIn(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    if (error) throw error;
}

export async function signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return subscription;
};
