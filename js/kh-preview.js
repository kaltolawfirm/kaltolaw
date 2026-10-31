// PREVIEW MODE (local use): loaded only when the page address contains ?preview.
// Replaces Firebase with four sample posts held in memory, so the blog cards,
// post page, likes and comments can be seen without touching the real database.
// Nothing is saved; reloading resets everything.
(function(){
  function TS(d){ this._d=d; } TS.prototype.toDate=function(){ return this._d; };
  var now=Date.now();
  var day=86400000;
  var data={
    'insights/sample-1':{title:'How to register a company in Rwanda',category:'Company law',coverImage:'images/blog-img-5.jpg',description:'The steps, documents and fees involved in registering a company with RDB, and the mistakes that slow founders down.',content:'<p>This is a sample post shown in preview mode. Real posts written in the admin panel appear here with their full text.</p><h2>What you need</h2><p>Identification for each shareholder and director, the company name, the registered office address and the share structure.</p>',createdAt:new TS(new Date(now-day*1)),views:210,likes:25,comments:2},
    'insights/sample-2':{title:'Your rights when your employment ends',category:'Labour law',coverImage:'images/blog-img-2.jpg',description:'Notice periods, final pay and severance under Rwandan labour law, explained in plain language.',content:'<p>This is a sample post shown in preview mode.</p>',createdAt:new TS(new Date(now-day*3)),views:203,likes:10,comments:0},
    'insights/sample-3':{title:'Planning your estate: where to start',category:'Estate planning',coverImage:'images/blog-img-8.jpg',description:'Wills, succession and protecting family property: the first decisions to make.',content:'<p>This is a sample post shown in preview mode.</p>',createdAt:new TS(new Date(now-day*5)),views:126,likes:6,comments:1},
    'insights/sample-4':{title:'Resolving business disputes without court',category:'Dispute resolution',coverImage:'images/blog-img-7.jpg',description:'When mediation and arbitration are faster, cheaper and more private than litigation.',content:'<p>This is a sample post shown in preview mode.</p>',createdAt:new TS(new Date(now-day*7)),views:151,likes:16,comments:0},
    'insights/sample-1/comments/c1':{name:'Aline M.',text:'Very clear guide, thank you. Is the process the same for a foreign shareholder?',createdAt:new TS(new Date(now-3600000*5))},
    'insights/sample-1/comments/c2':{name:'Eric N.',text:'Helpful checklist before our registration next week.',createdAt:new TS(new Date(now-3600000*20))},
    'insights/sample-3/comments/c1':{name:'Grace U.',text:'Please write more about succession for family land.',createdAt:new TS(new Date(now-day*2))}
  };
  function Inc(n){this.n=n;} function STS(){}
  function apply(path,obj,merge){
    var cur=merge?Object.assign({},data[path]||{}):{};
    for(var k in obj){ var v=obj[k]; if(v instanceof Inc) cur[k]=(cur[k]||0)+v.n; else if(v instanceof STS) cur[k]=new TS(new Date()); else cur[k]=v; }
    // mimic the new rules: counters only move by one step
    data[path]=cur; 
  }
  function Snap(path){ this.id=path.split('/').pop(); this.exists=!!data[path]; this._p=path; }
  Snap.prototype.data=function(){ return data[this._p]; };
  function Doc(path){ this.path=path; this.id=path.split('/').pop(); }
  Doc.prototype.get=function(){ return Promise.resolve(new Snap(this.path)); };
  Doc.prototype.update=function(o){ var p=this.path; return new Promise(function(res,rej){ try{ if(!data[p]) throw new Error('no doc'); apply(p,o,true); res(); }catch(e){rej(e);} }); };
  Doc.prototype.set=function(o){ apply(this.path,o,false); return Promise.resolve(); };
  Doc.prototype.collection=function(n){ return new Col(this.path+'/'+n); };
  var auto=0;
  function Col(path){ this.path=path; this._o=null; this._l=null; }
  Col.prototype.doc=function(id){ return new Doc(this.path+'/'+(id||('auto'+(++auto)))); };
  Col.prototype.orderBy=function(f,dir){ var c=new Col(this.path); c._o=[f,dir]; c._l=this._l; return c; };
  Col.prototype.limit=function(n){ var c=new Col(this.path); c._o=this._o; c._l=n; return c; };
  Col.prototype.add=function(o){ var d=this.doc(); apply(d.path,o,false); return Promise.resolve(d); };
  Col.prototype.get=function(){ var pre=this.path+'/', self=this;
    var docs=Object.keys(data).filter(function(k){ return k.indexOf(pre)===0 && k.slice(pre.length).indexOf('/')<0; }).map(function(k){ return new Snap(k); });
    if(this._o){ var f=this._o[0], s=this._o[1]==='desc'?-1:1; docs.sort(function(a,b){ var x=a.data()[f],y=b.data()[f]; x=x&&x.toDate?x.toDate():x; y=y&&y.toDate?y.toDate():y; return (x>y?1:x<y?-1:0)*s; }); }
    if(this._l) docs=docs.slice(0,this._l);
    return Promise.resolve({empty:!docs.length, size:docs.length, docs:docs, forEach:function(fn){docs.forEach(fn);}}); };
  function Batch(){ this.ops=[]; }
  Batch.prototype.set=function(r,o){ this.ops.push(function(){ apply(r.path,o,false); }); return this; };
  Batch.prototype.update=function(r,o){ this.ops.push(function(){ apply(r.path,o,true); }); return this; };
  Batch.prototype.commit=function(){ var ops=this.ops; return new Promise(function(res,rej){ try{ ops.forEach(function(f){f();}); res(); }catch(e){rej(e);} }); };
  var db={ collection:function(n){ return new Col(n); }, batch:function(){ return new Batch(); } };
  var fs=function(){ return db; }; fs.FieldValue={ increment:function(n){ return new Inc(n); }, serverTimestamp:function(){ return new STS(); } };
  // The real Firebase scripts still load and log an error when they find this
  // stand-in instead of their own app; that is expected in preview and harmless.
  var fb={ apps:[], initializeApp:function(){ this.apps.push({}); return {}; }, firestore:fs, auth:function(){ return { onAuthStateChanged:function(){} }; } };
  // Keep the sample database even when the real Firebase library loads later
  try {
    Object.defineProperty(window, 'firebase', { configurable: false, get: function () { return fb; }, set: function () {} });
  } catch (e) { window.firebase = fb; }

  // Keep ?preview on links between the homepage, blog and post pages
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var url = new URL(a.getAttribute('href'), location.href);
    if (url.origin !== location.origin || url.searchParams.has('preview')) return;
    if (!/(^\/$|index|blog)/.test(url.pathname)) return;
    url.searchParams.set('preview', '');
    a.setAttribute('href', url.pathname + url.search.replace('preview=', 'preview') + url.hash);
  }, true);

  // Banner so sample content is never mistaken for real posts
  document.addEventListener('DOMContentLoaded', function () {
    var bar = document.createElement('div');
    bar.setAttribute('role', 'note');
    bar.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:3000;padding:10px 18px;border-radius:999px;background:#E8661C;color:#fff;font:600 13px/1.3 Poppins,Inter,sans-serif;box-shadow:0 10px 24px rgba(46,23,9,.25);white-space:nowrap';
    bar.textContent = 'Preview: sample blog posts, nothing is saved';
    document.body.appendChild(bar);
  });
})();
