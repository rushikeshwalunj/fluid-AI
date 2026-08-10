const products = [
  {
    title: 'Smart Home Speaker',
    description: 'Voice-enabled speaker with AI recommendations.',
    price: '₹2,499',
    image: 'https://images.unsplash.com/photo-1518440560458-40af4d0ca6f8?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Wireless Earbuds',
    description: 'Noise-cancelling earbuds for long listening sessions.',
    price: '₹3,999',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Fitness Smartwatch',
    description: 'Track workouts, health, and notifications on the go.',
    price: '₹4,299',
    image: 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Portable Projector',
    description: 'Mini projector for movies and presentations anywhere.',
    price: '₹8,199',
    image: 'https://images.unsplash.com/photo-1564866657318-986d5dfb6d90?auto=format&fit=crop&w=800&q=80',
  },
];

const productGrid = document.getElementById('productGrid');
const statusValue = document.getElementById('statusValue');
const refreshButton = document.getElementById('refreshButton');
const searchButton = document.getElementById('searchButton');
const searchInput = document.getElementById('searchInput');

function renderProducts(items) {
  productGrid.innerHTML = items
    .map(
      (product) => `
      <article class="product-card">
        <img src="${product.image}" alt="${product.title}" />
        <div>
          <h3>${product.title}</h3>
          <p>${product.description}</p>
        </div>
        <div class="price">${product.price}</div>
        <button class="primary">Add to cart</button>
      </article>
    `
    )
    .join('');
}

async function loadStatus() {
  try {
    const response = await fetch('/api/visits');
    const data = await response.json();
    statusValue.textContent = `Visits: ${data.visits} • ${data.message}`;
  } catch (err) {
    statusValue.textContent = `Backend error: ${err.message}`;
  }
}

refreshButton.addEventListener('click', loadStatus);
searchButton.addEventListener('click', () => {
  const query = searchInput.value.toLowerCase();
  const filtered = products.filter((product) =>
    product.title.toLowerCase().includes(query) || product.description.toLowerCase().includes(query)
  );
  renderProducts(filtered.length ? filtered : products);
});

renderProducts(products);
loadStatus();
