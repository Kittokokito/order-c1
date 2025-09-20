const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw1FkoUJoCzkv3cU59dCnfCr4fm4yakMzKjNXzkTI3dYgvQ8UnaZcBCsul7G30lwN_m/exec'; // ใส่ URL Web App ที่ Deploy

window.addEventListener('DOMContentLoaded',()=>{
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

let userLocation=null;
let menuData=[];
let currentOrderData={};

// โหลดเมนู
async function fetchMenu(){
try{
const res = await fetch(WEB_APP_URL);
const result = await res.json();
if(result.status==='success'){
menuData=result.data;
renderMenu(menuData);
}else{throw new Error(result.message);}
}catch(err){
loadingMessage.textContent=`โหลดเมนูล้มเหลว: ${err.message}`;
loadingMessage.style.color='red';
}
}

function renderMenu(items){
loadingMessage.style.display='none';
menuContainer.innerHTML='';
items.forEach(item=>{
let subOptionsHTML='';
if(item.Options && item.Options.length>0){
subOptionsHTML='<div class="sub-options-container">';
item.Options.forEach((opt,idx)=>{
subOptionsHTML+=`<label><input type="radio" name="option-${item.Name}" value="${opt}" ${idx===0?'checked':''}><span>${opt}</span></label>`;
});
subOptionsHTML+='</div>';
}
const specialRequestHTML=`<input type="text" class="special-request-input" data-itemname="${item.Name}" placeholder="คำสั่งพิเศษ">`;
menuContainer.innerHTML+=`
<div class="menu-item-dynamic">
<img src="${item.ImageURL}" alt="${item.Name}" onerror="this.src='https://placehold.co/160x160'">
<div class="menu-item-details">
<span class="item-name">${item.Name}</span>
<span class="item-price">${item.Price} บาท</span>
${subOptionsHTML}
${specialRequestHTML}
</div>
<div class="quantity-controls">
<button type="button" class="btn-minus" data-itemname="${item.Name}">-</button>
<span class="quantity-display" id="qty-${item.Name}">0</span>
<button type="button" class="btn-plus" data-itemname="${item.Name}">+</button>
</div>
</div>`});
addQuantityButtonListeners();
updateTotals();
}

// เพิ่มปุ่ม +/-
function addQuantityButtonListeners(){
document.querySelectorAll('.btn-plus, .btn-minus').forEach(btn=>{
btn.addEventListener('click',e=>{
const itemName=e.target.dataset.itemname;
const display=document.getElementById(`qty-${itemName}`);
let qty=parseInt(display.textContent,10);
if(e.target.classList.contains('btn-plus')) qty++;
else if(qty>0) qty--;
display.textContent=qty;
updateTotals();
});
});
}

// อัปเดตราคารวม
function updateTotals(){
let total=0;
document.querySelectorAll('.quantity-display').forEach(d=>{
const qty=parseInt(d.textContent,10);
if(qty>0){
const item=menuData.find(m=>m.Name===d.id.replace('qty-',''));
if(item) total+=item.Price*qty;
}
});
totalPriceValue.textContent=total;
grandTotalValue.textContent=total;
}

// เก็บ order
function collectOrderData(){
const orderDetails=[];
let foodTotal=0;
document.querySelectorAll('.quantity-display').forEach(d=>{
const qty=parseInt(d.textContent,10);
if(qty>0){
const itemName=d.id.replace('qty-','');
const item=menuData.find(m=>m.Name===itemName);
if(item){
let name=item.Name;
const selectedOption=document.querySelector(`input[name="option-${itemName}"]:checked`);
if(selectedOption) name+=` (${selectedOption.value})`;
const special=document.querySelector(`.special-request-input[data-itemname="${itemName}"]`).value.trim();
if(special) name+=` [${special}]`;
orderDetails.push({name, qty, price:item.Price, total:item.Price*qty});
foodTotal+=item.Price*qty;
}
}
});
return {
name: document.getElementById('customer-name').value,
phone: document.getElementById('customer-phone').value,
address: document.getElementById('customer-address').value,
orderDetailsRaw: orderDetails,
orderDetails: orderDetails.map(it=>`${it.name} (x${it.qty})`).join(', '),
totalPrice: foodTotal,
latitude: userLocation?.latitude,
longitude: userLocation?.longitude
};
}

// Event
getLocationBtn.addEventListener('click',()=>{
locationStatus.textContent='กำลังค้นหาตำแหน่ง...';
if(navigator.geolocation){
navigator.geolocation.getCurrentPosition(pos=>{
userLocation={latitude:pos.coords.latitude, longitude:pos.coords.longitude};
locationStatus.textContent='✅ ได้ตำแหน่งแล้ว';
},()=>{locationStatus.textContent='⚠️ ไม่สามารถเข้าถึงตำแหน่งได้';});
}else{locationStatus.textContent='เบราว์เซอร์ไม่รองรับ';}
});

reviewOrderBtn.addEventListener('click',async()=>{
if(!userLocation){alert('กรุณากดตำแหน่งก่อน'); return;}
if(!form.checkValidity()){form.reportValidity(); return;}
currentOrderData=collectOrderData();
if(currentOrderData.orderDetailsRaw.length===0){alert('กรุณาเลือกอาหาร'); return;}

summaryModal.classList.add('active');
modalSpinner.style.display='block';
document.getElementById('cost-summary').style.display='none';
confirmOrderBtn.style.display='none';

customerSummary.innerHTML=`<div><strong>ชื่อ:</strong> ${currentOrderData.name}</div>
<div><strong>โทร:</strong> ${currentOrderData.phone}</div>
<div><strong>ที่อยู่:</strong> ${currentOrderData.address}</div>`;

orderSummaryList.innerHTML=currentOrderData.orderDetailsRaw.map(it=>`<div class="item-line"><span>- ${it.name} (x${it.qty})</span> <span>${it.total} บ.</span></div>`).join('');

try{
const feeResp=await fetch(WEB_APP_URL,{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({action:'calculateFee', lat:currentOrderData.latitude, lng:currentOrderData.longitude})
});
const feeResult=await feeResp.json();
if(feeResult.status==='success'){
currentOrderData.deliveryFee=feeResult.fee;
summaryDistance.textContent=`${feeResult.distance} กม.`;
summaryDeliveryFee.textContent=`${feeResult.fee} บาท`;
summaryFoodTotal.textContent=`${currentOrderData.totalPrice} บาท`;
summaryGrandTotal.textContent=`${currentOrderData.totalPrice+feeResult.fee} บาท`;
}else{throw new Error(feeResult.message);}
}catch(e){
alert(`คำนวณค่าส่งล้มเหลว: ${e.message}`);
currentOrderData.deliveryFee=-1;
summaryDeliveryFee.textContent="คำนวณไม่ได้";
summaryGrandTotal.textContent="N/A";
}finally{
modalSpinner.style.display='none';
document.getElementById('cost-summary').style.display='block';
if(currentOrderData.deliveryFee!==-1) confirmOrderBtn.style.display='block';
}
});

editOrderBtn.addEventListener('click',()=>summaryModal.classList.remove('active'));
closeThankYouBtn.addEventListener('click',()=>thankYouModal.classList.remove('active'));

confirmOrderBtn.addEventListener('click',()=>{
confirmOrderBtn.disabled=true;
confirmOrderBtn.textContent='กำลังส่ง...';
const payload={...currentOrderData, action:'submitOrder'};
fetch(WEB_APP_URL,{method:'POST',mode:'no-cors',body:JSON.stringify(payload)})
.then(()=>{
summaryModal.classList.remove('active');
thankYouModal.classList.add('active');
form.reset();
document.querySelectorAll('.quantity-display').forEach(d=>d.textContent='0');
locationStatus.textContent='ยังไม่ได้ระบุตำแหน่ง';
userLocation=null;
updateTotals();
})
.finally(()=>{
confirmOrderBtn.disabled=false;
confirmOrderBtn.textContent='ยืนยันการสั่งซื้อ';
});
});

fetchMenu();
