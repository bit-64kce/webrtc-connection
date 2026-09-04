let submit = document.getElementById('submit')
let usrname = document.getElementById('username')



submit.addEventListener('click', function () {
  console.log('clicked')
  console.log(usrname.value)
  localStorage.setItem('userid', usrname.value)
  window.location.href = "../connect.html"
})
