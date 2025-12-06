import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, getDocs, addDoc, serverTimestamp, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const btn = document.querySelector('.btn-login');

    btn.innerHTML = 'Verifying...';
    btn.disabled = true;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Get User Data
        const userDocRef = doc(db, "users", email);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();

            // === 3. EXPIRY CHECK (SUBSCRIPTION LOGIC) ===
            if (userData.role === 'trader') {
                const now = new Date();
                const expiry = userData.expiryDate ? userData.expiryDate.toDate() : new Date(0); // Default to past if missing

                if (now > expiry) {
                    await auth.signOut(); // Logout immediately
                    Swal.fire({
                        title: 'Access Expired!',
                        html: `<p style="color:#aaa">Your free trial/plan has expired on <b>${expiry.toLocaleDateString()}</b>.</p>
                               <p style="color:#fff">Please contact Admin to extend validity.</p>
                               <div style="background:#333; padding:10px; border-radius:5px; margin-top:10px;">
                                 <i class="fas fa-phone-alt text-warning"></i> +91 9982593535
                               </div>`,
                        icon: 'error',
                        background: '#242424',
                        color: '#fff',
                        confirmButtonColor: '#a8741a'
                    });
                    btn.innerHTML = 'Login';
                    btn.disabled = false;
                    return; // Stop execution
                }
            }

            // 4. Save Login Log
            try {
                await addDoc(collection(db, "login_logs"), {
                    email: email,
                    userName: userData.fullName || "Admin",
                    companyName: userData.companyName || "System",
                    userMobile: userData.mobile || "N/A",
                    role: userData.role,
                    loginTime: serverTimestamp()
                });
            } catch(e) { console.log("Log error"); }

            // 5. Redirect
            if (userData.role === 'admin') {
                window.location.href = "admin-dashboard.html";
            } else {
                window.location.href = "user-dashboard.html"; 
            }

        } else {
            // Admin Special Case (Manual DB Entry Missing)
            if(email === "admin@sm.com") window.location.href = "admin-dashboard.html";
            else Swal.fire("Error", "User data not found.", "error");
        }

    } catch (error) {
        console.error(error);
        Swal.fire("Login Failed", "Invalid Email or Password", "error");
    } finally {
        btn.innerHTML = 'Login';
        btn.disabled = false;
    }
});

