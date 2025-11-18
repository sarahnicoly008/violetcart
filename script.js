// ===========================
// VIOLET MART — SCRIPT.JS (Atualizado)
// ===========================

// ---------- MENU MOBILE ---------
const nav = document.querySelector("nav ul");
const menuBtn = document.querySelector("#menu-btn");
menuBtn.addEventListener("click", () => {
    nav.classList.toggle("open");
});

// ---------- BANCO DE DADOS (Simulação com localStorage) ---------
let products = JSON.parse(localStorage.getItem("products")) || [];

function saveProducts() {
    localStorage.setItem("products", JSON.stringify(products));
}

// ---------- ADICIONAR PRODUTO (ADMIN) ---------
const addForm = document.querySelector("#add-product-form");
if (addForm) {
    addForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const name = document.querySelector("#p-name").value;
        const price = document.querySelector("#p-price").value;
        const image = document.querySelector("#p-image").value;
        const desc = document.querySelector("#p-desc").value;

        const newProduct = {
            id: Date.now(),
            name,
            price,
            image,
            desc
        };

        products.push(newProduct);
        saveProducts();
        addForm.reset();
        alert("Produto adicionado com sucesso!");
        loadAdminProducts();
    });
}

// ---------- LISTAR PRODUTOS NA ÁREA ADMIN ---------
function loadAdminProducts() {
    const adminList = document.querySelector("#admin-products");
    if (!adminList) return;

    adminList.innerHTML = "";

    products.forEach(p => {
        const item = document.createElement("div");
        item.classList.add("admin-product-card");
        item.innerHTML = `
            <img src="${p.image}" alt="${p.name}">
            <h3>${p.name}</h3>
            <p>R$ ${p.price}</p>
            <button onclick="deleteProduct(${p.id})" class="delete-btn">Excluir</button>
        `;
        adminList.appendChild(item);
    });
}

// ---------- EXCLUIR PRODUTO ---------
function deleteProduct(id) {
    products = products.filter(p => p.id !== id);
    saveProducts();
    loadAdminProducts();
}

// ---------- LISTAR PRODUTOS NA LOJA ---------
function loadStoreProducts() {
    const storeList = document.querySelector("#store-products");
    if (!storeList) return;

    storeList.innerHTML = "";

    products.forEach(p => {
        const card = document.createElement("div");
        card.classList.add("product-card");

        card.innerHTML = `
            <img src="${p.image}" alt="${p.name}">
            <h3>${p.name}</h3>
            <p class="price">R$ ${p.price}</p>
            <button class="buy-btn">Comprar</button>
        `;

        storeList.appendChild(card);
    });
}

// ---------- INICIALIZAÇÃO AUTOMÁTICA ---------
loadAdminProducts();
loadStoreProducts();
