const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");

const firebaseConfig = {
  apiKey: "AIzaSyD2LhB-cp6roklmQ91_-2GcqzuxrXTI6jM",
  authDomain: "fyp0689.firebaseapp.com",
  projectId: "fyp0689",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function login() {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    "owner@pharmacy.com",
    "password123"
  );

  const token = await userCredential.user.getIdToken();
  console.log("ID TOKEN:\n", token);
}

login();
