let tg = window.parent.Telegram.WebApp;
let user = tg.initDataUnsafe.user.id;

function wd(){
fetch("/withdraw",{
method:"POST",
headers:{'Content-Type':'application/json'},
body:JSON.stringify({
id:user,
amount:amount.value,
number:addr.value
})
})
.then(r=>r.json())
.then(d=>{
alert(d.success?"Done":"Error");
});
}
