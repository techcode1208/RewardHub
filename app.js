```javascript
// ======================================================
// REWARDHUB - app.js
// Firebase + Login + Register + Quiz + Daily Reward
// Profile + Wallet + Withdraw + Sounds
// ======================================================

import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp
} from "firebase/firestore";

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

const quizBtn = document.getElementById("quizBtn");
const dailyBtn = document.getElementById("dailyBtn");
const profileBtn = document.getElementById("profileBtn");

const claimBtn = document.getElementById("claimBtn");

const quizSection = document.getElementById("quizSection");
const profileSection = document.getElementById("profileSection");

const closeQuizBtn = document.getElementById("closeQuizBtn");

const profileModal = document.getElementById("profileModal");
const closeProfile = document.getElementById("closeProfile");

const questionElement = document.getElementById("question");
const optionsElement = document.getElementById("options");
const questionNumber = document.getElementById("questionNumber");
const quizResult = document.getElementById("quizResult");

const activityList = document.getElementById("activityList");

// ======================================================
// GLOBAL VARIABLES
// ======================================================

let currentUser = null;
let userData = null;

let quizIndex = 0;
let quizScoreSession = 0;

const COINS_PER_CORRECT = 10;
const DAILY_REWARD = 50;

// ======================================================
// QUIZ QUESTIONS
// ======================================================

const quizQuestions = [
  {
    question: "What is the opposite of 'hot'?",
    options: ["Cold", "Warm", "Dry", "Bright"],
    answer: "Cold"
  },
  {
    question: "Which word is a noun?",
    options: ["Beautiful", "Run", "Teacher", "Quickly"],
    answer: "Teacher"
  },
  {
    question: "What is the past tense of 'go'?",
    options: ["Goed", "Gone", "Went", "Going"],
    answer: "Went"
  },
  {
    question: "Which sentence is correct?",
    options: [
      "She are happy.",
      "She is happy.",
      "She am happy.",
      "She be happy."
    ],
    answer: "She is happy."
  },
  {
    question: "What is the plural of 'child'?",
    options: ["Childs", "Childes", "Children", "Childrens"],
    answer: "Children"
  },
  {
    question: "Which one is a color?",
    options: ["Apple", "Blue", "Chair", "Water"],
    answer: "Blue"
  },
  {
    question: "Complete: I ___ a student.",
    options: ["am", "is", "are", "be"],
    answer: "am"
  },
  {
    question: "What is the opposite of 'easy'?",
    options: ["Simple", "Hard", "Small", "Fast"],
    answer: "Hard"
  },
  {
    question: "Which word means 'very big'?",
    options: ["Tiny", "Huge", "Short", "Weak"],
    answer: "Huge"
  },
  {
    question: "Which is a correct greeting?",
    options: [
      "Good morning",
      "Good running",
      "Good eating",
      "Good sleeping"
    ],
    answer: "Good morning"
  }
];

// ======================================================
// SOUND SYSTEM
// ======================================================

let audioContext = null;

function getAudioContext() {
  try {
    if (!audioContext) {
      const AudioContext =
        window.AudioContext || window.webkitAudioContext;

      if (AudioContext) {
        audioContext = new AudioContext();
      }
    }

    return audioContext;
  } catch (error) {
    console.log("Audio unavailable.");
    return null;
  }
}

function playSound(type = "click") {
  try {
    const ctx = getAudioContext();

    if (!ctx) {
      return;
    }

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    let frequency = 500;
    let duration = 0.08;

    if (type === "success") {
      frequency = 800;
      duration = 0.15;
    }

    if (type === "wrong") {
      frequency = 180;
      duration = 0.18;
    }

    if (type === "reward") {
      frequency = 1000;
      duration = 0.2;
    }

    oscillator.frequency.value = frequency;
    oscillator.type = "sine";

    gain.gain.setValueAtTime(0.001, ctx.currentTime);

    gain.gain.exponentialRampToValueAtTime(
      0.15,
      ctx.currentTime + 0.01
    );

    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + duration
    );

    oscillator.start();

    oscillator.stop(
      ctx.currentTime + duration
    );
  } catch (error) {
    console.log("Sound error:", error);
  }
}

// ======================================================
// BUTTON SOUND
// ======================================================

document.addEventListener("click", function (event) {
  const button = event.target.closest("button");

  if (button) {
    playSound("click");
  }
});

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
  if (authScreen) {
    authScreen.style.display = "none";
  }

  if (app) {
    app.classList.remove("hidden");
    app.style.display = "block";
  }
}

// ======================================================
// HIDE SECTIONS
// ======================================================

function hideSections() {
  if (quizSection) {
    quizSection.classList.add("hidden");
    quizSection.style.display = "none";
  }

  if (profileSection) {
    profileSection.classList.add("hidden");
    profileSection.style.display = "none";
  }
}

// ======================================================
// OPEN QUIZ
// ======================================================

function openQuiz() {
  playSound("click");

  hideSections();

  if (!quizSection) {
    alert("Quiz section not found.");
    return;
  }

  quizSection.classList.remove("hidden");
  quizSection.style.display = "block";

  quizIndex = 0;
  quizScoreSession = 0;

  if (quizResult) {
    quizResult.textContent = "";
  }

  loadQuestion();

  window.scrollTo({
    
    behavior: "smooth"
  });
}

// ======================================================
// CLOSE QUIZ
// ======================================================

function closeQuiz() {
  playSound("click");

  if (quizSection) {
    quizSection.classList.add("hidden");
    quizSection.style.display = "none";
  }

  window.scrollTo({
  
    behavior: "smooth"
  });
}

// ======================================================
// LOAD QUESTION
// ======================================================

function loadQuestion() {
  if (!questionElement || !optionsElement) {
    return;
  }

  const currentQuestion =
    quizQuestions[quizIndex];

  if (!currentQuestion) {
    finishQuiz();
    return;
  }

  if (questionNumber) {
    questionNumber.textContent =
      String(quizIndex + 1);
  }

  questionElement.textContent =
    currentQuestion.question;

  optionsElement.innerHTML = "";

  currentQuestion.options.forEach(
    function (option) {

      const button =
        document.createElement("button");

      button.type = "button";
      button.className = "quiz-option";
      button.textContent = option;

      button.addEventListener(
        "click",
        function () {
          checkAnswer(
            option,
            currentQuestion.answer,
            button
          );
        }
      );

      optionsElement.appendChild(button);
    }
  );
}

// ======================================================
// CHECK ANSWER
// ======================================================

async function checkAnswer(
  selectedAnswer,
  correctAnswer,
  selectedButton
) {
  if (!currentUser) {
    alert("Please login first.");
    return;
  }

  const allButtons =
    optionsElement
      ? optionsElement.querySelectorAll("button")
      : [];

  allButtons.forEach(function (button) {
    button.disabled = true;
  });

  if (selectedAnswer === correctAnswer) {

    playSound("success");

    quizScoreSession += 1;

    if (selectedButton) {
      selectedButton.classList.add("correct");
    }

    if (quizResult) {
      quizResult.textContent =
        "✅ Correct! +10 coins";
    }

    await addCoins(COINS_PER_CORRECT);

  } else {

    playSound("wrong");

    if (selectedButton) {
      selectedButton.classList.add("wrong");
    }

    allButtons.forEach(function (button) {
      if (
        button.textContent === correctAnswer
      ) {
        button.classList.add("correct");
      }
    });

    if (quizResult) {
      quizResult.textContent =
        "❌ Wrong answer!";
    }
  }

  setTimeout(function () {

    quizIndex += 1;

    if (
      quizIndex >=
      quizQuestions.length
    ) {
      finishQuiz();
    } else {
      loadQuestion();
    }

  }, 900);
}

// ======================================================
// FINISH QUIZ
// ======================================================

async function finishQuiz() {
  playSound("reward");

  const totalQuestions =
    quizQuestions.length;

  if (quizResult) {
    quizResult.textContent =
      "🎉 Quiz complete! Score: " +
      quizScoreSession +
      "/" +
      totalQuestions;
  }

  if (currentUser) {

    try {

      const userRef =
        doc(
          db,
          "users",
          currentUser.uid
        );

      const snapshot =
        await getDoc(userRef);

      if (snapshot.exists()) {

        const data =
          snapshot.data();

        const oldScore =
          Number(data.quizScore || 0);

        await updateDoc(
          userRef,
          {
            quizScore:
              oldScore +
              quizScoreSession,

            updatedAt:
              serverTimestamp()
          }
        );

        await loadUserData(
          currentUser.uid
        );
      }

    } catch (error) {
      console.error(
        "Quiz score error:",
        error
      );
    }
  }
}

// ======================================================
// DAILY REWARD
// ======================================================

async function claimDailyReward() {

  playSound("click");

  if (!currentUser) {
    alert("Please login first.");
    return;
  }

  try {

    const userRef =
      doc(
        db,
        "users",
        currentUser.uid
      );

    const snapshot =
      await getDoc(userRef);

    if (!snapshot.exists()) {
      alert("User data not found.");
      return;
    }

    const data =
      snapshot.data();

    const lastClaim =
      data.lastDailyReward;

    let canClaim = true;

    if (lastClaim) {

      let lastDate;

      if (
        typeof lastClaim.toDate ===
        "function"
      ) {
        lastDate =
          lastClaim.toDate();
      } else {
        lastDate =
          new Date(lastClaim);
      }

      const now =
        new Date();

      const difference =
        now.getTime() -
        lastDate.getTime();

      const oneDay =
        24 * 60 * 60 * 1000;

      if (difference < oneDay) {
        canClaim = false;
      }
    }

    if (!canClaim) {

      alert(
        "⏰ Daily reward already claimed. Come back after 24 hours."
      );

      return;
    }

    const oldCoins =
      Number(data.coins || 0);

    const oldRewards =
      Number(data.rewardCount || 0);

    await updateDoc(
      userRef,
      {
        coins:
          oldCoins +
          DAILY_REWARD,

        rewardCount:
          oldRewards + 1,

        lastDailyReward:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()
      }
    );

    playSound("reward");

    await addActivity(
      "Daily Reward",
      "+" + DAILY_REWARD + " coins"
    );

    alert(
      "🎁 Daily Reward Claimed! +" +
      DAILY_REWARD +
      " coins"
    );

    await loadUserData(
      currentUser.uid
    );

  } catch (error) {

    console.error(
      "DAILY REWARD ERROR:",
      error
    );

    alert(
      "Daily reward failed: " +
      getErrorMessage(error)
    );
  }
}

// ======================================================
// ADD COINS
// ======================================================

async function addCoins(amount) {

  if (!currentUser) {
    return;
  }

  try {

    const userRef =
      doc(
        db,
        "users",
        currentUser.uid
      );

    const snapshot =
      await getDoc(userRef);

    if (!snapshot.exists()) {
      return;
    }

    const data =
      snapshot.data();

    const oldCoins =
      Number(data.coins || 0);

    const oldBalance =
      Number(data.balance || 0);

    const newCoins =
      oldCoins + amount;

    const newBalance =
      newCoins / 5000;

    await updateDoc(
      userRef,
      {
        coins: newCoins,

        balance:
          Number(
            newBalance.toFixed(4)
          ),

        updatedAt:
          serverTimestamp()
      }
    );

    await loadUserData(
      currentUser.uid
    );

  } catch (error) {

    console.error(
      "ADD COINS ERROR:",
      error
    );
  }
}

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

      const name =
        currentUser &&
        currentUser.email
          ? currentUser.email.split("@")[0]
          : "User";

      const newUser = {

        uid: uid,

        name: name,

        email:
          currentUser
            ? currentUser.email || ""
            : "",

        coins: 0,

        balance: 0,

        adsToday: 0,

        quizScore: 0,

        rewardCount: 0,

        createdAt:
          serverTimestamp()
      };

      await setDoc(
        userRef,
        newUser
      );

      userData = newUser;

      updateDashboard(
        newUser
      );

      return;
    }

    userData =
      snapshot.data();

    updateDashboard(
      userData
    );

  } catch (error) {

    console.error(
      "LOAD USER ERROR:",
      error
    );

    if (authMessage) {
      authMessage.textContent =
        "Unable to load account data.";
    }
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
    (
      currentUser
        ? currentUser.email
        : ""
    );

  const coins =
    Number(data.coins || 0);

  const balance =
    Number(data.balance || 0);

  const score =
    Number(data.quizScore || 0);

  const rewards =
    Number(data.rewardCount || 0);

  const adsToday =
    Number(data.adsToday || 0);

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

  setText(
    "profileEmail",
    email
  );

  setText(
    "modalEmail",
    email
  );

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

  setText(
    "balance",
    balance.toFixed(2)
  );

  setText(
    "withdrawBalance",
    balance.toFixed(2)
  );

  setText(
    "quizScore",
    score
  );

  setText(
    "profileScore",
    score
  );

  setText(
    "rewardCount",
    rewards
  );

  setText(
    "profileRewards",
    rewards
  );

  setText(
    "adsToday",
    adsToday
  );

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

  updateDailyButton(
    data.lastDailyReward
  );
}

// ======================================================
// DAILY BUTTON STATUS
// ======================================================

function updateDailyButton(lastClaim) {

  if (!claimBtn) {
    return;
  }

  if (!lastClaim) {

    claimBtn.disabled = false;
    claimBtn.textContent =
      "Claim 50 Coins";

    return;
  }

  let lastDate;

  try {

    if (
      typeof lastClaim.toDate ===
      "function"
    ) {
      lastDate =
        lastClaim.toDate();
    } else {
      lastDate =
        new Date(lastClaim);
    }

    const difference =
      Date.now() -
      lastDate.getTime();

    const oneDay =
      24 * 60 * 60 * 1000;

    if (difference < oneDay) {

      claimBtn.disabled = true;

      claimBtn.textContent =
        "Already Claimed";

    } else {

      claimBtn.disabled = false;

      claimBtn.textContent =
        "Claim 50 Coins";
    }

  } catch (error) {

    claimBtn.disabled = false;

    claimBtn.textContent =
      "Claim 50 Coins";
  }
}

// ======================================================
// SET TEXT
// ======================================================

function setText(id, value) {

  const element =
    document.getElementById(id);

  if (element) {
    element.textContent =
      String(value);
  }
}

// ======================================================
// ADD ACTIVITY
// ======================================================

async function addActivity(
  title,
  description
) {

  if (!currentUser) {
    return;
  }

  try {

    await addDoc(
      collection(
        db,
        "activity"
      ),
      {

        userId:
          currentUser.uid,

        title:
          title,

        description:
          description,

        createdAt:
          serverTimestamp()
      }
    );

  } catch (error) {

    console.log(
      "Activity save skipped:",
      error
    );
  }
}

// ======================================================
// LOGIN TAB
// ======================================================

if (loginTab) {

  loginTab.addEventListener(
    "click",
    function () {

      playSound("click");

      if (loginForm) {
        loginForm.classList.remove(
          "hidden"
        );

        loginForm.style.display =
          "block";
      }

      if (registerForm) {
        registerForm.classList.add(
          "hidden"
        );

        registerForm.style.display =
          "none";
      }

      loginTab.classList.add(
        "active"
      );

      if (registerTab) {
        registerTab.classList.remove(
          "active"
        );
      }

      if (authMessage) {
        authMessage.textContent =
          "";
      }
    }
  );
}

// ======================================================
// REGISTER TAB
// ======================================================

if (registerTab) {

  registerTab.addEventListener(
    "click",
    function () {

      playSound("click");

      if (registerForm) {
        registerForm.classList.remove(
          "hidden"
        );

        registerForm.style.display =
          "block";
      }

      if (loginForm) {
        loginForm.classList.add(
          "hidden"
        );

        loginForm.style.display =
          "none";
      }

      registerTab.classList.add(
        "active"
      );

      if (loginTab) {
        loginTab.classList.remove(
          "active"
        );
      }

      if (authMessage) {
        authMessage.textContent =
          "";
      }
    }
  );
}

// ======================================================
// REGISTER
// ======================================================

if (registerForm) {

  registerForm.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();

      playSound("click");

      const nameElement =
        document.getElementById(
          "registerName"
        );

      const emailElement =
        document.getElementById(
          "registerEmail"
        );

      const passwordElement =
        document.getElementById(
          "registerPassword"
        );

      const name =
        nameElement
          ? nameElement.value.trim()
          : "";

      const email =
        emailElement
          ? emailElement.value.trim()
          : "";

      const password =
        passwordElement
          ? passwordElement.value
          : "";

      if (
        !name ||
        !email ||
        !password
      ) {

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

        const user =
          result.user;

        await setDoc(
          doc(
            db,
            "users",
            user.uid
          ),
          {

            uid:
              user.uid,

            name:
              name,

            email:
              email,

            coins: 0,

            balance: 0,

            adsToday: 0,

            quizScore: 0,

            rewardCount: 0,

            createdAt:
              serverTimestamp()
          }
        );

        playSound("success");

        if (authMessage) {
          authMessage.textContent =
            "Account created successfully!";
        }

        registerForm.reset();

      } catch (error) {

        console.error(
          "REGISTER ERROR:",
          error
        );

        if (authMessage) {
          authMessage.textContent =
            getErrorMessage(error);
        }
      }
    }
  );
}

// ======================================================
// LOGIN
// ======================================================

if (loginForm) {

  loginForm.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();

      playSound("click");

      const emailElement =
        document.getElementById(
          "loginEmail"
        );

      const passwordElement =
        document.getElementById(
          "loginPassword"
        );

      const email =
        emailElement
          ? emailElement.value.trim()
          : "";

      const password =
        passwordElement
          ? passwordElement.value
          : "";

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

        playSound("success");

        if (authMessage) {
          authMessage.textContent =
            "Login successful!";
        }

        loginForm.reset();

      } catch (error) {

        console.error(
          "LOGIN ERROR:",
          error
        );

        if (authMessage) {
          authMessage.textContent =
            getErrorMessage(error);
        }
      }
    }
  );
}

// ======================================================
// LOGOUT
// ======================================================

if (logoutBtn) {

  logoutBtn.addEventListener(
    "click",
    async function () {

      try {

        await signOut(auth);

        playSound("success");

        currentUser = null;
        userData = null;

        showLogin();

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
// QUIZ BUTTON
// ======================================================

if (quizBtn) {

  quizBtn.addEventListener(
    "click",
    openQuiz
  );
}

// ======================================================
// CLOSE QUIZ
// ======================================================

if (closeQuizBtn) {

  closeQuizBtn.addEventListener(
    "click",
    closeQuiz
  );
}

// ======================================================
// DAILY BUTTON
// ======================================================

if (dailyBtn) {

  dailyBtn.addEventListener(
    "click",
    function () {

      playSound("click");

      if (claimBtn) {
        claimBtn.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }
    }
  );
}

// ======================================================
// CLAIM BUTTON
// ======================================================

if (claimBtn) {

  claimBtn.addEventListener(
    "click",
    claimDailyReward
  );
}

// ======================================================
// PROFILE BUTTON
// ======================================================

if (profileBtn) {

  profileBtn.addEventListener(
    "click",
    function () {

      playSound("click");

      hideSections();

      if (profileSection) {

        profileSection.classList.remove(
          "hidden"
        );

        profileSection.style.display =
          "block";

        profileSection.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    }
  );
}

// ======================================================
// PROFILE MODAL
// ======================================================

function openProfileModal() {

  if (!profileModal) {
    return;
  }

  profileModal.classList.remove(
    "hidden"
  );

  profileModal.style.display =
    "flex";
}

function closeProfileModal() {

  if (!profileModal) {
    return;
  }

  profileModal.classList.add(
    "hidden"
  );

  profileModal.style.display =
    "none";
}

if (closeProfile) {

  closeProfile.addEventListener(
    "click",
    closeProfileModal
  );
}

if (profileModal) {

  profileModal.addEventListener(
    "click",
    function (event) {

      if (
        event.target ===
        profileModal
      ) {
        closeProfileModal();
      }
    }
  );
}

// ======================================================
// WITHDRAW
// ======================================================

if (withdrawBtn) {

  withdrawBtn.addEventListener(
    "click",
    async function () {

      playSound("click");

      if (!currentUser) {

        alert(
          "Please login first."
        );

        return;
      }

      const amountElement =
        document.getElementById(
          "withdrawAmount"
        );

      const methodElement =
        document.getElementById(
          "withdrawMethod"
        );

      const accountElement =
        document.getElementById(
          "paymentAccount"
        );

      const amount =
        amountElement
          ? Number(amountElement.value)
          : 0;

      const method =
        methodElement
          ? methodElement.value
          : "";

      const paymentAccount =
        accountElement
          ? accountElement.value.trim()
          : "";

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

        const snapshot =
          await getDoc(userRef);

        if (!snapshot.exists()) {

          throw new Error(
            "User account not found."
          );
        }

        const data =
          snapshot.data();

        const balance =
          Number(data.balance || 0);

        if (amount > balance) {

          alert(
            "Insufficient balance. Available: $" +
            balance.toFixed(2)
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

        playSound("success");

        await addActivity(
          "Withdrawal Request",
          "$" +
          amount.toFixed(2) +
          " withdrawal requested"
        );

        alert(
          "Withdrawal request submitted successfully."
        );

        if (amountElement) {
          amountElement.value =
            "";
        }

        if (accountElement) {
          accountElement.value =
            "";
        }

      } catch (error) {

        console.error(
          "WITHDRAW ERROR:",
          error
        );

        alert(
          "Withdrawal failed: " +
          getErrorMessage(error)
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
// FIREBASE ERROR MESSAGE
// ======================================================

function getErrorMessage(error) {

  const code =
    error && error.code
      ? error.code
      : "";

  switch (code) {

    case "auth/email-already-in-use":
      return "This email is already registered.";

    case "auth/invalid-email":
      return "Invalid email address.";

    case "auth/weak-password":
      return "Password must be at least 6 characters.";

    case "auth/invalid-credential":
      return "Incorrect email or password.";

    case "auth/user-not-found":
      return "Account not found.";

    case "auth/wrong-password":
      return "Incorrect password.";

    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";

    case "auth/network-request-failed":
      return "Network error. Check your internet connection.";

    case "permission-denied":
      return "Firebase permission denied. Check Firestore rules.";

    default:

      return (
        error && error.message
          ? error.message
          : "Something went wrong."
      );
  }
}

// ======================================================
// AUTH STATE
// ======================================================

onAuthStateChanged(
  auth,
  async function (user) {

    console.log(
      "AUTH STATE:",
      user
    );

    if (!user) {

      currentUser = null;
      userData = null;

      showLogin();

      return;
    }

    currentUser = user;

    showDashboard();

    await loadUserData(
      user.uid
    );
  }
);

// ======================================================
// INITIAL STATE
// ======================================================

showLogin();

console.log(
  "RewardHub app.js loaded successfully."
);
```
