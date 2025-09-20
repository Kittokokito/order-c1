const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw1FkoUJoCzkv3cU59dCnfCr4fm4yakMzKjNXzkTI3dYgvQ8UnaZcBCsul7G30lwN_m/exec';

let menuData = [];
let userLocation = null;
let currentOrderData = {};

window.addEventListener('DOMContentLoaded', () => {
  const menuContainer = document.getElementById('menu-container');
  const loadingMessage = document.getElementById('loading-menu');
  const totalPriceValue = document.getElementById('total-price-value');
  const grandTotalValue = document.getElementById('grand-total-value');

  async function fetchMenu() {
    try {
      const response = await fetch(WEB_APP_URL);
      if (!response.ok) throw new Error('Network response was not ok');
      const result = await response.json();
      if (result.status === 'success') {
        menuData = result.data;
        renderMenu(menuData);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      loadingMessage.textContent = `เกิดข้อผิดพลาดในการโหลดเมนู: ${error.message}`;
      loadingMessage.style.color = 'red';
    }
  }

  function renderMenu(items) {
    if (loadingMessage) loadingMessage.style.display = 'none';
    menuContainer.innerHTML = '';

    items.forEach(item => {
      if(item.Status !== 'Active') return;

      const options = [item.Option1,item.Option2,item.Option3].filter(o=>o);
      const subOptionsHTML = options.map((o,i)=>
        `<label><input type="radio" name="option-${item.Name}" value="${o}" ${i===0?'checked':''}><span>${o}</span></label>`
      ).join('');

      const menuItemHTML = `
      <div class="menu-item-dynamic">
        <img src="${item.ImageURL}" alt="${item.Name}">
        <div class="menu-item-details">
          <span class="item-name">${item.Name}</span>
          <span class="item-price">${item.Price} บาท</span>
          <div class="sub-options-container">${subOptionsHTML}</div>
          <input type="text" class="special-request-input" placeholder="คำสั่งพิเศษ">
        </div>
        <div class="quantity-controls">
          <button type="button" class="btn-minus">-</button>
          <span class="quantity-display">0</span>
          <button type="button" class="btn-plus">+</button>
        </div>
      </div>`;
      menuContainer.innerHTML += menuItemHTML;
    });
  }

  fetchMenu();
});
