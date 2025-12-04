import { db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.getElementById('signupForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // 1. Get Values
    const company = document.getElementById('companyName').value;
    const name = document.getElementById('fullName').value;
    const email = document.getElementById('email').value.toLowerCase(); // keep email lowercase
    const mobile = document.getElementById('mobile').value;
    const address = document.getElementById('address').value;
    const submitBtn = document.querySelector('.btn-register');

    // Button Loading State
    submitBtn.innerHTML = 'Sending Request...';
    submitBtn.disabled = true;

    try {
        // 2. Check if email already exists in 'pending_requests' or 'users'
        // (Ye basic check hai, advanced check hum cloud functions se bhi kar sakte hain)
        const q = query(collection(db, "pending_requests"), where("email", "==", email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            throw new Error("This email request is already pending!");
        }

        // 3. Save to Firestore (Not creating Auth User yet)
        await addDoc(collection(db, "pending_requests"), {
            companyName: company,
            fullName: name,
            email: email,
            mobile: mobile,
            address: address,
            status: "pending", // Admin will change this to 'approved'
            requestDate: serverTimestamp()
        });

        // 4. Success Alert
        Swal.fire({
            title: 'Request Sent!',
            text: 'Your registration details have been sent to the Admin. Once verified, you will receive an email to set your password.',
            icon: 'success',
            confirmButtonColor: '#a8741a',
            background: '#242424',
            color: '#fff'
        }).then(() => {
            // Optional: Redirect to home or clear form
            document.getElementById('signupForm').reset();
        });

    } catch (error) {
        console.error("Error:", error);
        Swal.fire({
            title: 'Error!',
            text: error.message,
            icon: 'error',
            confirmButtonColor: '#d33',
            background: '#242424',
            color: '#fff'
        });
    } finally {
        submitBtn.innerHTML = 'Submit Request';
        submitBtn.disabled = false;
    }
});