let running = false;

function initTask(){
  loadUser();
}

function watchAd(){

  if(running){
    alert("⏳ Wait...");
    return;
  }

  running = true;

  // 🔥 Smartlink
  window.open("https://www.profitablecpmratenetwork.com/kxq650wd?key=11d1ec5f3d88b1d9689e0547e8b15dd1", "_blank");

  setTimeout(()=>{

    fetch("/api/reward",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({id:user})
    })
    .then(r=>r.json())
    .then(d=>{
      alert(d.msg);
      loadUser();
      running = false;
    });

  },15000);
}
