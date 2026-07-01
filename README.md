# Watchly

A public watchlist app for movies, series, anime, and books. Sign up, get a personal URL (`/your-username`), and share your taste with anyone — no account required to view.

Built with Next.js, Firebase, and Tailwind CSS.

---

## Features

- **Public profiles** — every user gets a shareable `/:username` page
- **Four categories** — Movies, Series, Anime, Books & Comics
- **Poster art** — automatically fetched from TMDB (movies/series/anime) and Open Library (books)
- **Pending / Finished tracking** — mark items as watched or toggle them back
- **Real-time updates** — powered by Firestore's `onSnapshot`
- **Dark mode** — system-aware with manual toggle
- **Auth** — email/password sign-up and login via Firebase Auth

---

## Tech Stack

| Layer | Tools |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database & Auth | Firebase Firestore + Firebase Auth |
| Styling | Tailwind CSS v4 |
| Animations | Motion (Framer Motion) |
| Poster APIs | TMDB API, Open Library API |
| Forms | React Hook Form + Zod |
| Toasts | Sonner |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Firebase](https://console.firebase.google.com/) project with Firestore and Authentication enabled
- A [TMDB API key](https://www.themoviedb.org/settings/api) (optional — posters won't load without it)

### 1. Clone and install

```bash
git clone https://github.com/Mamoon5G/watchly.git
cd watchly
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env.local
```


### 3. Set up Firebase

In your Firebase project:

1. Enable **Email/Password** sign-in under Authentication → Sign-in method
2. Create a **Firestore** database in production mode
3. Add the following security rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public read on user profiles and watchlists
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;

      match /watchlist/{itemId} {
        allow read: if true;
        allow write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).


---

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

---

## License
---

*Created by [Mamoon Siddiqui](https://github.com/Mamoon5G)*
