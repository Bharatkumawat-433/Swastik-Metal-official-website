import { db } from "./firebase-config.js";
import { collection, query, onSnapshot, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let allMetals = [];
let allPrices = [];
let myChart = null;
window.dealerCache = {}; // Store dealer data

// 1. Initialize Listeners
function init() {
    onSnapshot(collection(db, "metals"), (snap) => {
        allMetals = []; 
        snap.forEach(d => allMetals.push({id:d.id, ...d.data()})); 
        renderPage();
    });

    onSnapshot(collection(db, "prices"), (snap) => {
        allPrices = []; 
        snap.forEach(d => allPrices.push(d.data())); 
        renderPage();
    });

    loadDealers();
}

// 2. Render Live Rate Cards
function renderPage() {
    const container = document.getElementById('liveMetalsContainer');
    
    if(allMetals.length===0) {
        container.innerHTML = '<div class="col-12 text-center text-white"><h3>No data available.</h3></div>';
        return;
    }
    
    let html = "";
    allMetals.forEach(m => {
        const prices = allPrices.filter(p => p.metalId === m.id);
        let dPrice = "N/A", dColor = "#888", dQty = "No Stock";
        
        if(prices.length > 0) {
            prices.sort((a,b) => b.price - a.price); // Highest first
            dPrice = `₹ ${prices[0].price}`; 
            dColor = "#a8741a"; 
            dQty = `${prices[0].quantity} Ton Avl.`;
        }

        html += `
            <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
                <div class="single_product" onclick="openDetailModal('${m.id}')">
                    <div class="product_thumb">
                        <img src="${m.image}" onerror="this.src='https://via.placeholder.com/200'">
                    </div>
                    <div class="product_content">
                        <h3>${m.name}</h3>
                        <h2 style="color:${dColor}">${dPrice}</h2>
                        <span>${dQty}</span>
                    </div>
                </div>
            </div>`;
    });
    container.innerHTML = html;
}

// 3. Open Metal Detail Modal (Graph + Sellers)
window.openDetailModal = (mId) => {
    const metal = allMetals.find(m => m.id === mId);
    if(!metal) return;

    document.getElementById('modalMetalName').innerText = metal.name;
    document.getElementById('modalMetalImage').src = metal.image;

    const traders = allPrices.filter(p => p.metalId === mId).sort((a,b) => b.price - a.price);
    const body = document.getElementById('modalTradersList');
    body.innerHTML = traders.length ? '' : '<tr><td colspan="4" class="text-center text-muted">No sellers yet.</td></tr>';

    traders.forEach(t => {
        const ver = t.isVerified ? '<i class="fas fa-check-circle text-primary ml-1"></i>' : '';
        const link = `https://wa.me/91${t.userMobile}?text=Interested in ${metal.name} at ₹${t.price}`;
        body.innerHTML += `<tr>
            <td><b class="text-white">${t.userName}</b>${ver}<br><small class="text-muted">${t.userEmail}</small></td>
            <td class="text-warning font-weight-bold">₹${t.price}</td>
            <td class="text-white">${t.quantity} T</td>
            <td><a href="${link}" target="_blank" class="btn-whatsapp-sm"><i class="fab fa-whatsapp"></i> Chat</a></td>
        </tr>`;
    });

    new bootstrap.Modal(document.getElementById('productModal')).show();
    setTimeout(() => renderChart(traders), 200);
};

// 4. Render Graph
function renderChart(traders) {
    const ctx = document.getElementById('priceChart').getContext('2d');
    if(myChart) myChart.destroy();
    
    let price = traders.length > 0 ? traders[0].price : 100;
    const data = [price-10, price-8, price+5, price-5, price+7, price-2, price];
    
    let gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(168, 116, 26, 0.5)');
    gradient.addColorStop(1, 'rgba(168, 116, 26, 0.0)');

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Day 1','Day 2','Day 3','Day 4','Day 5','Yesterday','Today'],
            datasets: [{
                label: 'Price Trend', data: data, borderColor: '#a8741a', backgroundColor: gradient, fill: true, tension: 0.4
            }]
        },
        options: { plugins:{legend:{display:false}}, scales:{y:{grid:{color:'#333'}}, x:{display:false}} }
    });
}

// 5. Load Verified Dealers (With Card Design)
function loadDealers() {
    const q = query(collection(db, "users"), where("isVerified", "==", true), where("role", "==", "trader"));
    
    onSnapshot(q, (snapshot) => {
        const container = document.getElementById('dealersContainer');
        container.innerHTML = '';
        
        if(snapshot.empty) {
            container.innerHTML = '<div class="col-12 text-center text-muted">No verified dealers found.</div>';
            return;
        }

        snapshot.forEach(doc => {
            const u = doc.data();
            const img = u.profileImage || `https://ui-avatars.com/api/?name=${u.fullName}&background=242424&color=fff`;
            const shortAddr = u.address ? u.address.substring(0, 25) + '...' : 'India';

            window.dealerCache[doc.id] = u;

            container.innerHTML += `
                <div class="col-lg-4 col-md-6 mb-4">
                    <div class="dealer-card" onclick="openDealerModal('${doc.id}')">
                        <div class="dealer-img-box"><img src="${img}"></div>
                        <div class="dealer-info">
                            <div class="dealer-company">${u.companyName} <i class="fas fa-check-circle verified-tick"></i></div>
                            <div class="dealer-user">${u.fullName}</div>
                            <div class="dealer-loc"><i class="fas fa-map-marker-alt"></i> ${shortAddr}</div>
                        </div>
                    </div>
                </div>`;
        });
    });
}

// 6. Open Dealer Modal (UPDATED)
window.openDealerModal = (userId) => {
    const user = window.dealerCache[userId];
    if(!user) return;

    const img = user.profileImage || `https://ui-avatars.com/api/?name=${user.fullName}&background=242424&color=fff`;

    document.getElementById('popDealerImg').src = img;
    document.getElementById('popCompany').innerHTML = `${user.companyName} <i class="fas fa-check-circle verified-tick"></i>`;
    
    // UPDATED: Populate Owner Name
    document.getElementById('popOwnerName').innerText = user.fullName;
    
    document.getElementById('popAddress').innerText = user.address || "N/A";
    document.getElementById('popMobile').innerText = user.mobile;
    document.getElementById('popEmail').innerText = user.email;

    document.getElementById('btnCall').href = `tel:+91${user.mobile}`;
    document.getElementById('btnWhatsapp').href = `https://wa.me/91${user.mobile}?text=Hello`;

    new bootstrap.Modal(document.getElementById('dealerModal')).show();
};

init();

