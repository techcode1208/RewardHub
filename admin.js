import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "firebase/auth";

import app from "./firebase.js";

const auth =
  getAuth(app);

const API_URL =
  "http://localhost:3000";

const table =
  document.getElementById(
    "withdrawalTable"
  );

const message =
  document.getElementById(
    "message"
  );

const refreshBtn =
  document.getElementById(
    "refreshBtn"
  );

const logoutBtn =
  document.getElementById(
    "logoutBtn"
  );


// =====================================
// AUTH
// =====================================

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      window.location.href =
        "./index.html";

      return;
    }

    await loadWithdrawals();
  }
);


// =====================================
// GET TOKEN
// =====================================

async function getToken() {

  const user =
    auth.currentUser;

  if (!user) {

    throw new Error(
      "Please login first."
    );
  }

  return await user.getIdToken();
}


// =====================================
// LOAD WITHDRAWALS
// =====================================

async function loadWithdrawals() {

  try {

    table.innerHTML = `
      <tr>
        <td colspan="7">
          Loading...
        </td>
      </tr>
    `;

    const token =
      await getToken();

    const response =
      await fetch(
        `${API_URL}/api/admin/withdrawals`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`
          }
        }
      );

    const result =
      await response.json();

    if (!response.ok) {

      throw new Error(
        result.message ||
        "Failed to load withdrawals."
      );
    }

    displayWithdrawals(
      result.withdrawals || []
    );

  } catch (error) {

    console.error(error);

    showMessage(
      error.message
    );

    table.innerHTML = `
      <tr>
        <td colspan="7">
          ${escapeHtml(
            error.message
          )}
        </td>
      </tr>
    `;
  }
}


// =====================================
// DISPLAY
// =====================================

function displayWithdrawals(
  withdrawals
) {

  let pending = 0;
  let approved = 0;
  let rejected = 0;

  withdrawals.forEach(
    item => {

      if (
        item.status ===
        "pending"
      ) {
        pending++;
      }

      if (
        item.status ===
        "approved"
      ) {
        approved++;
      }

      if (
        item.status ===
        "rejected"
      ) {
        rejected++;
      }
    }
  );

  document.getElementById(
    "totalCount"
  ).textContent =
    withdrawals.length;

  document.getElementById(
    "pendingCount"
  ).textContent =
    pending;

  document.getElementById(
    "approvedCount"
  ).textContent =
    approved;

  document.getElementById(
    "rejectedCount"
  ).textContent =
    rejected;


  if (
    withdrawals.length === 0
  ) {

    table.innerHTML = `
      <tr>
        <td colspan="7">
          No withdrawal requests.
        </td>
      </tr>
    `;

    return;
  }


  table.innerHTML = "";


  withdrawals.forEach(
    withdrawal => {

      const row =
        document.createElement(
          "tr"
        );

      const status =
        withdrawal.status ||
        "pending";

      let actions = "-";


      if (
        status ===
        "pending"
      ) {

        actions = `
          <button
            class="approve"
            data-id="${escapeHtml(
              withdrawal.id
            )}"
          >
            Approve
          </button>

          <button
            class="reject"
            data-id="${escapeHtml(
              withdrawal.id
            )}"
          >
            Reject
          </button>
        `;
      }


      row.innerHTML = `

        <td>
          ${escapeHtml(
            withdrawal.id
          )}
        </td>

        <td>
          ${escapeHtml(
            withdrawal.uid
          )}
        </td>

        <td>
          $${Number(
            withdrawal.amount ||
            0
          ).toFixed(2)}
        </td>

        <td>
          ${escapeHtml(
            withdrawal.method ||
            "-"
          )}
        </td>

        <td>
          ${escapeHtml(
            withdrawal.paymentAccount ||
            "-"
          )}
        </td>

        <td>

          <span
            class="status ${escapeHtml(
              status
            )}"
          >
            ${escapeHtml(
              status
            )}
          </span>

        </td>

        <td>
          ${actions}
        </td>
      `;


      table.appendChild(row);
    }
  );


  document
    .querySelectorAll(
      ".approve"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          approveWithdrawal(
            button.dataset.id
          );
        }
      );
    });


  document
    .querySelectorAll(
      ".reject"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          rejectWithdrawal(
            button.dataset.id
          );
        }
      );
    });
}


// =====================================
// APPROVE
// =====================================

async function approveWithdrawal(
  id
) {

  const confirmApprove =
    confirm(
      "Approve this withdrawal?"
    );

  if (!confirmApprove) {
    return;
  }

  try {

    const token =
      await getToken();

    const response =
      await fetch(
        `${API_URL}/api/admin/withdrawals/${id}/approve`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`
          }
        }
      );

    const result =
      await response.json();

    if (!response.ok) {

      throw new Error(
        result.message ||
        "Approval failed."
      );
    }

    showMessage(
      "Withdrawal approved successfully."
    );

    await loadWithdrawals();

  } catch (error) {

    showMessage(
      error.message
    );
  }
}


// =====================================
// REJECT
// =====================================

async function rejectWithdrawal(
  id
) {

  const reason =
    prompt(
      "Why are you rejecting this withdrawal?"
    );

  if (
    reason === null
  ) {
    return;
  }

  try {

    const token =
      await getToken();

    const response =
      await fetch(
        `${API_URL}/api/admin/withdrawals/${id}/reject`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`
          },

          body: JSON.stringify({
            reason:
              reason.trim() ||
              "Withdrawal rejected."
          })
        }
      );

    const result =
      await response.json();

    if (!response.ok) {

      throw new Error(
        result.message ||
        "Rejection failed."
      );
    }

    showMessage(
      "Withdrawal rejected and balance refunded."
    );

    await loadWithdrawals();

  } catch (error) {

    showMessage(
      error.message
    );
  }
}


// =====================================
// REFRESH
// =====================================

if (refreshBtn) {

  refreshBtn.addEventListener(
    "click",
    loadWithdrawals
  );
}


// =====================================
// LOGOUT
// =====================================

if (logoutBtn) {

  logoutBtn.addEventListener(
    "click",
    async () => {

      await signOut(auth);

      window.location.href =
        "./index.html";
    }
  );
}


// =====================================
// MESSAGE
// =====================================

function showMessage(
  text
) {

  message.textContent =
    text;

  message.style.display =
    "block";

  setTimeout(() => {

    message.style.display =
      "none";

  }, 4000);
}


// =====================================
// HTML ESCAPE
// =====================================

function escapeHtml(
  value
) {

  return String(
    value ?? ""
  )
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll(
      "'",
      "&#039;"
    );
}