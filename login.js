import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const btn = document.querySelector('.btn-login');

    btn.innerHTML = 'Verifying...';
    btn.disabled = true;

    try {
        // 1. Firebase Auth Login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Fetch User Details from Firestore
        const q = query(collection(db, "users"), where("email", "==", email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            
            // 3. SAVE LOGIN HISTORY (Detailed)
            // Hum wait kar rahe hain taki data save ho jaye
            try {
                await addDoc(collection(db, "login_logs"), {
                    email: email,
                    userName: userData.fullName || "Admin",
                    companyName: userData.companyName || "System Admin",
                    userMobile: userData.mobile || "N/A",
                    role: userData.role,
                    loginTime: serverTimestamp() // Server ka time
                });
            } catch (logError) {
                console.error("Logging failed:", logError);
            }

            // 4. Redirect based on Role
            if (userData.role === 'admin') {
                window.location.href = "admin-dashboard.html";
            } else {
                window.location.href = "user-dashboard.html"; 
            }
        } else {
            // Agar Auth me hai par Database me nahi (Admin manual case)
            if(email === "admin@sm.com") { // Replace with your admin email if needed
                 window.location.href = "admin-dashboard.html";
            } else {
                Swal.fire("Error", "User record not found in database.", "error");
            }
        }

    } catch (error) {
        console.error("Login Error:", error);
        Swal.fire("Login Failed", "Invalid Email or Password", "error");
    } finally {
        btn.innerHTML = 'Login';
        btn.disabled = false;
    }
});