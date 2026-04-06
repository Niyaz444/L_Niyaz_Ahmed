/* ============================================================
   NIYAZ AHMED PORTFOLIO — script.js
   Contains: WebGL Fluid Cursor, Custom Cursor, Math Canvas BG,
   Scroll Reveal, Counters, Nav, Tilt, Progress Bar
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* =====================================================
     1. SCROLL PROGRESS BAR
     ===================================================== */
  const bar = document.createElement('div');
  bar.id = 'scroll-bar';
  document.body.appendChild(bar);
  window.addEventListener('scroll', () => {
    const pct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
    bar.style.width = (pct * 100) + '%';
  }, { passive: true });


  /* =====================================================
     2. CUSTOM CURSOR (blob + dot with lerp bloop)
     ===================================================== */
  const blob = document.getElementById('cursor-blob');
  const dot  = document.getElementById('cursor-dot');
  let bX = -300, bY = -300, tX = -300, tY = -300;

  document.addEventListener('mousemove', e => {
    tX = e.clientX; tY = e.clientY;
    dot.style.left = tX + 'px'; dot.style.top = tY + 'px';
  });

  (function animateBlob() {
    bX += (tX - bX) * 0.1; bY += (tY - bY) * 0.1;
    blob.style.left = bX + 'px'; blob.style.top = bY + 'px';
    requestAnimationFrame(animateBlob);
  })();

  document.querySelectorAll('a, button, .pub-card, .exp-card, .skill-pills span, .lang-item, .award-card, .ref-card, .conf-item, .social-link, .btn-primary, .btn-ghost').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  });

  document.addEventListener('mousedown', () => {
    document.body.classList.add('cursor-click');
    // ripple
    const r = document.createElement('div');
    Object.assign(r.style, { position:'fixed', left:tX+'px', top:tY+'px', width:'8px', height:'8px', borderRadius:'50%', border:'1.5px solid rgba(196,160,100,0.8)', transform:'translate(-50%,-50%) scale(1)', pointerEvents:'none', zIndex:'9998', transition:'transform .5s ease-out, opacity .5s ease-out', opacity:'1' });
    document.body.appendChild(r);
    requestAnimationFrame(() => { r.style.transform = 'translate(-50%,-50%) scale(9)'; r.style.opacity = '0'; });
    setTimeout(() => r.remove(), 520);
  });
  document.addEventListener('mouseup', () => setTimeout(() => document.body.classList.remove('cursor-click'), 200));


  /* =====================================================
     3. MATH CANVAS BACKGROUND
     ===================================================== */
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, pts, syms;
  const SYMS = ['∂','∑','∫','∇','∆','λ','α','β','π','θ','ε','δ','∞','≈','⊂','⊗'];

  function resizeBG() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }

  function initBG() {
    pts  = Array.from({length:60}, () => ({ x:Math.random()*W, y:Math.random()*H, r:Math.random()*1.5+.3, vx:(Math.random()-.5)*.25, vy:(Math.random()-.5)*.25, a:Math.random()*.4+.1 }));
    syms = Array.from({length:18}, () => ({ x:Math.random()*W, y:Math.random()*H, s:SYMS[Math.floor(Math.random()*SYMS.length)], sz:Math.random()*18+10, a:Math.random()*.07+.02, vx:(Math.random()-.5)*.12, vy:(Math.random()-.5)*.12, rot:Math.random()*Math.PI*2, rs:(Math.random()-.5)*.003 }));
  }

  function drawBG() {
    ctx.clearRect(0,0,W,H);
    ctx.strokeStyle='rgba(196,160,100,0.025)'; ctx.lineWidth=1;
    for(let x=0;x<W;x+=80){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=80){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    for(let i=0;i<pts.length;i++){
      for(let j=i+1;j<pts.length;j++){
        const dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y, d=Math.sqrt(dx*dx+dy*dy);
        if(d<140){ctx.strokeStyle=`rgba(196,160,100,${.06*(1-d/140)})`;ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.stroke();}
      }
    }
    pts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(196,160,100,${p.a})`;ctx.fill();});
    syms.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.rot+=s.rs;if(s.x<-30||s.x>W+30)s.vx*=-1;if(s.y<-30||s.y>H+30)s.vy*=-1;ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.rot);ctx.font=`300 ${s.sz}px 'Cormorant Garamond',serif`;ctx.fillStyle=`rgba(196,160,100,${s.a})`;ctx.fillText(s.s,0,0);ctx.restore();});
    requestAnimationFrame(drawBG);
  }

  resizeBG(); initBG(); drawBG();
  window.addEventListener('resize', ()=>{resizeBG();initBG();});


  /* =====================================================
     4. WEBGL FLUID SPLASH CURSOR
        (Vanilla JS port of the React SplashCursor component)
     ===================================================== */
  (function initFluid() {
    const c = document.getElementById('fluid');
    if (!c) return;

    const params = { alpha:true, depth:false, stencil:false, antialias:false, preserveDrawingBuffer:false };
    let gl = c.getContext('webgl2', params);
    const isGL2 = !!gl;
    if (!isGL2) gl = c.getContext('webgl', params) || c.getContext('experimental-webgl', params);
    if (!gl) return;

    let halfFloat, linFilt;
    if (isGL2) { gl.getExtension('EXT_color_buffer_float'); linFilt = gl.getExtension('OES_texture_float_linear'); }
    else { halfFloat = gl.getExtension('OES_texture_half_float'); linFilt = gl.getExtension('OES_texture_half_float_linear'); }
    gl.clearColor(0,0,0,1);

    const hfType = isGL2 ? gl.HALF_FLOAT : (halfFloat && halfFloat.HALF_FLOAT_OES);

    function fmtSupported(intFmt, fmt, type) {
      const t=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,t);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,intFmt,4,4,0,fmt,type,null);
      const f=gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER,f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);
      return gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
    }
    function getSupportedFormat(i,f,t) {
      if(!fmtSupported(i,f,t)){if(i===gl.R16F)return getSupportedFormat(gl.RG16F,gl.RG,t);if(i===gl.RG16F)return getSupportedFormat(gl.RGBA16F,gl.RGBA,t);return null;}
      return{internalFormat:i,format:f};
    }

    let fmtRGBA,fmtRG,fmtR;
    if(isGL2){fmtRGBA=getSupportedFormat(gl.RGBA16F,gl.RGBA,hfType);fmtRG=getSupportedFormat(gl.RG16F,gl.RG,hfType);fmtR=getSupportedFormat(gl.R16F,gl.RED,hfType);}
    else{fmtRGBA=getSupportedFormat(gl.RGBA,gl.RGBA,hfType);fmtRG=getSupportedFormat(gl.RGBA,gl.RGBA,hfType);fmtR=getSupportedFormat(gl.RGBA,gl.RGBA,hfType);}

    const SIM_RES=128, DYE_RES=linFilt?1440:256;
    const DENSITY_DISS=3.5, VEL_DISS=2, PRESSURE=0.1, PRESSURE_ITER=20, CURL=3;
    const SPLAT_RADIUS=0.2, SPLAT_FORCE=6000, COLOR_SPEED=10;

    function compile(type, src) { const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); return s; }
    function prog(vs,fs) { const p=gl.createProgram(); gl.attachShader(p,vs); gl.attachShader(p,fs); gl.linkProgram(p); const u={}; const n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS); for(let i=0;i<n;i++){const nm=gl.getActiveUniform(p,i).name;u[nm]=gl.getUniformLocation(p,nm);} return{p,u,bind(){gl.useProgram(p);}}; }

    const VS = compile(gl.VERTEX_SHADER,`precision highp float;attribute vec2 aPosition;varying vec2 vUv,vL,vR,vT,vB;uniform vec2 texelSize;void main(){vUv=aPosition*.5+.5;vL=vUv-vec2(texelSize.x,0.);vR=vUv+vec2(texelSize.x,0.);vT=vUv+vec2(0.,texelSize.y);vB=vUv-vec2(0.,texelSize.y);gl_Position=vec4(aPosition,0.,1.);}`);

    const copyP  = prog(VS, compile(gl.FRAGMENT_SHADER,`precision mediump float;precision mediump sampler2D;varying highp vec2 vUv;uniform sampler2D uTexture;void main(){gl_FragColor=texture2D(uTexture,vUv);}`));
    const clearP = prog(VS, compile(gl.FRAGMENT_SHADER,`precision mediump float;precision mediump sampler2D;varying highp vec2 vUv;uniform sampler2D uTexture;uniform float value;void main(){gl_FragColor=value*texture2D(uTexture,vUv);}`));
    const splatP = prog(VS, compile(gl.FRAGMENT_SHADER,`precision highp float;precision highp sampler2D;varying vec2 vUv;uniform sampler2D uTarget;uniform float aspectRatio;uniform vec3 color;uniform vec2 point;uniform float radius;void main(){vec2 p=vUv-point.xy;p.x*=aspectRatio;vec3 splat=exp(-dot(p,p)/radius)*color;vec3 base=texture2D(uTarget,vUv).xyz;gl_FragColor=vec4(base+splat,1.);}`));
    const advP   = prog(VS, compile(gl.FRAGMENT_SHADER,`precision highp float;precision highp sampler2D;varying vec2 vUv;uniform sampler2D uVelocity,uSource;uniform vec2 texelSize,dyeTexelSize;uniform float dt,dissipation;void main(){vec2 coord=vUv-dt*texture2D(uVelocity,vUv).xy*texelSize;vec4 result=texture2D(uSource,coord);gl_FragColor=result/(1.+dissipation*dt);}`));
    const divP   = prog(VS, compile(gl.FRAGMENT_SHADER,`precision mediump float;precision mediump sampler2D;varying highp vec2 vUv,vL,vR,vT,vB;uniform sampler2D uVelocity;void main(){float L=texture2D(uVelocity,vL).x,R=texture2D(uVelocity,vR).x,T=texture2D(uVelocity,vT).y,B=texture2D(uVelocity,vB).y;vec2 C=texture2D(uVelocity,vUv).xy;if(vL.x<0.)L=-C.x;if(vR.x>1.)R=-C.x;if(vT.y>1.)T=-C.y;if(vB.y<0.)B=-C.y;gl_FragColor=vec4(.5*(R-L+T-B),0.,0.,1.);}`));
    const curlP  = prog(VS, compile(gl.FRAGMENT_SHADER,`precision mediump float;precision mediump sampler2D;varying highp vec2 vUv,vL,vR,vT,vB;uniform sampler2D uVelocity;void main(){float L=texture2D(uVelocity,vL).y,R=texture2D(uVelocity,vR).y,T=texture2D(uVelocity,vT).x,B=texture2D(uVelocity,vB).x;gl_FragColor=vec4(.5*(R-L-T+B),0.,0.,1.);}`));
    const vortP  = prog(VS, compile(gl.FRAGMENT_SHADER,`precision highp float;precision highp sampler2D;varying vec2 vUv,vL,vR,vT,vB;uniform sampler2D uVelocity,uCurl;uniform float curl,dt;void main(){float L=texture2D(uCurl,vL).x,R=texture2D(uCurl,vR).x,T=texture2D(uCurl,vT).x,B=texture2D(uCurl,vB).x,C=texture2D(uCurl,vUv).x;vec2 f=.5*vec2(abs(T)-abs(B),abs(R)-abs(L));f/=length(f)+.0001;f*=curl*C;f.y*=-1.;vec2 v=texture2D(uVelocity,vUv).xy+f*dt;v=min(max(v,-1000.),1000.);gl_FragColor=vec4(v,0.,1.);}`));
    const presP  = prog(VS, compile(gl.FRAGMENT_SHADER,`precision mediump float;precision mediump sampler2D;varying highp vec2 vUv,vL,vR,vT,vB;uniform sampler2D uPressure,uDivergence;void main(){float L=texture2D(uPressure,vL).x,R=texture2D(uPressure,vR).x,T=texture2D(uPressure,vT).x,B=texture2D(uPressure,vB).x,div=texture2D(uDivergence,vUv).x;gl_FragColor=vec4((L+R+B+T-div)*.25,0.,0.,1.);}`));
    const gradP  = prog(VS, compile(gl.FRAGMENT_SHADER,`precision mediump float;precision mediump sampler2D;varying highp vec2 vUv,vL,vR,vT,vB;uniform sampler2D uPressure,uVelocity;void main(){float L=texture2D(uPressure,vL).x,R=texture2D(uPressure,vR).x,T=texture2D(uPressure,vT).x,B=texture2D(uPressure,vB).x;vec2 v=texture2D(uVelocity,vUv).xy-vec2(R-L,T-B);gl_FragColor=vec4(v,0.,1.);}`));
    const dispP  = prog(VS, compile(gl.FRAGMENT_SHADER,`precision highp float;precision highp sampler2D;varying vec2 vUv,vL,vR,vT,vB;uniform sampler2D uTexture;uniform vec2 texelSize;void main(){vec3 c=texture2D(uTexture,vUv).rgb;vec3 lc=texture2D(uTexture,vL).rgb,rc=texture2D(uTexture,vR).rgb,tc=texture2D(uTexture,vT).rgb,bc=texture2D(uTexture,vB).rgb;float dx=length(rc)-length(lc),dy=length(tc)-length(bc);vec3 n=normalize(vec3(dx,dy,length(texelSize)));float diff=clamp(dot(n,vec3(0,0,1))+.7,.7,1.);c*=diff;float a=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c,a);}`));

    gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,-1,1,1,1,1,-1]),gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array([0,1,2,0,2,3]),gl.STATIC_DRAW);
    gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0); gl.enableVertexAttribArray(0);

    function blit(target, clear) {
      if(!target){gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);gl.bindFramebuffer(gl.FRAMEBUFFER,null);}
      else{gl.viewport(0,0,target.width,target.height);gl.bindFramebuffer(gl.FRAMEBUFFER,target.fbo);}
      if(clear){gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);}
      gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0);
    }

    function makeFBO(w,h,iF,f,t,p){
      gl.activeTexture(gl.TEXTURE0);
      const tex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,tex);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,p); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,p);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,iF,w,h,0,f,t,null);
      const fbo=gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);
      gl.viewport(0,0,w,h); gl.clear(gl.COLOR_BUFFER_BIT);
      return{texture:tex,fbo,width:w,height:h,texelSizeX:1/w,texelSizeY:1/h,attach(id){gl.activeTexture(gl.TEXTURE0+id);gl.bindTexture(gl.TEXTURE_2D,tex);return id;}};
    }
    function makeDoubleFBO(w,h,iF,f,t,p){
      let a=makeFBO(w,h,iF,f,t,p),b=makeFBO(w,h,iF,f,t,p);
      return{width:w,height:h,texelSizeX:a.texelSizeX,texelSizeY:a.texelSizeY,get read(){return a;},set read(v){a=v;},get write(){return b;},set write(v){b=v;},swap(){let t=a;a=b;b=t;}};
    }

    function getRes(res){
      let ar=gl.drawingBufferWidth/gl.drawingBufferHeight; if(ar<1)ar=1/ar;
      const mn=Math.round(res),mx=Math.round(res*ar);
      return gl.drawingBufferWidth>gl.drawingBufferHeight?{width:mx,height:mn}:{width:mn,height:mx};
    }
    function spx(v){return Math.floor(v*(window.devicePixelRatio||1));}

    let dye,velocity,divFBO,curlFBO,pressure;
    function initFBOs(){
      const sim=getRes(SIM_RES),dyr=getRes(DYE_RES),fil=linFilt?gl.LINEAR:gl.NEAREST;
      gl.disable(gl.BLEND);
      if(!dye)dye=makeDoubleFBO(dyr.width,dyr.height,fmtRGBA.internalFormat,fmtRGBA.format,hfType,fil);
      if(!velocity)velocity=makeDoubleFBO(sim.width,sim.height,fmtRG.internalFormat,fmtRG.format,hfType,fil);
      divFBO=makeFBO(sim.width,sim.height,fmtR.internalFormat,fmtR.format,hfType,gl.NEAREST);
      curlFBO=makeFBO(sim.width,sim.height,fmtR.internalFormat,fmtR.format,hfType,gl.NEAREST);
      pressure=makeDoubleFBO(sim.width,sim.height,fmtR.internalFormat,fmtR.format,hfType,gl.NEAREST);
    }
    initFBOs();

    function resizeCanvas(){const w=spx(c.clientWidth),h=spx(c.clientHeight);if(c.width!==w||c.height!==h){c.width=w;c.height=h;return true;}return false;}
    function HSV(h,s,v){let r,g,b,i=Math.floor(h*6),f=h*6-i,p=v*(1-s),q=v*(1-f*s),t=v*(1-(1-f)*s);switch(i%6){case 0:r=v,g=t,b=p;break;case 1:r=q,g=v,b=p;break;case 2:r=p,g=v,b=t;break;case 3:r=p,g=q,b=v;break;case 4:r=t,g=p,b=v;break;case 5:r=v,g=p,b=q;break;}return{r,g,b};}
    function genColor(){let c=HSV(Math.random(),1,1);c.r*=.15;c.g*=.15;c.b*=.15;return c;}
    function corrR(r){let ar=c.width/c.height;if(ar>1)r*=ar;return r;}
    function corrDX(d){let ar=c.width/c.height;if(ar<1)d*=ar;return d;}
    function corrDY(d){let ar=c.width/c.height;if(ar>1)d/=ar;return d;}

    function splat(x,y,dx,dy,color){
      splatP.bind();
      gl.uniform1i(splatP.u.uTarget,velocity.read.attach(0)); gl.uniform1f(splatP.u.aspectRatio,c.width/c.height);
      gl.uniform2f(splatP.u.point,x,y); gl.uniform3f(splatP.u.color,dx,dy,0); gl.uniform1f(splatP.u.radius,corrR(SPLAT_RADIUS/100));
      blit(velocity.write); velocity.swap();
      gl.uniform1i(splatP.u.uTarget,dye.read.attach(0)); gl.uniform3f(splatP.u.color,color.r,color.g,color.b);
      blit(dye.write); dye.swap();
    }

    let ptr={texcoordX:.5,texcoordY:.5,prevX:.5,prevY:.5,deltaX:0,deltaY:0,moved:false,color:{r:.3,g:.1,b:.1}};
    let lastTime=Date.now(),colorTimer=0;

    function step(dt){
      gl.disable(gl.BLEND);
      curlP.bind(); gl.uniform2f(curlP.u.texelSize,velocity.texelSizeX,velocity.texelSizeY); gl.uniform1i(curlP.u.uVelocity,velocity.read.attach(0)); blit(curlFBO);
      vortP.bind(); gl.uniform2f(vortP.u.texelSize,velocity.texelSizeX,velocity.texelSizeY); gl.uniform1i(vortP.u.uVelocity,velocity.read.attach(0)); gl.uniform1i(vortP.u.uCurl,curlFBO.attach(1)); gl.uniform1f(vortP.u.curl,CURL); gl.uniform1f(vortP.u.dt,dt); blit(velocity.write); velocity.swap();
      divP.bind(); gl.uniform2f(divP.u.texelSize,velocity.texelSizeX,velocity.texelSizeY); gl.uniform1i(divP.u.uVelocity,velocity.read.attach(0)); blit(divFBO);
      clearP.bind(); gl.uniform1i(clearP.u.uTexture,pressure.read.attach(0)); gl.uniform1f(clearP.u.value,PRESSURE); blit(pressure.write); pressure.swap();
      presP.bind(); gl.uniform2f(presP.u.texelSize,velocity.texelSizeX,velocity.texelSizeY); gl.uniform1i(presP.u.uDivergence,divFBO.attach(0));
      for(let i=0;i<PRESSURE_ITER;i++){gl.uniform1i(presP.u.uPressure,pressure.read.attach(1));blit(pressure.write);pressure.swap();}
      gradP.bind(); gl.uniform2f(gradP.u.texelSize,velocity.texelSizeX,velocity.texelSizeY); gl.uniform1i(gradP.u.uPressure,pressure.read.attach(0)); gl.uniform1i(gradP.u.uVelocity,velocity.read.attach(1)); blit(velocity.write); velocity.swap();
      advP.bind(); gl.uniform2f(advP.u.texelSize,velocity.texelSizeX,velocity.texelSizeY); gl.uniform2f(advP.u.dyeTexelSize,velocity.texelSizeX,velocity.texelSizeY);
      const vid=velocity.read.attach(0); gl.uniform1i(advP.u.uVelocity,vid); gl.uniform1i(advP.u.uSource,vid); gl.uniform1f(advP.u.dt,dt); gl.uniform1f(advP.u.dissipation,VEL_DISS); blit(velocity.write); velocity.swap();
      gl.uniform2f(advP.u.dyeTexelSize,dye.texelSizeX,dye.texelSizeY); gl.uniform1i(advP.u.uVelocity,velocity.read.attach(0)); gl.uniform1i(advP.u.uSource,dye.read.attach(1)); gl.uniform1f(advP.u.dissipation,DENSITY_DISS); blit(dye.write); dye.swap();
    }

    function render(){
      gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA); gl.enable(gl.BLEND);
      const w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
      dispP.bind(); gl.uniform2f(dispP.u.texelSize,1/w,1/h); gl.uniform1i(dispP.u.uTexture,dye.read.attach(0)); blit(null);
    }

    function frame(){
      const now=Date.now(); let dt=Math.min((now-lastTime)/1000,.016666); lastTime=now;
      if(resizeCanvas())initFBOs();
      colorTimer+=dt*COLOR_SPEED; if(colorTimer>=1){colorTimer=0;ptr.color=genColor();}
      if(ptr.moved){ptr.moved=false;splat(ptr.texcoordX,ptr.texcoordY,ptr.deltaX*SPLAT_FORCE,ptr.deltaY*SPLAT_FORCE,ptr.color);}
      step(dt); render();
      requestAnimationFrame(frame);
    }

    let firstMove=false;
    window.addEventListener('mousemove',e=>{
      const px=spx(e.clientX)/c.width, py=1-spx(e.clientY)/c.height;
      if(!firstMove){ptr.texcoordX=px;ptr.texcoordY=py;firstMove=true;return;}
      ptr.deltaX=corrDX(px-ptr.texcoordX); ptr.deltaY=corrDY(py-ptr.texcoordY);
      ptr.texcoordX=px; ptr.texcoordY=py;
      ptr.moved=Math.abs(ptr.deltaX)>0||Math.abs(ptr.deltaY)>0;
    });
    window.addEventListener('mousedown',e=>{
      const col=genColor(); col.r*=10;col.g*=10;col.b*=10;
      const px=spx(e.clientX)/c.width, py=1-spx(e.clientY)/c.height;
      splat(px,py,10*(Math.random()-.5),30*(Math.random()-.5),col);
    });
    window.addEventListener('touchstart',e=>{
      const t=e.targetTouches[0];
      const col=genColor();col.r*=10;col.g*=10;col.b*=10;
      splat(spx(t.clientX)/c.width,1-spx(t.clientY)/c.height,10*(Math.random()-.5),30*(Math.random()-.5),col);
    },{passive:true});
    window.addEventListener('touchmove',e=>{
      const t=e.targetTouches[0];
      const px=spx(t.clientX)/c.width,py=1-spx(t.clientY)/c.height;
      ptr.deltaX=corrDX(px-ptr.texcoordX); ptr.deltaY=corrDY(py-ptr.texcoordY);
      ptr.texcoordX=px; ptr.texcoordY=py; ptr.moved=true;
    },{passive:true});

    frame();
  })();


  /* =====================================================
     5. NAVBAR SCROLL + ACTIVE LINK
     ===================================================== */
  const navbar = document.getElementById('navbar');
  const navAs  = navbar.querySelectorAll('.nav-links a');
  const sects  = document.querySelectorAll('section[id]');

  function updateNav() {
    let cur = '';
    sects.forEach(s => { if (window.scrollY >= s.offsetTop - 120) cur = s.id; });
    navAs.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + cur));
  }
  window.addEventListener('scroll', () => { navbar.classList.toggle('scrolled', window.scrollY > 40); updateNav(); }, { passive: true });
  updateNav();

  const toggle = document.getElementById('nav-toggle');
  const navList = navbar.querySelector('.nav-links');
  toggle.addEventListener('click', () => {
    const open = navList.classList.toggle('open');
    const sp = toggle.querySelectorAll('span');
    if (open) { sp[0].style.transform='translateY(6.5px) rotate(45deg)'; sp[1].style.opacity='0'; sp[2].style.transform='translateY(-6.5px) rotate(-45deg)'; }
    else { sp.forEach(s=>{s.style.transform='';s.style.opacity='';}); }
  });
  navList.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    navList.classList.remove('open');
    toggle.querySelectorAll('span').forEach(s=>{s.style.transform='';s.style.opacity='';});
  }));


  /* =====================================================
     6. SCROLL REVEAL
     ===================================================== */
  document.querySelectorAll('.pub-card').forEach((el,i)=>el.dataset.delay=i*70);
  document.querySelectorAll('.timeline-item').forEach((el,i)=>el.dataset.delay=i*100);
  document.querySelectorAll('.skills-block').forEach((el,i)=>el.dataset.delay=i*80);

  new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('visible'), parseInt(e.target.dataset.delay || 0));
        // skill pill stagger
        e.target.querySelectorAll('.skill-pills span').forEach((pill,i) => {
          pill.style.opacity='0'; pill.style.transform='translateY(10px) scale(0.9)';
          setTimeout(()=>{ pill.style.transition='opacity .4s ease,transform .4s var(--ease-out)'; pill.style.opacity='1'; pill.style.transform=''; }, i*55);
        });
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' }).observe = (() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('visible'), parseInt(e.target.dataset.delay || 0));
          e.target.querySelectorAll('.skill-pills span').forEach((pill,i) => {
            pill.style.opacity='0'; pill.style.transform='translateY(10px) scale(0.9)';
            setTimeout(()=>{ pill.style.transition='opacity .4s ease,transform .4s'; pill.style.opacity='1'; pill.style.transform=''; }, i*55);
          });
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.section-label,.section-title,.timeline-item,.pub-card,.exp-card,.conf-item,.skills-block,.lang-item,.ref-card,.about-grid,.exp-grid').forEach(el => obs.observe(el));
    return obs.observe.bind(obs);
  })();


  /* =====================================================
     7. HERO STAT COUNTERS
     ===================================================== */
  let counted = false;
  new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !counted) {
      counted = true;
      setTimeout(() => {
        document.querySelectorAll('.stat-num[data-target]').forEach(el => {
          const target = +el.dataset.target, start = performance.now();
          (function tick(now) {
            const p = Math.min((now - start) / 1600, 1);
            el.textContent = Math.floor((1 - Math.pow(1 - p, 3)) * target);
            if (p < 1) requestAnimationFrame(tick); else el.textContent = target;
          })(performance.now());
        });
      }, 800);
    }
  }, { threshold: 0.5 }).observe(document.getElementById('hero'));


  /* =====================================================
     8. PUB CARD 3D TILT
     ===================================================== */
  document.querySelectorAll('.pub-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top)  / r.height - .5;
      card.style.transform = `perspective(700px) rotateX(${-y*4}deg) rotateY(${x*4}deg) translateY(-3px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform .5s cubic-bezier(0.22,1,0.36,1)';
      card.style.transform = '';
      setTimeout(() => card.style.transition = '', 500);
    });
  });

  console.log('%cL. Niyaz Ahmed — Portfolio', 'color:#c4a064;font-size:16px;font-family:serif;');
});
