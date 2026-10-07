(function(root){const config=Object.freeze({...{gearRatios:Object.freeze({'-1':-3.6,0:0,1:4.2,2:2.5,3:1.75,4:1.35,5:1.1,6:.9}),
   differential:4.3,efficiency:.9,wheelRadius:.385,idleRpm:900,maxRpm:6500,reverseSpeedLimit:3/3.6,
   automaticUpRpm:5500,automaticDownRpm:1400,automaticCruiseRpm:2300,automaticKickdownRpm:3000,automaticShiftDelay:.8,automaticReverseDelay:.35,torqueCurve:Object.freeze([[900,140],[1500,190],[2500,270],[4000,300],[5500,270],[6500,220]].map(Object.freeze))},mass:1450,enginePower:150000,drag:.41,rolling:18,
    offroadRolling:140,offroadDrag:22,offroadSpeed:11,wheelbase:2.65,
    maxSteer:.53,steerSpeedFactor:.035,yawResponse:7,lateralResponse:6,
    gravity:9.81,asphaltHalfWidth:4.4,
    carHalfWidth:1.4,carHalfLength:2.45,wheelRadius:.385,
    verticalSpring:70,verticalDamping:14,pitchSpring:55,pitchDamping:11,
    rollSpring:50,rollDamping:10,acceleration:7,braking:15,maxSpeed:180,
    sensitivity:.65,steeringSmooth:3.5,keyboardSteerRate:.75,keyboardLateralAccel:4.5,grip:1,
 steeringWheelDegrees:450,track:1.65,suspensionSpring:32000,suspensionDamping:4200,suspensionTravel:.25,
 handbrakeForce:8,handbrakeGrip:.3,collisionStep:.2,
 surfaces:Object.freeze({asphalt:{grip:1,rolling:18,drag:0},shoulder:{grip:.75,rolling:30,drag:.4},grass:{grip:.6,rolling:55,drag:1.6},gravel:{grip:.48,rolling:45,drag:1.2}})});
 root.PhysicsConfig=config;if(typeof module!=='undefined')module.exports=config;
})(typeof window!=='undefined'?window:globalThis);
