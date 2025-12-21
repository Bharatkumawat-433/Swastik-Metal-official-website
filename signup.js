import { db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.getElementById('signupForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // 1. Get Values
    const company = document.getElementById('companyName').value;
    const name = document.getElementById('fullName').value;
    const email = document.getElementById('email').value.toLowerCase().trim(); // Clean Email
    const mobile = document.getElementById('mobile').value;
    const address = document.getElementById('address').value;
    const submitBtn = document.querySelector('.btn-register');

    submitBtn.innerHTML = 'Checking Availability...';
    submitBtn.disabled = true;

    try {
        // === 2. DUPLICATE CHECK (Users & Pending) 
        // Check 1: Kya ye User pehle se verified list me hai?
        const qUsers = query(collection(db, "users"), where("email", "==", email));
        const snapUsers = await getDocs(qUsers);

        // Check 2: Kya ye Request pehle se pending list me hai?
        const qPending = query(collection(db, "pending_requests"), where("email", "==", email));
        const snapPending = await getDocs(qPending);

        if (!snapUsers.empty) {
            throw new Error("This Email is ALREADY REGISTERED and Active. Please Login.");
        }

        if (!snapPending.empty) {
            throw new Error("Request for this Email is already PENDING approval.");
        }

        // === 3. Submit Request ===
        submitBtn.innerHTML = 'Sending Request...';
        
        await addDoc(collection(db, "pending_requests"), {
            companyName: company,
            fullName: name,
            email: email,
            mobile: mobile,
            address: address,
            status: "pending",
            requestDate: serverTimestamp()
        });

        Swal.fire({
            title: 'Request Sent!',
            text: 'Your details have been submitted for Admin verification.',
            icon: 'success',
            confirmButtonColor: '#a8741a',
            background: '#242424',
            color: '#fff'
        }).then(() => {
            document.getElementById('signupForm').reset();
        });

    } catch (error) {
        console.error("Error:", error);
        Swal.fire({
            title: 'Registration Failed',
            text: error.message, // "Email already registered" message yahan dikhega
            icon: 'warning',
            confirmButtonColor: '#d33',
            background: '#242424',
            color: '#fff'
        });
    } finally {
        submitBtn.innerHTML = 'Submit Request';
        submitBtn.disabled = false;
    }
});

