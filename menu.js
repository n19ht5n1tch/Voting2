const navMenu = document.getElementById("navMenu");
const dropdownContent = document.querySelector(".dropdown-content");

navMenu.addEventListener("click", () => {
    navMenu.classList.toggle("active");
    dropdownContent.classList.toggle("show");
});