/**
 * Celebration animation bank for goal-met + streak/milestone moments.
 * Each effect is intentionally distinct — pick randomly so repeats feel fresh.
 */
(function (global) {
  /** @type {HTMLElement | null} */
  let root = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let clearTimer = null;
  let lastPlayedId = null;
  let frameId = null;
  let sceneCleanup = null;
  const rotations = new Map();
  let reducedMotion = false;

  try {
    reducedMotion =
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    /* ignore */
  }

  function ensureRoot() {
    if (root && document.body.contains(root)) return root;
    root = document.getElementById('celebration-fx');
    if (!root) {
      root = document.createElement('div');
      root.id = 'celebration-fx';
      root.className = 'celebration-fx';
      root.setAttribute('aria-hidden', 'true');
      root.hidden = true;
      document.body.appendChild(root);
    }
    return root;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function clearFx() {
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
    if (sceneCleanup) sceneCleanup();
    sceneCleanup = null;
    if (clearTimer) {
      clearTimeout(clearTimer);
      clearTimer = null;
    }
    const el = ensureRoot();
    el.className = 'celebration-fx';
    el.innerHTML = '';
    el.hidden = true;
    document.body.classList.remove('is-celebrating');
  }

  function finish(durationMs) {
    if (clearTimer) clearTimeout(clearTimer);
    clearTimer = setTimeout(clearFx, durationMs);
  }

  function banner(title, subtitle) {
    const b = document.createElement('div');
    b.className = 'cele-banner';
    const heading = document.createElement('p');
    heading.className = 'cele-banner-title';
    heading.textContent = title || 'Goal met';
    b.appendChild(heading);
    if (subtitle) {
      const sub = document.createElement('p');
      sub.className = 'cele-banner-sub';
      sub.textContent = subtitle;
      b.appendChild(sub);
    }
    return b;
  }

  // Every scene shares the same six-second cinematic stage and lifecycle.
  const SCENES = [
    ['aqua-aurora', 'Aqua aurora', 170, 'aurora'],
    ['bubble-cascade', 'Bubble cascade', 190, 'bubbles'],
    ['rain-reversal', 'Rain reversal', 205, 'rain'],
    ['ripple-crown', 'Ripple crown', 45, 'crown'],
    ['splash-orbit', 'Splash orbit', 185, 'orbit'],
    ['tide-wave', 'Tide wave', 195, 'wave'],
    ['hydro-prism', 'Hydro prism', 210, 'prism'],
    ['firefly-fountain', 'Firefly fountain', 155, 'fireflies'],
    ['crystal-shatter', 'Crystal shatter', 200, 'crystal'],
    ['hydro-helix', 'Hydro helix', 180, 'helix'],
    ['streak-inferno', 'Streak inferno', 25, 'inferno'],
    ['droplet-meteors', 'Droplet meteors', 220, 'meteors'],
    ['koi-splash', 'Koi splash', 30, 'koi'],
    ['stamp-slam', 'Stamp slam', 160, 'stamp'],
    ['champagne-fountain', 'Champagne fountain', 45, 'fountain'],
    ['galaxy-swirl', 'Galaxy swirl', 260, 'galaxy'],
    ['origami-fleet', 'Origami fleet', 185, 'origami'],
    ['pearl-supernova', 'Pearl supernova', 190, 'burst'],
    ['lantern-lagoon', 'Lantern lagoon', 38, 'lantern'],
    ['jellyfish-ballet', 'Jellyfish ballet', 280, 'jelly'],
    ['lotus-awakening', 'Lotus awakening', 325, 'lotus'],
    ['moonlit-tide', 'Moonlit tide', 215, 'tide'],
    ['coral-symphony', 'Coral symphony', 15, 'coral'],
    ['celestial-compass', 'Celestial compass', 45, 'compass'],
    ['rainbow-regatta', 'Rainbow regatta', 180, 'regatta'],
    ['wish-constellation', 'Wish constellation', 235, 'stars'],
    ['liquid-fireworks', 'Liquid fireworks', 165, 'fireworks'],
    ['vortex-bloom', 'Vortex bloom', 265, 'vortex'],
    ['diamond-rain', 'Diamond rain', 195, 'diamond'],
  ];

  const TAU = Math.PI * 2;
  const progress = (t, start, duration) => Math.max(0, Math.min(1, (t - start) / duration));
  const easeOut = p => 1 - (1 - p) ** 3;

  function ellipse(g, x, y, rx, ry, color, width = 1) {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.beginPath();
    g.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), 0, 0, TAU);
    g.stroke();
  }

  function droplet(g, x, y, size, angle, color) {
    g.save();
    g.translate(x, y);
    g.rotate(angle);
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, -size * 1.6);
    g.bezierCurveTo(size * 1.5, 0, size, size, 0, size);
    g.bezierCurveTo(-size, size, -size * 1.5, 0, 0, -size * 1.6);
    g.fill();
    g.restore();
  }

  // Original effects, reauthored with distinct build / reveal / release sequences.
  const CLASSIC_RENDERERS = {
    aurora({g, t, radius: r, w, reveal, color, dot}) {
      for (let band = 0; band < 5; band++) {
        const points = Array.from({length: 65}, (_, i) => {
          const x = (i / 64 - .5) * w;
          return [x, -r * .8 + band * r * .26 + Math.sin(i * .08 + t * .65 + band) * r * .3];
        });
        const glow = g.createLinearGradient(0, -r, 0, r);
        glow.addColorStop(0, color(band * 14, .03));
        glow.addColorStop(.5, color(band * 14, .28 * reveal));
        glow.addColorStop(1, color(band * 14, 0));
        g.fillStyle = glow;
        g.beginPath();
        points.forEach(([x,y], i) => i ? g.lineTo(x,y) : g.moveTo(x,y));
        [...points].reverse().forEach(([x,y]) => g.lineTo(x,y + r * .7));
        g.closePath(); g.fill();
        for (let i = 0; i < points.length; i += 3) {
          const [x,y] = points[i];
          dot(x, y, 1.2 * reveal, color(20, .5));
        }
      }
    },
    bubbles({g, t, radius: r, w, reveal, color, seeds, dot}) {
      for (let i = 0; i < 16; i++) {
        const s = seeds[i];
        const age = progress(t, i * .09, 4.2);
        const x = (s.x - .5) * w * .9 + Math.sin(t + i) * 14;
        const y = r * 1.2 - age * r * 2.6;
        const size = (14 + s.r * 20) * reveal;
        const pop = progress(age, .77, .23);
        if (!pop) {
          const fill = g.createRadialGradient(x-size*.3, y-size*.4, 0, x,y,size || 1);
          fill.addColorStop(0, color(35,.13)); fill.addColorStop(.8, color(0,.02)); fill.addColorStop(1,color(15,.3));
          g.fillStyle = fill; g.beginPath(); g.arc(x,y,size,0,TAU); g.fill();
          ellipse(g,x,y,size,size,color(i*5,.65));
          g.strokeStyle='#e9fbff'; g.beginPath(); g.arc(x,y,size*.77,3.6,4.5);g.stroke();
        } else {
          for (let k=0;k<8;k++) {
            const a=k*TAU/8;
            dot(x+Math.cos(a)*size*(1+pop),y+Math.sin(a)*size*(1+pop),2*(1-pop),color(25,1-pop));
          }
        }
      }
    },
    rain({g, t, radius: r, w, color, seeds, line, dot}) {
      const reversal = progress(t, 1.8, 2.7);
      for (let i=0;i<65;i++) {
        const s=seeds[i], x=(s.x-.5)*w;
        const y = reversal ? r*.65 - easeOut(reversal)*r*(1.1+s.y) : -r*1.5+progress(t,s.y*.9,1.1)*r*2.15;
        line([[x,y-(reversal?-14:18)],[x,y]],color(i%3*10,.7),1.4);
        dot(x,y,1.8,color(20));
      }
      for(let i=0;i<4;i++) {
        const p=progress(t,1.3+i*.13,1.8);
        ellipse(g,0,r*.65,r*p,r*.15*p,color(20,(1-p)*.7));
      }
    },
    crown({g, t, radius: r, reveal, color, dot, line}) {
      const rise=easeOut(progress(t,.7,1.4)), release=progress(t,3.6,1.6);
      for(let i=0;i<5;i++) ellipse(g,0,r*.4,r*(.3+i*.15)*reveal,r*(.07+i*.025)*reveal,color(5,.45-i*.06));
      const points=[];
      for(let i=0;i<=12;i++) {
        const x=(i/12-.5)*r*1.6;
        const y=r*.35-(i%2 ? r*(.5+.3*Math.cos(x/r))*rise : 0);
        points.push([x,y]);
        if(i%2) droplet(g,x*(1+release*.4),y-release*r*.6,6*(1-release),0,color());
      }
      line(points,color(0,.85*(1-release)),2);
      line([[-r*.8,r*.45],[r*.8,r*.45]],color(10,.6*(1-release)),2);
      for(let i=0;i<24;i++) {
        const a=i*TAU/24, d=r*(.8+release*.6);
        dot(Math.cos(a)*d,Math.sin(a)*d,1.5*rise,color(30,.6));
      }
    },
    orbit({g, t, radius: r, reveal, color, dot}) {
      const release=easeOut(progress(t,3.2,1.5));
      for(let band=0;band<3;band++) {
        g.save();g.rotate(band*Math.PI/3);
        ellipse(g,0,0,r*.9*reveal,r*.3*reveal,color(band*15,.35*(1-release)));
        for(let i=0;i<9;i++) {
          const a=i*TAU/9+t*(1+band*.15), d=1+release*1.1;
          droplet(g,Math.cos(a)*r*.9*d*reveal,Math.sin(a)*r*.3*d*reveal,3.5,a+Math.PI/2,color(band*15,1-release*.7));
        }
        g.restore();
      }
      dot(0,0,(8+Math.sin(t)*2)*reveal,color(20));
    },
    wave({g, t, radius: r, w, reveal, color, dot}) {
      const swell=Math.sin(progress(t,.2,5)*Math.PI);
      for(let j=4;j>=0;j--) {
        const points=Array.from({length:81},(_,i)=>{
          const x=(i/80-.5)*w;
          const crest=Math.exp(-(((x/w-.5+t*.18)*4)**2));
          return [x,r*.65+j*15-Math.sin(i*.09-t*1.3+j*.3)*r*.17-r*.9*crest*swell];
        });
        g.fillStyle=color(j*8,.1*reveal);g.beginPath();g.moveTo(-w/2,r*1.6);
        points.forEach(([x,y])=>g.lineTo(x,y));g.lineTo(w/2,r*1.6);g.closePath();g.fill();
        g.strokeStyle=color(j*8,.55);g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();
        if(j===0) points.forEach(([x,y],i)=>{if(i%3===0)dot(x,y-3,1.6,color(0,.8));});
      }
    },
    prism({g, t, radius: r, reveal, color, line}) {
      const split=easeOut(progress(t,1.3,1.8));
      line([[-r*1.6,-r*.4],[-r*.24,0]],`rgba(240,250,255,${reveal*.8})`,3);
      for(let i=0;i<7;i++) {
        g.fillStyle=`hsla(${i*45},80%,72%,${split*.2})`;
        g.beginPath();g.moveTo(r*.15,0);g.lineTo(r*1.5,(i-3)*r*.18*split);g.lineTo(r*1.5,(i-2)*r*.18*split);g.closePath();g.fill();
      }
      const points=[[0,-r*.55],[-r*.48,r*.3],[r*.48,r*.3],[0,-r*.55]];
      g.fillStyle=color(0,.12*reveal);g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.fill();
      line(points,color(0,reveal),2);line([[0,-r*.55],[0,r*.05],[r*.48,r*.3]],color(20,.4));
      ellipse(g,0,0,r*.83*reveal,r*.83*reveal,color(20,.15));
    },
    fireflies({t, radius: r, w, reveal, color, seeds, dot, line}) {
      for(let i=0;i<70;i++) {
        const s=seeds[i], gather=easeOut(progress(t,.6,2.5)), release=progress(t,3.7,1.4);
        const a=i*2.39996+t*.15, d=r*(.2+s.x*.7);
        const x=(s.x-.5)*w*(1-gather)+Math.cos(a)*d*gather+Math.sin(i)*release*r;
        const y=r*(1-s.y*.4)*(1-gather)+Math.sin(a)*d*gather-release*r*.6;
        const glow=.4+.6*Math.sin(t*1.8+i)**2;
        dot(x,y,(2+s.r)*reveal,color(i%4*16,glow));
        dot(x,y,7*reveal,color(i%4*16,.06*glow));
        if(i%5===0)line([[x-3,y+8],[x,y]],color(0,.15));
      }
    },
    crystal({g, t, radius: r, reveal, color, line}) {
      const breakApart=easeOut(progress(t,2.7,1.6));
      for(let i=0;i<12;i++) {
        const a=i*TAU/12, d=breakApart*r*.8;
        g.save();g.translate(Math.cos(a)*d,Math.sin(a)*d);g.rotate(a+breakApart*.4);
        const points=[[0,0],[r*.65*reveal,-r*.17*reveal],[r*reveal,0],[r*.65*reveal,r*.17*reveal],[0,0]];
        g.fillStyle=color(i*3,.2);g.beginPath();points.forEach(([x,y],j)=>j?g.lineTo(x,y):g.moveTo(x,y));g.fill();
        line(points,color(i*3,.85),1);line([[0,0],[r*reveal,0]],color(0,.45));g.restore();
      }
    },
    helix({t, radius: r, reveal, color, line, dot}) {
      for(let i=0;i<28;i++) {
        const y=(i/27-.5)*r*1.9, phase=i*.38-t*1.6, x=Math.sin(phase)*r*.43*reveal;
        line([[-x,y],[x,y]],color(15,.22*reveal));
        const front=(Math.cos(phase)+1)/2;
        dot(x,y,(2.5+front*2.5)*reveal,color(0,.4+front*.6));
        dot(-x,y,(5-front*2.5)*reveal,color(45,1-front*.6));
      }
    },
    inferno({g, t, radius: r, reveal, color, seeds, dot}) {
      const n=7;
      for(let i=0;i<n;i++) {
        const a=i*TAU/n-Math.PI/2, x=Math.cos(a)*r*.65, y=Math.sin(a)*r*.65;
        ellipse(g,x,y,20*reveal,20*reveal,color(12,.4));
        const height=(27+Math.sin(t*2.5+i)*5)*reveal;
        g.fillStyle=color(i*3,.75);g.beginPath();g.moveTo(x,y+12);
        g.bezierCurveTo(x-25,y,x+6,y-height*.5,x,y-height);
        g.bezierCurveTo(x+30,y-5,x+15,y+18,x,y+12);g.fill();
        dot(x,y,5*reveal,'#fff2c9');
      }
      seeds.slice(0,30).forEach((s,i)=>dot((s.x-.5)*r*2,r-((t*.25+s.y)%1)*r*2.5,1.7*reveal,color(i%3*10,.65)));
    },
    meteors({t, radius: r, w, color, seeds, line, dot}) {
      for(let i=0;i<18;i++) {
        const s=seeds[i], p=progress(t,i*.17,1.8);
        if(p<=0 || p>=1)continue;
        const x=(s.x-.8)*w+p*w*.8, y=-r*1.2+p*r*2.2;
        for(let k=0;k<6;k++)line([[x-k*10,y-k*8],[x-(k+1)*10,y-(k+1)*8]],color(i%4*12,(1-k/6)*.55),2-k*.2);
        dot(x,y,3.5,color(10));
      }
    },
    koi({g, t, radius: r, reveal, color}) {
      for(let i=0;i<3;i++) {
        const a=t*.65+i*TAU/3, x=Math.cos(a)*r*.72, y=Math.sin(a)*r*.42;
        g.save();g.translate(x,y);g.rotate(Math.atan2(Math.cos(a)*.42,-Math.sin(a)*.72));g.scale(reveal,reveal);
        g.fillStyle=color(i*25,.9);g.beginPath();g.ellipse(0,0,29,10,0,0,TAU);g.fill();
        g.beginPath();g.moveTo(-22,0);g.lineTo(-42,-12+Math.sin(t*5+i)*4);g.lineTo(-35,0);g.lineTo(-42,12+Math.sin(t*5+i)*4);g.closePath();g.fill();
        g.fillStyle='#f3f3e5';g.beginPath();g.ellipse(2,-2,11,7,-.3,0,TAU);g.fill();
        g.fillStyle='#102331';g.beginPath();g.arc(19,-3,2,0,TAU);g.fill();g.restore();
        ellipse(g,x-20,y+10,(12+(t*.4+i)%1*35)*reveal,8*reveal,color(160,.2));
      }
    },
    stamp({g, t, radius: r, color, seeds, dot, ctx}) {
      const land=easeOut(progress(t,.4,.7)), release=progress(t,4.2,1);
      g.save();g.rotate(-.09);g.scale(1.5-land*.5,1.5-land*.5);g.globalAlpha*=land*(1-release);
      g.strokeStyle=color();g.lineWidth=2;g.fillStyle=color(0,.08);
      g.beginPath();g.roundRect(-r*.8,-r*.36,r*1.6,r*.72,12);g.fill();g.stroke();
      g.setLineDash([3,5]);g.strokeRect(-r*.73,-r*.29,r*1.46,r*.58);g.setLineDash([]);
      g.fillStyle=color();g.font=`600 ${Math.min(34,r*.28)}px sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(ctx.stamp || 'GOAL',0,0,r*1.3);g.restore();
      const p=progress(t,.9,2.7);
      for(let i=0;i<36;i++) {
        const a=i*TAU/36,d=r*(.7+easeOut(p)*seeds[i].r*.7);
        dot(Math.cos(a)*d,Math.sin(a)*d*.7,2*(1-p),color(20,.7));
      }
    },
    fountain({g, t, radius: r, reveal, color}) {
      for(let stream=0;stream<7;stream++) {
        const angle=(stream-3)*.18;
        for(let i=0;i<12;i++) {
          const p=progress(t,i*.07+stream*.06,3.5);
          if(p<=0 || p>=1)continue;
          const x=Math.sin(angle)*r*3*p, y=r*.8-r*6*p*(1-p);
          droplet(g,x,y,3.5*reveal,angle+p*Math.PI,color(stream*8,(1-p)*.9));
        }
      }
      ellipse(g,0,r*.8,r*.6*reveal,r*.12,color(0,.45));
    },
    galaxy({t, radius: r, reveal, color, dot, line}) {
      const collapse=easeOut(progress(t,2,1.2)), release=easeOut(progress(t,3.3,1.7));
      for(let i=0;i<96;i++) {
        const arm=i%3, p=i/96, a=arm*TAU/3+p*5+t*.6;
        const d=r*(.12+p)*reveal*(1-collapse*.85+release*1.3);
        const x=Math.cos(a)*d, y=Math.sin(a)*d*.7;
        line([[x-5*Math.sin(a),y+5*Math.cos(a)],[x,y]],color(arm*25,.3));
        dot(x,y,1.5+p*2,color(arm*25,.9-release*.5));
      }
      dot(0,0,(5+collapse*9-release*10)*reveal,'#f5eaff');
    },
    origami({g, t, radius: r, w, reveal, color, line}) {
      for(let i=0;i<7;i++) {
        const p=progress(t,i*.15,4.4), x=-w*.65+p*w*1.3, y=(i-3)*r*.24-Math.sin(p*Math.PI)*r*.5;
        g.save();g.translate(x,y);g.rotate(-.15+Math.sin(t+i)*.08);g.scale(reveal,reveal);
        const points=[[-25,-12],[30,0],[-25,12],[-10,0],[-25,-12]];
        g.fillStyle=color(i*7,.65);g.beginPath();points.forEach(([px,py],j)=>j?g.lineTo(px,py):g.moveTo(px,py));g.fill();
        line(points,color(i*7),1);line([[-10,0],[30,0]],'#e4f8ff',1);
        line([[-38,0],[-70,4]],color(0,.2));g.restore();
      }
    },
  };

  function cinematic(host, ctx, scene) {
    const [, name, hue, mode] = scene;
    host.classList.add('cele-cinema');
    host.style.setProperty('--scene-hue', hue);
    const canvas = document.createElement('canvas');
    canvas.className = 'cele-canvas';
    host.appendChild(canvas);
    const g = canvas.getContext('2d');
    if (!g) { canvas.remove(); reducedFallback(host, ctx); return; }
    const label = document.createElement('p');
    label.className = 'cele-scene-label';
    label.textContent = name;
    host.appendChild(label);
    const card = banner(ctx.title, ctx.subtitle || 'A little moment for a daily win');
    const seal = document.createElement('div');
    seal.className = 'cele-seal';
    seal.textContent = ctx.short || '✓';
    card.prepend(seal);
    host.appendChild(card);
    let w, h, radius;
    function resize() {
      w = host.clientWidth; h = host.clientHeight;
      radius = Math.min(w * .38, h * .24, 235);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);
    sceneCleanup = () => window.removeEventListener('resize', resize);
    const seeds = Array.from({length: 100}, () => ({x: Math.random(), y: Math.random(), r: rand(.5, 1.5)}));
    const tau = Math.PI * 2;
    const clamp = v => Math.max(0, Math.min(1, v));
    function dot(x, y, r, color) {
      g.fillStyle = color; g.beginPath(); g.arc(x, y, Math.max(.1, r), 0, tau); g.fill();
    }
    function line(points, color, width = 1) {
      g.strokeStyle = color; g.lineWidth = width; g.beginPath();
      points.forEach(([x,y], i) => i ? g.lineTo(x,y) : g.moveTo(x,y)); g.stroke();
    }
    const start = performance.now();
    function draw(now) {
      const t = (now - start) / 1000;
      if (t >= 6) { clearFx(); return; }
      g.clearRect(0, 0, w, h);
      g.globalAlpha = clamp(t * 2) * clamp((6 - t) / .8);
      const cx = w / 2, cy = h * (host.closest('.cele-preview-stage') ? .40 : .49);
      const reveal = 1 - Math.pow(1 - clamp((t - .25) / 1.8), 3);
      const color = (shift = 0, alpha = 1) => `hsla(${hue + shift},85%,75%,${alpha})`;
      // Distant dust and slow expanding water rings provide depth in every scene.
      seeds.slice(0, 35).forEach((s,i) => dot(s.x*w, (s.y*h-t*8+h)%h, s.r, color(i, .2+.2*Math.sin(t+i)**2)));
      for (let j=0;j<3;j++) {
        g.strokeStyle=color(0,.15); g.lineWidth=1;
        g.beginPath(); g.ellipse(cx,cy+radius*.7, radius*(.4+((t*.22+j*.3)%1)),radius*.16,0,0,tau);g.stroke();
      }
      g.save(); g.translate(cx, cy);
      if (CLASSIC_RENDERERS[mode]) {
        CLASSIC_RENDERERS[mode]({g, t, radius, w, h, reveal, color, seeds, dot, line, ctx});
      } else if (mode === 'burst' || mode === 'vortex' || mode === 'fireworks') {
        for(let i=0;i<96;i++) {
          const s=seeds[i], group=i%3;
          const age=mode==='fireworks' ? clamp((t-.4-group*.65)/2.4) : clamp((t-.5)/3.6);
          const a=i*2.39996+(mode==='vortex'?t*1.5:0);
          const r=radius*(mode==='vortex' ? (.15+s.x*.85)*reveal : Math.sin(age*Math.PI*.7)*( .3+s.x));
          const ox=mode==='fireworks'?(group-1)*radius*.62:0, oy=mode==='fireworks'?-group*radius*.32:0;
          const x=Math.cos(a)*r+ox, y=Math.sin(a)*r+oy+age*age*radius*.4;
          line([[x-Math.cos(a)*12,y-Math.sin(a)*12],[x,y]],color(group*45,.45),1.5);
          dot(x,y,2+s.r,color(group*45));
        }
      } else if(mode==='lotus') {
        for(let layer=2;layer>=0;layer--) for(let i=0;i<10;i++) {
          g.save();g.rotate(i*tau/10+layer*.3+t*.06);
          g.scale(reveal,reveal);g.fillStyle=color(layer*22,.38);g.strokeStyle=color(layer*22,.8);
          g.beginPath();g.moveTo(0,0);g.bezierCurveTo(-radius*.48,-radius*.5, -radius*.3,-radius*(1-layer*.22),0,-radius*(1.15-layer*.23));
          g.bezierCurveTo(radius*.3,-radius*(1-layer*.22),radius*.48,-radius*.5,0,0);g.fill();g.stroke();g.restore();
        }
        dot(0,0,14*reveal,'#fff5c5');
      } else if(mode==='jelly' || mode==='lantern') {
        for(let i=0;i<7;i++) {
          const s=seeds[i], x=(s.x-.5)*w*.85, y=radius*1.8-((t*.23+s.y)%1)*radius*3;
          const size=(18+s.r*12)*reveal;
          g.save();g.translate(x,y);
          if(mode==='jelly') {
            for(let k=0;k<5;k++) line(Array.from({length:22},(_,n)=>[(k-2)*size*.3+Math.sin(n*.3+t*2+i)*n*.45,n*size*.09]),color(i*12,.55));
            g.fillStyle=color(i*12,.4);g.beginPath();g.ellipse(0,0,size,size*.7,0,Math.PI,tau);g.closePath();g.fill();
            line([[-size,0],[size,0]],color(i*12),2);
          } else {
            g.fillStyle=color(i*5,.4);g.strokeStyle=color();g.lineWidth=1;
            g.beginPath();g.roundRect(-size*.6,-size,size*1.2,size*1.5,8);g.fill();g.stroke();
            dot(0,0,5,'#fff4c2');line([[-size*.5,size*.5],[size*.5,size*.5]],color(),2);
          }g.restore();
        }
      } else if(mode==='tide' || mode==='regatta') {
        if(mode==='tide') {dot(radius*.45,-radius*.55,32*reveal,'#edf5ff');dot(radius*.58,-radius*.65,29*reveal,'#10213c');}
        for(let j=0;j<5;j++) {
          const points=Array.from({length:61},(_,i)=>{const x=-w/2+i*w/60;return [x,radius*.25+j*22+Math.sin(i*.19+t*1.5+j)*18*reveal];});
          line(points,color(j*14,.65-j*.08),2);
          if(mode==='regatta' && j<3) {
            const x=((t*.15+j*.32)%1)*w-w/2, y=radius*.25+j*22;
            g.fillStyle=color(j*65);g.beginPath();g.moveTo(x,y-65*reveal);g.lineTo(x-28,y-7);g.lineTo(x,y-7);g.fill();
            line([[x-35,y],[x-22,y+12],[x+19,y+12],[x+32,y]],color(j*65),3);
          }
        }
      } else if(mode==='coral') {
        function branch(x,y,len,a,depth) {
          if(!depth)return;
          const nx=x+Math.sin(a)*len*reveal, ny=y-Math.cos(a)*len*reveal;
          line([[x,y],[nx,ny]],color(depth*12,.8),depth*1.5);
          if(depth===1)dot(nx,ny,3,color(55));
          branch(nx,ny,len*.7,a-.5,depth-1);branch(nx,ny,len*.7,a+.5,depth-1);
        }
        for(let j=-1;j<=1;j++)branch(j*radius*.65,radius*.8,radius*.45,j*.2+Math.sin(t)*.04,5);
      } else if(mode==='compass' || mode==='stars') {
        const n=mode==='stars'?12:32;
        const points=Array.from({length:n},(_,i)=>{const a=i*tau/n-Math.PI/2+t*.07;const r=radius*reveal*(mode==='stars'?(i%2?.48:1):1);return [Math.cos(a)*r,Math.sin(a)*r];});
        line([...points,points[0]],color(0,.6),1);
        points.forEach(([x,y],i)=>{dot(x,y,i%4?2:4,color(i*3));if(mode==='compass')line([[x*.8,y*.8],[x,y]],color());else if(i%2===0)line([[x,y],points[(i+4)%n]],color(25,.2));});
        if(mode==='compass') {g.rotate(t*.3);g.fillStyle=color();g.beginPath();g.moveTo(0,-radius*.7*reveal);g.lineTo(13,15);g.lineTo(0,0);g.lineTo(-13,15);g.closePath();g.fill();}
      } else if(mode==='diamond') {
        for(let i=0;i<38;i++) {
          const s=seeds[i], x=(s.x-.5)*w, y=((s.y+t*.2)%1)*h-h/2, size=(4+s.r*5)*reveal;
          g.save();g.translate(x,y);g.rotate(t*.5+i);g.fillStyle=color(i*3,.6);
          g.beginPath();g.moveTo(0,-size*1.6);g.lineTo(size,0);g.lineTo(0,size*1.6);g.lineTo(-size,0);g.closePath();g.fill();
          line([[0,-size*1.6],[0,size*1.6]],'#e6fbff');g.restore();
        }
      }
      g.restore();
      frameId = requestAnimationFrame(draw);
    }
    frameId = requestAnimationFrame(draw);
    finish(6100); // Also cleans up if the browser pauses animation frames.
  }

  /* ─── Banks ─────────────────────────────────────────────────────── */

  const ALL_BY_ID = Object.fromEntries(SCENES.map(scene => [scene[0], {
    id: scene[0], play: (host, ctx) => cinematic(host, ctx, scene),
  }]));
  const originalStreaks = ['streak-inferno', 'droplet-meteors', 'firefly-fountain', 'galaxy-swirl', 'stamp-slam', 'crystal-shatter', 'champagne-fountain', 'hydro-helix'];
  const originalMilestones = ['streak-inferno', 'galaxy-swirl', 'crystal-shatter', 'tide-wave', 'hydro-prism', 'stamp-slam', 'aqua-aurora'];
  const newIds = SCENES.slice(17).map(scene => scene[0]);
  const GOAL_BANK = Object.values(ALL_BY_ID).filter(item => item.id !== 'streak-inferno');
  const STREAK_BANK = [...newIds, ...originalStreaks].map(id => ALL_BY_ID[id]);
  const MILESTONE_BANK = [...newIds, ...originalMilestones].map(id => ALL_BY_ID[id]);

  /** Streak lengths that get the big milestone treatment. */
  const STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365];

  function isStreakMilestone(n) {
    return STREAK_MILESTONES.includes(n);
  }

  function pickFromBank(bank) {
    if (!bank.length) return null;
    const key = 'water-celebration-rotation-' + (bank === GOAL_BANK ? 'goal' : bank === STREAK_BANK ? 'streak' : 'milestone');
    let remaining = rotations.get(bank);
    if (!remaining) {
      try {
        const saved = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(saved)) {
          remaining = [...new Set(saved)].map(id => bank.find(item => item.id === id)).filter(Boolean);
        }
      } catch { /* Storage is optional; celebrations still work without it. */ }
    }
    if (!remaining || !remaining.length) remaining = shuffle(bank);
    if (remaining.length > 1 && remaining[remaining.length - 1].id === lastPlayedId) {
      [remaining[0], remaining[remaining.length - 1]] = [remaining[remaining.length - 1], remaining[0]];
    }
    const item = remaining.pop();
    rotations.set(bank, remaining);
    try { localStorage.setItem(key, JSON.stringify(remaining.map(entry => entry.id))); } catch { /* optional */ }
    return item;
  }

  function reducedFallback(host, ctx) {
    host.className = 'celebration-fx cele-reduced';
    host.appendChild(banner(ctx.title, ctx.subtitle));
    finish(1800);
  }

  /**
   * @param {'goal' | 'streak' | 'milestone' | string} kind
   * @param {{ title?: string, subtitle?: string, streak?: number, stamp?: string, short?: string, id?: string, preview?: boolean }} [opts]
   */
  function play(kind, opts = {}) {
    reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    const host = ensureRoot();
    clearFx();
    host.hidden = false;
    void host.offsetWidth;
    document.body.classList.add('is-celebrating');

    const streak = opts.streak || 0;
    let bank = GOAL_BANK;
    let title = opts.title;
    let subtitle = opts.subtitle;
    let stamp = opts.stamp;
    let short = opts.short;

    if (kind === 'milestone' || (kind === 'auto' && isStreakMilestone(streak))) {
      bank = MILESTONE_BANK;
      title =
        title ||
        (streak >= 365
          ? 'A full year hydrated'
          : streak >= 100
            ? `${streak}-day legend`
            : streak >= 30
              ? `${streak}-day milestone`
              : `${streak}-day streak`);
      subtitle = subtitle || 'Consistency looks good on you';
      stamp = stamp || `${streak}★`;
      short = short || String(streak);
    } else if (kind === 'streak') {
      bank = STREAK_BANK;
      title = title || `${streak}-day streak`;
      subtitle = subtitle || 'Keep the chain alive';
      stamp = stamp || `${streak}🔥`;
      short = short || String(streak);
    } else if (kind === 'goal') {
      bank = GOAL_BANK;
      title = title || 'Goal met';
      subtitle = subtitle || pick([
        'Hydration secured',
        'Well poured',
        'Body says thanks',
        'Daily dunk complete',
        'You filled the well',
      ]);
      stamp = stamp || 'GOAL';
      short = short || '✓';
    } else if (ALL_BY_ID[kind]) {
      // Play a specific animation by id
      const item = ALL_BY_ID[kind];
      if (!opts.preview) lastPlayedId = item.id;
      const ctx = {
        title: title || 'Goal met',
        subtitle: subtitle || '',
        streak,
        stamp: stamp || 'GOAL',
        short: short || '✓',
      };
      if (reducedMotion) {
        reducedFallback(host, ctx);
        return item.id;
      }
      item.play(host, ctx);
      return item.id;
    }

    const ctx = { title: title || 'Goal met', subtitle, streak, stamp, short };

    if (reducedMotion) {
      reducedFallback(host, ctx);
      return 'reduced';
    }

    // Optional forced id within bank
    let item = opts.id && ALL_BY_ID[opts.id] ? ALL_BY_ID[opts.id] : pickFromBank(bank);
    if (!item) {
      reducedFallback(host, ctx);
      return 'none';
    }
    lastPlayedId = item.id;
    item.play(host, ctx);
    return item.id;
  }

  /**
   * Choose the right celebration tier for a just-met goal + current streak.
   * @param {{ streak: number, title?: string, subtitle?: string }} opts
   */
  function playForGoalMet(opts) {
    const streak = opts.streak || 1;
    if (isStreakMilestone(streak)) {
      return play('milestone', opts);
    }
    if (streak >= 2) {
      // Mix streak-flavored FX with general goal bank so multi-day feels special
      return play(Math.random() < 0.55 ? 'streak' : 'goal', opts);
    }
    return play('goal', opts);
  }

  function listAnimations() {
    return shuffle(Object.keys(ALL_BY_ID));
  }

  document.addEventListener('visibilitychange', () => { if (document.hidden) clearFx(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && root && !root.hidden) clearFx(); });

  global.WaterCelebrations = {
    play,
    playForGoalMet,
    isStreakMilestone,
    STREAK_MILESTONES,
    listAnimations,
    catalog: () => SCENES.map(([id, name, hue]) => ({id, name, hue})),
    clear: clearFx,
    /** ids in each bank (for debugging / preview UI) */
    banks: {
      goal: GOAL_BANK.map((b) => b.id),
      streak: STREAK_BANK.map((b) => b.id),
      milestone: MILESTONE_BANK.map((b) => b.id),
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
