const CACHE_VERSION='acl-pwa-v7';
const APP_SHELL=[
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon-32.png',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_VERSION).then(cache=>cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(key=>key!==CACHE_VERSION).map(key=>caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  const {request}=event;

  if(request.method!=='GET')return;

  const url=new URL(request.url);

  if(url.origin==='https://api.jsonbin.io'){
    event.respondWith(networkFirst(request));
    return;
  }

  if(url.origin==='https://fonts.googleapis.com'||url.origin==='https://fonts.gstatic.com'){
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if(request.mode==='navigate'){
    event.respondWith(
      fetch(request).catch(()=>caches.match('/index.html'))
    );
    return;
  }

  if(url.origin===self.location.origin){
    event.respondWith(cacheFirst(request));
  }
});

async function cacheFirst(request){
  const cached=await caches.match(request);
  if(cached)return cached;
  const response=await fetch(request);
  const cache=await caches.open(CACHE_VERSION);
  cache.put(request,response.clone());
  return response;
}

async function networkFirst(request){
  try{
    return await fetch(request);
  }catch(error){
    const cached=await caches.match(request);
    if(cached)return cached;
    throw error;
  }
}

async function staleWhileRevalidate(request){
  const cache=await caches.open(CACHE_VERSION);
  const cached=await cache.match(request);
  const fetchPromise=fetch(request).then(response=>{
    cache.put(request,response.clone());
    return response;
  });
  return cached||fetchPromise;
}
