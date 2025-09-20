const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyuABStmwl1YfouRYGyvHtoSRhlt2lYSkAgXkMkH21pffhJqclykksMq4vBSMnQaClt/exec";

let userLocation = null;
let menuData = [];
let currentOrderData = {};

document.addEventListener("DOMContentLoaded", () => {
    const menuContainer = document.getElementById("menu-container");
    const loadingMessage = document.getElementById("loading-menu");
    const getLocationBtn = document.getElementById("get-location-btn");
    const locationStatus = document.getElementById("location-status");
    const totalPriceValue = document.getElementById("total-price-value");
    const grandTotalValue = document.getElementById("grand-total-value");
    const reviewOrderBtn = document.getElementById("review-order-btn");

    const summaryModal = document.getElementById("summary-modal");
    const customerSummary = document.getElementById("customer-summary");
    const orderSummaryList = document.getElementById("order-summary-list");
    const summaryFoodTotal = document.getElementById("summary-food-total");
    const summaryDistance = document.getElementById("summary-distance");
    const summaryDeliveryFee = document.getElementById("summary-delivery-fee");
    const summaryGrandTotal = document.getElementById("summary-grand-total");
    const modalSpinner = document.getElementById("modal-spinner");
    const editOrderBtn = document.getElementById("edit-order-btn");
    const confirmOrderBtn = document.getElementById("confirm-order-btn");

    const thankYouModal = document.getElementById("thank-you-modal");
    const closeThankYouBtn = document.getElementById("close-thank-you-btn");

    // --- ดึงเมนูจาก Apps Script
    async function fetchMenu() {
        try {
            const res = await fetch(WEB_APP_URL, { method:"POST", body: JSON.stringify({action:"getMenu"}) });
            const data = await res.json();
            if(data.status==="success"){ menuData = data.data; renderMenu(menuData); }
        } catch(e){ loadingMessage.textContent = "โหลดเมนูล้มเหลว"; loadingMessage.style.color="red"; }
    }

    function renderMenu(items){
        document.getElementById("loading-menu").style.display="none";
        menuContainer.innerHTML = "";
        items.forEach(item=>{
            let optionsHTML = `<div class="sub-options-container">`;
            ["Option1","Option2","Option3"].forEach((opt,index)=>{
                const val = item[opt];
                optionsHTML += `<label><input type="radio" name="option-${item.Name}" value="${val}" ${index===0?"checked":""}><span>${val}</span></label>`;
            });
            optionsHTML += "</div>";

            const specialHTML = `<input type="text" class="special-request-input" data-name="${item.Name}" placeholder="คำสั่งพิเศษ">`;

            const itemHTML = `<div class="menu-item-dynamic">
                <img src="${item.ImageURL}" alt="${item.Name}">
                <div class="menu-item-details">
                    <span class="item-name">${item.Name}</span>
                    <span class="item-price">${item.Price} บาท</span>
                    ${optionsHTML}
                    ${specialHTML}
                </div>
                <div class="quantity-controls">
                    <button type="button" class="btn-minus" data-name="${item.Name}">-</button>
                    <span class="quantity-display" id="qty-${item.Name}">0</span>
                    <button type="button" class="btn-plus" data-name="${item.Name}">+</button>
                </div>
            </div>`;
            menuContainer.innerHTML += itemHTML;
        });
        addQuantityListeners();
        updateTotals();
    }

    function addQuantityListeners(){
        document.querySelectorAll(".btn-plus,.btn-minus").forEach(btn=>{
            btn.addEventListener("click",e=>{
                const name = e.target.dataset.name;
                const display = document.getElementById(`qty-${name}`);
                let qty = parseInt(display.textContent);
                if(e.target.classList.contains("btn-plus")) qty++;
                else if(qty>0) qty--;
                display.textContent = qty;
                updateTotals();
            });
        });
    }

    function updateTotals(){
        let total=0;
        document.querySelectorAll(".quantity-display").forEach(d=>{
            const qty=parseInt(d.textContent);
            if(qty>0){
                const name=d.id.replace("qty-","");
                const item=menuData.find(i=>i.Name===name);
                total += item.Price*qty;
            }
        });
        totalPriceValue.textContent = total;
        grandTotalValue.textContent = total;
    }

    getLocationBtn.addEventListener("click", ()=>{
        locationStatus.textContent="กำลังค้นหาตำแหน่ง...";
        if(navigator.geolocation){
            navigator.geolocation.getCurrentPosition(pos=>{
                userLocation={lat:pos.coords.latitude,lng:pos.coords.longitude};
                locationStatus.textContent="✅ ได้ตำแหน่งแล้ว";
            },()=>{
                locationStatus.textContent="⚠️ ไม่สามารถเข้าถึงตำแหน่ง";
            });
        }else locationStatus.textContent="เบราว์เซอร์ไม่รองรับ";
    });

    reviewOrderBtn.addEventListener("click", async ()=>{
        if(!userLocation){ alert("กดขอตำแหน่งก่อน"); return; }
        const name = document.getElementById("customer-name").value;
        const phone = document.getElementById("customer-phone").value;
        const address = document.getElementById("customer-address").value;
        if(!name||!phone||!address){ alert("กรุณากรอกข้อมูลลูกค้า"); return; }

        const orderItems=[];
        let foodTotal=0;
        document.querySelectorAll(".quantity-display").forEach(d=>{
            const qty=parseInt(d.textContent);
            if(qty>0){
                const itemName=d.id.replace("qty-","");
                const item=menuData.find(i=>i.Name===itemName);
                const selectedOption=document.querySelector(`input[name="option-${itemName}"]:checked`);
                const special=document.querySelector(`.special-request-input[data-name="${itemName}"]`).value;
                let displayName=itemName;
                if(selectedOption) displayName += ` (${selectedOption.value})`;
                if(special) displayName += ` [${special}]`;
                orderItems.push({name:displayName,qty,price:item.Price,total:item.Price*qty});
                foodTotal += item.Price*qty;
            }
        });
        if(orderItems.length===0){ alert("เลือกอาหารอย่างน้อย 1 รายการ"); return; }

        currentOrderData={name,phone,address,orderItems,totalPrice:foodTotal,latitude:userLocation.lat,longitude:userLocation.lng};

        // --- แสดง Modal และคำนวณค่าส่ง ---
        summaryModal.classList.add("active");
        modalSpinner.style.display="block";
        document.getElementById("cost-summary").style.display="none";
        confirmOrderBtn.style.display="none";

        customerSummary.innerHTML=`<div><strong>ชื่อ:</strong> ${name}</div><div><strong>โทร:</strong> ${phone}</div><div><strong>ที่อยู่:</strong> ${address}</div>`;
        orderSummaryList.innerHTML=orderItems.map(i=>`<div class="item-line"><span>- ${i.name} (x${i.qty})</span><span>${i.total} บ.</span></div>`).join("");

        try{
            const feeRes=await fetch(WEB_APP_URL,{
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify({action:"calculateFee",lat:userLocation.lat,lng:userLocation.lng})
            });
            const feeData=await feeRes.json();
            if(feeData.status==="success"){
                currentOrderData.deliveryFee=feeData.fee;
                summaryDistance.textContent=`${feeData.distance} กม.`;
                summaryDeliveryFee.textContent=`${feeData.fee} บ.`;
                summaryFoodTotal.textContent=`${foodTotal} บ.`;
                summaryGrandTotal.textContent=`${foodTotal+feeData.fee} บ.`;
            } else throw new Error(feeData.message);
        } catch(e){
            alert("คำนวณค่าส่งล้มเหลว: "+e.message);
            currentOrderData.deliveryFee=-1;
            summaryDeliveryFee.textContent="N/A";
            summaryGrandTotal.textContent="N/A";
        } finally{
            modalSpinner.style.display="none";
            document.getElementById("cost-summary").style.display="block";
            if(currentOrderData.deliveryFee!==-1) confirmOrderBtn.style.display="block";
        }
    });

    editOrderBtn.addEventListener("click", ()=> summaryModal.classList.remove("active"));
    closeThankYouBtn.addEventListener("click", ()=> thankYouModal.classList.remove("active"));

    confirmOrderBtn.addEventListener("click", async ()=>{
        confirmOrderBtn.disabled=true;
        confirmOrderBtn.textContent="กำลังส่ง...";
        try{
            await fetch(WEB_APP_URL,{method:"POST",mode:"no-cors",body:JSON.stringify({...currentOrderData,action:"submitOrder"})});
            summaryModal.classList.remove("active");
            thankYouModal.classList.add("active");
            document.getElementById("order-form").reset();
            document.querySelectorAll(".quantity-display").forEach(d=>d.textContent="0");
            locationStatus.textContent="ยังไม่ได้ระบุตำแหน่ง";
            userLocation=null;
            updateTotals();
        } catch(e){ alert("ส่งออเดอร์ล้มเหลว"); }
        finally{ confirmOrderBtn.disabled=false; confirmOrderBtn.textContent="ยืนยัน"; }
    });

    fetchMenu();
});
