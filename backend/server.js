require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { initializeApp, cert } = require("firebase-admin/app");
const {
  getAuth: getAdminAuth
} = require("firebase-admin/auth");

const {
  getFirestore,
  FieldValue
} = require("firebase-admin/firestore");

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================
// FIREBASE ADMIN
// =====================================

const serviceAccount =
  require("./serviceAccountKey.json");

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const adminAuth = getAdminAuth();

// =====================================
// SETTINGS
// =====================================

const COINS_PER_DOLLAR = 5000;
const DAILY_REWARD = 50;
const QUIZ_REWARD = 10;
const MIN_WITHDRAWAL = 1;

// Put your admin Firebase UID here later.
// Example:
// const ADMIN_UIDS = ["your-firebase-uid"];

const ADMIN_UIDS = [];

// =====================================
// MIDDLEWARE
// =====================================

app.use(cors());
app.use(express.json());

// =====================================
// AUTHENTICATION
// =====================================

async function verifyUser(req, res, next) {

  try {

    const header =
      req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {

      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    const token =
      header.substring(7);

    const decoded =
      await adminAuth.verifyIdToken(token);

    req.user = decoded;

    next();

  } catch (error) {

    console.error(
      "Authentication error:",
      error.message
    );

    return res.status(401).json({
      success: false,
      message: "Invalid or expired login session."
    });
  }
}

// =====================================
// ADMIN AUTHENTICATION
// =====================================

async function verifyAdmin(req, res, next) {

  try {

    const header =
      req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {

      return res.status(401).json({
        success: false,
        message: "Admin authentication required."
      });
    }

    const token =
      header.substring(7);

    const decoded =
      await adminAuth.verifyIdToken(token);

    if (!ADMIN_UIDS.includes(decoded.uid)) {

      return res.status(403).json({
        success: false,
        message: "Admin access denied."
      });
    }

    req.user = decoded;

    next();

  } catch (error) {

    console.error(
      "Admin authentication error:",
      error.message
    );

    return res.status(403).json({
      success: false,
      message: "Admin authentication failed."
    });
  }
}

// =====================================
// HOME
// =====================================

app.get("/", (req, res) => {

  res.json({
    success: true,
    message:
      "RewardHub backend is running 🚀"
  });
});

// =====================================
// HEALTH
// =====================================

app.get("/api/health", (req, res) => {

  res.json({
    success: true,
    service: "RewardHub API",
    status: "online"
  });
});

// =====================================
// GET USER
// =====================================

app.get(
  "/api/user/:uid",
  verifyUser,
  async (req, res) => {

    try {

      const uid =
        req.params.uid;

      if (uid !== req.user.uid) {

        return res.status(403).json({
          success: false,
          message: "Access denied."
        });
      }

      const userRef =
        db.collection("users").doc(uid);

      const snapshot =
        await userRef.get();

      if (!snapshot.exists) {

        return res.status(404).json({
          success: false,
          message: "User not found."
        });
      }

      res.json({
        success: true,
        user: snapshot.data()
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        message: "Failed to load user."
      });
    }
  }
);

// =====================================
// DAILY REWARD
// =====================================

app.post(
  "/api/daily-reward",
  verifyUser,
  async (req, res) => {

    try {

      const uid =
        req.user.uid;

      const userRef =
        db.collection("users").doc(uid);

      const result =
        await db.runTransaction(
          async (transaction) => {

            const snapshot =
              await transaction.get(
                userRef
              );

            if (!snapshot.exists) {
              throw new Error(
                "User not found."
              );
            }

            const user =
              snapshot.data();

            const now =
              new Date();

            const lastClaim =
              user.lastDailyReward
                ? user.lastDailyReward.toDate()
                : null;

            if (lastClaim) {

              const difference =
                now.getTime() -
                lastClaim.getTime();

              const oneDay =
                24 *
                60 *
                60 *
                1000;

              if (
                difference <
                oneDay
              ) {

                throw new Error(
                  "Daily reward already claimed. Try again tomorrow."
                );
              }
            }

            const oldCoins =
              Number(
                user.coins || 0
              );

            const newCoins =
              oldCoins +
              DAILY_REWARD;

            transaction.update(
              userRef,
              {
                coins: newCoins,

                balance:
                  newCoins /
                  COINS_PER_DOLLAR,

                rewardCount:
                  Number(
                    user.rewardCount ||
                    0
                  ) + 1,

                lastDailyReward:
                  FieldValue.serverTimestamp()
              }
            );

            return {
              newCoins
            };
          }
        );

      await db
        .collection("transactions")
        .add({
          uid,

          type:
            "daily_reward",

          coins:
            DAILY_REWARD,

          status:
            "completed",

          createdAt:
            FieldValue.serverTimestamp()
        });

      res.json({

        success: true,

        message:
          `You received ${DAILY_REWARD} coins.`,

        coins:
          result.newCoins
      });

    } catch (error) {

      console.error(error);

      res.status(400).json({

        success: false,

        message:
          error.message
      });
    }
  }
);

// =====================================
// QUIZ COMPLETE
// =====================================

app.post(
  "/api/quiz/complete",
  verifyUser,
  async (req, res) => {

    try {

      const uid =
        req.user.uid;

      const correct =
        Math.max(
          0,
          Math.min(
            10,
            Number(
              req.body.correctAnswers ||
              0
            )
          )
        );

      const earnedCoins =
        correct *
        QUIZ_REWARD;

      const userRef =
        db.collection("users").doc(uid);

      const result =
        await db.runTransaction(
          async (transaction) => {

            const snapshot =
              await transaction.get(
                userRef
              );

            if (!snapshot.exists) {

              throw new Error(
                "User not found."
              );
            }

            const user =
              snapshot.data();

            const oldCoins =
              Number(
                user.coins || 0
              );

            const newCoins =
              oldCoins +
              earnedCoins;

            transaction.update(
              userRef,
              {

                coins:
                  newCoins,

                balance:
                  newCoins /
                  COINS_PER_DOLLAR,

                quizScore:
                  Number(
                    user.quizScore ||
                    0
                  ) + correct
              }
            );

            return {
              newCoins
            };
          }
        );

      await db
        .collection("transactions")
        .add({

          uid,

          type:
            "quiz",

          correctAnswers:
            correct,

          coins:
            earnedCoins,

          status:
            "completed",

          createdAt:
            FieldValue.serverTimestamp()
        });

      res.json({

        success: true,

        message:
          "Quiz completed.",

        earnedCoins,

        coins:
          result.newCoins
      });

    } catch (error) {

      console.error(error);

      res.status(400).json({

        success: false,

        message:
          error.message
      });
    }
  }
);

// =====================================
// CREATE WITHDRAWAL
// =====================================

app.post(
  "/api/withdraw",
  verifyUser,
  async (req, res) => {

    try {

      const uid =
        req.user.uid;

      const amount =
        Number(
          req.body.amount
        );

      const method =
        req.body.method;

      const paymentAccount =
        String(
          req.body.paymentAccount ||
          ""
        ).trim();

      if (
        !amount ||
        amount <
        MIN_WITHDRAWAL
      ) {

        return res.status(400).json({

          success: false,

          message:
            `Minimum withdrawal is $${MIN_WITHDRAWAL}.`
        });
      }

      if (
        !method ||
        !paymentAccount
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Payment details are required."
        });
      }

      const userRef =
        db.collection("users").doc(uid);

      const withdrawalRef =
        db.collection("withdrawals").doc();

      const transactionRef =
        db.collection("transactions").doc();

      await db.runTransaction(
        async (transaction) => {

          const snapshot =
            await transaction.get(
              userRef
            );

          if (!snapshot.exists) {

            throw new Error(
              "User not found."
            );
          }

          const user =
            snapshot.data();

          const balance =
            Number(
              user.balance || 0
            );

          if (
            amount >
            balance
          ) {

            throw new Error(
              "Insufficient balance."
            );
          }

          const remainingBalance =
            balance -
            amount;

          const remainingCoins =
            Math.floor(
              remainingBalance *
              COINS_PER_DOLLAR
            );

          transaction.update(
            userRef,
            {
              balance:
                remainingBalance,

              coins:
                remainingCoins
            }
          );

          transaction.set(
            withdrawalRef,
            {

              uid,

              amount,

              method,

              paymentAccount,

              status:
                "pending",

              createdAt:
                FieldValue.serverTimestamp()
            }
          );

          transaction.set(
            transactionRef,
            {

              uid,

              type:
                "withdrawal",

              amount,

              status:
                "pending",

              withdrawalId:
                withdrawalRef.id,

              createdAt:
                FieldValue.serverTimestamp()
            }
          );
        }
      );

      res.json({

        success: true,

        status:
          "pending",

        message:
          "Withdrawal request submitted for admin approval.",

        withdrawalId:
          withdrawalRef.id
      });

    } catch (error) {

      console.error(error);

      res.status(400).json({

        success: false,

        message:
          error.message
      });
    }
  }
);

// =====================================
// USER WITHDRAWAL HISTORY
// =====================================

app.get(
  "/api/withdrawals/:uid",
  verifyUser,
  async (req, res) => {

    try {

      const uid =
        req.params.uid;

      if (
        uid !==
        req.user.uid
      ) {

        return res.status(403).json({

          success: false,

          message:
            "Access denied."
        });
      }

      const snapshot =
        await db
          .collection(
            "withdrawals"
          )
          .where(
            "uid",
            "==",
            uid
          )
          .get();

      const withdrawals =
        snapshot.docs
          .map(doc => ({
            id:
              doc.id,

            ...doc.data()
          }));

      withdrawals.sort(
        (a, b) => {

          const aTime =
            a.createdAt?.toMillis?.() ||
            0;

          const bTime =
            b.createdAt?.toMillis?.() ||
            0;

          return bTime - aTime;
        }
      );

      res.json({

        success: true,

        withdrawals
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({

        success: false,

        message:
          "Failed to load withdrawals."
      });
    }
  }
);

// =====================================
// ADMIN: ALL WITHDRAWALS
// =====================================

app.get(
  "/api/admin/withdrawals",
  verifyAdmin,
  async (req, res) => {

    try {

      const snapshot =
        await db
          .collection(
            "withdrawals"
          )
          .get();

      const withdrawals =
        snapshot.docs.map(
          doc => ({

            id:
              doc.id,

            ...doc.data()
          })
        );

      withdrawals.sort(
        (a, b) => {

          const aTime =
            a.createdAt?.toMillis?.() ||
            0;

          const bTime =
            b.createdAt?.toMillis?.() ||
            0;

          return bTime - aTime;
        }
      );

      res.json({

        success: true,

        withdrawals
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({

        success: false,

        message:
          "Failed to load admin withdrawals."
      });
    }
  }
);

// =====================================
// ADMIN: APPROVE WITHDRAWAL
// =====================================

app.post(
  "/api/admin/withdrawals/:id/approve",
  verifyAdmin,
  async (req, res) => {

    try {

      const withdrawalId =
        req.params.id;

      const withdrawalRef =
        db.collection(
          "withdrawals"
        ).doc(
          withdrawalId
        );

      const withdrawalSnapshot =
        await withdrawalRef.get();

      if (
        !withdrawalSnapshot.exists
      ) {

        return res.status(404).json({

          success: false,

          message:
            "Withdrawal not found."
        });
      }

      const withdrawal =
        withdrawalSnapshot.data();

      if (
        withdrawal.status !==
        "pending"
      ) {

        return res.status(400).json({

          success: false,

          message:
            "This withdrawal is already processed."
        });
      }

      await withdrawalRef.update({

        status:
          "approved",

        approvedBy:
          req.user.uid,

        approvedAt:
          FieldValue.serverTimestamp()
      });

      res.json({

        success: true,

        message:
          "Withdrawal approved."
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({

        success: false,

        message:
          "Failed to approve withdrawal."
      });
    }
  }
);

// =====================================
// ADMIN: REJECT WITHDRAWAL
// =====================================

app.post(
  "/api/admin/withdrawals/:id/reject",
  verifyAdmin,
  async (req, res) => {

    try {

      const withdrawalId =
        req.params.id;

      const reason =
        String(
          req.body.reason ||
          "Withdrawal rejected."
        );

      const withdrawalRef =
        db.collection(
          "withdrawals"
        ).doc(
          withdrawalId
        );

      const withdrawalSnapshot =
        await withdrawalRef.get();

      if (
        !withdrawalSnapshot.exists
      ) {

        return res.status(404).json({

          success: false,

          message:
            "Withdrawal not found."
        });
      }

      const withdrawal =
        withdrawalSnapshot.data();

      if (
        withdrawal.status !==
        "pending"
      ) {

        return res.status(400).json({

          success: false,

          message:
            "This withdrawal is already processed."
        });
      }

      const userRef =
        db.collection(
          "users"
        ).doc(
          withdrawal.uid
        );

      await db.runTransaction(
        async (transaction) => {

          const userSnapshot =
            await transaction.get(
              userRef
            );

          if (
            !userSnapshot.exists
          ) {

            throw new Error(
              "User not found."
            );
          }

          const user =
            userSnapshot.data();

          const oldBalance =
            Number(
              user.balance || 0
            );

          const oldCoins =
            Number(
              user.coins || 0
            );

          const refundAmount =
            Number(
              withdrawal.amount || 0
            );

          const newBalance =
            oldBalance +
            refundAmount;

          const newCoins =
            oldCoins +
            Math.floor(
              refundAmount *
              COINS_PER_DOLLAR
            );

          transaction.update(
            userRef,
            {

              balance:
                newBalance,

              coins:
                newCoins
            }
          );

          transaction.update(
            withdrawalRef,
            {

              status:
                "rejected",

              rejectionReason:
                reason,

              rejectedBy:
                req.user.uid,

              rejectedAt:
                FieldValue.serverTimestamp()
            }
          );
        }
      );

      res.json({

        success: true,

        message:
          "Withdrawal rejected and balance refunded."
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({

        success: false,

        message:
          error.message
      });
    }
  }
);

// =====================================
// START SERVER
// =====================================

app.listen(
  PORT,
  () => {

    console.log(
      `🚀 RewardHub backend running on port ${PORT}`
    );

  }
);