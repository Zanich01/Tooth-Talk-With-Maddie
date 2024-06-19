function toggleSearchBar() {
  var searchBar = document.getElementById("mySearch");
  searchBar.style.display = (searchBar.style.display === "none" || searchBar.style.display === "") ? "inline-block" : "none";
}

function filterLinks() {
    // Get the user input and convert it to lowercase for case-insensitive matching
    const userInput = document.getElementById('mySearch').value.toLowerCase();
  
    // Get all the links in the navbar
    const links = document.querySelectorAll('.navbar a');
  
    // Iterate through each link and hide/show based on the user input
    links.forEach(link => {
      const linkText = link.textContent.toLowerCase();
      if (linkText.includes(userInput)) {
        link.style.display = 'block';
      } else {
        link.style.display = 'none';
      }
    });
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

