"use client"

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { checkUsernameExists, createUserDocument, getUsernameByUid } from '@/lib/auth';
import { toast } from 'sonner';
import { Loader2, User, Mail, Lock } from 'lucide-react';

export function AuthPanel() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [firebaseError, setFirebaseError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'mock-api-key' || !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      setFirebaseError(true);
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const uname = await getUsernameByUid(user.uid);
          if (uname) {
            router.push(`/${uname}`);
          } else {
            setAuthLoading(false);
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
          setAuthLoading(false);
        }
      } else {
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uname = await getUsernameByUid(userCredential.user.uid);
        if (uname) {
          toast.success('Logged in successfully!');
          router.push(`/${uname}`);
        } else {
          setErrorMessage('User profile not found. Please contact support.');
        }
      } else {
        // Validation
        const cleanUsername = username.trim().toLowerCase();
        if (cleanUsername.includes(' ')) {
          setErrorMessage('Username cannot contain spaces.');
          setLoading(false);
          return;
        }
        if (cleanUsername.length < 3) {
          setErrorMessage('Username must be at least 3 characters long.');
          setLoading(false);
          return;
        }
        
        const exists = await checkUsernameExists(cleanUsername);
        if (exists) {
          setErrorMessage('Username is already taken.');
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await createUserDocument(userCredential.user.uid, cleanUsername);
        toast.success('Account created successfully!');
        router.push(`/${cleanUsername}`);
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      let errorMsg = error.message || 'An error occurred during authentication.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        errorMsg = 'Incorrect email or password.';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMsg = 'This email is already in use.';
      } else if (error.code === 'auth/weak-password') {
        errorMsg = 'Password should be at least 6 characters.';
      }
      setErrorMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (firebaseError) {
    return (
      <div className="p-8 text-center bg-red-50 dark:bg-red-950/30 rounded-2xl border border-red-200 dark:border-red-900/50">
        <h3 className="text-red-800 dark:text-red-400 font-medium mb-2">Firebase Configuration Missing</h3>
        <p className="text-sm text-red-600 dark:text-red-500">Please add your Firebase config to the environment variables to use authentication.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-8 rounded-2xl bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800/80 shadow-2xl transition-all">
      <h2 className="text-2xl font-bold mb-6 text-center tracking-tight text-neutral-900 dark:text-white">
        {isLogin ? 'Welcome back' : 'Create an account'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        {!isLogin && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5 px-1">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500">
                <User className="w-4.5 h-4.5" />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800/60 focus:bg-white dark:focus:bg-neutral-900 focus:border-neutral-400 dark:focus:border-neutral-600 focus:ring-4 focus:ring-neutral-100 dark:focus:ring-neutral-900/40 transition-all outline-none text-sm"
                placeholder="e.g. johndoe"
              />
            </div>
          </div>
        )}
        
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5 px-1">
            Email address
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500">
              <Mail className="w-4.5 h-4.5" />
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800/60 focus:bg-white dark:focus:bg-neutral-900 focus:border-neutral-400 dark:focus:border-neutral-600 focus:ring-4 focus:ring-neutral-100 dark:focus:ring-neutral-900/40 transition-all outline-none text-sm"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5 px-1">
            Password
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500">
              <Lock className="w-4.5 h-4.5" />
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800/60 focus:bg-white dark:focus:bg-neutral-900 focus:border-neutral-400 dark:focus:border-neutral-600 focus:ring-4 focus:ring-neutral-100 dark:focus:ring-neutral-900/40 transition-all outline-none text-sm"
              placeholder="••••••••"
            />
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-100 dark:border-red-900/50">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 mt-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-medium rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors disabled:opacity-70 flex justify-center items-center shadow-lg active:scale-[0.98] transform"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isLogin ? 'Sign In' : 'Sign Up'}
        </button>
      </form>
      
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          className="text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
