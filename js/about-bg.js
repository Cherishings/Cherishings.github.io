(function(){
  var obs=null;
  function applyBg(b){
    if(obs)obs.disconnect();
    b.style.backgroundImage="url('/img/dream.JPG')";
    b.style.backgroundSize='cover';
    b.style.backgroundPosition='center center';
    b.style.backgroundAttachment='fixed';
    setTimeout(function(){
      if(obs&&document.getElementById('web_bg')===b)
        obs.observe(b,{attributes:true,attributeFilter:['style']});
    },0);
  }
  function setup(){
    var b=document.getElementById('web_bg');
    if(!b)return;
    if(obs){obs.disconnect();obs=null;}
    if(document.body.classList.contains('type-about')){
      obs=new MutationObserver(function(){
        if(document.body.classList.contains('type-about'))applyBg(b);
      });
      applyBg(b);
    }
  }
  document.addEventListener('DOMContentLoaded',setup);
  document.addEventListener('pjax:complete',setup);
  if(document.readyState!=='loading')setup();
})();
