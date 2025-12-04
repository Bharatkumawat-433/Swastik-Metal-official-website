import { auth, db } from "./firebase-config.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, serverTimestamp, onSnapshot, orderBy, limit, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signOut as secSignOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 👇 YOUR CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyB-qDqAbjfa3vpNLPOZyTlp8eRdyzD4J0w",
  authDomain: "swastikmetallive.firebaseapp.com",
  projectId: "swastikmetallive",
  storageBucket: "swastikmetallive.firebasestorage.app",
  messagingSenderId: "72216642800",
  appId: "1:72216642800:web:e01759b40ac80c2dafee35"
};

auth.onAuthStateChanged(user => { if (!user) window.location.href = "login.html"; });
document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth).then(() => window.location.href = "index.html"));

// 1. Load Requests
function loadRequests() {
    onSnapshot(collection(db, "pending_requests"), (snapshot) => {
        const body = document.getElementById('requestsTableBody');
        body.innerHTML = snapshot.empty ? '<tr><td colspan="6" class="text-center text-muted">No pending requests.</td></tr>' : '';
        snapshot.forEach(doc => {
            const d = doc.data();
            const date = d.requestDate ? new Date(d.requestDate.seconds*1000).toLocaleDateString() : 'N/A';
            body.innerHTML += `<tr><td>${date}</td><td>${d.companyName}</td><td>${d.fullName}</td><td>${d.email}</td><td>${d.mobile}</td>
            <td><button class="btn btn-sm btn-success mr-2" onclick="approveUser('${doc.id}')">Approve</button><button class="btn btn-sm btn-danger" onclick="rejectUser('${doc.id}')">Reject</button></td></tr>`;
        });
    });
}

// 2. Approve User
window.approveUser = async (docId) => {
    if(!(await Swal.fire({ title: 'Approve?', icon: 'question', showCancelButton: true, confirmButtonText: 'Yes' })).isConfirmed) return;
    try {
        Swal.showLoading();
        const pendingRef = doc(db, "pending_requests", docId);
        const userData = (await getDoc(pendingRef)).data();

        const secApp = initializeApp(firebaseConfig, "Secondary");
        const secAuth = getAuth(secApp);
        const tempPass = "Swastik@" + Math.floor(1000 + Math.random()*9000);
        const cred = await createUserWithEmailAndPassword(secAuth, userData.email, tempPass);
        await secSignOut(secAuth);

        await setDoc(doc(db, "users", userData.email), {
            uid: cred.user.uid, companyName: userData.companyName, fullName: userData.fullName,
            email: userData.email, mobile: userData.mobile, address: userData.address, role: 'trader', isVerified: true, createdAt: serverTimestamp()
        });

        await emailjs.send("service_cjc1agm", "template_tt0jxw6", { to_name: userData.fullName, to_email: userData.email, temp_password: tempPass });
        await deleteDoc(pendingRef);
        Swal.fire("Success", "User Created & Email Sent!", "success");
    } catch (e) { Swal.fire("Error", e.message, "error"); }
};
window.rejectUser = async (id) => { if(confirm("Reject?")) await deleteDoc(doc(db, "pending_requests", id)); };

// 3. Metal Mgmt
document.getElementById('metalImageFile').addEventListener('change', function(e) {
    const reader = new FileReader();
    reader.onload = (e) => { document.getElementById('previewImg').src=e.target.result; document.getElementById('previewImg').style.display='block'; }
    if(e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
});

document.getElementById('addMetalForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = document.getElementById('metalImageFile').files[0];
    if(file.size > 800*1024) return Swal.fire("Error", "Image > 800KB", "error");
    const btn = document.getElementById('btnAddMetal'); btn.innerHTML='Uploading...'; btn.disabled=true;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        await addDoc(collection(db, "metals"), { name: document.getElementById('metalName').value, image: reader.result, createdAt: serverTimestamp() });
        document.getElementById('addMetalForm').reset(); document.getElementById('previewImg').style.display='none';
        Swal.fire("Success", "Metal Added", "success"); btn.innerHTML='Add Metal'; btn.disabled=false;
    };
});

function loadMetals() {
    onSnapshot(collection(db, "metals"), (snap) => {
        const body = document.getElementById('metalsTableBody');
        body.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            body.innerHTML += `<tr><td><img src="${d.image}" class="metal-img-preview"></td><td>${d.name}</td>
            <td><button class="btn btn-sm btn-info mr-1" onclick="openEditModal('${doc.id}','${d.name}','${d.image}')"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-danger" onclick="deleteMetal('${doc.id}')"><i class="fas fa-trash"></i></button></td></tr>`;
        });
    });
}
window.deleteMetal = async (id) => { if(confirm("Delete?")) await deleteDoc(doc(db, "metals", id)); };

// Edit Metal
window.openEditModal = (id, name, img) => {
    document.getElementById('editMetalId').value = id;
    document.getElementById('editMetalName').value = name;
    document.getElementById('editMetalPreview').src = img;
    $('#editMetalModal').modal('show');
};
document.getElementById('editMetalForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editMetalId').value;
    const name = document.getElementById('editMetalName').value;
    const file = document.getElementById('editMetalFile').files[0];
    let updateData = { name: name };
    if(file) {
        if(file.size > 800*1024) return Swal.fire("Error", "Image > 800KB", "error");
        const reader = new FileReader(); reader.readAsDataURL(file);
        reader.onload = async () => { updateData.image = reader.result; await updateDoc(doc(db, "metals", id), updateData); $('#editMetalModal').modal('hide'); Swal.fire("Success", "Updated", "success"); };
    } else { await updateDoc(doc(db, "metals", id), updateData); $('#editMetalModal').modal('hide'); Swal.fire("Success", "Updated", "success"); }
});

// 4. LOGIN LOGS (UPDATED for Date/Time/Mobile)
function loadLogs() {
    onSnapshot(query(collection(db, "login_logs"), orderBy("loginTime", "desc"), limit(50)), (snap) => {
        const body = document.getElementById('logsTableBody'); body.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            let dateStr = "N/A", timeStr = "N/A";
            if(d.loginTime) {
                const dateObj = new Date(d.loginTime.seconds*1000);
                dateStr = dateObj.toLocaleDateString();
                timeStr = dateObj.toLocaleTimeString();
            }
            // Rendering Company, Name, Phone
            body.innerHTML += `
                <tr>
                    <td style="color:#aaa;">${dateStr}</td>
                    <td style="color:#a8741a;">${timeStr}</td>
                    <td><strong>${d.companyName}</strong></td>
                    <td>${d.userName}</td>
                    <td>${d.userMobile}</td>
                </tr>`;
        });
    });
    cleanOldLogs();
}

async function cleanOldLogs() {
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const q = query(collection(db, "login_logs"), where("loginTime", "<", sevenDaysAgo));
    const snapshot = await getDocs(q);
    snapshot.forEach(async (docSnap) => { await deleteDoc(docSnap.ref); });
}

loadRequests(); loadMetals(); loadLogs();