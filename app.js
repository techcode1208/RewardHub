import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";

import {
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp
} from "firebase/firestore";

import { auth, db } from "./firebase.js";

let currentUser = null;

// ======================================================
// ELEMENTS
// ======================================================

const authScreen = document.getElementById("authScreen");
const app = document.getElementById("app");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");

const authMessage = document.getElementById("authMessage");

const logoutBtn = document.getElementById("logoutBtn");
const withdrawBtn = document.getElementById("withdrawBtn");


// ======================================================
// SCREEN CONTROL
// ======================================================

function showLogin() {

  if (authScreen) {
    authScreen.style.display = "flex";
  }

  if (app) {
    app.style.display = "none";
  }

}


function showDashboard() {

  console.log("Showing RewardHub dashboard...");

  if (authScreen) {
    authScreen.style.display = "none";
  }

  if (app) {

    app.classList.remove("hidden");

    app.style.display = "block";

  } else {

    console.error(
      "ERROR: #app element was not found in index.html"
    );

  }

}


// ======================================================
// INITIAL STATE
// ======================================================

showLogin();


// ======================================================
// LOGIN TAB
// ======================================================

if (loginTab) {

  loginTab.addEventListener("click", () => {

    if (loginForm) {

      loginForm.classList.remove("hidden");
      loginForm.style.display = "block";

    }

    if (registerForm) {

      registerForm.classList.add("hidden");
      registerForm.style.display = "none";

    }

    loginTab.classList.add("active");

    if (registerTab) {
      registerTab.classList.remove("active");
    }

    if (authMessage) {
      authMessage.textContent = "";
    }

  });

}


// ======================================================
// REGISTER TAB
// ======================================================

if (registerTab) {

  registerTab.addEventListener("click", () => {

    if (registerForm) {

      registerForm.classList.remove("hidden");
      registerForm.style.display = "block";

    }

    if (loginForm) {

      loginForm.classList.add("hidden");
      loginForm.style.display = "none";

    }

    registerTab.classList.add("active");

    if (loginTab) {
      loginTab.classList.remove("active");
    }

    if (authMessage) {
      authMessage.textContent = "";
    }

  });

}


// ======================================================
// REGISTER
// ======================================================

if (registerForm) {

  registerForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const name =
      document.getElementById("registerName")?.value.trim();

    const email =
      document.getElementById("registerEmail")?.value.trim();

    const password =
      document.getElementById("registerPassword")?.value;


    if (!name || !email || !password) {

      if (authMessage) {
        authMessage.textContent =
          "Please fill all fields.";
      }

      return;
    }


    try {

      if (authMessage) {
        authMessage.textContent =
          "Creating account...";
      }


      const result =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );


      const user = result.user;


      await setDoc(
        doc(db, "users", user.uid),
        {

          uid: user.uid,

          name: name,

          email: email,

          coins: 0,

          balance: 0,

          adsToday: 0,

          quizScore: 0,

          rewardCount: 0,

          createdAt: serverTimestamp()

        }
      );


      if (authMessage) {

        authMessage.textContent =
          "Account created successfully!";

      }


      registerForm.reset();


      // Firebase automatically signs in
      // the newly created user.
      //
      // onAuthStateChanged() will then
      // open the dashboard.


    } catch (error) {

      console.error(
        "REGISTER ERROR:",
        error
      );


      if (authMessage) {

        authMessage.textContent =
          getFirebaseError(error);

      }

    }

  });

}


// ======================================================
// LOGIN
// ======================================================

if (loginForm) {

  loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();


    const email =
      document.getElementById("loginEmail")?.value.trim();

    const password =
      document.getElementById("loginPassword")?.value;


    if (!email || !password) {

      if (authMessage) {

        authMessage.textContent =
          "Please enter email and password.";

      }

      return;
    }


    try {

      if (authMessage) {

        authMessage.textContent =
          "Logging in...";

      }


      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );


      console.log(
        "Login successful"
      );


      if (authMessage) {

        authMessage.textContent =
          "Login successful!";

      }


      loginForm.reset();


      // DO NOT manually open dashboard here.
      //
      // onAuthStateChanged() handles it.


    } catch (error) {

      console.error(
        "LOGIN ERROR:",
        error
      );


      if (authMessage) {

        authMessage.textContent =
          getFirebaseError(error);

      }

    }

  });

}


// ======================================================
// AUTH STATE
// ======================================================

onAuthStateChanged(
  auth,
  async (user) => {

    console.log(
      "AUTH STATE:",
      user
    );


    if (!user) {

      currentUser = null;

      showLogin();

      return;

    }


    currentUser = user;


    console.log(
      "USER LOGGED IN:",
      user.email
    );


    // THIS IS THE IMPORTANT PART
    // Dashboard opens here.

    showDashboard();


    await loadUserData(
      user.uid
    );

  }
);


// ======================================================
// LOAD USER DATA
// ======================================================

async function loadUserData(uid) {

  try {

    const userRef =
      doc(
        db,
        "users",
        uid
      );


    const snapshot =
      await getDoc(userRef);


    if (!snapshot.exists()) {

      console.log(
        "User document missing. Creating..."
      );


      await setDoc(
        userRef,
        {

          uid: uid,

          name:
            currentUser?.email
              ?.split("@")[0] ||
            "User",

          email:
            currentUser?.email ||
            "",

          coins: 0,

          balance: 0,

          adsToday: 0,

          quizScore: 0,

          rewardCount: 0,

          createdAt:
            serverTimestamp()

        }
      );


      const newSnapshot =
        await getDoc(userRef);


      updateDashboard(
        newSnapshot.data()
      );


      return;

    }


    const data =
      snapshot.data();


    updateDashboard(
      data
    );


  } catch (error) {

    console.error(
      "LOAD USER ERROR:",
      error
    );

  }

}


// ======================================================
// UPDATE DASHBOARD
// ======================================================

function updateDashboard(data) {

  const name =
    data.name || "User";


  const email =
    data.email ||
    currentUser?.email ||
    "";


  const coins =
    Number(
      data.coins || 0
    );


  const balance =
    Number(
      data.balance || 0
    );


  const score =
    Number(
      data.quizScore || 0
    );


  const rewards =
    Number(
      data.rewardCount || 0
    );


  const adsToday =
    Number(
      data.adsToday || 0
    );


  // NAME

  setText(
    "navName",
    name
  );

  setText(
    "welcomeName",
    name
  );

  setText(
    "profileName",
    name
  );

  setText(
    "modalName",
    name
  );


  // EMAIL

  setText(
    "profileEmail",
    email
  );

  setText(
    "modalEmail",
    email
  );


  // COINS

  setText(
    "coinBalance",
    coins.toLocaleString()
  );

  setText(
    "profileCoins",
    coins.toLocaleString()
  );

  setText(
    "modalCoins",
    coins.toLocaleString()
  );


  // BALANCE

  setText(
    "balance",
    balance.toFixed(2)
  );

  setText(
    "withdrawBalance",
    balance.toFixed(2)
  );


  // SCORE

  setText(
    "quizScore",
    score
  );

  setText(
    "profileScore",
    score
  );


  // REWARDS

  setText(
    "rewardCount",
    rewards
  );

  setText(
    "profileRewards",
    rewards
  );


  // ADS

  setText(
    "adsToday",
    adsToday
  );


  // AVATAR

  const avatar =
    name.charAt(0).toUpperCase();


  setText(
    "avatar",
    avatar
  );

  setText(
    "profileAvatar",
    avatar
  );

  setText(
    "modalAvatar",
    avatar
  );

}


// ======================================================
// TEXT HELPER
// ======================================================

function setText(
  id,
  value
) {

  const element =
    document.getElementById(id);


  if (element) {

    element.textContent =
      value;

  }

}


// ======================================================
// LOGOUT
// ======================================================

if (logoutBtn) {

  logoutBtn.addEventListener(
    "click",
    async () => {

      try {

        await signOut(
          auth
        );


        currentUser = null;


        showLogin();


        if (authMessage) {

          authMessage.textContent =
            "Logged out successfully.";

        }


      } catch (error) {

        console.error(
          "LOGOUT ERROR:",
          error
        );

      }

    }
  );

}


// ======================================================
// WITHDRAWAL
// ======================================================

if (withdrawBtn) {

  withdrawBtn.addEventListener(
    "click",
    async () => {


      if (!currentUser) {

        alert(
          "Please login first."
        );

        return;

      }


      const amountInput =
        document.getElementById(
          "withdrawAmount"
        );


      const methodInput =
        document.getElementById(
          "withdrawMethod"
        );


      const accountInput =
        document.getElementById(
          "paymentAccount"
        );


      const amount =
        Number(
          amountInput?.value || 0
        );


      const method =
        methodInput?.value || "";


      const paymentAccount =
        accountInput?.value.trim() || "";


      if (amount < 1) {

        alert(
          "Minimum withdrawal is $1."
        );

        return;

      }


      if (!method) {

        alert(
          "Please select a payment method."
        );

        return;

      }


      if (!paymentAccount) {

        alert(
          "Please enter your payment account."
        );

        return;

      }


      try {

        withdrawBtn.disabled =
          true;


        withdrawBtn.textContent =
          "Submitting...";


        const userRef =
          doc(
            db,
            "users",
            currentUser.uid
          );


        const userSnapshot =
          await getDoc(
            userRef
          );


        if (!userSnapshot.exists()) {

          throw new Error(
            "User account not found."
          );

        }


        const userData =
          userSnapshot.data();


        const currentBalance =
          Number(
            userData.balance || 0
          );


        if (
          amount >
          currentBalance
        ) {

          alert(
            "Insufficient balance. Available: $" +
            currentBalance.toFixed(2)
          );

          return;

        }


        await addDoc(
          collection(
            db,
            "withdrawals"
          ),
          {

            userId:
              currentUser.uid,

            userEmail:
              currentUser.email || "",

            amount:
              amount,

            method:
              method,

            paymentAccount:
              paymentAccount,

            status:
              "pending",

            createdAt:
              serverTimestamp()

          }
        );


        alert(
          "Withdrawal request submitted. Waiting for admin approval."
        );


        if (amountInput) {
          amountInput.value = "";
        }


        if (accountInput) {
          accountInput.value = "";
        }


      } catch (error) {

        console.error(
          "WITHDRAWAL ERROR:",
          error
        );


        alert(
          "Withdrawal failed: " +
          error.message
        );


      } finally {

        withdrawBtn.disabled =
          false;


        withdrawBtn.textContent =
          "💰 Request Withdrawal";

      }

    }
  );

}


// ======================================================
// FIREBASE ERROR
// ======================================================

function getFirebaseError(error) {

  const code =
    error?.code || "";


  switch (code) {

    case "auth/email-already-in-use":

      return "This email is already registered.";


    case "auth/invalid-email":

      return "Invalid email address.";


    case "auth/weak-password":

      return "Password is too weak.";


    case "auth/invalid-credential":

      return "Incorrect email or password.";


    case "auth/user-not-found":

      return "Account not found.";


    case "auth/wrong-password":

      return "Incorrect password.";


    case "auth/api-key-not-valid":

      return "Firebase API key is invalid.";


    case "auth/configuration-not-found":

      return "Firebase Email/Password authentication is not enabled.";


    default:

      return (
        error?.message ||
        "Something went wrong."
      );

  }

}


// ======================================================
// APP LOADED
// ======================================================

console.log(
  "🚀 RewardHub app.js loaded successfully"
);