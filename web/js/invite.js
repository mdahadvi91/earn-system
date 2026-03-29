let tg = window.parent.Telegram.WebApp;
let user = tg.initDataUnsafe.user.id;

let link = document.getElementById("link");
link.value = "https://t.me/YOUR_BOT?start="+user;

function copy(){
navigator.clipboard.writeText(link.value);
alert("Copied");
}
