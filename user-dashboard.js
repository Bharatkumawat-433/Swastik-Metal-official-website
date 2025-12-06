import { auth, db } from "./firebase-config.js";
import { signOut, updatePassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, query, onSnapshot, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let userData = null;
let userFavs = [];
let allMetalsData = [];
let allPricesData = [];
let currentTab = 'all';
let myChart = null;

// 1. Auth & Initial Load
auth.onAuthStateChanged(async (user) => {
    if (!user) window.location.href = "login.html";
    else {
        const docSnap = await getDoc(doc(db, "users", user.email));
        if (docSnap.exists()) {
            userData = docSnap.data();
            userFavs = userData.favorites || [];
            
            // Set UI Data
            document.getElementById('profileName').innerText = userData.companyName || "Trader";
            document.getElementById('navUserName').innerText = `Hi, ${userData.companyName}`;
            document.getElementById('profileEmail').innerText = userData.email;
            if(userData.profileImage) document.getElementById('userProfileImg').src = userData.profileImage;
            
            // --- SUBSCRIPTION LOGIC ---
            if(userData.expiryDate) {
                const expiryDate = userData.expiryDate.toDate();
                const today = new Date();
                const diffTime = expiryDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                
                // Header Status
                const headerStatus = document.getElementById('headerDaysLeft');
                if(diffDays > 0) {
                    headerStatus.innerText = `${diffDays} Days`;
                    headerStatus.style.color = diffDays <= 5 ? "#dc3545" : "#25D366";
                } else {
                    headerStatus.innerText = "Expired";
                    headerStatus.style.color = "red";
                }

                // Subscription Tab Info
                document.getElementById('planExpiryDate').innerText = `Valid till: ${expiryDate.toLocaleDateString('en-GB')}`;
                document.getElementById('planDaysCount').innerText = diffDays > 0 ? diffDays : 0;

                // --- SMART PLAN HIGHLIGHTING ---
                // Database se plan ka naam lo (Agar nahi hai to 'Trial' maano)
                const activePlan = userData.activePlanName || 'Trial';
                
                // Sabko reset karo
                ['Trial', 'Quarterly', 'Half-Yearly', 'Yearly'].forEach(plan => {
                    const card = document.getElementById(`card-${plan}`);
                    const btn = document.getElementById(`btn-${plan}`);
                    if(card) {
                        card.classList.remove('plan-active');
                        card.style.borderColor = "#333";
                        if(btn && plan !== 'Trial') {
                            btn.innerText = "Select Plan";
                            btn.className = "btn-plan";
                            btn.disabled = false;
                        }
                    }
                });

                // Jo plan database me hai, usse highlight karo
                const currentCard = document.getElementById(`card-${activePlan}`);
                const currentBtn = document.getElementById(`btn-${activePlan}`);
                
                if(currentCard) {
                    currentCard.classList.add('plan-active'); // Green Glow Class
                    
                    if(currentBtn) {
                        currentBtn.innerText = "Current Active Plan";
                        currentBtn.className = "btn-plan bg-success border-success";
                        currentBtn.disabled = true;
                    }
                }
            }

            // Realtime Prices
            onSnapshot(collection(db, "prices"), (snap) => {
                allPricesData = [];
                snap.forEach(d => allPricesData.push(d.data()));
                if(currentTab !== 'plan') fetchMetals(); 
            });
        }
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth).then(() => window.location.href = "index.html"));

async function fetchMetals() {
    allMetalsData = [];
    const q = await getDocs(collection(db, "metals"));
    q.forEach(d => allMetalsData.push({id:d.id, ...d.data()}));
    renderMetals();
}

// 2. TAB SWITCHER
window.switchTab = (tab) => {
    currentTab = tab;
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');

    if(tab === 'plan') {
        document.getElementById('metalsSection').style.display = 'none';
        document.getElementById('plansSection').style.display = 'block';
    } else {
        document.getElementById('metalsSection').style.display = 'block';
        document.getElementById('plansSection').style.display = 'none';
        renderMetals();
    }
};

// 3. RENDER METALS
function renderMetals() {
    const container = document.getElementById('metalsContainer');
    container.innerHTML = '';

    let displayList = allMetalsData;
    if (currentTab === 'fav') displayList = allMetalsData.filter(m => userFavs.includes(m.id));

    if(displayList.length === 0) {
        let msg = "No metals available.";
        if(currentTab === 'fav') msg = "Watchlist is empty. Add favorites first.";
        container.innerHTML = `<div class="col-12 text-center text-muted">${msg}</div>`;
        return;
    }

    if(currentTab !== 'live') displayList.sort((a,b) => (userFavs.includes(b.id) ? 1 : 0) - (userFavs.includes(a.id) ? 1 : 0));

    displayList.forEach(m => {
        const isFav = userFavs.includes(m.id) ? 'active' : '';
        const metalPrices = allPricesData.filter(p => p.metalId === m.id);
        
        let livePrice = "N/A", liveColor = "#888", liveQty = "";
        if (metalPrices.length > 0) {
            metalPrices.sort((a, b) => b.price - a.price);
            livePrice = `₹ ${metalPrices[0].price}`; liveColor = "#a8741a"; liveQty = `${metalPrices[0].quantity} T`;
        }

        let cardContent = "";
        if (currentTab === 'live') {
            cardContent = `
                <div class="col-md-3 col-sm-6 mb-4">
                    <div class="metal-card" onclick="openDetailModal('${m.id}')" style="cursor:pointer;">
                        <i class="fas fa-star fav-icon ${isFav}" onclick="event.stopPropagation(); toggleFav('${m.id}')"></i>
                        <img src="${m.image}" class="card-img-top" onerror="this.src='https://via.placeholder.com/200'">
                        <div class="card-body text-center">
                            <h5 class="text-white">${m.name}</h5>
                            <h3 style="color:${liveColor}; font-weight:bold;">${livePrice}</h3>
                            <small class="text-muted d-block mb-2">${liveQty}</small>
                            <span class="btn btn-sm btn-outline-warning w-100">View Sellers</span>
                        </div>
                    </div>
                </div>`;
        } else {
            cardContent = `
                <div class="col-md-3 col-sm-6 mb-4">
                    <div class="metal-card">
                        <i class="fas fa-star fav-icon ${isFav}" onclick="toggleFav('${m.id}')"></i>
                        <img src="${m.image}" class="card-img-top" onerror="this.src='https://via.placeholder.com/200'">
                        <div class="card-body">
                            <h5 class="text-white mb-1">${m.name}</h5>
                            <div class="mb-2 text-right" style="font-size:12px; color:#aaa;">High: <span style="color:${liveColor}">${livePrice}</span></div>
                            <form onsubmit="updatePrice(event, '${m.id}', '${m.name}')">
                                <div class="d-flex gap-2 mb-2">
                                    <input type="number" id="p-${m.id}" class="form-control form-control-dark" placeholder="Price" required>
                                    <input type="number" id="q-${m.id}" class="form-control form-control-dark" placeholder="Qty" required>
                                </div>
                                <button type="submit" class="btn btn-warning w-100 btn-sm">Update</button>
                            </form>
                        </div>
                    </div>
                </div>`;
        }
        container.innerHTML += cardContent;
    });
}

// 4. OTHER LOGIC (WhatsApp Plan Request, etc.)
window.requestPlan = (planName) => {
    Swal.fire({
        title: 'Upgrade Plan',
        html: `Contact Admin to activate <b>${planName}</b>.<br><br>
               <a href="https://wa.me/919982593535?text=Hello, I want to upgrade to ${planName}" target="_blank" class="btn btn-success"><i class="fab fa-whatsapp"></i> Chat Now</a>`,
        showConfirmButton: false, showCloseButton: true
    });
};

// ... Standard Helpers (ToggleFav, UpdatePrice, Modal, Chart, Profile) ...
// (Space bachane ke liye pichle code se copy karein, wo same hai)

window.toggleFav = async (mId) => { const r = doc(db, "users", userData.email); if(userFavs.includes(mId)) { await updateDoc(r, { favorites: arrayRemove(mId) }); userFavs = userFavs.filter(id => id !== mId); } else { await updateDoc(r, { favorites: arrayUnion(mId) }); userFavs.push(mId); } renderMetals(); };
window.updatePrice = async (e, mId, mName) => { e.preventDefault(); const p = document.getElementById(`p-${mId}`).value; const q = document.getElementById(`q-${mId}`).value; try { const btn = e.target.querySelector('button'); btn.innerText = "..."; const docId = `${mId}_${userData.email.replace(/\W/g,'')}`; await setDoc(doc(db, "prices", docId), { metalId: mId, metalName: mName, userEmail: userData.email, userName: userData.companyName, userMobile: userData.mobile, isVerified: userData.isVerified, price: Number(p), quantity: Number(q), updatedAt: serverTimestamp() }); await addDoc(collection(db, "price_history"), { metalId: mId, price: Number(p), date: serverTimestamp() }); Swal.fire({toast:true, position:'top-end', icon:'success', title:'Updated', timer:1500, showConfirmButton:false}); btn.innerText = "Update"; } catch(err) { Swal.fire("Error", "Failed", "error"); } };
window.openDetailModal = (mId) => { const metal = allMetalsData.find(m => m.id === mId); if(!metal) return; document.getElementById('modalMetalName').innerText = metal.name; document.getElementById('modalMetalImage').src = metal.image; const traders = allPricesData.filter(p => p.metalId === mId).sort((a,b) => b.price - a.price); const body = document.getElementById('modalTradersList'); body.innerHTML = traders.length ? '' : '<tr><td colspan="4" class="text-center text-muted">No sellers yet.</td></tr>'; traders.forEach(t => { const ver = t.isVerified ? '<i class="fas fa-check-circle text-primary ml-1"></i>' : ''; const isMe = t.userEmail === userData.email; const link = `https://wa.me/${t.userMobile}?text=Hi`; const chatBtn = isMe ? '<span class="badge bg-secondary">You</span>' : `<a href="${link}" target="_blank" class="btn-whatsapp"><i class="fab fa-whatsapp"></i> Chat</a>`; body.innerHTML += `<tr><td><b class="text-white">${t.userName}</b>${ver}<br><small class="text-muted">${t.userEmail}</small></td><td class="text-warning font-weight-bold">₹${t.price}</td><td class="text-white">${t.quantity} T</td><td>${chatBtn}</td></tr>`; }); $('#productModal').modal('show'); setTimeout(() => renderChart(traders), 200); };
function renderChart(traders) { const ctx = document.getElementById('priceChart').getContext('2d'); if(myChart) myChart.destroy(); let price = traders.length > 0 ? traders[0].price : 100; const data = [price-10, price-5, price+2, price-8, price+5, price-2, price]; myChart = new Chart(ctx, { type: 'line', data: { labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], datasets: [{ label: 'Trend', data: data, borderColor: '#a8741a', backgroundColor: 'rgba(168,116,26,0.1)', fill: true, tension: 0.4 }] }, options: { plugins:{legend:{display:false}}, scales:{y:{grid:{color:'#333'}}, x:{display:false}} } }); }
document.getElementById('profileUpload').addEventListener('change', (e) => { const file = e.target.files[0]; if(file && file.size < 500*1024) { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = async () => { await updateDoc(doc(db, "users", userData.email), { profileImage: reader.result }); document.getElementById('userProfileImg').src = reader.result; Swal.fire("Success", "Updated", "success"); }; } else Swal.fire("Error", "Image > 800KB", "warning"); });
document.getElementById('changePassForm').addEventListener('submit', async (e) => { e.preventDefault(); const newPass = document.getElementById('newPass').value; try { await updatePassword(auth.currentUser, newPass); Swal.fire("Success", "Password Changed!", "success").then(() => { $('#passwordModal').modal('hide'); document.getElementById('changePassForm').reset(); }); } catch (error) { Swal.fire("Error", error.message, "error"); } });

