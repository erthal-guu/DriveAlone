(function(root){
 const presets=Object.freeze({low:{resolution:1,horizon:6000,shadows:false,vegetation:.4,shadowSize:512,viewDistance:1200,shadowDistance:100,postProcessing:false,ssao:false,bloom:false,grass:.4},
 medium:{shadowCadence:2,horizon:9000,resolution:1,shadows:true,vegetation:.65,shadowSize:1024,viewDistance:1800,shadowDistance:220,postProcessing:true,ssao:false,bloom:false,grass:.65},
 high:{resolution:1.5,horizon:12000,shadows:true,vegetation:1,shadowSize:2048,viewDistance:2400,shadowDistance:350,postProcessing:true,ssao:true,bloom:true,grass:1},
 ultra:{resolution:2,horizon:14000,shadows:true,vegetation:1.3,shadowSize:2048,viewDistance:3000,shadowDistance:450,postProcessing:true,ssao:true,bloom:true,grass:1.3}});
 const Quality={presets,resolve:key=>presets[key]||presets.medium};root.Quality=Quality;if(typeof module!=='undefined')module.exports=Quality;
})(typeof window!=='undefined'?window:globalThis);

