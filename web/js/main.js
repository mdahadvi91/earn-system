let tg = window.Telegram.WebApp;
let user = tg.initDataUnsafe.user?.id || "test_user";

document.getElementById("uid").innerText = user;

// load first page
loadPage("task");

// page loader
function loadPage(page){
  fetch("/pages/" + page + ".html")
  .then(res => res.text())
  .then(html => {
    document.getElementById("content").innerHTML = html;

    if(page === "task") initTask();
    if(page === "admin"){}
    if(page === "invite") initInvite();
    if(page === "withdraw") initWithdraw();
    if(page === "offer"){}
    if(page === "offerwall"){}
    if(page === "leaderboard"){}
  });
}

// nav control
function showPage(page){
  loadPage(page);
}

function showPage(page) {
  if(page === "offer"){
    window.location.href = "pages/offer.html";
    return;
  }

  document.querySelectorAll(".page").forEach(p => p.style.display = "none");
  document.getElementById(page).style.display = "block";
}
