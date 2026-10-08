/* Garagem: uma ficha por carro. Para acrescentar um carro, veja assets/cars/LEIA-ME.md.
   Medidas em metros já na escala final; o carro olha para +z, com o motorista à esquerda (+x).
   - length: comprimento real (o modelo é escalado uniformemente para ele)
   - flip: gira 180° quando o modelo foi feito olhando para −z
   - wheels: nomes das peças que giram; são agrupadas pelas quatro posições automaticamente
   - brakes: peças que esterçam com a roda mas não giram (pinças)
   - steering: peças do volante (giram); sem volante separado, o motorista segura o volante do modelo
   - eye: cabeça do motorista; wheel: centro do volante quando não há peça separada
   - paint/glass/tail/head: materiais da pintura (cor configurável), vidros, lanternas e faróis
   - roof: peças escondidas na câmera de cockpit; hide: peças sempre escondidas
   - wheelSplit: volante modelado dentro de outra peça (centro, normal da coluna e raio do aro); o jogo o separa para girar
   - rhd: volante à direita; addWheel: cria um volante quando o modelo não tem; dashboard:false esconde o painel digital do jogo
   - engine: potência máxima (kW) e torque relativo ao motor padrão de 300 N·m */
(function(root){
 const HorizonCars={
  virtus:{cockpitTilt:-20,cockpitFov:67,navigationFit:[-0.35,-0.29,0.68,0.24,0.145],name:'Volkswagen Virtus GT 2022',type:'sedã',file:'virtus',length:4.56,flip:true,rhd:true,wheels:/^wheel[1-4]_/,steering:/^steer(2_|3_|_|stitch_|alu_|tt_)/,wheelRadius:.18,eyeFromWheel:{y:0.3,z:-0.49},paint:/^primary(\.|$)/,glass:/^glass$/,tail:/left_rear_light|right_rear_light/,head:/left_front_light|right_front_light/,engine:{power:110,torque:.85},credit:'2022 Volkswagen Virtus GT · BHP3D · CC BY 4.0'},
  purosangue:{cockpitTilt:-23,cockpitFov:68,navigationFit:[-0.35,-0.29,0.66,0.235,0.145],name:'Ferrari Purosangue 2023',type:'SUV',file:'purosangue',length:4.97,wheels:/^polySurface.*Wheel1A/,brakes:/Callipers|Calliper/,wheelSplit:{center:[.39913,1.05282,.15293],normal:[0,-.2218,.97509],radius:.15},wheel:{x:.39913,y:1.05282,z:.15293},wheelRadius:.15,eyeFromWheel:{y:0.32,z:-0.47},paint:/2023Paint_Material$/,glass:/Window(Inside)?_Material$/,engine:{power:533,torque:2.4},credit:'2023 Ferrari Purosangue · Ddiaz Design · CC BY-NC-SA 4.0'},
  golf:{cockpitTilt:-20,cockpitFov:67,navigationFit:[-0.34,-0.29,0.66,0.225,0.14],name:'Volkswagen Golf GTI Mk7 2014',type:'hatch',file:'golf',length:4.27,wheels:/^polySurface.*Wheel1A/,brakes:/CalliperGloss/,wheel:{x:.38,y:.9,z:.34},addWheel:true,wheelRadius:.18,eyeFromWheel:{y:0.3,z:-0.47},paint:/Paint_Material1$/,glass:/Window_Material1$/,tail:/^red_glass$/,engine:{power:162,torque:1.2},credit:'2014 Volkswagen Golf GTI Mk7 · Ddiaz Design · CC BY-NC-SA 4.0'},
  civic:{cockpitTilt:-21,cockpitFov:67,navigationFit:[-0.34,-0.28,0.66,0.23,0.145],name:'Honda Civic Type R 2023',type:'hatch',file:'civic',length:4.60,wheels:/^polySurface.*Wheel1A/,brakes:/Callipers/,wheel:{x:.39,y:.86,z:.32},addWheel:true,wheelRadius:.18,eyeFromWheel:{y:0.31,z:-0.47},paint:/2023Paint_Material$/,glass:/2023Window_Material$/,tail:/^RED_GLASS$/,engine:{power:235,torque:1.4},credit:'2023 Honda Civic Type R · Ddiaz Design · CC BY-NC-SA 4.0'},
  concept:{cockpitTilt:-24,cockpitFov:70,navigationFit:[-0.36,-0.31,0.7,0.245,0.15],name:'Concept GT',type:'cupê',file:'concept',fit:{length:4.65,width:2.5},
   wheels:/^Wheel(Front|Rear)(L|R)$/,steering:/^InteriorSteering(Wheel|Emblem)/,wheelRadius:.16,eyeFromWheel:{y:0.43,z:-0.53},
   paint:/Clearcoat|^Paint 1/,glass:/Smoked Smart Glass|^Glass$/,tail:/Tail Lamp Red|Brakelight/,head:/^Headlight$/,
   roof:/CABIN_Roof_Shell|BodyRoofPanel|Panoramic_Roof_Glass|InteriorCage|InteriorPillar|BodyWindshieldGasket|InteriorSeats|Seat_/,hide:/^(Shift_Selector|InteriorSteeringDash|Digital_Gauge_Cluster)$/,
   pedals:/Pedal(Accel|Brake)$/,engine:{power:150,torque:1},
   credit:'Car Concept: Eric Chadwick / Darmstadt Graphics Group GmbH, 2024 · CC BY 4.0'},
  jetta:{cockpitTilt:-20,cockpitFov:67,navigationFit:[-0.33,-0.31,0.66,0.23,0.14],name:'Volkswagen Jetta 2024',type:'sedã',file:'jetta',length:4.70,
   wheels:/^(Rim_Viper_17|Tire)_(FL|FR|RL|RR)/,brakes:/^Ext_Brake_F[LR]#/,steering:/^Int_SW#/,wheelRadius:.19,eyeFromWheel:{y:0.3,z:-0.48},
   paint:/^CarPaint$/,glass:/^(Windows|D_glass)$/,tail:/^(Glow_Red|Glass_Red)$/,head:/^(Glow_1|Glow_2)$/,engine:{power:110,torque:.85},
   credit:'"2024 Volkswagen Jetta" por Ddiaz Design (sketchfab.com/ddiaz-design) · CC BY-NC-SA 4.0'},
  'tt-rs':{cockpitTilt:-20,cockpitFov:67,navigationFit:[-0.33,-0.29,0.65,0.22,0.135],name:'Audi TT RS 2010',type:'cupê',file:'tt-rs',length:4.20,
   wheels:/^Mesh(1[4-9]|2[01])_/,brakes:/^Mesh2[2-5]_/,wheelSplit:{center:[.374,.883,.22],normal:[0,-.336,.942],radius:.168},wheel:{x:.374,y:.883,z:.22},wheelRadius:.18,eyeFromWheel:{y:0.28,z:-0.46},
   paint:/^TTRS$/,glass:/^(glass|vidrios)$/,tail:/^TTRS_luz2$/,head:/^TTRS_luz$/,engine:{power:250,torque:1.5},
   credit:'"2010 Audi TT RS" por Ddiaz Design (sketchfab.com/ddiaz-design) · CC BY-NC-SA 4.0'},
  '350z':{cockpitTilt:-20,cockpitFov:67,navigationFit:[-0.34,-0.29,0.65,0.22,0.14],name:'Nissan 350Z',type:'cupê',file:'350z',length:4.31,flip:true,
   wheels:/^wheel_rs721/,rhd:true,dashboard:false,wheelSplit:{center:[-.379,.818,.181],normal:[0,-.326,.945],radius:.169},wheel:{x:-.379,y:.818,z:.181},wheelRadius:.18,eyeFromWheel:{y:0.29,z:-0.47},
   paint:/^body_white_pri(_0)?$/,glass:/^(body_white_e01(_0)?|whitea128a_spe(_0)?)$/,tail:/^(lights2_env_50__lights2\.bmp|vehiclelights12)$/,head:null,engine:{power:210,torque:1.2},
   credit:'"Nissan 350z" por David_Holiday (sketchfab.com/David_Holiday) · CC BY 4.0'}
 };
 root.HorizonCars=HorizonCars;if(typeof module!=='undefined')module.exports=HorizonCars;
})(typeof window!=='undefined'?window:globalThis);
