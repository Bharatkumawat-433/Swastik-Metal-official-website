import { auth, db } from "./firebase-config.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, serverTimestamp, onSnapshot, orderBy, limit, where, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut as secSignOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

// 1. VERIFICATION (Auto 'Trial' Plan)
function loadRequests() {
    onSnapshot(collection(db, "pending_requests"), (snapshot) => {
        const body = document.getElementById('requestsTableBody');
        body.innerHTML = snapshot.empty ? '<tr><td colspan="6" class="text-center text-muted">No pending requests.</td></tr>' : '';
        snapshot.forEach(doc => {
            const d = doc.data();
            const date = d.requestDate ? new Date(d.requestDate.seconds*1000).toLocaleDateString('en-GB') : 'N/A';
            body.innerHTML += `<tr><td>${date}</td><td>${d.companyName}</td><td>${d.fullName}</td><td>${d.email}</td><td>${d.mobile}</td>
            <td><button class="btn btn-sm btn-success mr-2" onclick="approveUser('${doc.id}')">Approve</button><button class="btn btn-sm btn-danger" onclick="rejectUser('${doc.id}')">Reject</button></td></tr>`;
        });
    });
}

window.approveUser = async (docId) => {
    if(!(await Swal.fire({ title: 'Approve?', text: "Starts 1 Month Trial.", icon: 'question', showCancelButton: true, confirmButtonText: 'Yes' })).isConfirmed) return;
    try {
        Swal.fire({ title: 'Processing...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const pendingRef = doc(db, "pending_requests", docId);
        const userData = (await getDoc(pendingRef)).data();

        const secApp = initializeApp(firebaseConfig, "Secondary");
        const secAuth = getAuth(secApp);
        let finalUid="", isOld=false;
        const tempPass = "Swastik@" + Math.floor(1000 + Math.random()*9000);

        try {
            const cred = await createUserWithEmailAndPassword(secAuth, userData.email, tempPass);
            finalUid = cred.user.uid;
           await emailjs.send("service_cjc1agm", "template_tt0jxw6", { to_name: userData.fullName, to_email: userData.email, temp_password: tempPass });
        } catch (e) {
            if (e.code === 'auth/email-already-in-use') { isOld=true; finalUid="EXISTING"; await sendPasswordResetEmail(secAuth, userData.email); } else throw e;
        }
        await secSignOut(secAuth);

        const expiry = new Date(); expiry.setDate(expiry.getDate() + 30);

        await setDoc(doc(db, "users", userData.email), {
            uid: finalUid, companyName: userData.companyName, fullName: userData.fullName,
            email: userData.email, mobile: userData.mobile, address: userData.address, 
            role: 'trader', isVerified: true, createdAt: serverTimestamp(),
            expiryDate: Timestamp.fromDate(expiry),
            activePlanName: 'Trial' // 👈 SAVING PLAN NAME
        });

        await deleteDoc(pendingRef);
        Swal.fire("Success", isOld ? "User Re-activated." : "User Created.", "success");
    } catch (e) { console.error(e); Swal.fire("Error", e.message, "error"); }
};
window.rejectUser = async (id) => { if(confirm("Reject?")) await deleteDoc(doc(db, "pending_requests", id)); };


// ===================================
// 2. MANAGE USERS (Update for Plan Name & Calendar)
// ===================================
window.loadUsers = function() {
    const q = query(collection(db, "users"), where("role", "==", "trader"));
    onSnapshot(q, (snapshot) => {
        const body = document.getElementById('usersTableBody');
        body.innerHTML = snapshot.empty ? '<tr><td colspan="6" class="text-center">No active users.</td></tr>' : '';
        
        snapshot.forEach(docSnap => {
            const u = docSnap.data();
            let expiryObj = u.expiryDate ? u.expiryDate.toDate() : new Date();
            const isExpired = new Date() > expiryObj;
            const expiryStr = expiryObj.toLocaleDateString('en-GB');
            const statusBadge = isExpired ? '<span class="badge bg-danger">Expired</span>' : '<span class="badge bg-success">Active</span>';
            const dateClass = isExpired ? 'text-expiry-expired' : 'text-expiry-valid';
            const planName = u.activePlanName || 'Trial';

            body.innerHTML += `
                <tr>
                    <td><strong style="color:white">${u.companyName}</strong><br><small style="color:#aaa">${u.email}</small></td>
                    <td>${u.mobile}</td>
                    <td><span class="badge bg-info text-dark">${planName}</span> ${statusBadge}</td>
                    <td class="${dateClass}">${expiryStr}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-info" title="3 Months" onclick="extendUser('${docSnap.id}', 3, 'Quarterly')">3M</button>
                            <button class="btn btn-outline-warning" title="6 Months" onclick="extendUser('${docSnap.id}', 6, 'Half-Yearly')">6M</button>
                            <button class="btn btn-outline-success" title="1 Year" onclick="extendUser('${docSnap.id}', 12, 'Yearly')">1Y</button>
                            <button class="btn btn-outline-light" title="Manual Edit" onclick="openDateModal('${docSnap.id}')"><i class="fas fa-pencil-alt"></i></button>
                        </div>
                    </td>
                    <td><button class="btn btn-sm btn-danger" onclick="deleteUser('${docSnap.id}', '${u.email}')"><i class="fas fa-trash"></i></button></td>
                </tr>`;
        });
    });
}

// EXTEND LOGIC (SAVES PLAN NAME)
window.extendUser = async (userId, months, planName) => {
    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return Swal.fire("Error", "User not found", "error");

        const userData = userSnap.data();
        let currentExpiry = userData.expiryDate ? userData.expiryDate.toDate() : new Date();
        if (currentExpiry < new Date()) currentExpiry = new Date();

        currentExpiry.setMonth(currentExpiry.getMonth() + months);
        
        await updateDoc(userRef, { 
            expiryDate: Timestamp.fromDate(currentExpiry),
            activePlanName: planName // 👈 Saving Plan
        });
        
        Swal.fire({toast:true, position:'top-end', icon:'success', title:`Extended (${planName})`, timer:2000, showConfirmButton:false});
    } catch(e) { Swal.fire("Error", e.message, "error"); }
};

// MANUAL DATE LOGIC
window.openDateModal = (userId) => {
    document.getElementById('dateUserId').value = userId;
    $('#dateModal').modal('show');
};

window.saveCustomDate = async () => {
    const userId = document.getElementById('dateUserId').value;
    const dateVal = document.getElementById('newExpiryDate').value;
    if(!dateVal) return Swal.fire("Error", "Select a date", "error");

    try {
        const newDate = new Date(dateVal);
        await updateDoc(doc(db, "users", userId), { 
            expiryDate: Timestamp.fromDate(newDate),
            activePlanName: 'Custom' // 👈 Custom Label
        });
        $('#dateModal').modal('hide');
        Swal.fire("Success", "Date Updated Manually", "success");
    } catch(e) { Swal.fire("Error", e.message, "error"); }
};

window.deleteUser = async (userId, userEmail) => {
    if(!(await Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Delete' })).isConfirmed) return;
    try {
        Swal.showLoading();
        const pricesQ = query(collection(db, "prices"), where("userEmail", "==", userEmail));
        (await getDocs(pricesQ)).docs.map(d => deleteDoc(d.ref));
        await deleteDoc(doc(db, "users", userId));
        Swal.fire("Deleted", "User removed.", "success");
    } catch (e) { Swal.fire("Error", e.message, "error"); }
};

// ... (Metals & Logs Same as before) ...
document.getElementById('metalImageFile').addEventListener('change', function(e) { const r = new FileReader(); r.onload=(ev)=>{document.getElementById('previewImg').src=ev.target.result;document.getElementById('previewImg').style.display='block';}; if(e.target.files[0])r.readAsDataURL(e.target.files[0]); });
document.getElementById('addMetalForm').addEventListener('submit', async (e) => { e.preventDefault(); const f=document.getElementById('metalImageFile').files[0]; if(f.size>800*1024)return Swal.fire("Error","Image > 800KB","error"); const b=document.getElementById('btnAddMetal'); b.innerHTML='Uploading...'; b.disabled=true; const r=new FileReader(); r.readAsDataURL(f); r.onload=async()=>{ await addDoc(collection(db,"metals"),{name:document.getElementById('metalName').value,image:r.result,createdAt:serverTimestamp()}); document.getElementById('addMetalForm').reset(); document.getElementById('previewImg').style.display='none'; Swal.fire("Success","Metal Added","success"); b.innerHTML='Add Metal'; b.disabled=false; }; });
function loadMetals() { onSnapshot(collection(db,"metals"),(s)=>{ const b=document.getElementById('metalsTableBody'); b.innerHTML=''; s.forEach(d=>{ const v=d.data(); b.innerHTML+=`<tr><td><img src="${v.image}" class="metal-img-preview"></td><td>${v.name}</td><td><button class="btn btn-sm btn-info mr-1" onclick="openEditModal('${d.id}','${v.name}','${v.image}')"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger" onclick="deleteMetal('${d.id}')"><i class="fas fa-trash"></i></button></td></tr>`; }); }); }
window.deleteMetal = async(id)=>{if(confirm("Delete?"))await deleteDoc(doc(db,"metals",id));};
window.openEditModal=(id,n,i)=>{document.getElementById('editMetalId').value=id;document.getElementById('editMetalName').value=n;document.getElementById('editMetalPreview').src=i;$('#editMetalModal').modal('show');};
document.getElementById('editMetalForm').addEventListener('submit',async(e)=>{e.preventDefault();const id=document.getElementById('editMetalId').value;const n=document.getElementById('editMetalName').value;const f=document.getElementById('editMetalFile').files[0];let u={name:n};if(f){if(f.size>800*1024)return Swal.fire("Error","Big Image","error");const r=new FileReader();r.readAsDataURL(f);r.onload=async()=>{u.image=r.result;await updateDoc(doc(db,"metals",id),u);$('#editMetalModal').modal('hide');Swal.fire("Updated","","success");};}else{await updateDoc(doc(db,"metals",id),u);$('#editMetalModal').modal('hide');Swal.fire("Updated","","success");}});
function loadLogs(){ onSnapshot(query(collection(db,"login_logs"),orderBy("loginTime","desc"),limit(50)),(s)=>{ const b=document.getElementById('logsTableBody');b.innerHTML='';s.forEach(d=>{const v=d.data();let dt="N/A",tm="N/A";if(v.loginTime){const o=new Date(v.loginTime.seconds*1000);dt=o.toLocaleDateString('en-GB');tm=o.toLocaleTimeString();}b.innerHTML+=`<tr><td style="color:#aaa;">${dt}</td><td style="color:#a8741a; font-family:monospace;">${tm}</td><td><strong>${v.companyName||"N/A"}</strong></td><td>${v.userName||v.name||"N/A"}</td><td>${v.userMobile||"N/A"}</td></tr>`;});}); cleanOldLogs(); }
async function cleanOldLogs(){const d=new Date();d.setDate(d.getDate()-7);const q=query(collection(db,"login_logs"),where("loginTime","<",d));const s=await getDocs(q);s.forEach(async(x)=>{await deleteDoc(x.ref);});}

loadRequests(); loadUsers(); loadMetals(); loadLogs();



