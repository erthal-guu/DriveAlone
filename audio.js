/* Paisagem sonora sintetizada, sem arquivos de áudio: motor em camadas, admissão, vento, pneus,
   derrapagem, chuva e ambiente (pássaros de dia, grilos à noite). Funciona offline.
   update() recebe o estado do carro a cada quadro; nada aqui altera a física. */
function createSoundscape(){
 let ctx=null,nodes=null,nextBird=2,nextCricket=0,lastGear=0;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

 function noiseBuffer(seconds=2){const buffer=ctx.createBuffer(1,ctx.sampleRate*seconds,ctx.sampleRate),data=buffer.getChannelData(0);
  // Slightly brown-tinted noise: less hiss, more body for wind and tyres.
  let last=0;for(let i=0;i<data.length;i++){const white=Math.random()*2-1;last=(last+.08*white)/1.08;data[i]=white*.55+last*2.2;}return buffer;}
 function loop(buffer){const source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;source.start(0,Math.random()*buffer.duration);return source;}
 function filter(type,frequency,Q=.7){const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=frequency;f.Q.value=Q;return f;}
 function amp(value=0){const g=ctx.createGain();g.gain.value=value;return g;}
 // Engine timbre: crank-order fundamental with strong firing orders (even harmonics for a 4-cylinder).
 function engineWave(){const n=28,real=new Float32Array(n),imag=new Float32Array(n);for(let k=1;k<n;k++)imag[k]=(k%2===0?1:.38)/Math.pow(k,.75)*(1+.25*Math.sin(k*1.7));return ctx.createPeriodicWave(real,imag);}
 function softClip(amount){const curve=new Float32Array(1024);for(let i=0;i<1024;i++){const x=i/511.5-1;curve[i]=Math.tanh(x*amount)/Math.tanh(amount);}return curve;}

 function build(){
  const master=amp(0),engineBus=amp(0),ambient=amp(.9),limiter=ctx.createDynamicsCompressor();
  // Gentle limiter: engine, wind, tyres and rain together never clip.
  limiter.threshold.value=-10;limiter.knee.value=8;limiter.ratio.value=6;master.connect(limiter).connect(ctx.destination);ambient.connect(master);
  const wave=engineWave(),noise=noiseBuffer();crashBuffer=noiseBuffer(3);clickBuffer=noiseBuffer(.2);
  const body=ctx.createOscillator(),thick=ctx.createOscillator();body.setPeriodicWave(wave);thick.setPeriodicWave(wave);thick.detune.value=9;
  const tone=filter('lowpass',600,.9),shaper=ctx.createWaveShaper();shaper.curve=softClip(1.5);shaper.oversample='2x';
  const thickGain=amp(.45);body.connect(tone);thick.connect(thickGain).connect(tone);tone.connect(shaper).connect(engineBus);
  const intake=loop(noise),intakeBand=filter('bandpass',300,1.4),intakeGain=amp(0);intake.connect(intakeBand).connect(intakeGain).connect(engineBus);
  const cabin=filter('lowpass',4000,.5);engineBus.connect(cabin).connect(master);
  const wind=loop(noise),windTone=filter('lowpass',500,.6),windHigh=filter('highpass',80),windGain=amp(0);wind.connect(windHigh).connect(windTone).connect(windGain).connect(master);
  const road=loop(noise),roadTone=filter('lowpass',350,.8),roadGain=amp(0);road.connect(roadTone).connect(roadGain).connect(master);
  const gravel=loop(noise),gravelBand=filter('bandpass',2200,.9),gravelGain=amp(0),gravelLfo=ctx.createOscillator(),gravelDepth=amp(0);
  gravelLfo.frequency.value=11;gravelLfo.connect(gravelDepth).connect(gravelGain.gain);gravel.connect(gravelBand).connect(gravelGain).connect(master);
  const squeal=ctx.createOscillator(),squealGain=amp(0),vibrato=ctx.createOscillator(),vibratoDepth=amp(18);squeal.type='triangle';squeal.frequency.value=880;vibrato.frequency.value=7;
  vibrato.connect(vibratoDepth).connect(squeal.frequency);squeal.connect(filter('bandpass',900,3)).connect(squealGain).connect(master);
  const rain=loop(noise),rainTone=filter('highpass',900,.5),rainGain=amp(0);rain.connect(rainTone).connect(rainGain).connect(master);
  for(const o of [body,thick,gravelLfo,squeal,vibrato])o.start();
  return {master,engineBus,ambient,body,thick,tone,intakeBand,intakeGain,cabin,windTone,windGain,roadTone,roadGain,gravelGain,gravelDepth,squeal,squealGain,rainGain};
 }

 function chirp(time,pan){const notes=2+Math.floor(Math.random()*5),base=2400+Math.random()*2400,panner=ctx.createStereoPanner?ctx.createStereoPanner():null;
  const out=amp(1);if(panner){panner.pan.value=pan;out.connect(panner).connect(nodes.ambient);}else out.connect(nodes.ambient);
  for(let i=0;i<notes;i++){const t=time+i*(.09+Math.random()*.07),o=ctx.createOscillator(),g=amp(0),len=.05+Math.random()*.07;
   o.frequency.setValueAtTime(base*(1+Math.random()*.15),t);o.frequency.exponentialRampToValueAtTime(base*(.75+Math.random()*.6),t+len);
   g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.035,t+.012);g.gain.exponentialRampToValueAtTime(.0005,t+len);o.connect(g).connect(out);o.start(t);o.stop(t+len+.02);}}
 function cricket(time,pan){const o=ctx.createOscillator(),g=amp(0),panner=ctx.createStereoPanner?ctx.createStereoPanner():null;o.frequency.value=4300+Math.random()*700;
  (panner?(g.connect(panner).connect(nodes.ambient),panner.pan.value=pan):g.connect(nodes.ambient));o.connect(g);
  const pulses=3+Math.floor(Math.random()*4);for(let i=0;i<pulses;i++){const t=time+i*.045;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.018,t+.008);g.gain.linearRampToValueAtTime(0,t+.03);}
  o.start(time);o.stop(time+pulses*.045+.05);}

 // Gear change: a short mechanical click and a brief dip in engine sound.
 let clickBuffer=null;
 function shift(){if(!ctx)return;const t=ctx.currentTime,click=ctx.createBufferSource(),g=amp(0),band=filter('bandpass',1400,2);click.buffer=clickBuffer||(clickBuffer=noiseBuffer(.2));
  g.gain.setValueAtTime(.12,t);g.gain.exponentialRampToValueAtTime(.001,t+.08);click.connect(band).connect(g).connect(nodes.master);click.start(t);click.stop(t+.1);
  nodes.engineBus.gain.cancelScheduledValues(t);nodes.engineBus.gain.setTargetAtTime(.05,t,.02);}

 // Crash: a burst of filtered noise (metal and glass) and a low thump, both scaled by the impact (m/s).
 let crashBuffer=null;
 function burst(gainValue,cutoff,length,thump){const t=ctx.currentTime,src=ctx.createBufferSource(),g=amp(0),f=filter('lowpass',cutoff,.8);src.buffer=crashBuffer||(crashBuffer=noiseBuffer(3));
  g.gain.setValueAtTime(gainValue,t);g.gain.exponentialRampToValueAtTime(.001,t+length);src.connect(f).connect(g).connect(nodes.master);src.start(t,Math.random()*.5);src.stop(t+length+.05);
  const o=ctx.createOscillator(),og=amp(0);o.frequency.setValueAtTime(thump,t);o.frequency.exponentialRampToValueAtTime(thump*.5,t+length*.6);og.gain.setValueAtTime(gainValue*1.4,t);og.gain.exponentialRampToValueAtTime(.001,t+length*.6);o.connect(og).connect(nodes.master);o.start(t);o.stop(t+length);}
 function crash(strength){if(!ctx)return;const s=Math.min(1,strength/25);burst(.15+s*.6,700+s*3000,.2+s*.6,70);}
 function explosion(){if(!ctx)return;burst(1.2,380,2.8,48);setTimeout(()=>ctx&&burst(.5,2200,.4,90),40);}

 return {crash,explosion,
  get ready(){return !!ctx;},
  // Must be called from a user gesture (browser autoplay rules).
  start(){if(ctx){ctx.resume?.();return true;}try{const Context=window.AudioContext||window.webkitAudioContext;ctx=new Context();nodes=build();ctx.resume?.();return true;}catch{ctx=null;return false;}},
  shift,
  reject(volume){if(!ctx)return;const t=ctx.currentTime,buzz=ctx.createOscillator(),g=amp(0);buzz.type='sawtooth';buzz.frequency.value=85;
   g.gain.setValueAtTime(volume*.05,t);g.gain.exponentialRampToValueAtTime(.001,t+.15);buzz.connect(g).connect(ctx.destination);buzz.start(t);buzz.stop(t+.16);},
  /* s: {on, volume 0-100, ambient bool, rpm, maxRpm, throttle 0-1, speed m/s, surface, slip m/s, gear, inside (cockpit/cabin), night 0-1, rain 0-1, dt} */
  update(s){if(!ctx)return;const t=ctx.currentTime,n=nodes,k=.06,v=Math.abs(s.speed||0),rpm=clamp(s.rpm||900,500,s.maxRpm||7000),load=clamp(s.throttle||0,0,1),r=rpm/(s.maxRpm||6500);
   n.master.gain.setTargetAtTime(s.on?clamp(s.volume/100,0,1)*.7:0,t,.15);
   if(!s.on)return;
   const f=rpm/60;n.body.frequency.setTargetAtTime(f,t,.03);n.thick.frequency.setTargetAtTime(f,t,.03);
   // Load opens the filter and adds intake roar; overrun keeps the engine muffled.
   n.tone.frequency.setTargetAtTime(220+rpm*.18+load*rpm*.35,t,k);
   n.intakeBand.frequency.setTargetAtTime(f*6,t,k);n.intakeGain.gain.setTargetAtTime(load*(.05+r*.12),t,k);
   const limiter=r>.97?(.6+.4*Math.sin(t*90)):1;
   if(s.gear!==lastGear){if(lastGear&&s.gear)shift();lastGear=s.gear;}
   n.engineBus.gain.setTargetAtTime((.16+.2*load+.14*r)*limiter,t+.03,.05);
   n.cabin.frequency.setTargetAtTime(s.inside?1600:5000,t,.2);
   const wind=clamp((v/42)**2,0,1);n.windGain.gain.setTargetAtTime(wind*(s.inside?.16:.32),t,.2);n.windTone.frequency.setTargetAtTime(300+v*28,t,.2);
   const asphalt=s.surface==='asphalt';n.roadGain.gain.setTargetAtTime(clamp(v/55,0,1)*(asphalt?.13:.07),t,.15);n.roadTone.frequency.setTargetAtTime(200+v*9,t,.2);
   const crunch=asphalt||v<.5?0:clamp(v/25,0,1)*(s.surface==='gravel'?.18:.11);n.gravelGain.gain.setTargetAtTime(crunch*.6,t,.1);n.gravelDepth.gain.setTargetAtTime(crunch*.4,t,.1);
   const skid=asphalt&&v>4?clamp((Math.abs(s.slip||0)-1.6)/3,0,1):0;n.squealGain.gain.setTargetAtTime(skid*.05,t,.06);n.squeal.frequency.setTargetAtTime(820+skid*160,t,.1);
   n.rainGain.gain.setTargetAtTime(clamp(s.rain||0,0,1)*(s.inside?.28:.18),t,.4);
   n.ambient.gain.setTargetAtTime(s.ambient?clamp(1-v/35,.25,1):0,t,.5);
   if(s.ambient){const night=clamp(s.night||0,0,1),wet=clamp(s.rain||0,0,1);
    nextBird-=s.dt||0;if(nextBird<=0){nextBird=1.5+Math.random()*5;if(Math.random()>night&&Math.random()>wet)chirp(t+.05,Math.random()*1.6-.8);}
    nextCricket-=s.dt||0;if(nextCricket<=0){nextCricket=.25+Math.random()*.6;if(Math.random()<night*(1-wet))cricket(t+.02,Math.random()*1.6-.8);}}
  }
 };
}
