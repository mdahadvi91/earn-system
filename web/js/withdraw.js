function initWithdraw(){
  loadUser();
}

function withdraw(){

  let amount = document.getElementById("amount").value;
  let address = document.getElementById("address").value;

  fetch("/api/withdraw",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      id:user,
      amount:amount,
      address:address
    })
  })
  .then(r=>r.json())
  .then(d=>{
    alert(d.msg);
    loadUser();
  });

}
