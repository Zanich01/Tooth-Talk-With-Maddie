function toggleSearchBar() {
  var searchBar = document.getElementById("mySearch");
  searchBar.style.display = (searchBar.style.display === "none" || searchBar.style.display === "") ? "inline-block" : "none";
}


// Get the button
var mybutton = document.getElementById("topBtn");

// When the user scrolls down 20px from the top of the document, show the button
window.onscroll = function () {
    scrollFunction();
};

function scrollFunction() {
    if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
        mybutton.style.display = "block";
    } else {
        mybutton.style.display = "none";
    }
}

// When the user clicks on the button, scroll to the top of the document
function topFunction() {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
}




let products = [];

async function fetchProducts() {
    const response = await fetch('products.json');
    products = await response.json();
}

function searchProducts() {
    const query = document.getElementById('search-bar').value.toLowerCase();
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';

    if (query.trim() === '') {
        resultsContainer.style.display = 'none';
        return;
    }

    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
        
    );

    filteredProducts.forEach(product => {
        const productElement = document.createElement('div');
        productElement.className = 'product';
        
        const productImageLink = document.createElement('a');
        productImageLink.href = product.url;
        productImageLink.target = '_blank';
        
        const productImage = document.createElement('img');
        productImage.src = product.image;
        productImage.alt = product.name;
        
        productImageLink.appendChild(productImage);
        productElement.appendChild(productImageLink);
        
        const productInfo = document.createElement('div');
        productInfo.className = 'product-info';
        
        const productName = document.createElement('a');
        productName.href = product.url;
        productName.target = '_blank';
        productName.textContent = product.name;
        productInfo.appendChild(productName);
        
        const productCategory = document.createElement('p');
        productCategory.textContent = `Category: ${product.category}`;
        productInfo.appendChild(productCategory);

        productElement.appendChild(productInfo);
        resultsContainer.appendChild(productElement);
    });

    if (filteredProducts.length === 0) {
        resultsContainer.textContent = 'No products found';
    } else {
        resultsContainer.style.display = 'block';
    }
}

fetchProducts();

const searchBar = document.getElementById('search-bar');
const resultsContainer = document.getElementById('results');

searchBar.addEventListener('input', searchProducts);

searchBar.addEventListener('focus', () => {
    if (searchBar.value.trim() !== '') {
        resultsContainer.style.display = 'block';
    }
});

document.addEventListener('click', (event) => {
    if (!searchBar.contains(event.target) && !resultsContainer.contains(event.target)) {
        resultsContainer.style.display = 'none';
    }
});
