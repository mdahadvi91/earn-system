let tg = window.parent.Telegram.WebApp;
let user = tg.initDataUnsafe.user.id;

function watch(){

window.open("https://www.profitablecpmratenetwork.com/kxq650wd?key=11d1ec5f3d88b1d9689e0547e8b15dd1");

setTimeout(()=>{
fetch("/reward",{
method:"POST",
headers:{'Content-Type':'application/json'},
body:JSON.stringify({id:user})
})
.then(r=>r.json())
.then(d=>{
alert(d.success ? "Earned" : d.error);
});
},15000);

}
