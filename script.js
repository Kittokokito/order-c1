// script.js (v6.0 - พร้อม calculateDeliveryFee + Notifications)
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwygchacVZIL4aPPobSJCdOQL5QihCwfD4AIdxfpIGxpOlPEi3mRuk3jyoMhScIX05d/exec'; // <-- เปลี่ยนเป็น URL ของคุณ

window.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('order-form');
    const menuContainer = document.getElementById('menu-container');
    const loadingMessage = document.getElementById('loading-menu');
    const getLocationBtn = document.getElementById('get-location-btn');
    const locationStatus = document.getElementById('location-status');
    const totalPriceValue = document.getElementById('total-price-value');
    const grandTotalValue = document.getElementById('grand-total-value');
    const reviewOrderBtn = document.getElementById('review-order-btn');
    const summaryModal = document.getElementById('summary-modal');
    const customerSummary = document.getElementById('customer-summary');
    const orderSummaryList = document.getElementById('order-summary-list');
    const summaryFoodTotal = document.getElementById('summary-food-total');
    const summaryDistance = document.getElementById('summary-distance');
    const summaryDeliveryFee = document.getElementById('summary-delivery-fee');
    const summaryGrandTotal = document.getElementById('summary-grand-total');
    const modalSpinner = document.getElementById('modal-spinner');
    const editOrderBtn = document.getElementById('edit-order-btn');
    const confirmOrderBtn = document.getElementById('confirm-order-btn');
    const thankYouModal = document.getElementById('thank-you-modal');
    const closeThankYouBtn = document.getElementById('close-thank-you-btn');

    let userLocation = null;
    let menuData = [];
    let currentOrderData = {};

    // --- โหลดเมนูจาก Web App ---
    async function fetchMenu() {
        try {
            const response = await fetch(WEB_APP_URL);
            if (!response.ok) throw new Error('ไม่สามารถโหลดเมนูได้');
            const result = await response.json();
            if (result.status === 'success') {
                menuData = result.data;
                renderMenu(menuData);
            } else throw new Error(result.message);
        } catch (e) {
            loadingMessage.textContent = `เกิดข้อผิดพลาด: ${e.message}`;
            loadingMessage.style.color = 'red';
        }
    }

    function renderMenu(items) {
        if(loadingMessage) loadingMessage.style.display = 'none';
        menuContainer.innerHTML = '';
        items.forEach(item => {
            let optionsHTML = '';
            if(item.Options && item.Options.length > 0){
                const options = item.Options.split(',').map(o=>o.trim());
                optionsHTML = '<div class="sub-options-container">';
                options.forEach((opt,i)=>{
                    optionsHTML += `<label><input type="radio" name="option-${item.ItemID}" value="${opt}" ${i===0?'checked':''}><span>${opt}</span></label>`;
                });
                optionsHTML += '</div>';
            }

            const specialHTML = `<input type="text" class="special-request-input" data-itemid="${item.ItemID}" placeholder="คำสั่งพิเศษ">`;

            const html = `
            <div class="menu-item-dynamic" id="${item.ItemID}">
                <img src="${item.ImageURL}" alt="${item.Name}" onerror="this.src='https://placehold.co/160x160/EFEFEF/AAAAAA?text=Image'">
                <div class="menu-item-details">
                    <span class="item-name">${item.Name}</span>
                    <span class="item-price">${item.Price} บาท</span>
                    ${optionsHTML}
                    ${specialHTML}
                </div>
                <div class="quantity-controls">
                    <button type="button" class="btn-minus" data-itemid="${item.ItemID}">-</button>
                    <span class="quantity-display" id="qty-${item.ItemID}">0</span>
                    <button type="button" class="btn-plus" data-itemid="${item.ItemID}">+</button>
                </div>
            </div>`;
            menuContainer.innerHTML += html;
        });
        addQuantityListeners();
        updateTotals();
    }

    function addQuantityListeners(){
        document.querySelectorAll('.btn-plus,.btn-minus').forEach(btn=>{
            btn.addEventListener('click', e=>{
                const id = e.target.dataset.itemid;
                const display = document.getElementById(`qty-${id}`);
                let qty = parseInt(display.textContent);
                if(e.target.classList.contains('btn-plus')) qty++;
                else if(qty>0) qty--;
                display.textContent = qty;
                updateTotals();
            });
        });
    }

    function updateTotals(){
        let total=0;
        document.querySelectorAll('.quantity-display').forEach(d=>{
            const qty = parseInt(d.textContent);
            if(qty>0){
                const id = d.id.replace('qty-','');
                const item = menuData.find(m=>m.ItemID===id);
                if(item) total += item.Price * qty;
            }
        });
        totalPriceValue.textContent = total;
        grandTotalValue.textContent = total;
    }

    function collectOrder(){
        const details=[];
        let foodTotal=0;
        document.querySelectorAll('.quantity-display').forEach(d=>{
            const qty=parseInt(d.textContent);
            if(qty>0){
                const id=d.id.replace('qty-','');
                const item = menuData.find(m=>m.ItemID===id);
                if(item){
                    let name=item.Name;
                    const opt=document.querySelector(`input[name="option-${id}"]:checked`);
                    if(opt) name+=` (${opt.value})`;
                    const sp=document.querySelector(`.special-request-input[data-itemid="${id}"]`).value.trim();
                    if(sp) name+=` [${sp}]`;
                    details.push({name,qty,price:item.Price,total:item.Price*qty});
                    foodTotal+=item.Price*qty;
                }
            }
        });
        return {
            name: document.getElementById('customer-name').value,
            phone: document.getElementById('customer-phone').value,
            address: document.getElementById('customer-address').value,
            orderDetailsRaw: details,
            orderDetails: details.map(i=>`${i.name} (x${i.qty})`).join(', '),
            totalPrice: foodTotal,
            latitude: userLocation?.latitude,
            longitude: userLocation?.longitude
        };
    }

    // --- ตำแหน่งลูกค้า ---
    getLocationBtn.addEventListener('click', ()=>{
        locationStatus.textContent="กำลังค้นหาตำแหน่ง...";
        if(navigator.geolocation){
            navigator.geolocation.getCurrentPosition(
                p=>{
                    userLocation={latitude:p.coords.latitude, longitude:p.coords.longitude};
                    locationStatus.textContent="✅ ได้รับตำแหน่งแล้ว!";
                },
                ()=>{ locationStatus.textContent="⚠️ ไม่สามารถเข้าถึงตำแหน่งได้"; }
            );
        } else locationStatus.textContent="เบราว์เซอร์ไม่รองรับฟังก์ชันนี้";
    });

    // --- ดูสรุปและคำนวณค่าส่ง ---
    reviewOrderBtn.addEventListener('click', async ()=>{
        if(!userLocation){ alert("กรุณากด 'ขอตำแหน่งปัจจุบัน' ก่อน"); return;}
        if(!form.checkValidity()){ form.reportValidity(); return; }
        currentOrderData=collectOrder();
        if(currentOrderData.orderDetailsRaw.length===0){ alert("กรุณาเลือกอาหารอย่างน้อย 1 รายการ"); return;}

        summaryModal.classList.add('active');
        modalSpinner.style.display='block';
        document.getElementById('cost-summary').style.display='none';
        confirmOrderBtn.style.display='none';

        customerSummary.innerHTML=`<div><strong>ชื่อ:</strong> ${currentOrderData.name}</div>
        <div><strong>โทร:</strong> ${currentOrderData.phone}</div>
        <div><strong>ที่อยู่:</strong> ${currentOrderData.address}</div>`;
        orderSummaryList.innerHTML=currentOrderData.orderDetailsRaw.map(i=>`<div class="item-line"><span>- ${i.name} (x${i.qty})</span><span>${i.total} บ.</span></div>`).join('');

        try{
            const res = await fetch(WEB_APP_URL,{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({action:'calculateFee',lat:currentOrderData.latitude,lng:currentOrderData.longitude})
            });
            if(!res.ok) throw new Error('Server error');
            const feeResult = await res.json();
            if(feeResult.status==='success'){
                currentOrderData.deliveryFee=feeResult.fee;
                summaryDistance.textContent=`${feeResult.distance} กม.`;
                summaryDeliveryFee.textContent=`${feeResult.fee} บาท`;
                summaryFoodTotal.textContent=`${currentOrderData.totalPrice} บาท`;
                summaryGrandTotal.textContent=`${currentOrderData.totalPrice+feeResult.fee} บาท`;
            } else throw new Error(feeResult.message);
        } catch(e){
            alert(`คำนวณค่าส่งล้มเหลว: ${e.message}`);
            currentOrderData.deliveryFee=-1;
            summaryDeliveryFee.textContent="คำนวณไม่ได้";
            summaryGrandTotal.textContent="N/A";
        } finally{
            modalSpinner.style.display='none';
            document.getElementById('cost-summary').style.display='block';
            if(currentOrderData.deliveryFee!==-1) confirmOrderBtn.style.display='block';
        }
    });

    editOrderBtn.addEventListener('click', ()=>summaryModal.classList.remove('active'));
    closeThankYouBtn.addEventListener('click', ()=>thankYouModal.classList.remove('active'));

   
