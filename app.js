import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyDIH7_hmnWw3EbNWiT86Ttda-V86P2Yves",
  authDomain: "project-patner-finder.firebaseapp.com",
  projectId: "project-patner-finder",
  storageBucket: "project-patner-finder.firebasestorage.app",
  messagingSenderId: "80084049814",
  appId: "1:80084049814:web:f7a22c1fc45d3daaf207b7",
  measurementId: "G-29GR54P272"
};


const configured =
  firebaseConfig.apiKey &&
  !firebaseConfig.apiKey.includes("YOUR_") &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId;

let auth = null;
let db = null;

if (configured) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}


const $ = id => document.getElementById(id);

let currentUser = null;
let currentProfile = null;
let allStudents = [];


function toast(message) {
  const el = $("toast");

  if (!el) return;

  el.textContent = message;
  el.classList.add("show");

  setTimeout(() => {
    el.classList.remove("show");
  }, 3000);
}


function setAuthError(message = "") {
  const errorElement = $("authError");

  if (errorElement) {
    errorElement.textContent = message;
  }
}

function friendlyError(error) {

  const messages = {
    "auth/email-already-in-use":
      "An account already exists with this email.",

    "auth/invalid-email":
      "Please enter a valid email address.",

    "auth/weak-password":
      "Choose a password with at least 6 characters.",

    "auth/invalid-credential":
      "Email or password is incorrect.",

    "auth/user-not-found":
      "No account was found for this email.",

    "auth/wrong-password":
      "Email or password is incorrect.",

    "auth/too-many-requests":
      "Too many attempts. Please try again later.",

    "auth/api-key-not-valid":
      "Firebase API key is invalid. Check your Firebase project configuration.",

    "auth/requires-recent-login":
      "Please sign out, log in again and then change your email.",

    "auth/operation-not-allowed":
      "Changing email is not allowed. Check your Firebase Authentication settings.",

    "permission-denied":
      "You do not have permission to perform this action."
  };

  return messages[error.code] ||
    error.message ||
    "Something went wrong. Please try again.";
}


function switchAuth(mode) {

  const login = mode === "login";

  $("loginForm").classList.toggle("hidden", !login);
  $("signupForm").classList.toggle("hidden", login);

  $("loginTab").classList.toggle("active", login);
  $("signupTab").classList.toggle("active", !login);

  $("authTitle").textContent = login
    ? "Welcome back"
    : "Create your account";

  $("authSubtitle").textContent = login
    ? "Sign in to continue to your student workspace."
    : "Join the RV University student project community.";

  setAuthError("");
}

$("loginTab").addEventListener("click", () => {
  switchAuth("login");
});

$("signupTab").addEventListener("click", () => {
  switchAuth("signup");
});

if ($("yearNow")) {
  $("yearNow").textContent = new Date().getFullYear();
}


function showApp(user, profile) {

  currentUser = user;
  currentProfile = profile || {};

  $("authView").classList.add("hidden");
  $("appView").classList.remove("hidden");

  const name =
    currentProfile.name ||
    user.displayName ||
    (user.email ? user.email.split("@")[0] : "RVU Student");

  $("sideName").textContent = name;
  $("sideEmail").textContent = user.email || "";

  const initial = name.charAt(0).toUpperCase();

  $("sideAvatar").textContent = initial;
  $("topAvatar").textContent = initial;
  $("profileAvatar").textContent = initial;

  $("welcomeName").textContent = `Welcome, ${name}`;
  $("profileHeading").textContent = name;

  $("profileName").value = currentProfile.name || name;
  $("profileUsn").value = currentProfile.usn || "";
  $("profileEmail").value = user.email || "";
  $("profileCurrentPassword").value = "";
  $("emailPasswordRow").classList.add("hidden");

  $("profileDepartment").value =
    currentProfile.department || "Other";

  $("profileYear").value =
    currentProfile.year || "1st Year";

  $("profileSkills").value =
    (currentProfile.skills || []).join(", ");

  $("profileAbout").value =
    currentProfile.about || "";

  loadStudents();
}


function showAuth() {

  currentUser = null;
  currentProfile = null;
  allStudents = [];

  $("appView").classList.add("hidden");
  $("authView").classList.remove("hidden");
}


async function loadProfile(user) {

  const profileRef = doc(db, "users", user.uid);

  const snapshot = await getDoc(profileRef);

  return snapshot.exists()
    ? snapshot.data()
    : null;
}


$("loginForm").addEventListener("submit", async event => {

  event.preventDefault();

  setAuthError("");

  if (!configured || !auth) {
    return setAuthError(
      "Firebase configuration is missing or invalid. Check app.js."
    );
  }

  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;

  try {

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    toast("Login successful.");

  } catch (error) {

    console.error("Login error:", error);
    setAuthError(friendlyError(error));

  }

});


$("signupForm").addEventListener("submit", async event => {

  event.preventDefault();

  setAuthError("");

  if (!configured || !auth || !db) {
    return setAuthError(
      "Firebase configuration is missing or invalid."
    );
  }

  const name = $("signupName").value.trim();
  const usn = $("signupUsn").value.trim();
  const email = $("signupEmail").value.trim();
  const department = $("signupDepartment").value;
  const year = $("signupYear").value;
  const password = $("signupPassword").value;

  if (!name || !usn || !email || !department || !year || !password) {
    return setAuthError("Please fill in all required fields.");
  }

  try {

    const credential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    await updateProfile(credential.user, {
      displayName: name
    });

    const profile = {

      uid: credential.user.uid,

      name: name,

      usn: usn,

      email: email,

      department: department,

      year: year,

      skills: [],

      about: "",

      createdAt: serverTimestamp(),

      updatedAt: serverTimestamp()

    };

    await setDoc(
      doc(db, "users", credential.user.uid),
      profile
    );

    toast("Your account has been created.");

  } catch (error) {

    console.error("Registration error:", error);
    setAuthError(friendlyError(error));

  }

});


$("forgotPassword").addEventListener("click", async () => {

  if (!configured || !auth) {
    return setAuthError(
      "Configure Firebase first to enable password recovery."
    );
  }

  const email = $("loginEmail").value.trim();

  if (!email) {
    return setAuthError("Enter your email address first.");
  }

  try {

    await sendPasswordResetEmail(auth, email);

    toast("Password reset email sent. Check your inbox.");

  } catch (error) {

    setAuthError(friendlyError(error));

  }

});


$("logoutBtn").addEventListener("click", async () => {

  if (!auth) return;

  try {

    await signOut(auth);

    toast("You have been logged out.");

  } catch (error) {

    toast(friendlyError(error));

  }

});


$("menuBtn").addEventListener("click", () => {

  $("sidebar").classList.toggle("open");

});


function navigate(page) {

  document.querySelectorAll(".page").forEach(element => {

    element.classList.toggle(
      "active",
      element.id === `page-${page}`
    );

  });

  document.querySelectorAll(".nav-link[data-page]")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.page === page
      );

    });

  $("sidebar").classList.remove("open");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}

document.querySelectorAll("[data-page]").forEach(button => {

  button.addEventListener("click", () => {

    navigate(button.dataset.page);

  });

});

document.querySelectorAll("[data-go]").forEach(button => {

  button.addEventListener("click", () => {

    navigate(button.dataset.go);

  });

});


$("profileEmail").addEventListener("input", () => {

  const typed = $("profileEmail").value.trim().toLowerCase();
  const current = ((currentUser && currentUser.email) || "").toLowerCase();

  $("emailPasswordRow").classList.toggle("hidden", typed === current);

});


$("profileForm").addEventListener("submit", async event => {

  event.preventDefault();

  if (!currentUser || !db) {
    return;
  }

  const message = $("profileMessage");

  message.textContent = "Saving...";

  const name = $("profileName").value.trim();

  if (!name) {
    message.textContent = "Please enter your name.";
    return;
  }

  const skills = $("profileSkills")
    .value
    .split(",")
    .map(skill => skill.trim())
    .filter(Boolean)
    .slice(0, 20);

  const year = $("profileYear").value;
  const about = $("profileAbout").value.trim();

  const usn = $("profileUsn").value.trim();
  const department = $("profileDepartment").value;

  const newEmail = $("profileEmail").value.trim();
  const oldEmail = currentUser.email || "";
  const emailChanged =
    newEmail.toLowerCase() !== oldEmail.toLowerCase();
  const currentPassword = $("profileCurrentPassword").value;

  if (emailChanged && !currentPassword) {
    message.textContent =
      "Enter your current password to change your email.";
    return;
  }

  try {

    if (emailChanged) {

      const credential = EmailAuthProvider.credential(
        oldEmail,
        currentPassword
      );

      await reauthenticateWithCredential(currentUser, credential);

      await verifyBeforeUpdateEmail(currentUser, newEmail);

    }

    await setDoc(
      doc(db, "users", currentUser.uid),

      {
        name: name,
        usn: usn,
        department: department,
        year: year,
        skills: skills,
        about: about,
        updatedAt: serverTimestamp()
      },

      { merge: true }
    );

    await updateProfile(currentUser, {
      displayName: name
    });

    currentProfile = {
      ...currentProfile,
      name: name,
      usn: usn,
      department: department,
      year: year,
      skills: skills,
      about: about
    };

    $("sideName").textContent = name;
    $("welcomeName").textContent = `Welcome, ${name}`;
    $("profileHeading").textContent = name;

    const initial = name.charAt(0).toUpperCase();

    $("sideAvatar").textContent = initial;
    $("topAvatar").textContent = initial;
    $("profileAvatar").textContent = initial;

    $("profileEmail").value = oldEmail;
    $("profileCurrentPassword").value = "";
    $("emailPasswordRow").classList.add("hidden");

    if (emailChanged) {

      message.textContent =
        `Profile saved. We sent a verification link to ${newEmail}. Click it to finish changing your email.`;

      toast("Verification link sent to your new email.");

    } else {

      message.textContent =
        "Your profile has been saved.";

      toast("Profile updated.");

    }

    loadStudents();

  } catch (error) {

    console.error("Profile update error:", error);
    message.textContent = friendlyError(error);

  }

});


async function loadStudents() {

  const grid = $("studentGrid");

  if (!currentUser || !db) {
    return;
  }

  grid.innerHTML =
    '<div class="empty-state">Loading student community…</div>';

  try {

    const studentQuery = query(
      collection(db, "users"),

      where(
        "department",
        "==",
        "School of Engineering"
      )
    );

    const snapshot = await getDocs(studentQuery);

    if (!currentUser) return;

    allStudents = snapshot.docs
      .map(document => document.data())
      .filter(student => student.uid !== currentUser.uid);

    renderStudents();

  } catch (error) {

    grid.innerHTML =
      '<div class="empty-state">Unable to load profiles. Check your Firestore rules and internet connection.</div>';

    console.error("Student directory error:", error);

  }

}


function renderStudents() {

  const term = $("studentSearch")
    .value
    .trim()
    .toLowerCase();

  const filtered = allStudents.filter(student => {

    return [
      student.name,
      student.department,
      student.about,
      ...(student.skills || [])
    ]
      .join(" ")
      .toLowerCase()
      .includes(term);

  });

  $("studentCount").textContent =
    `${filtered.length} student${filtered.length === 1 ? "" : "s"}`;

  const grid = $("studentGrid");

  if (!filtered.length) {

    grid.innerHTML =
      '<div class="empty-state">No matching student profiles found yet.</div>';

    return;

  }

  grid.innerHTML = filtered.map(student => {

    const initial =
      (student.name || "S").charAt(0).toUpperCase();

    const skills = (student.skills || [])
      .slice(0, 5)
      .map(skill => `
        <span class="skill-chip">
          ${escapeHtml(skill)}
        </span>
      `)
      .join("");

    return `

      <article class="student-card">

        <div class="student-card-head">

          <div class="large-avatar">
            ${escapeHtml(initial)}
          </div>

          <div>

            <h3>
              ${escapeHtml(student.name || "RVU Student")}
            </h3>

            <p>
              ${escapeHtml(student.department || "RV University")}
              ·
              ${escapeHtml(student.year || "Student")}
            </p>

          </div>

        </div>

        <p class="about">
          ${escapeHtml(
            student.about ||
            "This student has not added an introduction yet."
          )}
        </p>

        <div class="skill-list">

          ${skills || '<span class="muted">No skills added yet</span>'}

        </div>

      </article>

    `;

  }).join("");

}


function escapeHtml(value) {

  return String(value).replace(/[&<>"']/g, character => {

    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[character];

  });

}


$("studentSearch").addEventListener(
  "input",
  renderStudents
);


if (!configured || !auth || !db) {

  setAuthError(
    "Firebase configuration is missing. Check your Firebase web app settings in app.js."
  );

} else {

  onAuthStateChanged(auth, async user => {

    if (!user) {

      showAuth();

      return;

    }

    try {

      let profile = await loadProfile(user);

      if (profile && user.email && profile.email !== user.email) {

        profile.email = user.email;

        try {

          await setDoc(
            doc(db, "users", user.uid),

            {
              email: user.email,
              updatedAt: serverTimestamp()
            },

            { merge: true }
          );

        } catch (syncError) {

          console.error("Email sync error:", syncError);

        }

      }

      if (!profile) {

        profile = {

          uid: user.uid,

          name: user.displayName || "RVU Student",

          email: user.email,

          department: "Other",

          year: "1st Year",

          skills: [],

          about: ""

        };

        await setDoc(
          doc(db, "users", user.uid),

          {
            ...profile,

            createdAt: serverTimestamp(),

            updatedAt: serverTimestamp()
          }
        );

      }

      showApp(user, profile);

    } catch (error) {

      setAuthError(
        "Could not load your profile. Check Firestore setup and security rules."
      );

      console.error("Profile loading error:", error);

    }

  });

}