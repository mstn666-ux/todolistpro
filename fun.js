import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBE1kqtzjAHKXyxOQI333KKpB2FZCA9nNs",
  authDomain: "todobase-39486.firebaseapp.com",
  projectId: "todobase-39486",
  storageBucket: "todobase-39486.firebasestorage.app",
  messagingSenderId: "7336152078",
  appId: "1:7336152078:web:76458966e9af524d0a005f",
  measurementId: "G-VSCLLEMXVW"
};

// Firebase init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// HTML elements
const authContainer = document.getElementById("authContainer");
const todoContainer = document.getElementById("todoContainer");
const taskList = document.getElementById("taskList");
const taskInput = document.getElementById("taskInput");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const logoutBtn = document.getElementById("logoutBtn");
const addTaskBtn = document.getElementById("addTaskBtn");
const taskCount = document.getElementById("taskCount");

let unsubscribeTasks = null;

// Helpers
function showAuth() {
  authContainer.style.display = "block";
  todoContainer.style.display = "none";
}

function showTodo() {
  authContainer.style.display = "none";
  todoContainer.style.display = "block";
}

function setButtonState(button, isLoading, loadingText, normalText) {
  if (!button) return;
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : normalText;
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Auth state
onAuthStateChanged(auth, (user) => {
  if (unsubscribeTasks) {
    unsubscribeTasks();
    unsubscribeTasks = null;
  }

  if (user) {
    showTodo();
    listenToTasks(user.uid);
  } else {
    showAuth();
    taskList.innerHTML = "";
    taskCount.textContent = "0 مهام متبقية";
  }
});

// Create account
signupBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    alert("أدخل البريد الإلكتروني وكلمة المرور");
    return;
  }

  if (password.length < 6) {
    alert("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
    return;
  }

  try {
    setButtonState(signupBtn, true, "جارٍ إنشاء الحساب...", "إنشاء حساب");

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      createdAt: serverTimestamp()
    });

    alert("تم إنشاء الحساب بنجاح");
  } catch (error) {
    console.error("Signup error:", error);
    alert("خطأ في إنشاء الحساب: " + error.message);
  } finally {
    setButtonState(signupBtn, false, "جارٍ إنشاء الحساب...", "إنشاء حساب");
  }
});

// Login
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    alert("أدخل البريد الإلكتروني وكلمة المرور");
    return;
  }

  try {
    setButtonState(loginBtn, true, "جارٍ تسجيل الدخول...", "دخول");
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error("Login error:", error);
    alert("فشل تسجيل الدخول: " + error.message);
  } finally {
    setButtonState(loginBtn, false, "جارٍ تسجيل الدخول...", "دخول");
  }
});

// Logout
logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout error:", error);
    alert("خطأ في تسجيل الخروج: " + error.message);
  }
});

// Add task
async function addTask() {
  const text = taskInput.value.trim();

  if (!text) {
    alert("اكتب مهمة أولاً");
    return;
  }

  if (!auth.currentUser) {
    alert("يجب تسجيل الدخول أولاً");
    return;
  }

  try {
    setButtonState(addTaskBtn, true, "جارٍ الإضافة...", "إضافة");

    await addDoc(collection(db, "tasks"), {
      text: text,
      completed: false,
      userId: auth.currentUser.uid,
      createdAt: serverTimestamp()
    });

    taskInput.value = "";
    taskInput.focus();
  } catch (error) {
    console.error("Add task error:", error);
    alert("خطأ في إضافة المهمة: " + error.message);
  } finally {
    setButtonState(addTaskBtn, false, "جارٍ الإضافة...", "إضافة");
  }
}

addTaskBtn.addEventListener("click", addTask);

taskInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    addTask();
  }
});

// Listen to tasks
function listenToTasks(uid) {
  const q = query(
    collection(db, "tasks"),
    where("userId", "==", uid)
  );

  unsubscribeTasks = onSnapshot(
    q,
    (snapshot) => {
      taskList.innerHTML = "";
      let count = 0;
      const tasks = [];

      snapshot.forEach((docSnap) => {
        const task = {
          id: docSnap.id,
          ...docSnap.data()
        };
        tasks.push(task);
      });

      // ترتيب يدوي من الأحدث إلى الأقدم
      tasks.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

      tasks.forEach((task) => {
        if (!task.completed) count++;
        renderTask(task);
      });

      taskCount.textContent = `${count} مهام متبقية`;
    },
    (error) => {
      console.error("Snapshot error:", error);
      alert("خطأ في تحميل المهام: " + error.message);
    }
  );
}

// Render task
function renderTask(task) {
  const li = document.createElement("li");

  if (task.completed) {
    li.classList.add("completed");
  }

  li.innerHTML = `
    <span class="task-text">${escapeHTML(task.text)}</span>
    <div class="btn-group">
      <button class="complete-btn">✓</button>
      <button class="delete-btn">✕</button>
    </div>
  `;

  const deleteBtn = li.querySelector(".delete-btn");
  const completeBtn = li.querySelector(".complete-btn");

  deleteBtn.addEventListener("click", async () => {
    try {
      await deleteDoc(doc(db, "tasks", task.id));
    } catch (error) {
      console.error("Delete error:", error);
      alert("خطأ في حذف المهمة: " + error.message);
    }
  });

  completeBtn.addEventListener("click", async () => {
    try {
      await updateDoc(doc(db, "tasks", task.id), {
        completed: !task.completed
      });
    } catch (error) {
      console.error("Update error:", error);
      alert("خطأ في تحديث المهمة: " + error.message);
    }
  });

  taskList.appendChild(li);
}