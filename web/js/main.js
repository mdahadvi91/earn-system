let tg = window.Telegram.WebApp;

let user = tg?.initDataUnsafe?.user?.id || localStorage.getItem("uid");

if(!user){
  user = Math.floor(Math.random()*1000000);
}

localStorage.setItem("uid", user);

document.getElementById("uid").innerText = user;

// first page
loadPage("task");

function loadPage(page){

  fetch("/pages/" + page + ".html")
  .then(res => res.text())
  .then(html => {

    document.getElementById("content").innerHTML = html;

    if(page === "task" && typeof initTask === "function") initTask();
    if(page === "invite" && typeof initInvite === "function") initInvite();
    if(page === "withdraw" && typeof initWithdraw === "function") initWithdraw();

  });
}

function showPage(page){
  loadPage(page);
}
