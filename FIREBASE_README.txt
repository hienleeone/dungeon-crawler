Firebase Integration Notes
==========================
- Open assets/js/firebase.js and replace the firebaseConfig object with your Firebase project configuration.
  You can find these values in your Firebase console under Project Settings -> General -> Your apps.
- The code uses Firebase Authentication (email/password) and Firestore (collection 'players') to store player profiles.
- After signing in, the library will try to load the player profile from Firestore and write it to localStorage as "playerData".
  The existing game JS reads from localStorage, so this keeps the current flow intact.
- When the game calls saveData(), it will also push the player object to Firestore if a user is signed in.
- Registration and login UI are not added automatically; you'll need to wire your own login/register buttons to
  window.firebaseRegister(email,password) and window.firebaseLogin(email,password).
  (This keeps changes minimal and avoids altering game UI excessively.)