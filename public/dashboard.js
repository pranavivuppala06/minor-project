// dashboard.js
document.addEventListener("DOMContentLoaded", () => {
    fetch("/username")
      .then(res => {
        if (!res.ok) throw new Error("Not logged in");
        return res.json();
      })
      .then(data => {
        document.getElementById("username").textContent = data.username;
      })
      .catch(() => {
        window.location.href = "/index.html"; // Redirect if not logged in
      });
  });
  
  function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("collapsed");
  }
  
  function logout() {
    window.location.href = "/logout";
  }
  